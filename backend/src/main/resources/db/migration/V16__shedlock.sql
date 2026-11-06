-- TICK-065 : table de verrous ShedLock (un job planifié n'est exécuté que par une instance à la fois).
CREATE TABLE IF NOT EXISTS shedlock (
    name       VARCHAR(64)  NOT NULL PRIMARY KEY,
    lock_until TIMESTAMP    NOT NULL,
    locked_at  TIMESTAMP    NOT NULL,
    locked_by  VARCHAR(255) NOT NULL
);

-- Index de la requête du scheduler 72 h : status = PROOFS_SUBMITTED AND auto_validate_at <= now
CREATE INDEX IF NOT EXISTS idx_courses_status_auto_validate
    ON courses (status, auto_validate_at);
