-- =========================================================
-- V8 : Ajout des informations personnelles dans kyc_submissions
-- Prénom, Nom de famille, Date de naissance, Nationalité
-- saisis par le coursier lors de la soumission KYC.
-- Ces données permettent à l'admin de les comparer aux documents.
-- =========================================================

ALTER TABLE kyc_submissions
    ADD COLUMN IF NOT EXISTS first_name    VARCHAR(100),
    ADD COLUMN IF NOT EXISTS last_name     VARCHAR(100),
    ADD COLUMN IF NOT EXISTS birth_date    DATE,
    ADD COLUMN IF NOT EXISTS nationality   VARCHAR(100);
