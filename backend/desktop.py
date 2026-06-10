"""Dinero desktop launcher — runs the Flask backend in a thread and opens it
in a native window (Edge WebView2 via pywebview).

Dev:    python backend/desktop.py
Frozen: built into Dinero.exe by PyInstaller (see dinero.spec).

`--server-only` starts the backend without a window and prints the URL —
used for smoke-testing the frozen build headlessly.
"""

import os
import socket
import sys
import threading

import webview

from app import app
from db import init_db


def free_port():
    with socket.socket() as s:
        s.bind(("127.0.0.1", 0))
        return s.getsockname()[1]


def start_server(port):
    # No reloader/debug: the reloader re-execs the process, which fights both
    # the thread and the frozen exe.
    threading.Thread(
        target=lambda: app.run(host="127.0.0.1", port=port,
                               debug=False, use_reloader=False),
        daemon=True,
    ).start()


def wait_until_up(port, tries=50):
    for _ in range(tries):
        try:
            with socket.create_connection(("127.0.0.1", port), timeout=0.2):
                return True
        except OSError:
            pass
    return False


def main():
    init_db()
    # PORT pins the port (useful with --server-only, where the windowless
    # frozen exe can't print the random one); otherwise pick a free port.
    port = int(os.environ.get("PORT") or free_port())
    start_server(port)
    url = f"http://127.0.0.1:{port}"
    if not wait_until_up(port):
        print("Backend failed to start", file=sys.stderr)
        sys.exit(1)

    if "--server-only" in sys.argv:
        print(url, flush=True)
        threading.Event().wait()  # serve until killed

    webview.create_window(
        "Dinero", url, width=1380, height=900, min_size=(1024, 700))
    webview.start()  # blocks until the window closes; daemon server dies with us


if __name__ == "__main__":
    main()
