# scrapers/origin_normalizer.py
# Map messy shop inputs → clean short codes used in DB (j,k,c,tw,...)

import re

# Flat map of MANY possible inputs → ONE canonical code
_ORIGIN_MAP = {
    # Japanese
    "j": "j", "jp": "j", "jpn": "j", "japan": "j", "japanese": "j",

    # Chinese
    "c": "c", "cn": "c", "china": "c", "chinese": "c",

    # Korean
    "k": "k", "kr": "k", "korea": "k", "korean": "k",

    # Thai
    "t": "t", "th": "t", "thai": "t", "thailand": "t",

    # Vietnamese
    "v": "v", "vn": "v", "vietnam": "v", "vietnamese": "v",

    # Filipina / Filipino
    "f": "f", "ph": "f", "philippines": "f", "filipina": "f", "filipino": "f",

    # Indonesian
    "i": "i", "indo": "i", "indonesia": "i", "indonesian": "i",

    # Malaysian
    "m": "m", "my": "m", "malaysia": "m", "malaysian": "m",

    # Singaporean
    "sg": "sg", "sgp": "sg", "singapore": "sg", "singaporean": "sg",

    # Taiwanese
    "tw": "tw", "taiwan": "tw", "taiwanese": "tw",

    # Hong Kong
    "hk": "hk", "hong kong": "hk", "hongkong": "hk", "hkg": "hk",

    # Indian
    "in": "in", "india": "in", "indian": "in",

    # Nepalese
    "np": "np", "nepal": "np", "nepalese": "np", "nepali": "np",

    # Mongolian
    "mn": "mn", "mongolia": "mn", "mongolian": "mn",

    # Eurasian / Mixed
    "eur": "eur", "eurasian": "eur", "mix": "eur", "mixed": "eur",

    # Australian
    "au": "au", "aus": "au", "australia": "au", "australian": "au",

    # Optional extras (uncomment + add to frontend if you want them visible)
    # "br": "br", "brz": "br", "brazil": "br", "brazilian": "br",
    # "tk": "tk", "turk": "tk", "turkish": "tk",
}

# Only these are considered “clean” to store
_CANON = set({
    "j","c","k","t","v","f","i","m","sg","tw","hk","in","np","mn","eur","au"
    # if you enable Brazil/Turkish above, add "br","tk" here too
})

def normalize_origin(raw: str) -> str:
    """
    Return a clean short code for DB (e.g., 'j', 'k', 'c').
    If we can’t map it confidently, return "" (so it becomes 'Other' in UI).
    """
    if not raw:
        return ""
    s = raw.strip().lower()
    # strip junk like punctuation/emojis
    s = re.sub(r"[^a-z\s]", "", s)
    s = s.replace("hongkong", "hong kong")

    # direct map first
    if s in _ORIGIN_MAP:
        return _ORIGIN_MAP[s]

    # if someone passed already a short code we allow, keep it
    return s if s in _CANON else ""
