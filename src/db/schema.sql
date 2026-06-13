CREATE TABLE IF NOT EXISTS users (
  id CHAR(36) NOT NULL,
  name VARCHAR(120) NOT NULL,
  email VARCHAR(190) NOT NULL,
  password VARCHAR(255) NOT NULL,
  phone VARCHAR(50) NULL,
  google_id VARCHAR(190) NULL,
  auth_provider ENUM('local','google') NOT NULL DEFAULT 'local',
  role ENUM('admin','user') NOT NULL DEFAULT 'user',
  is_active TINYINT(1) NOT NULL DEFAULT 1,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  UNIQUE KEY uq_users_email (email),
  UNIQUE KEY uq_users_google_id (google_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS categories (
  id CHAR(36) NOT NULL,
  name VARCHAR(120) NOT NULL,
  is_active TINYINT(1) NOT NULL DEFAULT 1,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  UNIQUE KEY uq_categories_name (name)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS cities (
  id CHAR(36) NOT NULL,
  name VARCHAR(120) NOT NULL,
  provinsi VARCHAR(120) NULL,
  is_active TINYINT(1) NOT NULL DEFAULT 1,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  UNIQUE KEY uq_cities_name (name)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS organizers (
  id CHAR(36) NOT NULL,
  name VARCHAR(120) NOT NULL,
  description TEXT NULL,
  contact_name VARCHAR(120) NULL,
  contact_email VARCHAR(190) NULL,
  contact_phone VARCHAR(50) NULL,
  is_active TINYINT(1) NOT NULL DEFAULT 1,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  UNIQUE KEY uq_organizers_name (name)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS events (
  id CHAR(36) NOT NULL,
  title VARCHAR(255) NOT NULL,
  description TEXT NOT NULL,
  category_id CHAR(36) NOT NULL,
  organizer_id CHAR(36) NOT NULL,
  created_by CHAR(36) NOT NULL,
  city_id CHAR(36) NOT NULL,
  address_detail VARCHAR(255) NOT NULL,
  banner LONGTEXT NULL,
  event_type VARCHAR(50) NULL,
  label_online VARCHAR(120) NULL,
  url_online VARCHAR(500) NULL,
  payment_type ENUM('free','paid') NOT NULL DEFAULT 'paid',
  visibility ENUM('public','private') NOT NULL DEFAULT 'private',
  start_datetime DATETIME NOT NULL,
  end_datetime DATETIME NOT NULL,
  status ENUM('draft','pending','published','rejected','completed','cancelled') NOT NULL DEFAULT 'draft',
  is_published TINYINT(1) NOT NULL DEFAULT 0,
  is_withdraw TINYINT(1) NOT NULL DEFAULT 0,
  published_by ENUM('user','admin') NULL,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  KEY idx_events_status_start (status, start_datetime),
  FULLTEXT KEY ft_events_title_desc (title, description),
  CONSTRAINT fk_events_category FOREIGN KEY (category_id) REFERENCES categories (id),
  CONSTRAINT fk_events_organizer FOREIGN KEY (organizer_id) REFERENCES organizers (id),
  CONSTRAINT fk_events_user FOREIGN KEY (created_by) REFERENCES users (id),
  CONSTRAINT fk_events_city FOREIGN KEY (city_id) REFERENCES cities (id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS event_ticket_types (
  id CHAR(36) NOT NULL,
  event_id CHAR(36) NOT NULL,
  name VARCHAR(120) NOT NULL,
  price DECIMAL(14,2) NOT NULL,
  quota INT UNSIGNED NOT NULL,
  sold INT UNSIGNED NOT NULL DEFAULT 0,
  sale_start_at DATETIME NOT NULL,
  sale_end_at DATETIME NOT NULL,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  KEY idx_ticket_event_id (event_id),
  CONSTRAINT fk_ticket_event FOREIGN KEY (event_id) REFERENCES events (id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS transactions (
  id CHAR(36) NOT NULL,
  order_id VARCHAR(120) NOT NULL,
  user_id CHAR(36) NOT NULL,
  event_id CHAR(36) NOT NULL,
  gross_amount DECIMAL(14,2) NOT NULL,
  admin_income DECIMAL(14,2) NOT NULL DEFAULT 0,
  status ENUM('pending','paid','failed','expired','cancelled','refunded') NOT NULL DEFAULT 'pending',
  payment_provider VARCHAR(50) NOT NULL DEFAULT 'midtrans',
  snap_token VARCHAR(255) NULL,
  redirect_url VARCHAR(500) NULL,
  midtrans_transaction_status VARCHAR(100) NULL,
  paid_at DATETIME NULL,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  UNIQUE KEY uq_transactions_order_id (order_id),
  KEY idx_transactions_user_id (user_id),
  KEY idx_transactions_event_id (event_id),
  CONSTRAINT fk_transactions_user FOREIGN KEY (user_id) REFERENCES users (id),
  CONSTRAINT fk_transactions_event FOREIGN KEY (event_id) REFERENCES events (id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS transaction_items (
  id CHAR(36) NOT NULL,
  transaction_id CHAR(36) NOT NULL,
  ticket_type_id CHAR(36) NOT NULL,
  ticket_name VARCHAR(120) NOT NULL,
  unit_price DECIMAL(14,2) NOT NULL,
  quantity INT UNSIGNED NOT NULL,
  subtotal DECIMAL(14,2) NOT NULL,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  KEY idx_transaction_items_tx_id (transaction_id),
  KEY idx_transaction_items_ticket_id (ticket_type_id),
  CONSTRAINT fk_transaction_items_tx FOREIGN KEY (transaction_id) REFERENCES transactions (id) ON DELETE CASCADE,
  CONSTRAINT fk_transaction_items_ticket FOREIGN KEY (ticket_type_id) REFERENCES event_ticket_types (id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS ticket (
  id CHAR(36) NOT NULL,
  user_id CHAR(36) NOT NULL,
  event_id CHAR(36) NOT NULL,
  transaction_id CHAR(36) NOT NULL,
  qr_code VARCHAR(120) NOT NULL,
  attendance_status ENUM('not_attended','attended') NOT NULL DEFAULT 'not_attended',
  attended_at DATETIME NULL,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  UNIQUE KEY uq_ticket_qr_code (qr_code),
  KEY idx_ticket_transaction_id (transaction_id),
  KEY idx_ticket_user_id (user_id),
  KEY idx_ticket_event_id (event_id),
  KEY idx_ticket_attendance_status (attendance_status),
  CONSTRAINT fk_ticket_purchase_user FOREIGN KEY (user_id) REFERENCES users (id),
  CONSTRAINT fk_ticket_purchase_event FOREIGN KEY (event_id) REFERENCES events (id),
  CONSTRAINT fk_ticket_purchase_transaction FOREIGN KEY (transaction_id) REFERENCES transactions (id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

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

CREATE TABLE IF NOT EXISTS finance (
  id CHAR(36) NOT NULL,
  user_id CHAR(36) NOT NULL,
  event_id CHAR(36) NOT NULL,
  transaksi_id CHAR(36) NOT NULL,
  organizer_id CHAR(36) NOT NULL,
  gross_amount DECIMAL(14,2) NOT NULL,
  admin_income DECIMAL(14,2) NOT NULL DEFAULT 0,
  time_transaksi DATETIME NOT NULL,
  published_by ENUM('user','admin') NULL,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  UNIQUE KEY uq_finance_transaksi_id (transaksi_id),
  KEY idx_finance_user_id (user_id),
  KEY idx_finance_event_id (event_id),
  KEY idx_finance_organizer_id (organizer_id),
  KEY idx_finance_published_by (published_by),
  CONSTRAINT fk_finance_user FOREIGN KEY (user_id) REFERENCES users (id),
  CONSTRAINT fk_finance_event FOREIGN KEY (event_id) REFERENCES events (id),
  CONSTRAINT fk_finance_transaksi FOREIGN KEY (transaksi_id) REFERENCES transactions (id) ON DELETE CASCADE,
  CONSTRAINT fk_finance_organizer FOREIGN KEY (organizer_id) REFERENCES organizers (id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS feedback (
  id CHAR(36) NOT NULL,
  rating ENUM('Sangat Puas','Puas','Cukup Puas','Tidak Puas','Sangat Tidak Puas') NOT NULL,
  review TEXT NULL,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  KEY idx_feedback_rating (rating)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS feedback_creator (
  id CHAR(36) NOT NULL,
  rating TINYINT UNSIGNED NOT NULL,
  review TEXT NULL,
  creator_type ENUM('organizer','user') NOT NULL,
  creator_id CHAR(36) NOT NULL,
  created_by CHAR(36) NOT NULL,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  KEY idx_feedback_creator_rating (rating),
  KEY idx_feedback_creator_target (creator_type, creator_id),
  KEY idx_feedback_creator_created_by (created_by),
  CONSTRAINT fk_feedback_creator_created_by FOREIGN KEY (created_by) REFERENCES users (id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS payment_logs (
  id CHAR(36) NOT NULL,
  order_id VARCHAR(120) NOT NULL,
  source VARCHAR(50) NOT NULL DEFAULT 'midtrans',
  notification_key VARCHAR(255) NOT NULL,
  payload JSON NOT NULL,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  UNIQUE KEY uq_payment_logs_notification_key (notification_key),
  KEY idx_payment_logs_order_id (order_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
