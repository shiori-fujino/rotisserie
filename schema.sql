-- schema.sql
-- Rotisserie database schema

-- 🏬 Shops
CREATE TABLE IF NOT EXISTS shops (
  id SERIAL PRIMARY KEY,
  name TEXT NOT NULL,
  canonical_url TEXT UNIQUE NOT NULL
);

-- 👩 Girls
CREATE TABLE IF NOT EXISTS girls (
  id SERIAL PRIMARY KEY,
  shop_id INT REFERENCES shops(id) ON DELETE CASCADE,
  name TEXT,
  origin TEXT,
  profile_url TEXT UNIQUE,
  photo_url TEXT
);

-- 📅 Daily roster entries
CREATE TABLE IF NOT EXISTS roster_entries (
  id SERIAL PRIMARY KEY,
  shop_id INT REFERENCES shops(id) ON DELETE CASCADE,
  girl_id INT REFERENCES girls(id) ON DELETE CASCADE,
  date DATE NOT NULL,
  shift_text TEXT,
  UNIQUE (shop_id, girl_id, date)
);

-- 👀 Views counter
CREATE TABLE IF NOT EXISTS girl_views (
  girl_id INT PRIMARY KEY REFERENCES girls(id) ON DELETE CASCADE,
  count INT NOT NULL DEFAULT 0
);

-- 💬 Comments / reviews (with one-level reply support)
CREATE TABLE IF NOT EXISTS girl_comments (
  id SERIAL PRIMARY KEY,
  girl_id INT REFERENCES girls(id) ON DELETE CASCADE,
  parent_id INT REFERENCES girl_comments(id) ON DELETE CASCADE, -- ✅ self-reference for replies
  rating INT CHECK (rating >= 1 AND rating <= 5),
  comment TEXT,
  created_at TIMESTAMP DEFAULT NOW()
);

-- 📩 Contact messages
CREATE TABLE IF NOT EXISTS contact_messages (
  id SERIAL PRIMARY KEY,
  message TEXT NOT NULL,
  created_at TIMESTAMP DEFAULT NOW()
);

-- 📝 Blog posts
CREATE TABLE IF NOT EXISTS blog_posts (
  id SERIAL PRIMARY KEY,
  title TEXT NOT NULL,
  content TEXT NOT NULL,
  created_at TIMESTAMP DEFAULT NOW()
);

-- 📊 DATA page (site visits)
CREATE TABLE IF NOT EXISTS site_visits (
  date DATE PRIMARY KEY,
  count INT NOT NULL DEFAULT 1
);
