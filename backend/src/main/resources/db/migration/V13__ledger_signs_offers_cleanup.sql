-- Corrections de la revue TICK-055 → TICK-061

-- 1. Convention de signe du ledger (TICK-061) : HOLD est positif, toute sortie
--    de séquestre (versement coursier, frais plateforme, remboursement) est négative.
--    Les anciennes lignes écrites en positif sont normalisées pour que la somme
--    par course clôturée vaille 0.
UPDATE escrow_ledger
SET amount = -amount
WHERE entry_type <> 'HOLD'
  AND amount > 0;

-- Les types SPLIT_* ne sont plus utilisés : un partage s'écrit
-- REFUND_CLIENT + COURIER_PAYOUT + PLATFORM_FEE.
UPDATE escrow_ledger SET entry_type = 'COURIER_PAYOUT' WHERE entry_type = 'SPLIT_COURIER';
UPDATE escrow_ledger SET entry_type = 'REFUND_CLIENT'  WHERE entry_type = 'SPLIT_CLIENT';
UPDATE escrow_ledger SET entry_type = 'PLATFORM_FEE'   WHERE entry_type = 'SPLIT_PLATFORM';

COMMENT ON COLUMN escrow_ledger.entry_type IS
    'HOLD (+total) | COURIER_PAYOUT (-) | PLATFORM_FEE (-) | REFUND_CLIENT (-)';

-- 2. Paramètre de remboursement des frais figé sur la course au moment de la décision.
ALTER TABLE courses
    ADD COLUMN IF NOT EXISTS refund_platform_fees BOOLEAN;

-- 3. Verrou optimiste (TICK-060) : filet de sécurité en plus du verrou pessimiste.
ALTER TABLE courses
    ADD COLUMN IF NOT EXISTS version BIGINT NOT NULL DEFAULT 0;

-- 4. Le message OFFER porte l'id de la CourseOffer (TICK-058) pour pouvoir
--    accepter l'offre après rechargement de l'historique.
ALTER TABLE chat_messages
    ADD COLUMN IF NOT EXISTS offer_id BIGINT REFERENCES course_offers(id);

-- 5. Nettoyage des offres fictives à 0,01 créées par l'ancien « Choisir et discuter »
--    (TICK-057). V10 les avait passées en ACTIVE : elles ne doivent plus être acceptables.
UPDATE course_offers
SET status = 'REJECTED'
WHERE amount < 1
  AND status IN ('ACTIVE', 'PENDING');

-- Les offres PENDING restantes (ancien POST /offers, supprimé) ne sont pas
-- soumises aux règles de TICK-058 (minimum, arrondi) : elles sont retirées.
UPDATE course_offers
SET status = 'SUPERSEDED'
WHERE status = 'PENDING';
