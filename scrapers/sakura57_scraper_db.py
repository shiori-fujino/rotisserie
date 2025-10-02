# sakura57_scraper_db.py
#!/usr/bin/env python3
# -*- coding: utf-8 -*-

import re, time, json, sys, requests
from bs4 import BeautifulSoup
from urllib.parse import urljoin
from requests.adapters import HTTPAdapter, Retry

from db_utils import (
    get_conn, ensure_schema,
    get_or_create_shop, upsert_girl,
    upsert_roster_entry
)

BASE_URL   = "https://www.surryhillsbrothel.com.au"   # keep consistent (www)
ROSTER_URL = f"{BASE_URL}/girls-roster/"

HEADERS = {
    "User-Agent": ("Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) "
                   "AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0 Safari/537.36"),
    "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
    "Accept-Language": "en-AU,en;q=0.9",
    "Connection": "keep-alive",
}

REQUEST_TIMEOUT = (10, 60)          # (connect, read) seconds
PAUSE_BETWEEN_PROFILE_REQUESTS = 0.7

RETRY = Retry(
    total=4, connect=3, read=3,
    backoff_factor=1.5,                      # 0s, 1.5s, 3s, 4.5s...
    status_forcelist=(429, 500, 502, 503, 504),
    allowed_methods=("GET", "HEAD", "OPTIONS"),
    raise_on_status=False,
)

SESSION = requests.Session()
SESSION.headers.update(HEADERS)
SESSION.mount("https://", HTTPAdapter(max_retries=RETRY))
SESSION.mount("http://",  HTTPAdapter(max_retries=RETRY))
SESSION.headers["Referer"] = BASE_URL + "/"

NEW_RE = re.compile(r"\bnew!?\b", re.I)

# full demonym mapping (we’ll store the FULL name in girls.origin)
ALIASES = {
    "jp":"Japanese","jpn":"Japanese","japan":"Japanese","japanese":"Japanese",
    "kr":"Korean","korea":"Korean","korean":"Korean",
    "cn":"Chinese","c":"Chinese","china":"Chinese","chinese":"Chinese",
    "tw":"Taiwanese","taiwan":"Taiwanese","taiwanese":"Taiwanese",
    "th":"Thai","thailand":"Thai","thai":"Thai",
    "vn":"Vietnamese","vietnam":"Vietnamese","vietnamese":"Vietnamese",
    "sg":"Singaporean","singapore":"Singaporean","singaporean":"Singaporean",
    "hk":"Hong Kong","hong kong":"Hong Kong",
    "id":"Indonesian","indonesia":"Indonesian","indonesian":"Indonesian",
    "my":"Malaysian","malaysia":"Malaysian","malaysian":"Malaysian",
    "br":"Brazilian","brz":"Brazilian","brazil":"Brazilian","brazilian":"Brazilian",
    "au":"Australian","australia":"Australian","australian":"Australian",
}
def norm_origin(s: str) -> str:
    t = (s or "").strip().lower()
    if not t: return ""
    if t in ALIASES: return ALIASES[t]
    for k, v in ALIASES.items():
        if k in t: return v
    return s.strip()

def clean_shift(s: str) -> str:
    s = NEW_RE.sub("", s or "").strip()
    return re.sub(r"\s{2,}", " ", s)

def parse_li_text(text: str):
    """
    Supports: 'Name (Origin) 10 am - 10 pm'  → (name, origin_full, shift)
              'Name (Origin)'                → (name, origin_full, '')
              'Name'                         → (name, '', '')
    """
    text = (text or "").strip()
    m = re.match(r"^(.*?)\s*\((.*?)\)\s*(.*)$", text)
    if m:
        name, origin_raw, rest = m.groups()
        return name.strip(), norm_origin(origin_raw), clean_shift(rest)
    return text, "", ""

def best_img_url(img):
    if not img: return ""
    srcset = img.get("srcset")
    if srcset:
        parts = [p.strip() for p in srcset.split(",") if p.strip()]
        def w(p):
            m = re.search(r"\s(\d+)w", p);  return int(m.group(1)) if m else -1
        parts.sort(key=w)
        return parts[-1].split()[0]
    url = (img.get("src") or img.get("data-src") or img.get("data-lazy-src") or img.get("data-original") or "")
    return re.sub(r"-\d+x\d+(?=\.\w+$)", "", url or "")

