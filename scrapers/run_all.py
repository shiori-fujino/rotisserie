#!/usr/bin/env python3
# -*- coding: utf-8 -*-

"""
Run all roster scrapers sequentially.
Also updates each shop's last_scraped timestamp when finished.
"""

import subprocess
import sys
import time
from avia_generic_scraper_db import scrape_avia_shop
from db_utils import get_conn

# ---------- Legacy scrapers ----------
SCRAPERS = [
    ("42gladesville_scraper_db.py", "42gladesville"),
    ("no5_scraper_db.py", "no5marrickville"),
    ("kyoto206_scraper_db.py", "kyoto206"),
    ("sakura57_scraper_db.py", "sakura57"),
    ("ginza_scraper_db.py", "ginza"),
    ("ginza479_scraper_db.py", "ginza479"),
    ("dreamgirl_scraper_db.py", "dreamgirl"),
    ("22rydalmere_scraper_db.py", "22rydalmere"),
    ("45granville_scraper_db.py", "45granville"),
]

# ---------- Avia-style shops ----------
AVIA_SHOPS = [
    ("Sydney Girl Massage", "https://sydneygirlmassage.com/"),
    ("SydBaby Massage", "https://sydbabymassage.com/nude-massage-roster/"),
    ("Sydney Empress 69", "https://sydneyempress69.com/todays-roster/"),
]


def mark_shop_scraped(slug: str):
    """Update last_scraped timestamp for a given shop slug."""
    conn = get_conn()
    try:
        with conn:
            with conn.cursor() as cur:
                cur.execute("UPDATE shops SET last_scraped = NOW() WHERE slug = %s;", (slug,))
                print(f"🕓 last_scraped updated for {slug}")
    finally:
        conn.close()


def run(cmd: str) -> bool:
    """Run a legacy scraper file as a subprocess; return True if success."""
    print(f"\n=== Running {cmd} ===\n")
    result = subprocess.run([sys.executable, cmd], capture_output=True, text=True)
    print(result.stdout)
    if result.stderr:
        print("STDERR:", result.stderr)
    return result.returncode == 0


def main():
    total = 0
    start = time.time()

    # ---------- legacy scrapers ----------
    for script, slug in SCRAPERS:
        ok = run(script)
        if ok:
            mark_shop_scraped(slug)

    # ---------- Avia scrapers ----------
    print("\n=== Running Avia (Enfold-theme) scrapers ===\n")
    for name, url in AVIA_SHOPS:
        try:
            inserted = scrape_avia_shop(name, url)
            total += inserted
            # derive slug the same way you store it (normalize name)
            slug = name.lower().replace(" ", "")
            mark_shop_scraped(slug)
        except Exception as e:
            print(f"❌ Failed on {name}: {e}")

    elapsed = time.time() - start
    print(f"\n✨ All scrapers finished — total {total} new entries inserted ✅")
    print(f"⏱️ Elapsed: {elapsed:.1f}s\n")


if __name__ == "__main__":
    main()
