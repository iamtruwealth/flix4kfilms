#!/usr/bin/env python3
"""
FLIX 4K — Phase 3 production browser smoke test.

Boots the *production* preview build (vite preview serving `dist/`), opens the
site in a real headless Chromium via Playwright, and walks the critical public
+ admin paths. Fails (exit 1) on any critical assertion or any unexpected
browser console error.

Prerequisites
-------------
  1. `npm run build`  (must exist before this script runs)
  2. Python 3 + Playwright for Python:
       python3 -m pip install playwright
       python3 -m playwright install chromium

Usage
-----
  npm run smoke                 # builds + previews + runs this script
  python3 scripts/smoke-test.py # assumes `dist/` already exists
  SMOKE_BASE_URL=https://... python3 scripts/smoke-test.py  # run against a live URL

Optional authenticated admin checks (local/CI only, NEVER committed creds):
  SMOKE_ADMIN_EMAIL=you@example.com SMOKE_ADMIN_PASSWORD=hunter2 \
    python3 scripts/smoke-test.py

When those env vars are absent, the script verifies the admin login page and
the unauthenticated redirect but skips sign-in — no credentials ever live in
the repository.

Server lifecycle: this script starts `vite preview` on an ephemeral port,
waits for it to respond, and terminates it in a `finally` block so no orphaned
processes are left behind.
"""
from __future__ import annotations

import os
import socket
import subprocess
import sys
import time
from pathlib import Path

DEFAULT_PORT = 4173
ADMIN_EMAIL = os.environ.get("SMOKE_ADMIN_EMAIL", "")
ADMIN_PASSWORD = os.environ.get("SMOKE_ADMIN_PASSWORD", "")
EXTERNAL_URL = os.environ.get("SMOKE_BASE_URL", "").rstrip("/")

PROJECT_ROOT = Path(__file__).resolve().parent.parent
DIST_DIR = PROJECT_ROOT / "dist"

results: list[tuple[str, bool, str]] = []


def record(label: str, ok: bool, extra: str = "") -> None:
    results.append((label, ok, extra))
    print(f"{'PASS' if ok else 'FAIL'}  {label}" + (f"  — {extra}" if extra else ""))


def wait_for_http(url: str, timeout: float = 60.0) -> bool:
    """Poll until the server responds over HTTP, or the timeout elapses."""
    import urllib.request

    deadline = time.monotonic() + timeout
    while time.monotonic() < deadline:
        try:
            with urllib.request.urlopen(url, timeout=2) as resp:
                return resp.status < 500
        except Exception:
            time.sleep(0.5)
    return False


def pick_port() -> int:
    """Pick a free port without racing the preview server."""
    if os.environ.get("SMOKE_PORT"):
        return int(os.environ["SMOKE_PORT"])
    s = socket.socket(socket.AF_INET, socket.SOCK_STREAM)
    try:
        s.bind(("127.0.0.1", 0))
        return s.getsockname()[1]
    finally:
        s.close()


def has_text(page, text: str, timeout: float = 15000) -> bool:
    try:
        page.wait_for_function(
            f"document.body && document.body.innerText.toLowerCase().includes({text.lower()!r})",
            timeout=timeout,
        )
        return True
    except Exception:
        return False


