# db_utils.py
# Reusable helpers for The Rotisserie: Postgres schema + upserts
import psycopg2
from typing import Optional, Iterable

AUS_TZ = "Australia/Sydney"

def get_conn():
    """
    Opens a Postgres connection. Change 'user' if your mac username isn't 'juno'.
    """
    return psycopg2.connect(dbname="rotisserie", user="juno", host="localhost", port=5432)

# ---------- one-time-safe setup (idempotent) ----------

def ensure_schema(cur) -> None:
    """
    Creates the supporting tables/indexes if they don't exist.
    Safe to call at the start of every scraper run.
    """
    cur.execute("""
    -- base tables (already created earlier, but IF NOT EXISTS keeps it safe)
    CREATE TABLE IF NOT EXISTS shops (
      id SERIAL PRIMARY KEY,
      name        VARCHAR(255) NOT NULL,
      url         TEXT NOT NULL,
      location    VARCHAR(255),
      created_at  TIMESTAMP DEFAULT NOW(),
      updated_at  TIMESTAMP DEFAULT NOW(),
      canonical_url TEXT
    );

    CREATE TABLE IF NOT EXISTS girls (
      id SERIAL PRIMARY KEY,
      name        VARCHAR(255) NOT NULL,
      origin      VARCHAR(100),
      photo_url   TEXT,
      shop_id     INT REFERENCES shops(id) ON DELETE SET NULL,
      profile_url TEXT,
      created_at  TIMESTAMP DEFAULT NOW(),
      updated_at  TIMESTAMP DEFAULT NOW()
    );

    CREATE TABLE IF NOT EXISTS reviews (
      id SERIAL PRIMARY KEY,
      girl_id   INT REFERENCES girls(id) ON DELETE CASCADE,
      user_id   INT,
      rating    INT CHECK (rating BETWEEN 1 AND 5),
      comment   TEXT,
      created_at TIMESTAMP DEFAULT NOW()
    );

    CREATE TABLE IF NOT EXISTS views (
      id SERIAL PRIMARY KEY,
      girl_id   INT REFERENCES girls(id) ON DELETE CASCADE,
      viewed_at TIMESTAMP DEFAULT NOW()
    );

    -- daily roster entries (today's lineup per shop)
    CREATE TABLE IF NOT EXISTS roster_entries (
      id SERIAL PRIMARY KEY,
      date       DATE      NOT NULL DEFAULT CURRENT_DATE,
      girl_id    INT       NOT NULL REFERENCES girls(id) ON DELETE CASCADE,
      shop_id    INT       NOT NULL REFERENCES shops(id) ON DELETE CASCADE,
      shift_text VARCHAR(120),
      source_url TEXT,
      scraped_at TIMESTAMP NOT NULL DEFAULT NOW(),
      UNIQUE (date, girl_id, shop_id)
    );

    -- optional: gallery images per girl
    CREATE TABLE IF NOT EXISTS girl_photos (
      id SERIAL PRIMARY KEY,
      girl_id  INT NOT NULL REFERENCES girls(id) ON DELETE CASCADE,
      url      TEXT NOT NULL,
      position INT,
      created_at TIMESTAMP DEFAULT NOW(),
      UNIQUE (girl_id, url)
    );
    """)

    # backfill + indexes/constraints (use indexes so IF NOT EXISTS works)
    cur.execute("""
    UPDATE shops SET canonical_url = regexp_replace(url, '/+$', '') WHERE canonical_url IS NULL;
    CREATE UNIQUE INDEX IF NOT EXISTS shops_canonical_url_key ON shops (canonical_url);
    CREATE UNIQUE INDEX IF NOT EXISTS girls_profile_url_key   ON girls (profile_url);
    CREATE INDEX IF NOT EXISTS idx_girls_shop    ON girls (shop_id);
    CREATE INDEX IF NOT EXISTS idx_views_girlday ON views (girl_id, viewed_at);
    CREATE INDEX IF NOT EXISTS idx_roster_shop_date ON roster_entries (shop_id, date);
    CREATE INDEX IF NOT EXISTS idx_photos_girl ON girl_photos (girl_id);
    """)

