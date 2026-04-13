CREATE TABLE income_records (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  financial_year TEXT NOT NULL UNIQUE,
  trust_distribution REAL DEFAULT 0,
  personal_taxable_income REAL DEFAULT 0,
  add_back_depreciation REAL DEFAULT 0,
  add_back_super REAL DEFAULT 0,
  add_back_one_off REAL DEFAULT 0,
  add_back_other REAL DEFAULT 0,
  notes TEXT,
  created_at TEXT DEFAULT (datetime('now')),
  updated_at TEXT DEFAULT (datetime('now'))
);

INSERT INTO income_records (financial_year) VALUES ('FY24'), ('FY25');
