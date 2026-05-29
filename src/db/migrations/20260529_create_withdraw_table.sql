CREATE TABLE IF NOT EXISTS withdraw (
  id CHAR(36) NOT NULL,
  event_id CHAR(36) NOT NULL,
  user_id CHAR(36) NOT NULL,
  total_amount DECIMAL(14,2) NOT NULL,
  bank_name VARCHAR(120) NULL,
  bank_account VARCHAR(190) NULL,
  account_number VARCHAR(100) NULL,
  status ENUM('pending','approved','rejected') NOT NULL DEFAULT 'pending',
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  KEY idx_withdraw_event_id (event_id),
  KEY idx_withdraw_user_id (user_id),
  KEY idx_withdraw_status (status),
  CONSTRAINT fk_withdraw_event FOREIGN KEY (event_id) REFERENCES events (id),
  CONSTRAINT fk_withdraw_user FOREIGN KEY (user_id) REFERENCES users (id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
