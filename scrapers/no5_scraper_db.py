# no5_scraper_db.py
import re, json, time, sys
import requests
from urllib.parse import urljoin
from bs4 import BeautifulSoup
import psycopg2
from db_utils import get_conn, ensure_schema, get_or_create_shop, upsert_girl, upsert_roster_entry, upsert_photos


BASE = "https://no5marrickville.com"   # ✅ no trailing slash
URL  = f"{BASE}/"                      # their roster lives on homepage

HEADERS = {
    "User-Agent": "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) "
                  "AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0 Safari/537.36"
}
TIMEOUT = 25
PAUSE = 0.35  # politeness delay

# ---- helpers ---------------------------------------------------------
KNOWN_CODES = {"J","K","C","T","V","Tw","Brz","Au","Indo","TK"}
NAME_WITH_CODE = re.compile(r"^\s*(?P<code>[A-Za-z]{1,5})\s+(?P<name>[A-Za-z][A-Za-z '\-]{1,60})\s*$")


def parse_name_and_code(raw: str):
    t = (raw or "").strip()
    m = NAME_WITH_CODE.match(t)
    if m and m.group("code").strip() in KNOWN_CODES:
        return m.group("name").strip(), m.group("code").strip()
    # e.g. "First Day - Momoe"
    t = re.sub(r"^\s*First\s*Day[-–—:\s]*", "", t, flags=re.I).strip()
    return t, ""

def largest_from_srcset(srcset: str) -> str:
    if not srcset: return ""
    parts = [p.strip() for p in srcset.split(",") if p.strip()]
    if not parts: return ""
    def width(entry):
        m = re.search(r"\s(\d+)w", entry)
        return int(m.group(1)) if m else -1
    best = sorted(parts, key=width)[-1]
    return best.split()[0]

def strip_wp_thumb_suffix(url: str) -> str:
    return re.sub(r"-\d+x\d+(?=\.\w+$)", "", url or "")

def best_img_url(img_tag) -> str:
    if not img_tag: return ""
    srcset = img_tag.get("srcset")
    if srcset:
        u = largest_from_srcset(srcset)
        if u: return u
    u = (img_tag.get("src")
         or img_tag.get("data-src")
         or img_tag.get("data-lazy-src")
         or img_tag.get("data-original")
         or "")
    return strip_wp_thumb_suffix(u)

def fetch(url: str):
    return requests.get(url, headers=HEADERS, timeout=TIMEOUT, allow_redirects=True)

# ---- DB helpers ------------------------------------------------------
def canonicalize_url(u: str) -> str:
    return (u or "").rstrip("/")

def get_conn():
    # change user if needed
    return psycopg2.connect(dbname="rotisserie", user="juno", host="localhost", port=5432)

def get_or_create_shop(cur, name, url, location=""):
    cu = canonicalize_url(url)
    cur.execute(
        """
        INSERT INTO shops (name, url, canonical_url, location)
        VALUES (%s, %s, %s, %s)
        ON CONFLICT (canonical_url) DO UPDATE
          SET name = EXCLUDED.name,
              url  = EXCLUDED.url,
              location = COALESCE(EXCLUDED.location, shops.location),
              updated_at = NOW()
        RETURNING id;
        """,
        (name, url, cu, location or None)
    )
    return cur.fetchone()[0]

def upsert_girl(cur, entry, shop_id):
    profile_url = entry.get("profile_link") or None
    if not profile_url:
        return None
    cur.execute(
        """
        INSERT INTO girls (name, origin, photo_url, shop_id, profile_url)
        VALUES (%s, %s, %s, %s, %s)
        ON CONFLICT (profile_url) DO UPDATE
          SET name = EXCLUDED.name,
              origin = EXCLUDED.origin,
              photo_url = EXCLUDED.photo_url,
              shop_id = EXCLUDED.shop_id,
              updated_at = NOW()
        RETURNING id;
        """,
        (
            entry.get("name"),
            entry.get("origin_code") or None,    # store code for now; map later
            entry.get("photo") or None,
            shop_id,
            profile_url
        )
    )
    return cur.fetchone()[0]

