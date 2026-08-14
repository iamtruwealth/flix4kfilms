#!/usr/bin/env python3
"""Verify the deployed URL contract needed by the SEO foundation.

Usage:
    python3 scripts/seo-verify.py
    python3 scripts/seo-verify.py https://flix4kfilms.art
    python3 scripts/seo-verify.py --base-url https://flix4kfilms.art
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
from urllib.parse import urljoin
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
ROUTE_DESCRIPTIONS = {
    "/about": "Learn about FLIX 4K Photography, an inclusive Atlanta photo and video crew serving weddings, portraits, events, and film productions across metro Atlanta.",
    "/portfolio": "Explore the FLIX 4K photography portfolio featuring Atlanta weddings, portraits, birthdays, events, and visual stories created across metro Atlanta.",
    "/portfolio/weddings": "View Atlanta wedding photography by FLIX 4K, with thoughtful coverage for ceremonies, celebrations, couples, families, and the moments between them.",
    "/portfolio/events": "See event photography from FLIX 4K for Atlanta celebrations, special events, productions, and gatherings captured with an efficient professional crew.",
    "/portfolio/birthdays": "Explore birthday and milestone event photography from FLIX 4K, serving clients across metro Atlanta with polished, friendly, efficient coverage.",
    "/portfolio/portraits": "Discover Atlanta portrait photography by FLIX 4K for individuals, couples, families, and personal stories captured with intention.",
    "/videos": "Watch FLIX 4K photography and video reels for weddings, events, portraits, social content, and film-friendly productions across metro Atlanta.",
    "/book": "Book FLIX 4K for Atlanta wedding photography, portraits, events, video, or film production. Tell us what you are planning and start a conversation.",
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
EXPECTED_SOCIAL_IMAGE = f"{BASE_URL}/og-image.jpg"
EXPECTED_SCHEMA_TYPES = {"WebSite", "Organization"}


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


def parse_json_ld_objects(head: HeadParser) -> list[dict[str, object]]:
    objects = []
    for raw in head.json_ld:
        try:
            value = json.loads(raw)
        except json.JSONDecodeError:
            continue
        if isinstance(value, dict):
            objects.append(value)
    return objects


def homepage_assertions(head: HeadParser) -> list[str]:
    failures = []
    if head.title != EXPECTED_TITLE:
        failures.append("title")
    if head.meta.get(("name", "description")) != EXPECTED_DESCRIPTION:
        failures.append("description")
    if head.links.get("canonical") != EXPECTED_CANONICAL:
        failures.append("canonical")
    if head.meta.get(("property", "og:image")) != EXPECTED_SOCIAL_IMAGE:
        failures.append("OG image")
    if head.meta.get(("name", "twitter:image")) != EXPECTED_SOCIAL_IMAGE:
        failures.append("Twitter image")
    schema_types = {value.get("@type") for value in parse_json_ld_objects(head)}
    if not EXPECTED_SCHEMA_TYPES.issubset(schema_types):
        failures.append("JSON-LD schema types")
    return failures


def route_fallback_assertion(head: HeadParser, path: str, homepage: str, body: str = "") -> bool:
    expected_title = ROUTE_TITLES[path]
    expected_description = ROUTE_DESCRIPTIONS[path]
    expected_canonical = f"{BASE_URL}{path}"
    return (
        head.title == expected_title
        and head.meta.get(("name", "description")) == expected_description
        and head.links.get("canonical") == expected_canonical
        and head.meta.get(("property", "og:url")) == expected_canonical
        and "BreadcrumbList" in {value.get("@type") for value in parse_json_ld_objects(head)}
        and head.title != EXPECTED_TITLE
        and body != homepage
    )


def redirect_assertion(result: FetchResult, path: str | None = None) -> bool:
    if result.status == 200:
        return result.final_url == result.requested_url
    if path and path != "/" and result.status in {301, 302, 307, 308}:
        expected_url = urljoin(result.requested_url, f"{path}/")
        return urljoin(result.requested_url, result.location) == expected_url
    return False


def content_type_assertion(content_type: str, expected_types: tuple[str, ...]) -> bool:
    return content_type.split(";", 1)[0].lower() in expected_types


def parse_base_url(argv: list[str] | None = None) -> str:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument(
        "base_url_positional",
        nargs="?",
        help="site origin to verify (legacy positional form)",
    )
    parser.add_argument(
        "--base-url",
        dest="base_url_flag",
        default=None,
        help=f"site origin to verify (default: $SEO_BASE_URL or {BASE_URL})",
    )
    args = parser.parse_args(argv)
    if args.base_url_positional and args.base_url_flag and args.base_url_positional != args.base_url_flag:
        parser.error("positional URL and --base-url must match when both are provided")
    return args.base_url_flag or args.base_url_positional or os.environ.get("SEO_BASE_URL", BASE_URL)


def main() -> int:
    base_url = parse_base_url().rstrip("/")
    passed = True

    homepage_result = fetch(base_url, "/")
    homepage_url_ok = redirect_assertion(homepage_result)
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
        url_ok = redirect_assertion(result, path)
        content_result = result
        if result.status in {301, 302, 307, 308} and url_ok:
            content_result = fetch(base_url, f"{path}/")
            url_ok = redirect_assertion(content_result)
        passed &= check(
            f"GET {path} returns 200 or matching trailing-slash redirect",
            content_result.status == 200 and url_ok,
            f"status={result.status or 'request error'} final={result.final_url}"
            + (f" location={result.location}" if result.location else ""),
        )
        if content_result.status == 200 and url_ok:
            route_head = HeadParser()
            route_head.feed(content_result.body)
            route_specific = route_fallback_assertion(route_head, path, homepage, content_result.body)
            passed &= check(
                f"{path} is not a generic homepage fallback",
                route_specific,
                f"title={route_head.title!r} canonical={route_head.links.get('canonical', 'missing')!r}",
            )

    for path, expected_types in REQUIRED_ASSETS.items():
        result = fetch(base_url, path)
        statuses[path] = result.status
        url_ok = redirect_assertion(result)
        passed &= check(
            f"GET {path} returns 200 without redirect",
            result.status == 200 and url_ok,
            f"status={result.status or 'request error'} final={result.final_url}"
            + (f" location={result.location}" if result.location else ""),
        )
        if result.status == 200 and url_ok:
            passed &= check(
                f"{path} has the expected content type",
                content_type_assertion(result.content_type, expected_types),
                f"content-type={result.content_type or 'missing'}",
            )

    head = HeadParser()
    head.feed(homepage)
    for requirement in ("title", "description", "canonical", "OG image", "Twitter image", "JSON-LD schema types"):
        passed &= check(f"Static {requirement} is present", requirement not in homepage_assertions(head))

    # Make it explicit in CI output that a passing status check is not route
    # indexability proof when the server returns the site's generic shell.
    clean_route_failures = [path for path in PUBLIC_ROUTES[1:] if statuses.get(path) != 200]
    if clean_route_failures:
        print("INFO  Clean public routes are not served by the origin: " + ", ".join(clean_route_failures))

    return 0 if passed else 1


if __name__ == "__main__":
    sys.exit(main())
