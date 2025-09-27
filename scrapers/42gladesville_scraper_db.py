# 42gladesville_scraper_db.py
import re, json, time, sys
import requests
from urllib.parse import urljoin
from bs4 import BeautifulSoup
import psycopg2
from db_utils import get_conn, ensure_schema, get_or_create_shop, upsert_girl, upsert_roster_entry

BASE = "https://thenightshade.com.au"
URL  = f"{BASE}/#roster"
HEADERS = {
    "User-Agent": "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) "
                  "AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0 Safari/537.36"
}
TIMEOUT = 25
PAUSE = 0.4  # politeness delay

NAME_WITH_CODE = re.compile(r"^\s*(?P<code>[A-Za-z]{1,3})\s+(?P<name>[A-Za-z][A-Za-z '\-]{1,40})\s*$")

def parse_name_and_code(raw: str):
    t = (raw or "").strip()
    m = NAME_WITH_CODE.match(t)
    if m:
        return m.group("name").strip(), m.group("code").strip()
    return t, ""

def best_img_url(img_tag) -> str:
    if not img_tag:
        return ""
    return (img_tag.get("src")
            or img_tag.get("data-src")
            or img_tag.get("data-lazy-src")
            or img_tag.get("data-original")
            or "")

def fetch(url: str):
    return requests.get(url, headers=HEADERS, timeout=TIMEOUT, allow_redirects=True)

# ---------- scraping ----------
def scrape():
    print(f"GET {URL}")
    r = fetch(URL)
    if r.status_code != 200:
        sys.exit(f"HTTP {r.status_code}")

    soup = BeautifulSoup(r.text, "html.parser")
    roster_root = soup.select_one("#nav-rostertoday .timetable") or soup
    rows = roster_root.select(".timetable__row")
    print(f"Found {len(rows)} timetable rows")

    out, seen_links = [], set()

    for row in rows:
        name_el = row.select_one(".timetable__name a")
        time_el = row.select_one(".timetable__time a")
        if not name_el:
            continue

        name_raw = name_el.get_text(" ", strip=True)
        name, code = parse_name_and_code(name_raw)
        shift = time_el.get_text(" ", strip=True) if time_el else ""
        href = name_el.get("href") or ""
        profile_link = urljoin(BASE, href) if href else ""

        if profile_link and profile_link in seen_links:
            continue
        seen_links.add(profile_link)

        entry = {
            "shop": "42 Gladesville",
            "name": name,
            "origin_code": code,
            "shift": shift,
            "profile_link": profile_link,
            "photo": ""
        }

        # optional profile visit to fetch photo
        if profile_link:
            try:
                pr = fetch(profile_link)
                if pr.status_code == 200:
                    psoup = BeautifulSoup(pr.text, "html.parser")
                    img = psoup.select_one(".ladie-page__photos img")
                    if img:
                        entry["photo"] = urljoin(BASE, best_img_url(img))
            except Exception as e:
                print(f"! Profile fetch failed {profile_link}: {e}")
            time.sleep(PAUSE)

        out.append(entry)

    # debug json dump
    with open("42gladesville.json", "w", encoding="utf-8") as f:
        json.dump(out, f, indent=2, ensure_ascii=False)

    return out

# ---------- main ----------
def main():
    out = scrape()
    conn = get_conn()
    try:
        with conn:
            with conn.cursor() as cur:
                ensure_schema(cur)
                shop_id = get_or_create_shop(cur, "42 Gladesville", BASE)
                inserted = 0
                for entry in out:
                    gid = upsert_girl(cur, entry, shop_id)
                    if not gid:
                        continue
                    upsert_roster_entry(cur, entry, shop_id, gid)
                    inserted += 1
                print(f"Saved {inserted} entries into DB ✅")
    finally:
        conn.close()

if __name__ == "__main__":
    main()