def upsert_roster_entry(cur, entry, shop_id, girl_id):
    cur.execute(
        """
        INSERT INTO roster_entries (date, girl_id, shop_id, shift_text, source_url)
        VALUES (CURRENT_DATE, %s, %s, %s, %s)
        ON CONFLICT (date, girl_id, shop_id) DO UPDATE
          SET shift_text = EXCLUDED.shift_text,
              scraped_at = NOW(),
              source_url = COALESCE(EXCLUDED.source_url, roster_entries.source_url);
        """,
        (girl_id, shop_id, entry.get("shift") or None, entry.get("profile_link") or None)
    )

def upsert_photos(cur, girl_id, photos):
    if not photos: return
    for i, url in enumerate(photos):
        cur.execute(
            """
            INSERT INTO girl_photos (girl_id, url, position)
            VALUES (%s, %s, %s)
            ON CONFLICT (girl_id, url) DO NOTHING;
            """,
            (girl_id, url, i)
        )

# ---- scrape + ingest -------------------------------------------------
def scrape():
    print(f"GET {URL}")
    r = fetch(URL)
    if r.status_code != 200:
        with open("no5_raw.html", "wb") as f:
            f.write(r.content)
        sys.exit(f"HTTP {r.status_code} – saved no5_raw.html")

    html = r.text
    with open("no5_raw.html", "w", encoding="utf-8") as f:
        f.write(html)

    soup = BeautifulSoup(html, "html.parser")
    today_root = soup.select_one("#nav-rostertoday .timetable")
    if not today_root:
    # Fallback: scan the whole page (some builds don’t have the tab id)
        today_root = soup
    print("! Fallback: scanning whole page for .timetable__row")

    rows = today_root.select(".timetable__row")
    print(f"Found {len(rows)} TODAY rows")

    out, seen = [], set()
    for idx, row in enumerate(rows, 1):
        name_el = row.select_one(".timetable__name a")
        time_el = row.select_one(".timetable__time a")
        if not name_el:
            continue

        name_raw = name_el.get_text(" ", strip=True)
        name, code = parse_name_and_code(name_raw)
        shift = time_el.get_text(" ", strip=True) if time_el else ""
        href = name_el.get("href") or ""
        profile_link = urljoin(BASE, href) if href else ""

        key = (profile_link, name.lower())
        if key in seen:
            continue
        seen.add(key)

        entry = {
            "shop": "No5 Marrickville",
            "name": name,
            "origin_code": code,
            "shift": shift,
            "profile_link": profile_link,
            "photo": ""
        }

        # Visit profile to grab a big image (and gallery)
        if profile_link:
            try:
                pr = fetch(profile_link)
                if pr.status_code == 200:
                    psoup = BeautifulSoup(pr.text, "html.parser")

                    imgs = psoup.select(".ladie-page__photos img, .ladie-page__photo img")
                    photos = []
                    for im in imgs:
                        u = best_img_url(im)
                        if u:
                            photos.append(urljoin(BASE, u))
                    if photos:
                        entry["photo"] = photos[0]
                        entry["photos"] = photos

                    if not entry.get("photo"):
                        img = (psoup.select_one(".wp-block-image img") or
                               psoup.select_one(".elementor-image img") or
                               psoup.select_one("img[class*='wp-image-']") or
                               psoup.select_one("article img, main img, img"))
                        if img:
                            u = best_img_url(img)
                            if u:
                                entry["photo"] = urljoin(BASE, u)
                else:
                    print(f"  ! HTTP {pr.status_code} for {profile_link}")
            except requests.RequestException as e:
                print(f"  ! Request error for {profile_link}: {e}")
            time.sleep(PAUSE)

        print(f"[{idx}] {entry['name']} {entry['origin_code']} → {entry['shift']}")
        out.append(entry)

    # keep JSON for debugging
    with open("no5.json", "w", encoding="utf-8") as f:
        json.dump(out, f, indent=2, ensure_ascii=False)

    return out

def main():
    out = scrape()  # your existing scrape() returning list[entry]
    conn = get_conn()
    try:
        with conn:
            with conn.cursor() as cur:
                ensure_schema(cur)
                shop_id = get_or_create_shop(cur, "42 Gladesville", "https://thenightshade.com.au", "Gladesville")
                inserted = 0
                for entry in out:
                    gid = upsert_girl(cur, entry, shop_id)
                    if not gid:
                        continue
                    upsert_roster_entry(cur, entry, shop_id, gid)
                    upsert_photos(cur, gid, entry.get("photos"))
                    inserted += 1
                print(f"\nSaved {inserted} entries into DB ✅")
    finally:
        conn.close()
if __name__ == "__main__":
    main()
