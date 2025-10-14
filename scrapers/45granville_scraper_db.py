#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
45 Granville — DB-enabled scraper (WordPress JSON roster page)
Schema matches other shop scrapers exactly.
"""

import re, json, sys, time, requests
from bs4 import BeautifulSoup
from requests.adapters import HTTPAdapter, Retry
from db_utils import get_conn, ensure_schema, get_or_create_shop, upsert_girl, upsert_roster_entry

BASE_URL = "https://45granville.com.au"
API_URL  = f"{BASE_URL}/wp-json/wp/v2/pages/103"
REQUEST_TIMEOUT = (10, 60)
PAUSE = 0.3

HEADERS = {
    "User-Agent": (
        "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) "
        "AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124 Safari/537.36"
    ),
    "Accept": "application/json, text/html, */*;q=0.9",
}

RETRY = Retry(
    total=4, connect=3, read=3,
    backoff_factor=1.2,
    status_forcelist=(429, 500, 502, 503, 504),
    allowed_methods=("GET", "HEAD", "OPTIONS"),
    raise_on_status=False,
)

SESSION = requests.Session()
SESSION.headers.update(HEADERS)
SESSION.mount("https://", HTTPAdapter(max_retries=RETRY))
SESSION.mount("http://",  HTTPAdapter(max_retries=RETRY))


# ---------- helpers ----------
def fetch_json():
    r = SESSION.get(API_URL, timeout=REQUEST_TIMEOUT)
    if r.status_code != 200:
        sys.exit(f"! HTTP {r.status_code} fetching {API_URL}")
    return r.json()

def strip_wp_suffix(url: str) -> str:
    return re.sub(r"-\d+x\d+(?=\.\w+$)", "", url or "")

def parse_girls(html: str):
    """Extract roster entries from page HTML"""
    soup = BeautifulSoup(html, "html.parser")
    girls = []
    paragraphs = soup.find_all("p")

    for i, p in enumerate(paragraphs):
        txt = p.get_text(" ", strip=True)
        # detect start of new girl entry
        if "~" in txt and any(prefix in txt for prefix in ["J ", "C ", "K "]):
            name_match = re.match(r"([JCK]\s*[A-Za-z]+)", txt)
            name = name_match.group(1).strip() if name_match else txt.split("~")[0].strip()
            origin_code = "J" if txt.startswith("J ") else "C" if txt.startswith("C ") else "K"

            # collect first image in the next <p>
            photos = []
            if i + 1 < len(paragraphs):
                for img in paragraphs[i + 1].find_all("img"):
                    src = img.get("src")
                    if src:
                        photos.append(strip_wp_suffix(src))

            girls.append({
                "shop": "45 Granville",
                "name": name,
                "origin_code": origin_code,
                "shift": txt,
                "profile_link": f"{BASE_URL}/?girl={i+1}",
                "photo": photos[0] if photos else ""
            })
    return girls


# ---------- scrape ----------
def scrape():
    print(f"Fetching roster JSON: {API_URL}")
    data = fetch_json()
    html = data["content"]["rendered"]
    roster = parse_girls(html)
    print(f"✅ Parsed {len(roster)} girls.")
    with open("45granville.json", "w", encoding="utf-8") as f:
        json.dump(roster, f, indent=2, ensure_ascii=False)
    return roster


# ---------- main ----------
def main():
    out = scrape()
    conn = get_conn()
    try:
        with conn:
            with conn.cursor() as cur:
                ensure_schema(cur)
                shop_id = get_or_create_shop(cur, "45 Granville", BASE_URL)
                inserted = 0
                for entry in out:
                    if not entry.get("photo"):
                        print(f"⚠️ Skipping {entry.get('name')} — no photo found")
                        continue
                    gid = upsert_girl(cur, entry, shop_id)
                    if not gid:
                        continue
                    upsert_roster_entry(cur, entry, shop_id, gid)
                    inserted += 1
                    time.sleep(PAUSE)
                print(f"Saved {inserted} entries into DB ✅")
    finally:
        conn.close()


if __name__ == "__main__":
    main()
