-- TICK-065b : échéance de preuves et non-livraison (PLAN_AMELIORATION §3.1 bis).

-- 1. Suivi de l'échéance sur la course
ALTER TABLE courses ADD COLUMN IF NOT EXISTS proof_deadline TIMESTAMP;          -- max(scheduled_at, paid_at) + proof_deadline_hours
ALTER TABLE courses ADD COLUMN IF NOT EXISTS extension_count INT NOT NULL DEFAULT 0;
ALTER TABLE courses ADD COLUMN IF NOT EXISTS overdue_since TIMESTAMP;           -- passage en OVERDUE
ALTER TABLE courses ADD COLUMN IF NOT EXISTS proof_reminder_sent_at TIMESTAMP;  -- rappel « échéance − 6 h » envoyé

CREATE INDEX IF NOT EXISTS idx_courses_status_proof_deadline ON courses (status, proof_deadline);
CREATE INDEX IF NOT EXISTS idx_courses_status_overdue_since  ON courses (status, overdue_since);

-- Courses déjà payées sans échéance : même règle qu'au paiement (24 h par défaut)
UPDATE courses
SET proof_deadline = GREATEST(COALESCE(scheduled_at, paid_at), paid_at) + INTERVAL '24 hours'
WHERE status = 'IN_PROGRESS' AND paid_at IS NOT NULL AND proof_deadline IS NULL;

-- 2. Paramètres admin (valeurs par défaut du plan) — updated_by NULL = valeur système
INSERT INTO platform_settings (setting_key, setting_value, updated_by, updated_at) VALUES
    ('proof_deadline_hours',                    '24',   NULL, NOW()),
    ('proof_reminder_hours_before',             '6',    NULL, NOW()),
    ('overdue_grace_hours',                     '48',   NULL, NOW()),
    ('max_extensions',                          '2',    NULL, NOW()),
    ('refund_platform_fees_on_courier_no_show', 'true', NULL, NOW())
ON CONFLICT (setting_key) DO NOTHING;

-- 3. Incidents coursier (non-livraison) : 2 sur 30 jours → suspension provisoire
CREATE TABLE IF NOT EXISTS courier_incidents (
    id            BIGSERIAL PRIMARY KEY,
    courier_id    BIGINT      NOT NULL REFERENCES users(id),
    course_id     BIGINT      NOT NULL REFERENCES courses(id),
    incident_type VARCHAR(30) NOT NULL,           -- NO_SHOW
    created_at    TIMESTAMP   NOT NULL DEFAULT NOW(),
    CONSTRAINT uq_courier_incident_course UNIQUE (course_id, incident_type)
);
CREATE INDEX IF NOT EXISTS idx_courier_incidents_courier ON courier_incidents (courier_id, created_at);
