ALTER TABLE users
  ADD COLUMN google_id VARCHAR(190) NULL AFTER phone,
  ADD COLUMN auth_provider ENUM('local','google') NOT NULL DEFAULT 'local' AFTER google_id,
  ADD UNIQUE KEY uq_users_google_id (google_id);
