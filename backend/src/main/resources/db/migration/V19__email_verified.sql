-- TICK-074 : vérification d'email effective.
-- Nouveaux comptes : non vérifiés jusqu'à la saisie de l'OTP d'inscription.
ALTER TABLE users ADD COLUMN IF NOT EXISTS email_verified BOOLEAN NOT NULL DEFAULT FALSE;

-- Comptes existants : considérés comme vérifiés (ils se connectaient déjà sans cette règle).
UPDATE users SET email_verified = TRUE;