# ---------- simple utilities ----------

def canonicalize_url(u: Optional[str]) -> Optional[str]:
    return (u or "").rstrip("/") or None

# ---------- upserts you’ll call from scrapers ----------

def get_or_create_shop(cur, name: str, url: str, location: Optional[str] = None) -> int:
    cu = canonicalize_url(url)
    cur.execute(
        """
        INSERT INTO shops (name, url, canonical_url, location)
        VALUES (%s, %s, %s, %s)
        ON CONFLICT (canonical_url) DO UPDATE
          SET url        = EXCLUDED.url,
              location   = COALESCE(EXCLUDED.location, shops.location),
              updated_at = NOW()
        RETURNING id;
        """,
        (name, url, cu, location)
    )
    return cur.fetchone()[0]

def upsert_girl(cur, entry: dict, shop_id: int) -> Optional[int]:
    """
    entry expects keys like:
      name, origin_code (optional), photo, profile_link
    """
    profile_url = entry.get("profile_link") or None
    if not profile_url:
        return None
    cur.execute(
        """
        INSERT INTO girls (name, origin, photo_url, shop_id, profile_url)
        VALUES (%s, %s, %s, %s, %s)
        ON CONFLICT (profile_url) DO UPDATE
          SET name      = EXCLUDED.name,
              origin    = EXCLUDED.origin,
              photo_url = EXCLUDED.photo_url,
              shop_id   = EXCLUDED.shop_id,
              updated_at= NOW()
        RETURNING id;
        """,
        (
            entry.get("name"),
            entry.get("origin_code") or None,   # store code for now
            entry.get("photo") or None,
            shop_id,
            profile_url
        )
    )
    return cur.fetchone()[0]
def upsert_photos(cur, girl_id, photos):
    if not photos:
        return
    for i, url in enumerate(photos):
        cur.execute(
            """
            INSERT INTO girl_photos (girl_id, url, position)
            VALUES (%s, %s, %s)
            ON CONFLICT (girl_id, url) DO NOTHING;
            """,
            (girl_id, url, i)
        )


def record_view(cur, girl_id: int) -> None:
    cur.execute("INSERT INTO views (girl_id) VALUES (%s);", (girl_id,))
# db_utils.py (add these)

def upsert_shop(conn, name: str, canonical_url: str) -> int:
    """Insert or update a shop. Returns shop.id"""
    with conn.cursor() as cur:
        cur.execute("""
            INSERT INTO shops (name, canonical_url)
            VALUES (%s, %s)
            ON CONFLICT (canonical_url) DO UPDATE
            SET name = EXCLUDED.name
            RETURNING id
        """, (name, canonical_url))
        shop_id = cur.fetchone()[0]
        conn.commit()
        return shop_id


def upsert_girl_photo(conn, girl_id: int, url: str, position: int = 0) -> int:
    """Insert photo if not exists. Returns photo.id"""
    with conn.cursor() as cur:
        cur.execute("""
            INSERT INTO girl_photos (girl_id, url, position)
            VALUES (%s, %s, %s)
            ON CONFLICT (girl_id, url) DO NOTHING
            RETURNING id
        """, (girl_id, url, position))
        row = cur.fetchone()
        conn.commit()
        return row[0] if row else None
def upsert_roster_entry(cur, entry: dict, shop_id: int, girl_id: int, tz: str = AUS_TZ) -> None:
    """
    Writes today's roster row (Sydney default).
    """
    cur.execute(
        f"""
        INSERT INTO roster_entries (date, girl_id, shop_id, shift_text, source_url)
        VALUES ((NOW() AT TIME ZONE %s)::date, %s, %s, %s, %s)
        ON CONFLICT (date, girl_id, shop_id) DO UPDATE
          SET shift_text = EXCLUDED.shift_text,
              scraped_at = NOW(),
              source_url = COALESCE(EXCLUDED.source_url, roster_entries.source_url);
        """,
        (tz, girl_id, shop_id, entry.get("shift") or None, entry.get("profile_link") or None)
    )
