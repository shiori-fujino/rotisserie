# ginza_scraper_debug.py
#!/usr/bin/env python3
# -*- coding: utf-8 -*-

import re, sys, time, json, requests
from bs4 import BeautifulSoup
from urllib.parse import urljoin
from requests.adapters import HTTPAdapter, Retry

BASE = "https://www.ginzaclub.com.au"
URL  = f"{BASE}/Roster"

# --- HTTP session with retries ------------------------------------------------
HEADERS = {
    "User-Agent": ("Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) "
                   "AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0 Safari/537.36"),
    "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
    "Accept-Language": "en-AU,en;q=0.9",
    "Connection": "keep-alive",
}
REQUEST_TIMEOUT = (10, 60)
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
            "name": None,
            "origin_code": None,
            "shift": None,
            "profile_link": profile_link,
            "photo": ""
        }

        # --- Extract name, origin_code, shift from text ---
        p = span.find_parent("p")
        if p:
            raw_text = p.get_text(" ", strip=True)
            m = re.search(r'(?:New\s+)?([A-Za-z]+)\s+([^\d]+?)\s+([0-9:.apm-]+)', raw_text)
            if m:
                entry["origin_code"], entry["name"], entry["shift"] = m.groups()

        # --- Fetch profile for photo ---
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

    # Save debug JSON
    with open("ginza.json", "w", encoding="utf-8") as f:
        json.dump(out, f, indent=2, ensure_ascii=False)
    print(f"\nSaved {len(out)} entries → ginza.json")
    return out

# --- main ---------------------------------------------------------------------
if __name__ == "__main__":
    scrape()
