-- =========================================================
-- V9 : Champs de ventilation financière sur courses
--
-- courier_amount      : montant net reversé au coursier
--                       = tarifCoursier - (tarifCoursier × commissionRateCourier / 100)
-- platform_fee_amount : gains totaux de la plateforme sur cette course
--                       = fraisServiceClient + commissionCoursier
--                       = commissionAmount  + (tarifCoursier × commissionRateCourier / 100)
-- commission_rate_courier : taux coursier appliqué au moment du paiement (snapshot)
-- =========================================================

ALTER TABLE courses
    ADD COLUMN IF NOT EXISTS courier_amount           DECIMAL(12,2),
    ADD COLUMN IF NOT EXISTS platform_fee_amount      DECIMAL(12,2),
    ADD COLUMN IF NOT EXISTS commission_rate_courier  DECIMAL(5,2);
