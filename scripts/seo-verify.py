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
from dataclasses import dataclass
from html.parser import HTMLParser
from urllib.error import HTTPError, URLError
from urllib.request import HTTPRedirectHandler, Request, build_opener


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
ROUTE_TITLES = {
    "/about": "About FLIX 4K | Atlanta Photography & Video Crew",
    "/portfolio": "Atlanta Photography Portfolio | FLIX 4K",
    "/portfolio/weddings": "Atlanta Wedding Photographer | FLIX 4K",
    "/portfolio/events": "Atlanta Event Photographer | FLIX 4K",
    "/portfolio/birthdays": "Atlanta Birthday Event Photography | FLIX 4K",
    "/portfolio/portraits": "Atlanta Portrait Photographer | FLIX 4K",
    "/videos": "Atlanta Photography & Video Reels | FLIX 4K",
    "/book": "Book an Atlanta Photographer | FLIX 4K",
}
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


class NoRedirectHandler(HTTPRedirectHandler):
    """Keep redirect responses observable instead of following them."""

    def redirect_request(self, request, response, code, msg, headers, new_url):
        return None


HTTP_OPENER = build_opener(NoRedirectHandler)


@dataclass(frozen=True)
class FetchResult:
    status: int
    content_type: str
    body: str
    requested_url: str
    final_url: str
    location: str


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


def fetch(base_url: str, path: str) -> FetchResult:
    url = f"{base_url}{path}"
    request = Request(url, headers={"User-Agent": "flix4k-seo-verify/1.0"})
    try:
        with HTTP_OPENER.open(request, timeout=20) as response:
            body = response.read().decode("utf-8", errors="replace")
            return FetchResult(
                response.status,
                response.headers.get("content-type", ""),
                body,
                url,
                response.geturl(),
                response.headers.get("location", ""),
            )
    except HTTPError as error:
        return FetchResult(
            error.code,
            error.headers.get("content-type", ""),
            "",
            url,
            error.geturl(),
            error.headers.get("location", ""),
        )
    except URLError as error:
        return FetchResult(0, "", str(error.reason), url, url, "")


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

    homepage_result = fetch(base_url, "/")
    homepage_url_ok = homepage_result.final_url == homepage_result.requested_url
    passed &= check(
        "GET / returns 200 without redirect",
        homepage_result.status == 200 and homepage_url_ok,
        f"status={homepage_result.status or 'request error'} final={homepage_result.final_url}",
    )
    homepage = homepage_result.body
    if not homepage:
        return 1

    statuses: dict[str, int] = {"/": homepage_result.status}
    for path in PUBLIC_ROUTES[1:]:
        result = fetch(base_url, path)
        statuses[path] = result.status
        url_ok = result.final_url == result.requested_url
        passed &= check(
            f"GET {path} returns 200 without redirect",
            result.status == 200 and url_ok,
            f"status={result.status or 'request error'} final={result.final_url}"
            + (f" location={result.location}" if result.location else ""),
        )
        if result.status == 200 and url_ok:
            route_head = HeadParser()
            route_head.feed(result.body)
            expected_title = ROUTE_TITLES[path]
            expected_canonical = f"{BASE_URL}{path}"
            route_specific = (
                route_head.title == expected_title
                and route_head.links.get("canonical") == expected_canonical
                and result.body != homepage
            )
            passed &= check(
                f"{path} is not a generic homepage fallback",
                route_specific,
                f"title={route_head.title!r} canonical={route_head.links.get('canonical', 'missing')!r}",
            )

    for path, expected_types in REQUIRED_ASSETS.items():
        result = fetch(base_url, path)
        statuses[path] = result.status
        url_ok = result.final_url == result.requested_url
        passed &= check(
            f"GET {path} returns 200 without redirect",
            result.status == 200 and url_ok,
            f"status={result.status or 'request error'} final={result.final_url}"
            + (f" location={result.location}" if result.location else ""),
        )
        if result.status == 200 and url_ok:
            passed &= check(
                f"{path} has the expected content type",
                result.content_type.split(";", 1)[0].lower() in expected_types,
                f"content-type={result.content_type or 'missing'}",
            )

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
