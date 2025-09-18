# empress69_scraper_db.py
#!/usr/bin/env python3
# -*- coding: utf-8 -*-

import re, sys, time, json, requests
from bs4 import BeautifulSoup
from urllib.parse import urlparse, urljoin, unquote
from datetime import datetime
try:
    from zoneinfo import ZoneInfo
except Exception:
    ZoneInfo = None

from requests.adapters import HTTPAdapter, Retry

from db_utils import (
    get_conn, ensure_schema,
    get_or_create_shop, upsert_girl,
    upsert_roster_entry
)

BASE_URL   = "https://sydneyempress69.com"   # keep consistent to avoid dup shops
ROSTER_URL = f"{BASE_URL}/"

HEADERS = {
    "User-Agent": ("Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) "
                   "AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0 Safari/537.36"),
    "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
    "Accept-Language": "en-AU,en;q=0.9",
    "Connection": "keep-alive",
}
REQUEST_TIMEOUT = (10, 60)  # (connect, read)
PAUSE = 0.6
DAY_IDS = ["mon","tue","wed","thu","fri","sat","sun"]

RETRY = Retry(
    total=4, connect=3, read=3,
    backoff_factor=1.5,
    status_forcelist=(429,500,502,503,504),
    allowed_methods=("GET","HEAD","OPTIONS"),
    raise_on_status=False,
)
SESSION = requests.Session()
SESSION.headers.update(HEADERS)
SESSION.mount("https://", HTTPAdapter(max_retries=RETRY))
SESSION.mount("http://",  HTTPAdapter(max_retries=RETRY))

def fetch(url: str):
    return SESSION.get(url, timeout=REQUEST_TIMEOUT, allow_redirects=True)

# ---------- helpers ----------
def best_img_url(img_tag):
    if not img_tag:
        return ""
    srcset = img_tag.get("srcset")
    if srcset:
        parts = [p.strip() for p in srcset.split(",") if p.strip()]
        def w(p):
            m = re.search(r"\s(\d+)w", p)
            return int(m.group(1)) if m else -1
        parts.sort(key=w)
        url = parts[-1].split()[0]
    else:
        url = (img_tag.get("src") or img_tag.get("data-src")
               or img_tag.get("data-lazy-src") or img_tag.get("data-original") or "")
    return re.sub(r"-\d+x\d+(?=\.\w+$)", "", (url or "").strip())

def name_from_url(url: str) -> str:
    """Generate a stable display name from the URL slug."""
    path = urlparse(url).path.strip("/")
    if not path:
        return ""
    slug = unquote(path.split("/")[-1].strip())
    for suf in [
        "-silver-gold-diamond-service","-standard-gold-diamond-service",
        "-gold-diamond-service","-diamond-service","-gold-service",
        "-silver-service","-standard-service","-service","-*",
    ]:
        if suf == "-*" and "-" in slug:
            slug = slug.split("-")[0]; break
        if slug.endswith(suf):
            slug = slug[: -len(suf)]; break
    return re.sub(r"[-_]+"," ", slug).strip().title()

def get_today_pane(soup: BeautifulSoup):
    now = datetime.now(ZoneInfo("Australia/Sydney")) if ZoneInfo else datetime.now()
    pane_id = f"#{DAY_IDS[now.weekday()]}_sort_button"
    return soup.select_one(pane_id)

def is_profile_url(link: str) -> bool:
    """Filter obvious non-profile links."""
    p = urlparse(link)
    if p.scheme in ("mailto","tel"):
        return False
    if p.netloc and p.netloc != urlparse(BASE_URL).netloc:
        return False
    path = (p.path or "").lower()
    if any(bad in path for bad in ("/tag/","/category/","/wp-","/feed","/author/","/page/",
                                   "/contact","/location","/address","/map","/about","/book")):
        return False
    # heuristic: treat deep content as profile (not just home/roster)
    return path.strip("/") not in ("", "roster", "schedule")

