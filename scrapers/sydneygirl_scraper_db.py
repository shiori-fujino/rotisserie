# sydneygirl_scraper_db.py
import os
import sys
import json
import requests
from bs4 import BeautifulSoup
import psycopg2
from datetime import datetime
from dotenv import load_dotenv

load_dotenv()

SHOP_NAME = "Sydney Girl Massage"
SHOP_URL = "https://sydneygirlmassage.com/"

def get_conn():
    dsn = os.getenv("DATABASE_URL")
    if not dsn:
        raise RuntimeError("DATABASE_URL not set")
    return psycopg2.connect(dsn, sslmode="require")

def scrape():
    print(f"Fetching roster page: {SHOP_URL}")
    r = requests.get(SHOP_URL, timeout=20)
    if not r.ok:
        sys.exit(f"Failed to fetch page: {r.status_code}")
    soup = BeautifulSoup(r.text, "lxml")

    # detect today and handle their weird 'thur' spelling
    weekday = datetime.now().strftime("%a").lower()[:3]  # e.g. 'thu'
    if weekday == "thu":
        today_id = "thur_sort_button"
    else:
        today_id = f"{weekday}_sort_button"
    print(f"Today is {weekday.upper()} → targeting div#{today_id}")

    roster_section = soup.select_one(f"div#{today_id}")
    if not roster_section:
        sys.exit(f"Couldn't find roster for today ({today_id})")

    roster_root = roster_section.select_one("div.avia-content-slider-inner")
    if not roster_root:
        sys.exit(f"Couldn't find .avia-content-slider-inner inside {today_id}")


    girls = roster_root.select("article.slide-entry")
    print(f"Found {len(girls)} raw girl entries inside {today_id}")

    roster = []
    for art in girls:
        name_el = art.select_one("h3.slide-entry-title")
        img_el = art.select_one("img.attachment-portfolio")

        name = name_el.get_text(strip=True) if name_el else None
        profile_url = name_el.find("a")["href"] if name_el and name_el.find("a") else None
        photo_url = img_el["src"] if img_el and img_el.has_attr("src") else None

        if not (name and profile_url and photo_url):
            continue
        if "double" in name.lower():
            continue

        roster.append({
            "name": name,
            "profile_url": profile_url,
            "photo_url": photo_url,
            "origin": None,
        })

    print(f"Scraped {len(roster)} profiles → sydneygirl.json")
    with open("sydneygirl.json", "w", encoding="utf-8") as f:
        json.dump(roster, f, ensure_ascii=False, indent=2)
    return roster

def save_to_db(roster):
    conn = get_conn()
    with conn, conn.cursor() as cur:
        # ensure shop exists
        cur.execute("""
            INSERT INTO shops (name, canonical_url)
            VALUES (%s, %s)
            ON CONFLICT (canonical_url) DO UPDATE SET name = EXCLUDED.name
            RETURNING id
        """, (SHOP_NAME, SHOP_URL))
        shop_id = cur.fetchone()[0]

        count = 0
        for g in roster:
            cur.execute("""
                INSERT INTO girls (shop_id, name, origin, profile_url, photo_url)
                VALUES (%s, %s, %s, %s, %s)
                ON CONFLICT (profile_url) DO UPDATE SET
                    name = EXCLUDED.name,
                    origin = EXCLUDED.origin,
                    photo_url = EXCLUDED.photo_url
                RETURNING id
            """, (shop_id, g["name"], g["origin"], g["profile_url"], g["photo_url"]))
            girl_id = cur.fetchone()[0]

            cur.execute("""
                INSERT INTO roster_entries (date, girl_id, shop_id)
                VALUES (%s, %s, %s)
                ON CONFLICT (date, girl_id, shop_id) DO NOTHING
            """, (datetime.now().date(), girl_id, shop_id))
            count += 1
        conn.commit()
    conn.close()
    print(f"Saved {count} entries into DB ✅")

def main():
    roster = scrape()
    if roster:
        save_to_db(roster)
    else:
        print("No roster scraped ❌")

if __name__ == "__main__":
    main()
