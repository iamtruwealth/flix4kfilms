#!/usr/bin/env python3
import importlib.util
import json
import sys
import unittest
from pathlib import Path


spec = importlib.util.spec_from_file_location("seo_verify", Path(__file__).with_name("seo-verify.py"))
seo_verify = importlib.util.module_from_spec(spec)
assert spec.loader is not None
sys.modules[spec.name] = seo_verify
spec.loader.exec_module(seo_verify)
parse_base_url = seo_verify.parse_base_url
FetchResult = seo_verify.FetchResult
HeadParser = seo_verify.HeadParser
homepage_assertions = seo_verify.homepage_assertions
route_fallback_assertion = seo_verify.route_fallback_assertion
redirect_assertion = seo_verify.redirect_assertion
content_type_assertion = seo_verify.content_type_assertion

FIXTURES = Path(__file__).with_name("fixtures") / "seo-verify"


class SeoVerifyArgumentTests(unittest.TestCase):
    def test_accepts_positional_base_url(self):
        self.assertEqual(parse_base_url(["https://example.com"]), "https://example.com")

    def test_accepts_base_url_flag(self):
        self.assertEqual(parse_base_url(["--base-url", "https://example.com"]), "https://example.com")


class SeoVerifyFixtureTests(unittest.TestCase):
    def read_fixture(self, name: str) -> str:
        return (FIXTURES / name).read_text(encoding="utf-8")

    def test_parses_homepage_canonical_and_required_schemas(self):
        head = HeadParser()
        head.feed(self.read_fixture("homepage.html"))

        self.assertEqual(homepage_assertions(head), [])
        schema_types = {json.loads(raw)["@type"] for raw in head.json_ld}
        self.assertEqual(schema_types, {"WebSite", "Organization"})

    def test_rejects_missing_canonical_and_schema(self):
        head = HeadParser()
        head.feed(self.read_fixture("missing-schema.html"))

        failures = homepage_assertions(head)
        self.assertIn("canonical", " ".join(failures))
        self.assertIn("JSON-LD", " ".join(failures))

    def test_detects_generic_homepage_route_fallback(self):
        homepage = self.read_fixture("homepage.html")
        route_head = HeadParser()
        route_head.feed(self.read_fixture("route-fallback.html"))

        self.assertFalse(route_fallback_assertion(route_head, "/about", homepage))

    def test_accepts_route_specific_html(self):
        homepage = self.read_fixture("homepage.html")
        route_head = HeadParser()
        route_head.feed(self.read_fixture("route-specific.html"))

        self.assertTrue(route_fallback_assertion(route_head, "/about", homepage))

    def test_accepts_matching_trailing_slash_redirect(self):
        location = self.read_fixture("relative-about-redirect.txt").strip()
        result = FetchResult(301, "text/html", "", "https://example.com/about", "https://example.com/about", location)
        self.assertTrue(redirect_assertion(result, "/about"))

    def test_rejects_redirect_to_homepage(self):
        result = FetchResult(301, "text/html", "", "https://example.com/about", "https://example.com/about", "https://example.com/")
        self.assertFalse(redirect_assertion(result, "/about"))

    def test_detects_redirect_response(self):
        result = FetchResult(301, "text/html", "", "https://example.com/about", "https://example.com/", "https://example.com/")
        self.assertFalse(redirect_assertion(result))

    def test_checks_content_type(self):
        self.assertTrue(content_type_assertion("application/xml; charset=utf-8", ("application/xml",)))
        self.assertFalse(content_type_assertion("text/html", ("application/xml",)))


if __name__ == "__main__":
    unittest.main()
