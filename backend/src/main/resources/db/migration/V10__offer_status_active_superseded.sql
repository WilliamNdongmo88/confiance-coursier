-- TICK-058 : Ajouter les statuts ACTIVE et SUPERSEDED sur course_offers
-- ACTIVE    = offre en cours (une seule par (course_id, courier_id))
-- SUPERSEDED = offre remplacée par une nouvelle du même coursier
-- Les statuts existants (PENDING, ACCEPTED, REJECTED) restent valides.

-- 1. Migrer les offres PENDING existantes vers ACTIVE
UPDATE course_offers SET status = 'ACTIVE' WHERE status = 'PENDING';

-- 2. Contrainte unique partielle : un coursier ne peut avoir qu'une seule
--    offre ACTIVE par course (la nouvelle remplace l'ancienne via SUPERSEDED).
CREATE UNIQUE INDEX IF NOT EXISTS idx_course_offers_one_active_per_courier
    ON course_offers (course_id, courier_id)
    WHERE status = 'ACTIVE';
