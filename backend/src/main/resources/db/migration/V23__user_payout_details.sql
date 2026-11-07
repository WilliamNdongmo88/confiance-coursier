-- Coordonnées de reversement des gains du coursier (saisies avec le dossier d'identité).
ALTER TABLE users ADD COLUMN IF NOT EXISTS payout_method VARCHAR(10);
ALTER TABLE users ADD COLUMN IF NOT EXISTS payout_number VARCHAR(30);
