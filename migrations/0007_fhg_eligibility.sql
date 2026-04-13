CREATE TABLE fhg_eligibility (
  id TEXT PRIMARY KEY,
  label TEXT NOT NULL,
  detail TEXT,
  criterion_type TEXT NOT NULL DEFAULT 'manual',
  confirmed INTEGER DEFAULT 0,
  confirmed_at TEXT
);

INSERT INTO fhg_eligibility (id, label, detail, criterion_type) VALUES
  ('single-parent', 'Single parent with dependent children', 'Must have at least one dependent child', 'manual'),
  ('australian-citizen', 'Australian citizen', 'Must be an Australian citizen (not just permanent resident)', 'manual'),
  ('income-cap', 'Taxable income under $125,000', 'Individual taxable income must be below the FHG cap', 'computed'),
  ('no-property', 'No existing property ownership', 'Must not own property individually or through any entity including trusts', 'manual'),
  ('owner-occupier', 'Owner occupier intent', 'Property must be purchased as primary residence', 'manual'),
  ('participating-lender', 'Participating lender confirmed', 'Broker has confirmed submission through an FHG participating lender', 'manual'),
  ('fy27-places', 'FY27 scheme places available', 'FHG allocation for FY27 opens 1 July 2026. Places are limited.', 'manual');
