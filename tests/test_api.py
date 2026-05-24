"""API tests against an isolated temp DB (configured in conftest.py)."""
import db
import app as appmod

db.init_db()
client = appmod.app.test_client()


def test_months_payload():
    r = client.get("/api/months")
    assert r.status_code == 200
    data = r.get_json()
    assert "months" in data and "current" in data


def test_month_payload_shape_and_standard_meters():
    d = client.get("/api/month/2026-05").get_json()
    for key in ("items", "meters", "loans", "notes", "trend", "state"):
        assert key in d, f"missing {key}"
    names = [m["name"] for m in d["meters"]]
    assert "Electricity" in names and "Water" in names  # standard meters always present


def test_bill_crud_roundtrip():
    r = client.post("/api/bills", json={"cat": "Card", "name": "CI Test",
                                        "amount": 123, "period": "2099-01", "status": "due"})
    assert r.status_code == 201
    bid = r.get_json()["id"]
    items = client.get("/api/month/2099-01").get_json()["items"]
    assert any(i["name"] == "CI Test" for i in items)
    assert client.delete(f"/api/bills/{bid}").status_code == 200
    items = client.get("/api/month/2099-01").get_json()["items"]
    assert not any(i["name"] == "CI Test" for i in items)


def test_admin_routes_require_auth():
    anon = appmod.app.test_client()                          # no session
    assert anon.get("/api/loan-plans").status_code == 401
    assert anon.post("/api/loan-plans", json={"name": "x", "tenure": 1, "monthly": 1}).status_code == 401
    # the dashboard installment toggle is NOT an admin route — stays open
    assert anon.post("/api/loan-plans/999/installment",
                     json={"period": "2099-01", "paid": False}).status_code == 200
    # bad creds rejected, good creds unlock the admin routes (cookie persists on the client)
    assert anon.post("/api/login", json={"username": "admin", "password": "wrong"}).status_code == 401
    assert anon.post("/api/login", json={"username": "admin", "password": "admin"}).status_code == 200
    assert anon.get("/api/loan-plans").status_code == 200


def test_loan_plan_installments_window_and_mark_paid():
    assert client.post("/api/login", json={"username": "admin", "password": "admin"}).status_code == 200
    r = client.post("/api/loan-plans", json={"name": "CI Loan", "totalAmount": 1200,
                                             "tenure": 3, "monthly": 400, "startPeriod": "2099-03"})
    assert r.status_code == 201
    pid = r.get_json()["id"]
    # month 2 of 3 inside the tenure
    loans = client.get("/api/month/2099-04").get_json()["loans"]
    inst = [l for l in loans if l.get("kind") == "installment" and l.get("planId") == pid]
    assert len(inst) == 1 and inst[0]["installmentNo"] == 2 and inst[0]["tenure"] == 3
    # past the tenure → nothing
    after = client.get("/api/month/2099-07").get_json()["loans"]
    assert not any(l.get("planId") == pid for l in after)
    # mark paid
    client.post(f"/api/loan-plans/{pid}/installment", json={"period": "2099-04", "paid": True})
    paid = [l for l in client.get("/api/month/2099-04").get_json()["loans"] if l.get("planId") == pid][0]
    assert paid["status"] == "done"
    client.delete(f"/api/loan-plans/{pid}")


def test_period_helpers():
    assert appmod.parse_period("2026-05") == (2026, 5)
    assert appmod.next_period("2026-12") == "2027-01"
    assert appmod.prev_period("2026-01") == "2025-12"
    assert appmod.period_index("2026-02") - appmod.period_index("2026-01") == 1
