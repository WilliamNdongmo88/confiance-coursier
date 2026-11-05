-- TICK-061 : EscrowService et ledger équilibré

-- 1. Statut REFUNDED sur les courses (remboursement total ou partiel)
--    Les statuts existants : PUBLISHED, ASSIGNED, IN_PROGRESS, PROOFS_SUBMITTED,
--    COMPLETED, DISPUTED, CANCELLED — REFUNDED est ajouté.
--    Pas de contrainte CHECK pour rester flexible (pas d'enum en base).

-- 2. Paramètre admin : rembourser les frais plateforme en cas de remboursement total ?
--    Défaut : false (la plateforme conserve ses frais de service client).
INSERT INTO platform_settings (setting_key, setting_value, updated_by, updated_at)
-- updated_by est une FK vers users(id) : NULL = valeur seedée par le système.
VALUES ('refund_platform_fees_on_full_refund', 'false', NULL, NOW())
ON CONFLICT (setting_key) DO NOTHING;

-- 3. Colonne refund_amount sur les litiges (montant remboursé lors d'un partage)
ALTER TABLE disputes
    ADD COLUMN IF NOT EXISTS refund_amount DECIMAL(12,2);

-- 4. Enrichir les types d'entrées du ledger (documentation, pas de contrainte)
--    Types existants : HOLD, COURIER_PAYOUT, PLATFORM_FEE, RELEASE, REFUND
--    Ajouts : REFUND_CLIENT, SPLIT_COURIER, SPLIT_CLIENT, SPLIT_PLATFORM
--    Le type RELEASE reste pour la compatibilité avec l'existant.
COMMENT ON COLUMN escrow_ledger.entry_type IS
    'HOLD | COURIER_PAYOUT | PLATFORM_FEE | REFUND_CLIENT | SPLIT_COURIER | SPLIT_CLIENT | SPLIT_PLATFORM';
