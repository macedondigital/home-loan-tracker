-- Add status and required_for_preapproval columns to documents
ALTER TABLE documents ADD COLUMN status TEXT NOT NULL DEFAULT 'not_started';
ALTER TABLE documents ADD COLUMN required_for_preapproval INTEGER NOT NULL DEFAULT 0;

-- Mark the 7 documents required for pre-approval
UPDATE documents SET required_for_preapproval = 1 WHERE id IN (
  'fy23-24-noa', 'fy24-25-noa', 'interim-pl', 'income-letter',
  'personal-statements', 'business-statements', 'trust-deed'
);
