# dreamgirls_scraper_db.py
#!/usr/bin/env python3
# -*- coding: utf-8 -*-

import re, sys, time, json, requests
from typing import Dict, Any, List
from urllib.parse import urljoin
from bs4 import BeautifulSoup, Tag
from requests.adapters import HTTPAdapter, Retry

from db_utils import (
    get_conn, ensure_schema,
    get_or_create_shop, upsert_girl,
    upsert_roster_entry
)

# --- Config -------------------------------------------------------------------
BASE = "https://dreamgirlmassage.com.au"
LIST_URL = BASE  # roster/grid is on homepage

HEADERS = {
    "User-Agent": ("Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) "
                   "AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0 Safari/537.36"),
    "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
    "Accept-Language": "en-AU,en;q=0.9",
    "Connection": "keep-alive",
}
TIMEOUT = (10, 45)   # (connect, read)
PAUSE = 0.4          # politeness delay between profile requests

# --- HTTP session with retries ------------------------------------------------
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

def fetch(url: str) -> requests.Response:
    return SESSION.get(url, timeout=TIMEOUT, allow_redirects=True)

# --- Helpers ------------------------------------------------------------------
NAME_ORIGIN_RE = re.compile(r"^\s*(?P<name>.+?)\s*\((?P<origin>[^)]+)\)\s*$")

ORIGIN_CODE_MAP = {
    "thai": "Th",
    "china": "Cn", "chinese": "Cn",
    "japan": "Jp", "japanese": "Jp",
    "korea": "Kr", "korean": "Kr",
    "vietnam": "Vn", "vietnamese": "Vn",
    "taiwan": "Tw", "taiwanese": "Tw",
    "malaysia": "My", "malaysian": "My",
    "indonesia": "Id", "indonesian": "Id",
    "brazil": "Br", "brazilian": "Br",
    "australia": "Au", "australian": "Au",
}

def split_name_and_origin(raw: str):
    t = (raw or "").strip()
    m = NAME_ORIGIN_RE.match(t)
    if not m:
        return t, ""
    return m.group("name").strip(), m.group("origin").strip()

def origin_to_code(origin_text: str) -> str:
    low = (origin_text or "").lower()
    for token, code in ORIGIN_CODE_MAP.items():
        if token in low:
            return code
    return ""

def largest_from_srcset(srcset: str) -> str:
    if not srcset: return ""
    parts = [p.strip() for p in srcset.split(",") if p.strip()]
    if not parts: return ""
    def width(entry: str) -> int:
        m = re.search(r"\s(\d+)w", entry)
        return int(m.group(1)) if m else -1
    best = sorted(parts, key=width)[-1]
    return best.split()[0]

def strip_wp_thumb_suffix(url: str) -> str:
    return re.sub(r"-\d+x\d+(?=\.\w+$)", "", url or "")

def best_img_url(img: Tag) -> str:
    if not img:
        return ""
    srcset = img.get("srcset")
    if srcset:
        u = largest_from_srcset(srcset)
        if u:
            return strip_wp_thumb_suffix(u)
    u = (
        img.get("src")
        or img.get("data-src")
        or img.get("data-lazy-src")
        or img.get("data-original")
        or ""
    )
    return strip_wp_thumb_suffix(u)

def text_or_attr(el: Tag, *attrs: str) -> str:
    if not el:
        return ""
    t = el.get_text(" ", strip=True)
    if t:
        return t
    for a in attrs:
        v = el.get(a)
        if v:
            return v
    return ""

# --- Scrape list --------------------------------------------------------------
def parse_list() -> List[Dict[str, Any]]:
    r = fetch(LIST_URL)
    if r.status_code != 200:
        with open("dreamgirl_raw.html", "wb") as f:
            f.write(r.content or b"")
        sys.exit(f"List page HTTP {r.status_code} — saved dreamgirl_raw.html")

    soup = BeautifulSoup(r.text, "html.parser")

    items = soup.select(".pt-cv-content-item.pt-cv-1-col")
    out: List[Dict[str, Any]] = []
    seen = set()

    for i, item in enumerate(items, 1):
        a = item.select_one(".pt-cv-thumb-wrapper a")
        img = item.select_one(".pt-cv-thumb-wrapper img")
        link = urljoin(BASE + "/", a["href"]) if a and a.has_attr("href") else ""

        # Try to extract "Name(Origin)" or similar from img/title text
        raw_name = ""
        if img:
            raw_name = text_or_attr(img, "alt", "title", "aria-label")
        if not raw_name:
            title_el = item.select_one(".pt-cv-title, .elementor-heading-title, h3, h4, .entry-title")
            raw_name = text_or_attr(title_el)

        name, origin_full = split_name_and_origin(raw_name)
        origin_code = origin_to_code(origin_full)

        photo = best_img_url(img) if img else ""
        photo = urljoin(BASE + "/", photo) if photo else ""

        # Skip if completely empty
        if not (name or link or photo):
            continue

        # de-dupe by (name, link)
        key = (name.lower(), link)
        if key in seen:
            continue
        seen.add(key)

        out.append({
            "name": name,
            "origin_code": origin_code,   # short code stored in girls.origin
            "origin_full": origin_full,   # sidecar (not saved unless your db_utils uses it)
            "shift": "",                  # site doesn’t list shift → blank
            "profile_link": link,
            "photo": photo,
        })

    return out

# --- Main ---------------------------------------------------------------------
def main() -> None:
    print(f"Fetching list: {LIST_URL}")
    entries = parse_list()
    print(f"Found {len(entries)} cards on list")

    # optional debug snapshot
    with open("dreamgirl.json", "w", encoding="utf-8") as f:
        json.dump(entries, f, indent=2, ensure_ascii=False)
    print(f"Saved {len(entries)} entries → dreamgirl.json")

    # DB upsert
    conn = get_conn()
    try:
        with conn:
            with conn.cursor() as cur:
                ensure_schema(cur)
                shop_id = get_or_create_shop(
                    cur,
                    name="Dream Girl Massage",
                    url=BASE,
                    location="Sydney"  # tweak if you want a suburb
                )
                inserted = 0
                for e in entries:
                    gid = upsert_girl(cur, e, shop_id)
                    if not gid:
                        continue
                    upsert_roster_entry(cur, e, shop_id, gid)  # today's row; shift may be blank
                    inserted += 1
                print(f"\nSaved {inserted} entries into DB ✅")
    finally:
        conn.close()

if __name__ == "__main__":
    main()
