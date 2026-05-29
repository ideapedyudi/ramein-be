ALTER TABLE events
  ADD COLUMN is_withdraw TINYINT(1) NOT NULL DEFAULT 0 AFTER is_published;
