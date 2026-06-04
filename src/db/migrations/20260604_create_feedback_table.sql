CREATE TABLE IF NOT EXISTS feedback (
  id CHAR(36) NOT NULL,
  rating ENUM('Sangat Puas','Puas','Cukup Puas','Tidak Puas','Sangat Tidak Puas') NOT NULL,
  review TEXT NULL,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  KEY idx_feedback_rating (rating)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
