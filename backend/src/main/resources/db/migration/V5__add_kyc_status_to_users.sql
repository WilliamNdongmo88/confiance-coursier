-- Migration V5 : Ajout du statut KYC sur les utilisateurs
ALTER TABLE users ADD COLUMN kyc_status VARCHAR(20) NOT NULL DEFAULT 'NONE';

-- Index pour les requêtes KYC fréquentes
CREATE INDEX idx_kyc_submissions_status ON kyc_submissions(status);
CREATE INDEX idx_kyc_submissions_user_id ON kyc_submissions(user_id);
CREATE INDEX idx_users_kyc_status ON users(kyc_status);
