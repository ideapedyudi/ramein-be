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
