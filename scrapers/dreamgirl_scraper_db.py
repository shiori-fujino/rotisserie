#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
Dream Girl Massage — DB-enabled scraper (scoped to roster container)
"""

import re, json, time, sys, requests
from bs4 import BeautifulSoup
from urllib.parse import urljoin
from requests.adapters import HTTPAdapter, Retry
from db_utils import get_conn, ensure_schema, get_or_create_shop, upsert_girl, upsert_roster_entry

BASE_URL   = "https://dreamgirlmassage.com.au"
ROSTER_URL = BASE_URL + "/"
REQUEST_TIMEOUT = (10, 60)
PAUSE_BETWEEN_PROFILE_REQUESTS = 0.6

HEADERS = {
    "User-Agent": ("Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) "
                   "AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0 Safari/537.36"),
    "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
    "Accept-Language": "en-AU,en;q=0.9",
}

RETRY = Retry(
    total=4, connect=3, read=3,
    backoff_factor=1.3,
    status_forcelist=(429, 500, 502, 503, 504),
    allowed_methods=("GET", "HEAD", "OPTIONS"),
    raise_on_status=False,
)

SESSION = requests.Session()
SESSION.headers.update(HEADERS)
SESSION.mount("https://", HTTPAdapter(max_retries=RETRY))
SESSION.mount("http://",  HTTPAdapter(max_retries=RETRY))


# ---------- helpers ----------
ALIASES = {
    "jp":"Japanese","kr":"Korean","cn":"Chinese","tw":"Taiwanese","th":"Thai","vn":"Vietnamese",
    "sg":"Singaporean","hk":"Hong Kong","id":"Indonesian","my":"Malaysian","br":"Brazilian","au":"Australian",
}
def norm_origin(s: str) -> str:
    t = (s or "").strip().lower()
    if not t: return ""
    if t in ALIASES: return ALIASES[t]
    for k, v in ALIASES.items():
        if k in t: return v
    return s.strip()

def best_img_url(img_tag):
    if not img_tag: return ""
    srcset = img_tag.get("srcset")
    if srcset:
        parts = [p.strip() for p in srcset.split(",") if p.strip()]
        def w(p):
            m = re.search(r"\s(\d+)w", p)
            return int(m.group(1)) if m else -1
        parts.sort(key=w)
        return parts[-1].split()[0]
    return (
        img_tag.get("src")
        or img_tag.get("data-src")
        or img_tag.get("data-lazy-src")
        or img_tag.get("data-original")
        or ""
    )

def parse_title(text: str):
    """Extracts name, origin, and shift info from title string."""
    t = text.strip()
    m = re.match(r"^(.+?)\(([^)]+)\)\s*(.*)$", t)
    if m:
        name, origin_raw, rest = m.groups()
        return name.strip(), norm_origin(origin_raw), rest.strip()
    return t.strip(), "", ""

def fetch(url: str):
    return SESSION.get(url, timeout=REQUEST_TIMEOUT, allow_redirects=True)


# ---------- scrape ----------
def scrape():
    print(f"Fetching roster page: {ROSTER_URL}")
    r = fetch(ROSTER_URL)
    if r.status_code != 200:
        sys.exit(f"! HTTP {r.status_code}")

    soup = BeautifulSoup(r.text, "html.parser")
    roster_root = soup.select_one("div.pt-cv-page[data-id='pt-cv-page-1']")
    if not roster_root:
        sys.exit("Couldn't find roster container (.pt-cv-page[data-id='pt-cv-page-1'])")

    items = roster_root.select("div.pt-cv-content-item.pt-cv-1-col")
    print(f"Found {len(items)} roster entries")

    roster, seen = [], set()
    for div in items:
        title_el = div.select_one("h4.pt-cv-title a")
        img_el   = div.select_one("div.pt-cv-thumb-wrapper img.pt-cv-thumbnail")
        desc_el  = div.select_one("div.pt-cv-content")
        if not title_el:
            continue

        title = title_el.get_text(" ", strip=True)
        link  = title_el.get("href") or ""
        if not link or link in seen:
            continue
        seen.add(link)

        name, origin, shift = parse_title(title)
        desc = desc_el.get_text(" ", strip=True) if desc_el else ""
        photo = best_img_url(img_el)

        # fallback: fetch profile page if missing photo
        if not photo:
            try:
                pr = fetch(link)
                if pr.status_code == 200:
                    psoup = BeautifulSoup(pr.text, "html.parser")
                    prof_img = psoup.select_one("img[class*='wp-image-'], .wp-block-image img, .elementor-image img, img")
                    if prof_img:
                        photo = best_img_url(prof_img)
            except requests.RequestException as e:
                print(f"! Failed to fetch profile photo {link}: {e}")

        entry = {
            "name": name,
            "origin_code": origin,
            "shift": shift or desc,
            "profile_link": link,
            "photo": photo or "",
        }
        roster.append(entry)
        time.sleep(PAUSE_BETWEEN_PROFILE_REQUESTS)

    with open("dreamgirl.json", "w", encoding="utf-8") as f:
        json.dump(roster, f, indent=2, ensure_ascii=False)
    print(f"Scraped {len(roster)} profiles → dreamgirl.json")
    return roster


# ---------- main ----------
def main():
    out = scrape()
    conn = get_conn()
    try:
        with conn:
            with conn.cursor() as cur:
                ensure_schema(cur)
                shop_id = get_or_create_shop(cur, "Dream Girl Massage", BASE_URL)
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
                print(f"Saved {inserted} entries into DB ✅")
    finally:
        conn.close()

if __name__ == "__main__":
    main()
