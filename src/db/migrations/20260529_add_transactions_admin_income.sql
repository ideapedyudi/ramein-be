ALTER TABLE transactions
  ADD COLUMN admin_income DECIMAL(14,2) NOT NULL DEFAULT 0 AFTER gross_amount;

UPDATE transactions
SET admin_income = ROUND(gross_amount * 0.2, 2);