def fetch(u: str):
    try:
        return SESSION.get(u, timeout=REQUEST_TIMEOUT, allow_redirects=True)
    except requests.exceptions.ReadTimeout:
        # try non-www fallback once
        if "://www." in u:
            alt = u.replace("://www.", "://", 1)
            print(f"  ! timeout; retrying without www → {alt}")
            return SESSION.get(alt, timeout=REQUEST_TIMEOUT, allow_redirects=True)
        raise

def find_today_pane(soup: BeautifulSoup):
    pane = soup.select_one(".tab-content .tab-pane.in.active, .tab-content .tab-pane.show.active, .tab-content .tab-pane.active")
    if pane: return pane
    a = soup.select_one(".wpsm_nav-tabs li.active a, ul[role='tablist'] li.active a")
    if a and a.has_attr("href"):
        pane = soup.select_one(a["href"])
        if pane: return pane
    return soup.select_one(".tab-content .tab-pane") or soup

def scrape():
    print(f"Fetching roster page: {ROSTER_URL}")
    try:
        r = fetch(ROSTER_URL)
    except requests.RequestException as e:
        print(f"! Failed to fetch roster page: {e}")
        sys.exit(1)

    if r.status_code != 200:
        with open("sakura57_raw.html", "wb") as f:
            f.write(r.content or b"")
        sys.exit(f"Roster page returned HTTP {r.status_code} — saved sakura57_raw.html")

    soup = BeautifulSoup(r.text, "html.parser")
    pane = find_today_pane(soup)
    if not pane:
        sys.exit("Couldn't find today's roster pane")

    roster, seen = [], set()
    links = pane.select("ul li a")
    if not links:
        print("Warning: no links found inside the active tab-pane.")

    for a in links:
        href = (a.get("href") or "").strip()
        if not href:
            continue
        link = urljoin(BASE_URL + "/", href)
        if link in seen:
            continue
        seen.add(link)

        text = a.get_text(strip=True)
        name, origin_full, shift = parse_li_text(text)

        entry = {
            "name": name,
            "origin_code": origin_full,   # we store FULL demonym in girls.origin
            "shift": shift,
            "profile_link": link,
            "photo": ""
        }

        # fetch one good photo from profile (fault-tolerant)
        try:
            pr = fetch(link)
            if pr.status_code == 200:
                psoup = BeautifulSoup(pr.text, "html.parser")
                a_img = psoup.select_one("a.lightbox-active.lightbox-image, a[data-src], a[data-exthumbimage]")
                if a_img:
                    u = a_img.get("href") or a_img.get("data-src")
                    if u:
                        entry["photo"] = re.sub(r"-\d+x\d+(?=\.\w+$)", "", u)
                    else:
                        inner = a_img.select_one("img")
                        if inner:
                            entry["photo"] = best_img_url(inner)
                if not entry["photo"]:
                    fb = psoup.select_one("img[class*='wp-image-'], .wp-block-image img, .elementor-image img, img")
                    if fb:
                        entry["photo"] = best_img_url(fb)
            else:
                print(f"  ! HTTP {pr.status_code} for {link} — skipping photo")
        except requests.RequestException as e:
            print(f"  ! request error for {link}: {e} — skipping photo")

        roster.append(entry)
        time.sleep(PAUSE_BETWEEN_PROFILE_REQUESTS)

    # debug snapshot
    with open("sakura57.json", "w", encoding="utf-8") as f:
        json.dump(roster, f, indent=2, ensure_ascii=False)
    print(f"\nScraped {len(roster)} TODAY profiles → saved to sakura57.json")
    return roster

def main():
    out = scrape()

    conn = get_conn()
    try:
        with conn:
            with conn.cursor() as cur:
                ensure_schema(cur)
                shop_id = get_or_create_shop(cur,
                    name="Sakura 57",
                    url=BASE_URL,
                )
                inserted = 0
                for entry in out:
                    gid = upsert_girl(cur, entry, shop_id)   # origin_code = full demonym
                    if not gid:
                        continue
                    upsert_roster_entry(cur, entry, shop_id, gid)  # writes today's shift (may be blank)
                    inserted += 1
                print(f"\nSaved {inserted} entries into DB ✅")
    finally:
        conn.close()

if __name__ == "__main__":
    main()
