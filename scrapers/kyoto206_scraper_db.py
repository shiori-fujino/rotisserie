# kyoto206_scraper_db.py
import requests, re, time, json, sys
from bs4 import BeautifulSoup
from urllib.parse import urljoin
from typing import Tuple

from db_utils import (
    get_conn, ensure_schema,
    get_or_create_shop, upsert_girl, upsert_roster_entry
)

BASE_URL   = "https://citybrothel.com.au"          # Kyoto 206 lives on this domain
ROSTER_URL = f"{BASE_URL}/girls-roster/"

HEADERS = {
    "User-Agent": (
        "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) "
        "AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0 Safari/537.36"
    )
}
REQUEST_TIMEOUT = 20
PAUSE_BETWEEN_PROFILE_REQUESTS = 0.5

# --- origin normalization ---
_ORIGIN_ALIASES = {
    "jp": ("Jp", "Japanese"), "jpn": ("Jp", "Japanese"),
    "kr": ("Kr", "Korean"),
    "cn": ("Cn", "Chinese"), "c": ("Cn", "Chinese"),
    "tw": ("Tw", "Taiwanese"),
    "th": ("Th", "Thai"),
    "vn": ("Vn", "Vietnamese"),
    "sg": ("Sg", "Singaporean"),
    "hk": ("Hk", "Hong Kong"),
    "id": ("Id", "Indonesian"),
    "my": ("My", "Malaysian"),
    "br": ("Br", "Brazilian"), "brz": ("Br", "Brazilian"),
    "au": ("Au", "Australian"),
    # words
    "japan": ("Jp", "Japanese"), "japanese": ("Jp", "Japanese"),
    "korea": ("Kr", "Korean"),   "korean": ("Kr", "Korean"),
    "china": ("Cn", "Chinese"),  "chinese": ("Cn", "Chinese"),
    "taiwan": ("Tw","Taiwanese"), "taiwanese": ("Tw","Taiwanese"),
    "thailand": ("Th","Thai"),   "thai": ("Th","Thai"),
    "vietnam": ("Vn","Vietnamese"), "vietnamese": ("Vn","Vietnamese"),
    "singapore": ("Sg","Singaporean"), "singaporean": ("Sg","Singaporean"),
    "indonesia": ("Id","Indonesian"), "indonesian": ("Id","Indonesian"),
    "malaysia": ("My","Malaysian"), "malaysian": ("My","Malaysian"),
    "brazil": ("Br","Brazilian"), "brazilian": ("Br","Brazilian"),
    "australia": ("Au","Australian"), "australian": ("Au","Australian"),
}

def normalize_origin(origin_raw: str) -> Tuple[str, str]:
    t = (origin_raw or "").strip()
    if not t:
        return "", ""
    low = t.lower()
    if low in _ORIGIN_ALIASES:
        return _ORIGIN_ALIASES[low]
    for token, pair in _ORIGIN_ALIASES.items():
        if token in low:
            return pair[0], t
    return "", t

NEW_RE = re.compile(r"\bnew!?\b", re.I)
def clean_shift(s: str) -> str:
    s = NEW_RE.sub("", s or "").strip()
    return re.sub(r"\s{2,}", " ", s)

def parse_li_text(text: str):
    text = (text or "").strip()
    # pattern: Name (Origin) 10am-10pm
    m = re.match(r"^(.*?)\s*\((.*?)\)\s*(.*)$", text)
    if m:
        name, origin_raw, rest = m.groups()
        origin_code, origin_full = normalize_origin(origin_raw)
        return name.strip(), origin_code, origin_full, clean_shift(rest)
    return text, "", "", ""

def fetch(url: str):
    return requests.get(url, headers=HEADERS, timeout=REQUEST_TIMEOUT, allow_redirects=True)

def find_today_pane(soup: BeautifulSoup):
    pane = soup.select_one(".tab-content .tab-pane.in.active, .tab-content .tab-pane.show.active, .tab-content .tab-pane.active")
    if pane: return pane
    a = soup.select_one(".wpsm_nav-tabs li.active a, ul[role='tablist'] li.active a")
    if a and a.has_attr("href"):
        pane = soup.select_one(a["href"])
        if pane: return pane
    return soup.select_one(".tab-content .tab-pane") or soup