def main() -> int:
    from playwright.sync_api import sync_playwright

    server: subprocess.Popen | None = None
    base = EXTERNAL_URL

    if not base:
        if not DIST_DIR.is_dir() or not (DIST_DIR / "index.html").exists():
            print("ERROR: dist/ missing. Run `npm run build` first (or `npm run smoke`).")
            return 1
        port = pick_port()
        base = f"http://127.0.0.1:{port}"
        try:
            server = subprocess.Popen(
                ["npx", "--no-install", "vite", "preview", "--port", str(port), "--strictPort"],
                cwd=str(PROJECT_ROOT),
                stdout=subprocess.DEVNULL,
                stderr=subprocess.DEVNULL,
            )
            if not wait_for_http(base):
                print(f"ERROR: preview server did not start on {base}")
                return 1
        except Exception as exc:
            print(f"ERROR: could not start preview server: {exc}")
            return 1

    exit_code = 1
    try:
        with sync_playwright() as p:
            browser = p.chromium.launch(headless=True)
            page = browser.new_page(viewport={"width": 1440, "height": 900})
            console_errors: list[str] = []
            not_found_urls: list[str] = []
            page.on("console", lambda msg: console_errors.append(msg.text) if msg.type == "error" else None)
            page.on("pageerror", lambda err: console_errors.append(str(err)))
            page.on(
                "response",
                lambda r: not_found_urls.append(r.url) if r.status == 404 else None,
            )

            # 1. Public homepage loads
            page.goto(f"{base}/", timeout=45000)
            record("1. Public homepage loads", has_text(page, "FLIX"))

            # 2. GLB camera model asset loads (HTTP 200)
            glb_ok = False
            try:
                with page.expect_response(
                    lambda r: r.url.endswith(".glb") and r.status == 200,
                    timeout=30000,
                ) as resp_info:
                    page.goto(f"{base}/", timeout=45000)
                glb_ok = resp_info.value is not None
            except Exception:
                glb_ok = False
            record("2. GLB camera asset loads (200)", glb_ok)

            # 3. Camera / 3D experience initializes (WebGL canvas mounts)
            canvas_ok = False
            try:
                page.goto(f"{base}/", timeout=45000)
                page.wait_for_selector("canvas", timeout=30000)
                canvas_ok = page.locator("canvas").count() >= 1
            except Exception:
                canvas_ok = False
            record("3. Camera experience initializes (WebGL canvas)", canvas_ok)

            # 4. LCD/photo experience does not throw (scroll through it)
            page.goto(f"{base}/", timeout=45000)
            page.wait_for_load_state("networkidle")
            try:
                page.mouse.wheel(0, 4000)
                page.wait_for_timeout(2500)
                page.mouse.wheel(0, 4000)
                page.wait_for_timeout(2500)
            except Exception:
                pass
            lcd_errors = [e for e in console_errors if "variant" in e or "is not a function" in e or "null" in e]
            record("4. LCD/photo experience renders without errors", not lcd_errors, f"{len(lcd_errors)} LCD error(s)")

            # 5. Portfolio navigation is accessible
            page.goto(f"{base}/portfolio", timeout=45000)
            record("5. Portfolio navigation is accessible", "portfolio" in page.url and has_text(page, "PORTFOLIO"))

            # 6. Public portfolio route loads (with content)
            page.goto(f"{base}/portfolio/weddings", timeout=45000)
            record("6. Public portfolio route loads", "weddings" in page.url and has_text(page, "WEDDINGS"))

            # 7. Videos page loads
            page.goto(f"{base}/videos", timeout=45000)
            record("7. Videos page loads", "videos" in page.url and has_text(page, "VIDEOS"))

            # 8. Admin login page loads
            page.goto(f"{base}/admin/login", timeout=45000)
            login_ok = False
            try:
                page.wait_for_selector("input[type=email]", timeout=15000)
                login_ok = (
                    page.locator("input[type=email]").count() == 1
                    and page.locator("input[type=password]").count() == 1
                )
            except Exception:
                login_ok = False
            record("8. Admin login page loads", login_ok)

            # 9. Protected /admin route redirects unauthenticated visitors
            page.goto(f"{base}/admin", timeout=45000)
            redirected = False
            try:
                page.wait_for_url("**/admin/login", timeout=15000)
                redirected = True
            except Exception:
                redirected = False
            record("9. Protected /admin redirects unauthenticated users", redirected)

            # 10. About + Book pages load (remainder of public shell)
            page.goto(f"{base}/about", timeout=45000)
            about_ok = "about" in page.url and has_text(page, "ABOUT")
            page.goto(f"{base}/book", timeout=45000)
            book_ok = "book" in page.url and has_text(page, "BOOK")
            record("10. About + Book pages load", about_ok and book_ok)

            # 10b. Booking page mounts the Cal.com embed OR shows the fallback
            page.goto(f"{base}/book", timeout=45000)
            page.wait_for_timeout(2500)
            iframe_ok = page.locator(".book-embed-slot iframe").count() >= 1
            fallback_ok = page.locator(".book-fallback").count() >= 1
            record(
                "10b. Booking widget mounts (iframe) or shows fallback",
                iframe_ok or fallback_ok,
                "iframe" if iframe_ok else "fallback",
            )

            # 10c. Booking reassurance copy present
            page.goto(f"{base}/book", timeout=45000)
            record("10c. Booking reassurance present", has_text(page, "BOOKING REQUEST"))

            # 11. Zero unexpected browser console errors
            # A 404 on app.cal.com (e.g. unprovisioned booking account) surfaces as a
            # generic "Failed to load resource: 404" console message. Suppress those
            # external 404s only; any other console error still fails the check.
            cal404 = any("app.cal.com" in url for url in not_found_urls)
            real = [
                e
                for e in console_errors
                if "favicon" not in e.lower()
                and not (
                    cal404
                    and "failed to load resource" in e.lower()
                    and "404" in e
                )
            ]
            record("11. Zero unexpected console errors", len(real) == 0, f"{len(real)} error(s)")
            for e in real[:8]:
                print("   console:", e[:220])

            # Optional authenticated admin checks (env-gated, no committed creds)
            if ADMIN_EMAIL and ADMIN_PASSWORD:
                page.goto(f"{base}/admin/login", timeout=45000)
                page.wait_for_selector("input[type=email]", timeout=15000)
                page.locator("input[type=email]").fill(ADMIN_EMAIL, timeout=10000)
                page.locator("input[type=password]").fill(ADMIN_PASSWORD, timeout=10000)
                page.locator("button[type=submit]").click()
                try:
                    page.wait_for_url("**/admin", timeout=20000)
                    auth_ok = "/admin" in page.url
                except Exception:
                    auth_ok = False
                record("A1. Admin sign-in (env creds)", auth_ok)
                if auth_ok:
                    record("A2. Admin overview (gate ready)", has_text(page, "OVERVIEW"))

            browser.close()
            exit_code = 0 if all(r[1] for r in results) else 1
    finally:
        if server is not None:
            server.terminate()
            try:
                server.wait(timeout=5)
            except subprocess.TimeoutExpired:
                server.kill()

    passed = sum(1 for r in results if r[1])
    print(f"\n== {passed}/{len(results)} checks passed ==")
    return exit_code


if __name__ == "__main__":
    sys.exit(main())
