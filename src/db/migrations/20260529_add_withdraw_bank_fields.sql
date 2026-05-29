ALTER TABLE withdraw
  ADD COLUMN bank_name VARCHAR(120) NULL AFTER total_amount,
  ADD COLUMN bank_account VARCHAR(190) NULL AFTER bank_name,
  ADD COLUMN account_number VARCHAR(100) NULL AFTER bank_account;
