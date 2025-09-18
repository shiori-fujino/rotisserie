# alex64_scraper_db.py
import re, sys, time, json, requests
from bs4 import BeautifulSoup
from datetime import datetime
from urllib.parse import urljoin, urlparse, unquote
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

BASE_URL = "https://64alexander.com.au"
ROSTER_URL = f"{BASE_URL}/roster/"

HEADERS = {
    "User-Agent": ("Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) "
                   "AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0 Safari/537.36"),
    "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
    "Accept-Language": "en-AU,en;q=0.9",
    "Connection": "keep-alive",
}
REQUEST_TIMEOUT = (10, 45)
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

def fetch(u: str):
    return SESSION.get(u, timeout=REQUEST_TIMEOUT, allow_redirects=True)

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

def find_profile_link(article: BeautifulSoup) -> str:
    a = article.select_one("h2 a, a")
    if not a:
        return ""
    return urljoin(BASE_URL + "/", (a.get("href") or "").strip())

def name_from_url(url: str) -> str:
    path = urlparse(url).path.strip("/")
    if not path:
        return ""
    slug = unquote(path.split("/")[-1])
    for suf in [
        "-silver-gold-diamond-service","-standard-gold-diamond-service",
        "-gold-diamond-service","-diamond-service","-gold-service",
        "-silver-service","-standard-service","-service",
    ]:
        if slug.endswith(suf):
            slug = slug[: -len(suf)]
            break
    return re.sub(r"[-_]+", " ", slug).strip().title()

def get_today_pane(soup: BeautifulSoup):
    now = datetime.now(ZoneInfo("Australia/Sydney")) if ZoneInfo else datetime.now()
    pane_id = f"#{DAY_IDS[now.weekday()]}_sort_button"
    return soup.select_one(pane_id)

def scrape_profile_photo(html: str) -> str:
    psoup = BeautifulSoup(html, "html.parser")
    cont = psoup.select_one(".av-masonry-image-container")
    if cont:
        a = cont.select_one("a[href]")
        if a and a.get("href"):
            return re.sub(r"-\d+x\d+(?=\.\w+$)", "", a.get("href"))
        img = cont.select_one("img")
        if img:
            u = best_img_url(img)
            if u: return u
    for sel in [".entry-content img",".post-entry img","img[class*='wp-image-']",
                ".wp-block-image img",".elementor-image img","img"]:
        img = psoup.select_one(sel)
        if img:
            u = best_img_url(img)
            if u: return u
    return ""

def scrape() -> list[dict]:
    print(f"GET {ROSTER_URL}")
    r = fetch(ROSTER_URL)
    if r.status_code != 200:
        with open("alex64_raw.html","wb") as f: f.write(r.content or b"")
        sys.exit(f"Roster page HTTP {r.status_code} — saved alex64_raw.html")

    soup = BeautifulSoup(r.text, "html.parser")
    pane = get_today_pane(soup)
    if not pane:
        sys.exit("Couldn't find today's roster pane (mon/tue/.../_sort_button).")

    roster = []
    for art in pane.select("article.slide-entry.post-entry"):
        link = find_profile_link(art)
        if not link:
            continue
        roster.append({
            "name": name_from_url(link),  # use slug for stability
            "origin_code": None,          # site doesn’t list origin in roster
            "shift": "",                  # no shift on roster page
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
    with open("alex64_today.json","w",encoding="utf-8") as f:
        json.dump(roster, f, indent=2, ensure_ascii=False)
    return roster

def main():
    entries = scrape()
    conn = get_conn()
    try:
        with conn:
            with conn.cursor() as cur:
                ensure_schema(cur)
                shop_id = get_or_create_shop(cur,
                    name="64 Alexander",
                    url=BASE_URL,
                    location="Crows Nest"  # adjust if needed
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
