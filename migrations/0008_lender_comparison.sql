CREATE TABLE lenders (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  tier TEXT NOT NULL,
  is_participating_lender INTEGER NOT NULL DEFAULT 1,
  assessment_method TEXT NOT NULL,
  accepts_one_year INTEGER NOT NULL DEFAULT 0,
  accepts_trust_income INTEGER NOT NULL DEFAULT 1,
  one_year_policy_note TEXT,
  trust_income_note TEXT,
  rate_premium_note TEXT,
  general_notes TEXT,
  sort_order INTEGER NOT NULL DEFAULT 0
);
