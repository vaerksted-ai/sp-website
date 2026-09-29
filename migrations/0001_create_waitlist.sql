-- Waitlist signups. Emails are stored lowercased; one row per email.
CREATE TABLE IF NOT EXISTS waitlist (
  id              INTEGER PRIMARY KEY AUTOINCREMENT,
  email           TEXT NOT NULL UNIQUE,
  name            TEXT,
  region          TEXT,
  household       TEXT,
  interests       TEXT NOT NULL DEFAULT '[]', -- JSON array
  lang            TEXT NOT NULL DEFAULT 'en',
  consent_version TEXT NOT NULL,
  consent_at      TEXT NOT NULL,              -- ISO 8601, UTC
  created_at      TEXT NOT NULL,
  updated_at      TEXT NOT NULL
);

CREATE INDEX IF NOT EXISTS waitlist_created_at ON waitlist (created_at);
