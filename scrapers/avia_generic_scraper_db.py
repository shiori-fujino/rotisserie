# scrapers/avia_generic_scraper.py
import sys
import json
import re
import requests
from bs4 import BeautifulSoup
from datetime import datetime
from db_utils import get_conn, get_or_create_shop, upsert_girl, upsert_roster_entry
from origin_normalizer import normalize_origin

def scrape_avia_shop(shop_name: str, shop_url: str) -> int:
    """Scrape any Enfold/Avia-style roster site (SydneyGirl / SydBaby / Empress69)."""
    print(f"Fetching roster page: {shop_url}")
    r = requests.get(shop_url, timeout=25)
    if not r.ok:
        sys.exit(f"Failed to fetch {shop_url}: {r.status_code}")
    soup = BeautifulSoup(r.text, "lxml")

    # weekday → div id (handle 'thur' misspelling)
    weekday = datetime.now().strftime("%a").lower()[:3]
    today_id = "thur_sort_button" if weekday == "thu" else f"{weekday}_sort_button"
    print(f"Today is {weekday.upper()} → targeting div#{today_id}")

    roster_section = soup.select_one(f"div#{today_id}")
    if not roster_section:
        print(f"⚠️ Couldn't find roster for today ({today_id})")
        return 0

    roster_root = roster_section.select_one("div.avia-content-slider-inner")
    if not roster_root:
        print(f"⚠️ Couldn't find .avia-content-slider-inner inside {today_id}")
        return 0

    articles = roster_root.select("article.slide-entry")
    print(f"Found {len(articles)} raw entries")

    roster = []
    for art in articles:
        name_el = art.select_one("h3.slide-entry-title")
        img_el = art.select_one("img.attachment-portfolio")

        if not name_el or not img_el:
            continue

        raw_name = name_el.get_text(strip=True)
        profile_el = name_el.find("a")
        profile_url = profile_el["href"] if profile_el and profile_el.has_attr("href") else None
        photo_url = img_el["src"] if img_el.has_attr("src") else None

        if not (raw_name and profile_url and photo_url):
            continue
        if "double" in raw_name.lower():
            continue

        # extract nationality in brackets, e.g. "Juno (Korea)"
        origin_raw = None
        name_clean = raw_name
        m = re.search(r"\(([^)]+)\)", raw_name)
        if m:
            origin_raw = m.group(1)
            name_clean = re.sub(r"\s*\(.*?\)", "", raw_name).strip()

        origin_code = normalize_origin(origin_raw or "")

        roster.append({
            "name": name_clean,
            "profile_link": profile_url,
            "photo": photo_url,
            "origin_code": origin_code or None,
        })

    print(f"Scraped {len(roster)} profiles → {shop_name.lower().replace(' ', '')}.json")
    with open(f"{shop_name.lower().replace(' ', '')}.json", "w", encoding="utf-8") as f:
        json.dump(roster, f, ensure_ascii=False, indent=2)

    if not roster:
        return 0

    # DB insert
    conn = get_conn()
    with conn, conn.cursor() as cur:
        shop_id = get_or_create_shop(cur, shop_name, shop_url)
        count = 0
        for g in roster:
            girl_id = upsert_girl(cur, g, shop_id)
            if girl_id:
                upsert_roster_entry(cur, g, shop_id, girl_id)
                count += 1
        conn.commit()
    conn.close()

    print(f"Saved {count} entries into DB ✅")
    return count
