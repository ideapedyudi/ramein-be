ALTER TABLE ticket
  ADD INDEX idx_ticket_transaction_id (transaction_id);

ALTER TABLE ticket
  DROP INDEX uq_ticket_transaction_id;
