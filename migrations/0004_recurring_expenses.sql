CREATE TABLE recurring_expenses (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT NOT NULL,
  amount REAL NOT NULL,
  frequency TEXT NOT NULL CHECK (frequency IN ('monthly', 'fortnightly', 'quarterly')),
  day_of_month INTEGER,
  category TEXT NOT NULL,
  match_pattern TEXT NOT NULL,
  active INTEGER DEFAULT 1,
  created_at TEXT DEFAULT (datetime('now'))
);

INSERT INTO recurring_expenses (name, amount, frequency, day_of_month, category, match_pattern) VALUES
  ('Rent (Hayden Leopold)', 2389.88, 'monthly', 1, 'rent', 'hayden leopold'),
  ('Health insurance (Aust Unity)', 563.29, 'monthly', 24, 'bills', 'aust unity'),
  ('Netflix', 28.99, 'monthly', 4, 'subscriptions', 'netflix'),
  ('Spotify', 27.99, 'monthly', 23, 'subscriptions', 'spotify'),
  ('Google One', 14.99, 'monthly', 5, 'subscriptions', 'google one'),
  ('Prime Video', 2.99, 'monthly', 6, 'subscriptions', 'prime vide'),
  ('Codespark Academy', 22.45, 'monthly', 6, 'kids', 'codespark'),
  ('Swellnet', 9.95, 'monthly', 17, 'subscriptions', 'swellnet'),
  ('Fairfax Media', 25.99, 'monthly', 9, 'subscriptions', 'fairfax'),
  ('AGL Sales', 55.00, 'fortnightly', NULL, 'bills', 'agl sales'),
  ('Barwon Water', 84.79, 'quarterly', NULL, 'bills', 'barwon water');
