-- TICK-094 : motif obligatoire, auteur et date d'une suspension décidée par un administrateur.
ALTER TABLE users ADD COLUMN suspension_reason VARCHAR(500) NULL;
ALTER TABLE users ADD COLUMN suspended_at TIMESTAMP NULL;
ALTER TABLE users ADD COLUMN suspended_by BIGINT NULL;
