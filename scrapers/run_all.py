#!/usr/bin/env python3
# -*- coding: utf-8 -*-

"""
Run all roster scrapers sequentially.
Includes both legacy individual scrapers and new Avia-theme generic scraper.
"""

import subprocess
import sys
from avia_generic_scraper_db import scrape_avia_shop

# ---------- Legacy scrapers (still individual) ----------
SCRAPERS = [
    "42gladesville_scraper_db.py",
    "no5_scraper_db.py",
    "kyoto206_scraper_db.py",
    "sakura57_scraper_db.py",
    "ginza_scraper_db.py",
    "ginza479_scraper_db.py",
    "dreamgirl_scraper_db.py",
]

# ---------- Avia-style shops (Enfold clones) ----------
AVIA_SHOPS = [
    ("Sydney Girl Massage", "https://sydneygirlmassage.com/"),
    ("SydBaby Massage", "https://sydbabymassage.com/nude-massage-roster/"),
    ("Sydney Empress 69", "https://sydneyempress69.com/todays-roster/"),
]


def run(cmd: str):
    """Run a legacy scraper file as a subprocess."""
    print(f"\n=== Running {cmd} ===\n")
    result = subprocess.run([sys.executable, cmd], capture_output=True, text=True)
    print(result.stdout)
    if result.stderr:
        print("STDERR:", result.stderr)


def main():
    total = 0

    # Run old scrapers first
    for s in SCRAPERS:
        run(s)

    # Run new generic Avia scrapers
    print("\n=== Running Avia (Enfold-theme) scrapers ===\n")
    for name, url in AVIA_SHOPS:
        try:
            total += scrape_avia_shop(name, url)
        except Exception as e:
            print(f"❌ Failed on {name}: {e}")

    print(f"\n✨ All scrapers finished — total {total} new entries inserted ✅")


if __name__ == "__main__":
    main()
