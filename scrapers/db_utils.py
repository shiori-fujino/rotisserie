# db_utils.py
import os
import psycopg2
from typing import Optional
from dotenv import load_dotenv

AUS_TZ = "Australia/Sydney"
load_dotenv()

# Load .env only if it exists (local dev)
dotenv_path = os.path.join(os.path.dirname(__file__), ".env")
if os.path.exists(dotenv_path):
    load_dotenv(dotenv_path)
    
# db_utils.py
def get_conn():
    # Try private URL first (faster, no sleep)
    dsn = os.getenv("DATABASE_PRIVATE_URL") or os.getenv("DATABASE_URL")
    if not dsn:
        raise RuntimeError("DATABASE_URL not set")
    
    # Add connection timeout + retry logic
    import time
    max_retries = 3
    
    for attempt in range(max_retries):
        try:
            return psycopg2.connect(
                dsn, 
                sslmode="require",
                connect_timeout=30  # 30 second timeout
            )
        except psycopg2.OperationalError as e:
            if attempt < max_retries - 1:
                print(f"Connection failed, retrying in 10s... ({attempt + 1}/{max_retries})")
                time.sleep(10)
            else:
                raise e

# ---------- schema ----------
def ensure_schema(cur) -> None:
    """Creates only the tables/indexes your backend & frontend expect."""
    cur.execute("""
    CREATE TABLE IF NOT EXISTS shops (
      id SERIAL PRIMARY KEY,
      name          TEXT NOT NULL,
      canonical_url TEXT UNIQUE NOT NULL
    );

    CREATE TABLE IF NOT EXISTS girls (
      id SERIAL PRIMARY KEY,
      shop_id     INT REFERENCES shops(id) ON DELETE CASCADE,
      name        TEXT,
      origin      TEXT,
      profile_url TEXT UNIQUE,
      photo_url   TEXT,
      manual_override BOOLEAN DEFAULT FALSE,
      cached_replies_count INT DEFAULT 0,
      cached_avg_rating DECIMAL(3,1) DEFAULT 0
    );

    CREATE TABLE IF NOT EXISTS roster_entries (
      id SERIAL PRIMARY KEY,
      shop_id   INT REFERENCES shops(id) ON DELETE CASCADE,
      girl_id   INT REFERENCES girls(id) ON DELETE CASCADE,
      date      DATE NOT NULL DEFAULT CURRENT_DATE,
      shift_text TEXT,
      UNIQUE (shop_id, girl_id, date)
    );

    CREATE TABLE IF NOT EXISTS girl_views (
      girl_id INT PRIMARY KEY REFERENCES girls(id) ON DELETE CASCADE,
      count   INT NOT NULL DEFAULT 0
    );

    CREATE TABLE IF NOT EXISTS girl_comments (
      id SERIAL PRIMARY KEY,
      girl_id INT REFERENCES girls(id) ON DELETE CASCADE,
      rating  INT CHECK (rating >= 1 AND rating <= 5),
      comment TEXT,
      created_at TIMESTAMP DEFAULT NOW()
    );
    """)

    cur.execute("""
    CREATE UNIQUE INDEX IF NOT EXISTS idx_shops_canonical_url ON shops (canonical_url);
    CREATE UNIQUE INDEX IF NOT EXISTS idx_girls_profile_url   ON girls (profile_url);
    CREATE INDEX IF NOT EXISTS idx_roster_shop_date           ON roster_entries (shop_id, date);
    """)

# ---------- helpers ----------
def canonicalize_url(u: Optional[str]) -> Optional[str]:
    return (u or "").rstrip("/") or None

# ---------- upserts ----------
def get_or_create_shop(cur, name: str, url: str) -> int:
    cu = canonicalize_url(url)
    cur.execute(
        """
        INSERT INTO shops (name, canonical_url)
        VALUES (%s, %s)
        ON CONFLICT (canonical_url) DO UPDATE
          SET name = EXCLUDED.name
        RETURNING id;
        """,
        (name, cu)
    )
    return cur.fetchone()[0]

def upsert_girl(cur, entry: dict, shop_id: int) -> Optional[int]:
    profile_url = entry.get("profile_link") or None
    if not profile_url:
        return None
    
    # ✅ CHECK if manual override is set
    cur.execute(
        "SELECT id, manual_override FROM girls WHERE profile_url = %s",
        (profile_url,)
    )
    existing = cur.fetchone()
    
    if existing and existing[1]:  # manual_override = True
        # Don't update origin/name, only update photo/shop if needed
        cur.execute(
            """
            UPDATE girls 
            SET photo_url = COALESCE(%s, photo_url),
                shop_id = %s
            WHERE profile_url = %s
            RETURNING id;
            """,
            (entry.get("photo") or None, shop_id, profile_url)
        )
    else:
        # Normal upsert (scraper can overwrite)
        cur.execute(
            """
            INSERT INTO girls (name, origin, photo_url, shop_id, profile_url, manual_override)
            VALUES (%s, %s, %s, %s, %s, FALSE)
            ON CONFLICT (profile_url) DO UPDATE
              SET name      = EXCLUDED.name,
                  origin    = EXCLUDED.origin,
                  photo_url = EXCLUDED.photo_url,
                  shop_id   = EXCLUDED.shop_id
            RETURNING id;
            """,
            (
                entry.get("name"),
                entry.get("origin_code") or None,
                entry.get("photo") or None,
                shop_id,
                profile_url
            )
        )
    
    return cur.fetchone()[0]

def upsert_roster_entry(cur, entry: dict, shop_id: int, girl_id: int) -> None:
    cur.execute(
        """
        INSERT INTO roster_entries (date, girl_id, shop_id, shift_text)
        VALUES ((NOW() AT TIME ZONE 'Australia/Sydney')::date, %s, %s, %s)
        ON CONFLICT (date, girl_id, shop_id) DO UPDATE
          SET shift_text = EXCLUDED.shift_text;
        """,
        (girl_id, shop_id, entry.get("shift") or None)
    )