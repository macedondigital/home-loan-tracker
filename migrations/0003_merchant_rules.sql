CREATE TABLE merchant_rules (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  pattern TEXT NOT NULL UNIQUE,
  category TEXT NOT NULL,
  source_description TEXT,
  created_at TEXT DEFAULT (datetime('now'))
);