def find_profile_link_from_tile(tile: BeautifulSoup) -> str:
    a = tile.select_one("h2 a, h3 a, a[href]")
    if not a:
        return ""
    return urljoin(BASE_URL + "/", (a.get("href") or "").strip())

def collect_profile_links(pane: BeautifulSoup):
    """Return list of (name, link). Prefer tiles; fallback to any internal profile-like link."""
    links, seen = [], set()

    tiles = pane.select("article.slide-entry.post-entry, article, .card, .entry, .post, .slide-entry")
    for t in tiles:
        link = find_profile_link_from_tile(t)
        if not link or not is_profile_url(link) or link in seen:
            continue
        seen.add(link)
        links.append((name_from_url(link), link))

    if links:
        return links

    for a in pane.select("a[href]"):
        link = urljoin(BASE_URL + "/", (a.get("href") or "").strip())
        if not link or not is_profile_url(link) or link in seen:
            continue
        seen.add(link)
        links.append((name_from_url(link), link))

    return links

def scrape_profile_photo(html: str) -> str:
    psoup = BeautifulSoup(html, "html.parser")
    for sel in [
        ".av-masonry-image-container a[href]",
        ".av-masonry-image-container img",
        ".entry-content img",
        ".post-entry img",
        ".wp-block-image img",
        ".elementor-image img",
        "img",
    ]:
        el = psoup.select_one(sel)
        if not el:
            continue
        if el.name == "a" and el.get("href"):
            return re.sub(r"-\d+x\d+(?=\.\w+$)", "", el.get("href"))
        if el.name == "img":
            u = best_img_url(el)
            if u:
                return u
    return ""

# ---------- scrape ----------
def scrape() -> list[dict]:
    print(f"GET {ROSTER_URL}")
    r = fetch(ROSTER_URL)
    if r.status_code != 200:
        with open("empress69_raw.html","wb") as f: f.write(r.content or b"")
        sys.exit(f"Roster page HTTP {r.status_code} — saved empress69_raw.html")

    soup = BeautifulSoup(r.text, "html.parser")
    pane = get_today_pane(soup)
    if not pane:
        sys.exit("Couldn't find today's roster pane (#mon_sort_button … #sun_sort_button).")

    roster = []
    for name, link in collect_profile_links(pane):
        roster.append({
            "name": name,          # slime-safe (from slug)
            "origin_code": None,   # site doesn’t expose in roster
            "shift": "",           # not listed → blank
            "profile_link": link,
            "photo": ""
        })

    print(f"Total TODAY entries: {len(roster)}")

    for i, e in enumerate(roster, start=1):
        link = e["profile_link"]
        print(f"[{i}/{len(roster)}] Fetching profile: {e['name']} → {link}")
        try:
            pr = fetch(link)
            if pr.status_code == 200:
                photo = scrape_profile_photo(pr.text)
                if photo:
                    e["photo"] = photo
            else:
                print(f"  ! HTTP {pr.status_code} for {link} — skipping photo")
        except requests.RequestException as ex:
            print(f"  ! request error for {link}: {ex}")
        time.sleep(PAUSE)

    # debug snapshot
    with open("empress69_today.json", "w", encoding="utf-8") as f:
        json.dump(roster, f, indent=2, ensure_ascii=False)
    return roster

# ---------- main ----------
def main():
    entries = scrape()
    conn = get_conn()
    try:
        with conn:
            with conn.cursor() as cur:
                ensure_schema(cur)
                shop_id = get_or_create_shop(
                    cur, name="Empress 69", url=BASE_URL, location="Sydney"
                )
                inserted = 0
                for e in entries:
                    gid = upsert_girl(cur, e, shop_id)
                    if not gid:
                        continue
                    upsert_roster_entry(cur, e, shop_id, gid)
                    inserted += 1
                print(f"\nSaved {inserted} entries into DB ✅")
    finally:
        conn.close()

if __name__ == "__main__":
    main()
