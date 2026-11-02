-- =========================================================
-- V6 : Correction de la colonne country dans users
-- VARCHAR(2) était trop court pour les noms de pays complets
-- (ex: "Cameroun", "France", "Belgique").
-- On l'agrandit à VARCHAR(100) pour être cohérent avec le frontend.
-- =========================================================
ALTER TABLE users ALTER COLUMN country TYPE VARCHAR(100);
