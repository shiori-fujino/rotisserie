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
    
def get_conn():
    dsn = os.getenv("DATABASE_URL")
    if not dsn:
        raise RuntimeError("DATABASE_URL not set (check .env locally or GitHub Actions secrets)")
    return psycopg2.connect(dsn, sslmode="require")

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
      photo_url   TEXT
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
    cur.execute(
        """
        INSERT INTO girls (name, origin, photo_url, shop_id, profile_url)
        VALUES (%s, %s, %s, %s, %s)
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
