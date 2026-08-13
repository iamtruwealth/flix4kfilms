#!/usr/bin/env python3
"""Capture responsive homepage bounds and assert service/scene separation.

Run against a production preview, for example:
    QA_BASE_URL=http://127.0.0.1:4174 python3 scripts/homepage-layout-qa.py
"""
from __future__ import annotations

import json
import os
import sys

from playwright.sync_api import sync_playwright


BASE_URL = os.environ.get("QA_BASE_URL", "http://127.0.0.1:4173").rstrip("/")
VIEWPORTS = {
    "desktop": {"width": 1440, "height": 900},
    "mobile": {"width": 390, "height": 844},
}
CHECKPOINTS = {
    "camera": 0.0,
    "lcd": 0.66,
    "handoff": 0.84,
    "portfolio": 1.0,
}
SELECTORS = {
    "stage": ".stage",
    "canvas": ".stage-3d canvas",
    "intro": ".intro",
    "lookAgain": ".look-again",
    "hint": ".hint",
    "brand": ".brand",
    "portfolio": ".portfolio",
    "service": ".atlanta-service-intro",
    "featured": ".editorial",
}


def main() -> int:
    failures: list[str] = []
    with sync_playwright() as playwright:
        browser = playwright.chromium.launch(headless=True)
        for label, viewport in VIEWPORTS.items():
            page = browser.new_page(viewport=viewport, device_scale_factor=1)
            console_errors: list[str] = []
            page.on("console", lambda message: console_errors.append(message.text) if message.type == "error" else None)
            page.on("pageerror", lambda error: console_errors.append(str(error)))
            page.goto(f"{BASE_URL}/#/", wait_until="networkidle", timeout=45000)
            page.wait_for_selector(".atlanta-service-intro", timeout=30000)

            measurements = {}
            for checkpoint, progress in CHECKPOINTS.items():
                page.evaluate(
                    """progress => window.scrollTo(0, progress * (document.documentElement.scrollHeight - innerHeight))""",
                    progress,
                )
                page.wait_for_timeout(250)
                measurements[checkpoint] = page.evaluate(
                    """selectors => {
                      const bounds = (selector) => {
                        const element = document.querySelector(selector)
                        if (!element) return null
                        const rect = element.getBoundingClientRect()
                        const style = getComputedStyle(element)
                        return {
                          top: Number(rect.top.toFixed(2)),
                          right: Number(rect.right.toFixed(2)),
                          bottom: Number(rect.bottom.toFixed(2)),
                          left: Number(rect.left.toFixed(2)),
                          width: Number(rect.width.toFixed(2)),
                          height: Number(rect.height.toFixed(2)),
                          opacity: Number(style.opacity),
                          visible: style.display !== 'none' && style.visibility !== 'hidden' && Number(style.opacity) > 0.01,
                          inViewport: rect.right > 0 && rect.left < innerWidth && rect.bottom > 0 && rect.top < innerHeight,
                        }
                      }
                      return {
                        scrollY: Number(scrollY.toFixed(2)),
                        viewport: { width: innerWidth, height: innerHeight },
                        horizontalOverflow: document.documentElement.scrollWidth > innerWidth,
                        bounds: Object.fromEntries(Object.entries(selectors).map(([name, selector]) => [name, bounds(selector)])),
                      }
                    }""",
                    SELECTORS,
                )

            service = measurements["portfolio"]["bounds"]["service"]
            featured = measurements["portfolio"]["bounds"]["featured"]
            if not service or not featured or service["bottom"] > featured["top"]:
                failures.append(f"{label}: service overlaps featured portfolio")
            if any(measurement["horizontalOverflow"] for measurement in measurements.values()):
                failures.append(f"{label}: horizontal overflow detected")
            for checkpoint in ("camera", "lcd", "handoff"):
                scene = measurements[checkpoint]["bounds"]["stage"]
                service_at_checkpoint = measurements[checkpoint]["bounds"]["service"]
                if (
                    scene
                    and service_at_checkpoint
                    and scene["visible"]
                    and service_at_checkpoint["visible"]
                    and scene["inViewport"]
                    and service_at_checkpoint["inViewport"]
                ):
                    failures.append(f"{label}: visible stage overlaps service at {checkpoint}")
            final_stage = measurements["portfolio"]["bounds"]["stage"]
            if final_stage and final_stage["visible"]:
                failures.append(f"{label}: stage remains visible over portfolio at final checkpoint")
            if console_errors:
                failures.append(f"{label}: browser errors: {console_errors[:3]}")

            print(json.dumps({"viewport": label, "measurements": measurements, "consoleErrors": console_errors}, sort_keys=True))
            page.close()
        browser.close()
    if failures:
        for failure in failures:
            print(f"FAIL  {failure}")
        return 1
    print("PASS  homepage layout bounds, overlap, overflow, and console checks")
    return 0


if __name__ == "__main__":
    sys.exit(main())
