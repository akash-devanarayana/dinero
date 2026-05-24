"""Unit tests for the Excel importer's pure parsing helpers."""
import import_excel as ie


def test_sheet_period_with_year():
    assert ie.sheet_period("MAY - 2026") == "2026-05"
    assert ie.sheet_period("January - 2025") == "2025-01"
    assert ie.sheet_period("JAN - 2026") == "2026-01"


def test_sheet_period_bare_month_is_2024():
    assert ie.sheet_period("October") == "2024-10"
    assert ie.sheet_period("December") == "2024-12"


def test_sheet_period_non_month_sheets():
    assert ie.sheet_period("Categories") is None
    assert ie.sheet_period("Utility Charts") is None


def test_normalize_status_paid_and_na():
    assert ie.normalize_status("Paid", None, None) == "paid"
    assert ie.normalize_status("N/A", None, None) == "na"


def test_normalize_status_unpaid_over_vs_due():
    # importer reference date is 2026-05-24
    assert ie.normalize_status("Not Paid", "2026-01-10", None) == "over"   # past due
    assert ie.normalize_status("Not Paid", "2026-12-10", None) == "due"    # future due


def test_to_num_handles_strings_and_commas():
    assert ie.to_num("1,234.5") == 1234.5
    assert ie.to_num("174") == 174.0
    assert ie.to_num(None) is None
    assert ie.to_num("-") is None
