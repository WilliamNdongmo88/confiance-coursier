-- TICK-069 : index des requêtes fréquentes (anomalie A-29).
-- Déjà créés par les tickets précédents : courses(status, auto_validate_at) V16,
-- courses(status, proof_deadline / overdue_since) V17, offre ACTIVE unique V10, litige OPEN unique V14.

-- Courses d'un client (dashboard, historique) et missions d'un coursier
CREATE INDEX IF NOT EXISTS idx_courses_client_created  ON courses (client_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_courses_courier_created ON courses (courier_id, created_at DESC);

-- Offres d'une course (écran client, acceptation) et d'un coursier
CREATE INDEX IF NOT EXISTS idx_course_offers_course_status ON course_offers (course_id, status);
CREATE INDEX IF NOT EXISTS idx_course_offers_courier       ON course_offers (courier_id);

-- Salons d'un coursier / d'un client (le UNIQUE (course_id, courier_id) couvre déjà la recherche par course)
CREATE INDEX IF NOT EXISTS idx_chat_rooms_courier ON chat_rooms (courier_id);
CREATE INDEX IF NOT EXISTS idx_chat_rooms_client  ON chat_rooms (client_id);

-- Registre de séquestre : somme par course (invariant) et gains par type et par mois
CREATE INDEX IF NOT EXISTS idx_escrow_ledger_course     ON escrow_ledger (course_id);
CREATE INDEX IF NOT EXISTS idx_escrow_ledger_type_date  ON escrow_ledger (entry_type, created_at);

-- Litiges d'une course (historique, tous statuts) et file admin
CREATE INDEX IF NOT EXISTS idx_disputes_course ON disputes (course_id);
CREATE INDEX IF NOT EXISTS idx_disputes_status ON disputes (status);

-- Signalements : règle 3 signaleurs / 30 jours et doublon par paire (TICK-063)
CREATE INDEX IF NOT EXISTS idx_reports_target_created      ON reports (target_id, created_at);
CREATE INDEX IF NOT EXISTS idx_reports_reporter_target_date ON reports (reporter_id, target_id, created_at);
CREATE INDEX IF NOT EXISTS idx_reports_status               ON reports (status);

-- Coursiers proposables (rôle, statut, KYC)
CREATE INDEX IF NOT EXISTS idx_users_role_status_kyc ON users (role, status, kyc_status);
