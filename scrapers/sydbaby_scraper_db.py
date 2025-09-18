# sydbaby_scraper_db.py
import requests, time, json, re, sys
from bs4 import BeautifulSoup
from urllib.parse import urlparse, urljoin, unquote
from datetime import datetime
try:
    from zoneinfo import ZoneInfo
except Exception:
    ZoneInfo = None

from db_utils import (
    get_conn, ensure_schema,
    get_or_create_shop, upsert_girl,
    upsert_roster_entry, upsert_photos
)

BASE_URL   = "https://sydbabymassage.com"     # ✅ no trailing slash (db_utils canonicalizes anyway)
ROSTER_URL = f"{BASE_URL}/"
HEADERS = {
    "User-Agent": (
        "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) "
        "AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0 Safari/537.36"
    )
}
REQUEST_TIMEOUT = 20
PAUSE_BETWEEN_PROFILE_REQUESTS = 0.5
DAY_IDS = ["mon", "tue", "wed", "thu", "fri", "sat", "sun"]

def fetch(url: str):
    return requests.get(url, headers=HEADERS, timeout=REQUEST_TIMEOUT, allow_redirects=True)

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
        url = (
            img_tag.get("src")
            or img_tag.get("data-src")
            or img_tag.get("data-lazy-src")
            or img_tag.get("data-original")
            or ""
        )
    return re.sub(r"-\d+x\d+(?=\.\w+$)", "", url or "")

def name_from_url(url: str) -> str:
    path = urlparse(url).path.strip("/")
    if not path:
        return ""
    slug = unquote(path.split("/")[-1].strip())

    # strip common marketing/service suffixes
    suffixes = [
        "-silver-gold-diamond-service",
        "-standard-gold-diamond-service",
        "-gold-diamond-service",
        "-diamond-service",
        "-gold-service",
        "-silver-service",
        "-standard-service",
        "-service",
        "-*",
    ]
    for suf in suffixes:
        if suf == "-*" and "-" in slug:
            slug = slug.split("-")[0]
            break
        if slug.endswith(suf):
            slug = slug[: -len(suf)]
            break

    name = re.sub(r"[-_]+", " ", slug).strip()
    return name.title()

def get_today_pane(soup: BeautifulSoup):
    # Use Australia/Sydney for correct weekday
    now = datetime.now(ZoneInfo("Australia/Sydney")) if ZoneInfo else datetime.now()
    pane_id = f"#{DAY_IDS[now.weekday()]}_sort_button"
    return soup.select_one(pane_id)

def find_profile_link_from_tile(tile: BeautifulSoup) -> str:
    a = tile.select_one("h2 a, h3 a, a[href]")
    if not a:
        return ""
    href = a.get("href", "").strip()
    if not href:
        return ""
    return urljoin(BASE_URL, href)

def collect_profile_links(pane: BeautifulSoup) -> list[tuple[str, str]]:
    """Return list of (name, link). Prefers article tiles; falls back to all internal links."""
    links, seen = [], set()

    tiles = pane.select("article, .card, .entry, .post, .slide-entry")
    for t in tiles:
        link = find_profile_link_from_tile(t)
        if not link:
            continue
        if urlparse(link).netloc and urlparse(link).netloc not in urlparse(BASE_URL).netloc:
            continue
        if link in seen:
            continue
        seen.add(link)
        links.append((name_from_url(link), link))
    if links:
        return links

    for a in pane.select("a[href]"):
        href = a.get("href", "").strip()
        if not href or href.startswith("#"):
            continue
        link = urljoin(BASE_URL, href)
        p = urlparse(link)
        if p.netloc and (p.netloc != urlparse(BASE_URL).netloc):
            continue
        if any(part in p.path for part in ["/tag/", "/category/", "/wp-", "/feed", "/author/", "/page/"]):
            continue
        if p.path.rstrip("/") in ["", "/", "/roster", "/schedule"]:
            continue
        if link in seen:
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
        "img"
    ]:
        el = psoup.select_one(sel)
        if not el:
            continue
        if el.name == "a" and el.get("href"):
            return re.sub(r"-\d+x\d+(?=\.\w+$)", "", el.get("href"))
        if el.name == "img":
            url = best_img_url(el)
            if url:
                return url
    return ""

def scrape() -> list[dict]:
    print(f"Fetching roster page: {ROSTER_URL}")
    r = fetch(ROSTER_URL)
    if r.status_code != 200:
        with open("sydbaby_raw.html", "wb") as f:
            f.write(r.content)
        sys.exit(f"Roster page returned HTTP {r.status_code} — saved sydbaby_raw.html")

    soup = BeautifulSoup(r.text, "html.parser")
    pane = get_today_pane(soup)
    if not pane:
        # Don’t bail—fallback to whole page
        pane = soup
        print("! Couldn’t find today pane; scanning whole page")

    pairs = collect_profile_links(pane)
    roster = []
    for name, link in pairs:
        if not link:
            continue
        # prefer anchored text if available; else slug name
        a = pane.select_one(f'a[href="{link}"]')
        display_name = name or (a.get_text(strip=True) if a else name)
        roster.append({"name": display_name, "profile_link": link})

    print(f"Total TODAY entries: {len(roster)}")

    for i, girl in enumerate(roster, start=1):
        link = girl["profile_link"]
        print(f"[{i}/{len(roster)}] Fetching profile: {girl.get('name','')} → {link}")
        try:
            pr = fetch(link)
            if pr.status_code == 200:
                photo = scrape_profile_photo(pr.text)
                if photo:
                    girl["photo"] = photo
            else:
                print(f"  ! HTTP {pr.status_code} for {link} — skipping photo")
        except requests.RequestException as e:
            print(f"  ! Request error for {link}: {e}")
        time.sleep(PAUSE_BETWEEN_PROFILE_REQUESTS)

    # keep JSON for debug
    out = "sydbaby.json"
    with open(out, "w", encoding="utf-8") as f:
        json.dump(roster, f, indent=2, ensure_ascii=False)
    print(f"\nScraped {len(roster)} TODAY profiles → saved to {out}")
    return roster

def main():
    out = scrape()

    conn = get_conn()
    try:
        with conn:
            with conn.cursor() as cur:
                ensure_schema(cur)
                shop_id = get_or_create_shop(cur,
                    name="SydBaby Massage",
                    url=BASE_URL,
                    location="Sydney"
                )
                inserted = 0
                for entry in out:
                    entry_db = {
                        "name": entry.get("name"),
                        "origin_code": None,             # unknown on this site
                        "shift": "",                     # not present → blank is fine
                        "profile_link": entry.get("profile_link"),
                        "photo": entry.get("photo") or None
                    }
                    gid = upsert_girl(cur, entry_db, shop_id)
                    if not gid:
                        continue
                    upsert_roster_entry(cur, entry_db, shop_id, gid)   # today’s row (shift may be blank)
                    # no gallery array here; skip upsert_photos
                    inserted += 1
                print(f"\nSaved {inserted} entries into DB ✅")
    finally:
        conn.close()

if __name__ == "__main__":
    main()