def best_img_url(img_tag):
    if not img_tag:
        return ""
    srcset = img_tag.get("srcset")
    if srcset:
        parts = [p.strip() for p in srcset.split(",") if p.strip()]
        def w(p):
            m = re.search(r"\s(\d+)w", p);  return int(m.group(1)) if m else -1
        parts.sort(key=w)
        return parts[-1].split()[0]
    url = (img_tag.get("src") or img_tag.get("data-src") or
           img_tag.get("data-lazy-src") or img_tag.get("data-original") or "")
    return re.sub(r"-\d+x\d+(?=\.\w+$)", "", url or "")

def scrape():
    print(f"Fetching roster page: {ROSTER_URL}")
    r = fetch(ROSTER_URL)
    if r.status_code != 200:
        with open("kyoto206_raw.html", "wb") as f:
            f.write(r.content)
        sys.exit(f"Roster page returned HTTP {r.status_code} — saved kyoto206_raw.html")

    soup = BeautifulSoup(r.text, "html.parser")
    pane = find_today_pane(soup)
    if not pane:
        sys.exit("Couldn't find today's roster pane")

    seen_links = set()
    roster = []

    links = pane.select("ul li a")
    if not links:
        print("Warning: No links found inside the active tab-pane.")

    for a in links:
        href = a.get("href", "").strip()
        if not href:
            continue
        link = urljoin(BASE_URL + "/", href)
        if link in seen_links:
            continue
        seen_links.add(link)

        text = a.get_text(strip=True)
        name, origin_code, origin_full, shift = parse_li_text(text)
        roster.append({
            "name": name,
            "origin_code": origin_code,
            "origin_full": origin_full,   # debug only
            "shift": shift,
            "profile_link": link,
            "photo": ""
        })

    print(f"Total TODAY entries: {len(roster)}")

    # Grab one cover photo per profile
    for i, girl in enumerate(roster, start=1):
        link = girl["profile_link"]
        print(f"[{i}/{len(roster)}] Fetching profile: {girl['name']} → {link}")
        try:
            pr = fetch(link)
            if pr.status_code != 200:
                print(f"  ! HTTP {pr.status_code} for {link} — skipping photo")
                time.sleep(PAUSE_BETWEEN_PROFILE_REQUESTS);  continue

            psoup = BeautifulSoup(pr.text, "html.parser")
            a_img = psoup.select_one("a.lightbox-active.lightbox-image, a[data-src], a[data-exthumbimage]")
            if a_img:
                full_img = a_img.get("href") or a_img.get("data-src")
                if full_img:
                    girl["photo"] = re.sub(r"-\d+x\d+(?=\.\w+$)", "", full_img)
                else:
                    inner = a_img.select_one("img")
                    if inner:
                        girl["photo"] = best_img_url(inner)

            if not girl.get("photo"):
                fallback_img = psoup.select_one("img[class*='wp-image-'], .wp-block-image img, .elementor-image img, img")
                if fallback_img:
                    girl["photo"] = best_img_url(fallback_img)

        except requests.RequestException as e:
            print(f"  ! Request error for {link}: {e}")

        time.sleep(PAUSE_BETWEEN_PROFILE_REQUESTS)

    with open("kyoto206.json", "w", encoding="utf-8") as f:
        json.dump(roster, f, indent=2, ensure_ascii=False)
    print(f"\nScraped {len(roster)} TODAY profiles → saved to kyoto206.json")
    return roster

def main():
    out = scrape()

    conn = get_conn()
    try:
        with conn:
            with conn.cursor() as cur:
                ensure_schema(cur)
                shop_id = get_or_create_shop(cur,
                    name="Kyoto 206",
                    url=BASE_URL
                )
                inserted = 0
                for entry in out:
                    gid = upsert_girl(cur, entry, shop_id)
                    if not gid:
                        continue
                    upsert_roster_entry(cur, entry, shop_id, gid)
                    inserted += 1
                print(f"\nSaved {inserted} entries into DB ✅")
    finally:
        conn.close()

if __name__ == "__main__":
    main()
