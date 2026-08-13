#!/usr/bin/env python3
import importlib.util
import sys
import unittest
from pathlib import Path


spec = importlib.util.spec_from_file_location("seo_verify", Path(__file__).with_name("seo-verify.py"))
seo_verify = importlib.util.module_from_spec(spec)
assert spec.loader is not None
sys.modules[spec.name] = seo_verify
spec.loader.exec_module(seo_verify)
parse_base_url = seo_verify.parse_base_url


class SeoVerifyArgumentTests(unittest.TestCase):
    def test_accepts_positional_base_url(self):
        self.assertEqual(parse_base_url(["https://example.com"]), "https://example.com")

    def test_accepts_base_url_flag(self):
        self.assertEqual(parse_base_url(["--base-url", "https://example.com"]), "https://example.com")


if __name__ == "__main__":
    unittest.main()
