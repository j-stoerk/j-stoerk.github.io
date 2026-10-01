-- Keeps the original table and any comments already posted through it.
CREATE TABLE IF NOT EXISTS comments (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  page TEXT NOT NULL,
  visitor_id TEXT NOT NULL,
  username TEXT NOT NULL,
  message TEXT NOT NULL,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);

ALTER TABLE comments ADD COLUMN request_id TEXT;
ALTER TABLE comments ADD COLUMN hidden INTEGER NOT NULL DEFAULT 0 CHECK(hidden IN (0, 1));
CREATE UNIQUE INDEX comments_visitor_request ON comments(visitor_id, request_id);
CREATE INDEX comments_page_visible_id ON comments(page, hidden, id DESC);

CREATE TABLE identities (
  id TEXT PRIMARY KEY,
  token_hash TEXT NOT NULL UNIQUE,
  display_name TEXT NOT NULL CHECK(length(display_name) BETWEEN 1 AND 40),
  created_at INTEGER NOT NULL,
  banned INTEGER NOT NULL DEFAULT 0 CHECK(banned IN (0, 1))
);

CREATE TABLE rate_limits (
  key TEXT PRIMARY KEY,
  minute INTEGER NOT NULL,
  used INTEGER NOT NULL
);
CREATE INDEX rate_limits_minute ON rate_limits(minute);
