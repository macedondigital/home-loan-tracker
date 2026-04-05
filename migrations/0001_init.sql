CREATE TABLE transactions (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  date TEXT NOT NULL,
  date_str TEXT NOT NULL,
  description TEXT NOT NULL,
  amount REAL NOT NULL,
  balance REAL,
  category TEXT NOT NULL,
  category_override TEXT,
  month_key TEXT NOT NULL,
  created_at TEXT DEFAULT (datetime('now')),
  UNIQUE(date_str, description, amount)
);

CREATE INDEX idx_txn_month ON transactions(month_key);
CREATE INDEX idx_txn_category ON transactions(category);

CREATE TABLE milestones (
  id TEXT PRIMARY KEY,
  label TEXT NOT NULL,
  detail TEXT,
  target_date TEXT,
  completed INTEGER DEFAULT 0,
  completed_at TEXT
);

CREATE TABLE bank_balances (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  bank_australia REAL NOT NULL,
  nab_business REAL NOT NULL,
  recorded_at TEXT DEFAULT (datetime('now'))
);

CREATE TABLE documents (
  id TEXT PRIMARY KEY,
  label TEXT NOT NULL,
  checked INTEGER DEFAULT 0,
  checked_at TEXT
);

CREATE TABLE uploads (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  filename TEXT,
  txn_count INTEGER,
  new_count INTEGER,
  duplicate_count INTEGER,
  uploaded_at TEXT DEFAULT (datetime('now'))
);
