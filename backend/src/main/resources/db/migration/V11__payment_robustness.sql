-- TICK-060 : Paiement fiable côté serveur
-- 1. Frais réels persistés sur la course (achats avancés par le coursier)
ALTER TABLE courses
    ADD COLUMN IF NOT EXISTS real_costs DECIMAL(12,2) DEFAULT 0 NOT NULL;

-- 2. Clé d'idempotence sur la course (évite le double paiement)
ALTER TABLE courses
    ADD COLUMN IF NOT EXISTS idempotency_key VARCHAR(64);

CREATE UNIQUE INDEX IF NOT EXISTS idx_courses_idempotency_key
    ON courses (idempotency_key)
    WHERE idempotency_key IS NOT NULL;

-- 3. Clé d'idempotence sur le ledger (évite le double HOLD)
ALTER TABLE escrow_ledger
    ADD COLUMN IF NOT EXISTS idempotency_key VARCHAR(64);

CREATE UNIQUE INDEX IF NOT EXISTS idx_escrow_idempotency_key
    ON escrow_ledger (idempotency_key)
    WHERE idempotency_key IS NOT NULL;
