-- TICK-091 : annulation d'une course par un administrateur, avec motif obligatoire (traçabilité).
ALTER TABLE courses ADD COLUMN cancel_reason VARCHAR(500) NULL;
ALTER TABLE courses ADD COLUMN cancelled_by BIGINT NULL;
ALTER TABLE courses ADD COLUMN cancelled_at TIMESTAMP NULL;
