# ginza_scraper_db.py
#!/usr/bin/env python3
# -*- coding: utf-8 -*-

import re, sys, time, json, requests
from bs4 import BeautifulSoup
from urllib.parse import urljoin
from requests.adapters import HTTPAdapter, Retry

from db_utils import (
    get_conn, ensure_schema,
    get_or_create_shop, upsert_girl,
    upsert_roster_entry
)

BASE = "https://www.ginzaclub.com.au"   # keep 'www' for canonical_url
URL  = f"{BASE}/Roster"                  # capital R per site

# --- HTTP session with retries ------------------------------------------------
HEADERS = {
    "User-Agent": ("Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) "
                   "AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0 Safari/537.36"),
    "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
    "Accept-Language": "en-AU,en;q=0.9",
    "Connection": "keep-alive",
}
REQUEST_TIMEOUT = (10, 60)   # (connect, read)
PAUSE = 0.6

RETRY = Retry(
    total=4, connect=3, read=3,
    backoff_factor=1.5,
    status_forcelist=(429, 500, 502, 503, 504),
    allowed_methods=("GET", "HEAD", "OPTIONS"),
    raise_on_status=False,
)

SESSION = requests.Session()
SESSION.headers.update(HEADERS)
SESSION.mount("https://", HTTPAdapter(max_retries=RETRY))
SESSION.mount("http://",  HTTPAdapter(max_retries=RETRY))
SESSION.headers["Referer"] = BASE + "/"

def fetch(url: str):
    return SESSION.get(url, timeout=REQUEST_TIMEOUT, allow_redirects=True)

def best_img_url(img_tag) -> str:
    if not img_tag:
        return ""
    return (img_tag.get("src") or img_tag.get("data-src") or "").strip()

# --- scrape -------------------------------------------------------------------
def scrape() -> list[dict]:
    print(f"GET {URL}")
    r = fetch(URL)
    if r.status_code != 200:
        with open("ginza_raw.html", "wb") as f:
            f.write(r.content or b"")
        sys.exit(f"HTTP {r.status_code} – saved ginza_raw.html")

    soup = BeautifulSoup(r.text, "html.parser")

    # Ginza roster page: find all "(photo)" indicators and climb to parent <a>
    photo_spans = soup.find_all("span", string=lambda t: t and "(photo" in t.lower())
    print(f"Found {len(photo_spans)} PHOTO spans")

    out, seen = [], set()

    for span in photo_spans:
        a = span.find_parent("a")
        if not a:
            continue

        href = (a.get("href") or "").strip()
        if not href or "/Girls/" not in href:
            continue

        profile_link = urljoin(BASE + "/", href)
        if profile_link in seen:
            continue
        seen.add(profile_link)

        entry = {
            "name": None,           # ← store NULL (we don't trust page text)
            "origin_code": None,    # ← NULL
            "shift": None,          # ← NULL
            "profile_link": profile_link,
            "photo": ""
        }

        # visit profile for one good photo
        try:
            pr = fetch(profile_link)
            if pr.status_code == 200:
                psoup = BeautifulSoup(pr.text, "html.parser")
                img = psoup.select_one(".swiper-slide img, .swiper-wrapper img")
                if img:
                    u = best_img_url(img)
                    if u:
                        entry["photo"] = urljoin(BASE, u)
                if not entry["photo"]:
                    any_img = psoup.select_one("img")
                    if any_img:
                        u = best_img_url(any_img)
                        if u:
                            entry["photo"] = urljoin(BASE, u)
            else:
                print(f"  ! HTTP {pr.status_code} for {profile_link}")
        except requests.RequestException as e:
            print(f"! Error fetching {profile_link}: {e}")

        out.append(entry)
        time.sleep(PAUSE)

    # debug snapshot (even if empty)
    with open("ginza.json", "w", encoding="utf-8") as f:
        json.dump(out, f, indent=2, ensure_ascii=False)
    print(f"\nSaved {len(out)} entries → ginza.json")
    return out

# --- main ---------------------------------------------------------------------
def main():
    roster = scrape()

    conn = get_conn()
    try:
        with conn:
            with conn.cursor() as cur:
                ensure_schema(cur)
                shop_id = get_or_create_shop(cur,
                    name="Ginza Club",
                    url=BASE,
                    location="Sydney"
                )
                inserted = 0
                for e in roster:
                    gid = upsert_girl(cur, e, shop_id)   # accepts None for name/origin/photo
                    if not gid:
                        continue
                    upsert_roster_entry(cur, e, shop_id, gid)  # shift NULL is fine
                    inserted += 1
                print(f"\nSaved {inserted} entries into DB ✅")
    finally:
        conn.close()

if __name__ == "__main__":
    main()
