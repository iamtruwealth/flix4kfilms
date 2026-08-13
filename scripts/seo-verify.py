#!/usr/bin/env python3
"""Verify the deployed URL contract needed by the SEO foundation.

Usage:
    python3 scripts/seo-verify.py
    SEO_BASE_URL=http://127.0.0.1:4173 python3 scripts/seo-verify.py

The checker intentionally tests clean public URLs as server requests. A 200
response from a static host is not enough to prove that a client-side router
can render the route, so the homepage HTML assertions are kept separate from
the route status checks.
"""
from __future__ import annotations

import argparse
import json
import os
import sys
from html.parser import HTMLParser
from urllib.error import HTTPError, URLError
from urllib.request import Request, urlopen


BASE_URL = "https://flix4kfilms.art"
PUBLIC_ROUTES = (
    "/",
    "/about",
    "/portfolio",
    "/portfolio/weddings",
    "/portfolio/events",
    "/portfolio/birthdays",
    "/portfolio/portraits",
    "/videos",
    "/book",
)
REQUIRED_ASSETS = {
    "/robots.txt": ("text/plain",),
    "/sitemap.xml": ("application/xml", "text/xml"),
    "/camera.ico": ("image/x-icon", "image/vnd.microsoft.icon", "image/ico"),
}
EXPECTED_TITLE = "Atlanta Photographer & Wedding Photography | FLIX 4K"
EXPECTED_DESCRIPTION = (
    "FLIX 4K is an Atlanta photographer for weddings, portraits, events, video, "
    "and film productions across metro Atlanta. Book a professional photo and video crew."
)
EXPECTED_CANONICAL = f"{BASE_URL}/"


class HeadParser(HTMLParser):
    """Collect only metadata needed for the static shell checks."""

    def __init__(self) -> None:
        super().__init__()
        self.title = ""
        self.meta: dict[tuple[str, str], str] = {}
        self.links: dict[str, str] = {}
        self.json_ld: list[str] = []
        self._in_title = False
        self._in_json_ld = False
        self._json_ld_buffer: list[str] = []

    def handle_starttag(self, tag: str, attrs: list[tuple[str, str | None]]) -> None:
        values = {key: value or "" for key, value in attrs}
        if tag == "title":
            self._in_title = True
        elif tag == "meta":
            key = values.get("name") or values.get("property")
            if key:
                self.meta[("property" if values.get("property") else "name", key)] = values.get("content", "")
        elif tag == "link" and values.get("rel"):
            self.links[values["rel"].lower()] = values.get("href", "")
        elif tag == "script" and values.get("type") == "application/ld+json":
            self._in_json_ld = True
            self._json_ld_buffer = []

    def handle_endtag(self, tag: str) -> None:
        if tag == "title":
            self._in_title = False
        elif tag == "script" and self._in_json_ld:
            self.json_ld.append("".join(self._json_ld_buffer))
            self._in_json_ld = False

    def handle_data(self, data: str) -> None:
        if self._in_title:
            self.title += data
        if self._in_json_ld:
            self._json_ld_buffer.append(data)


def fetch(base_url: str, path: str) -> tuple[int, str, str]:
    url = f"{base_url}{path}"
    request = Request(url, headers={"User-Agent": "flix4k-seo-verify/1.0"})
    try:
        with urlopen(request, timeout=20) as response:
            body = response.read().decode("utf-8", errors="replace")
            return response.status, response.headers.get("content-type", ""), body
    except HTTPError as error:
        return error.code, error.headers.get("content-type", ""), ""
    except URLError as error:
        return 0, "", str(error.reason)


def check(label: str, passed: bool, detail: str = "") -> bool:
    suffix = f" — {detail}" if detail else ""
    print(f"{'PASS' if passed else 'FAIL'}  {label}{suffix}")
    return passed


def main() -> int:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument(
        "--base-url",
        default=os.environ.get("SEO_BASE_URL", BASE_URL),
        help=f"site origin to verify (default: $SEO_BASE_URL or {BASE_URL})",
    )
    args = parser.parse_args()
    base_url = args.base_url.rstrip("/")
    passed = True

    statuses: dict[str, int] = {}
    for path in PUBLIC_ROUTES + tuple(REQUIRED_ASSETS):
        status, content_type, _ = fetch(base_url, path)
        statuses[path] = status
        passed &= check(f"GET {path} returns 200", status == 200, f"status={status or 'request error'}")
        if path in REQUIRED_ASSETS and status == 200:
            passed &= check(
                f"{path} has the expected content type",
                content_type.split(";", 1)[0].lower() in REQUIRED_ASSETS[path],
                f"content-type={content_type or 'missing'}",
            )

    status, content_type, homepage = fetch(base_url, "/")
    passed &= check("Homepage HTML downloads", status == 200 and bool(homepage), f"status={status}")
    if not homepage:
        return 1

    head = HeadParser()
    head.feed(homepage)
    passed &= check("Static title is present", head.title == EXPECTED_TITLE, repr(head.title))
    passed &= check(
        "Static description is present",
        head.meta.get(("name", "description")) == EXPECTED_DESCRIPTION,
        repr(head.meta.get(("name", "description"), "missing")),
    )
    passed &= check(
        "Static canonical is present",
        head.links.get("canonical") == EXPECTED_CANONICAL,
        repr(head.links.get("canonical", "missing")),
    )
    og_image = head.meta.get(("property", "og:image"), "")
    passed &= check("Static OG image is present", bool(og_image), repr(og_image or "missing"))

    valid_json_ld = []
    for raw in head.json_ld:
        try:
            value = json.loads(raw)
        except json.JSONDecodeError:
            continue
        if isinstance(value, dict):
            valid_json_ld.append(value)
    passed &= check(
        "Static JSON-LD fallback is present",
        bool(valid_json_ld),
        f"{len(valid_json_ld)} valid object(s)",
    )

    # Make it explicit in CI output that a passing status check is not route
    # indexability proof when the server returns the site's generic shell.
    clean_route_failures = [path for path in PUBLIC_ROUTES[1:] if statuses.get(path) != 200]
    if clean_route_failures:
        print("INFO  Clean public routes are not served by the origin: " + ", ".join(clean_route_failures))

    return 0 if passed else 1


if __name__ == "__main__":
    sys.exit(main())
