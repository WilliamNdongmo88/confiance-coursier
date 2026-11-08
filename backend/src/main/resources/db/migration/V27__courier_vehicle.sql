-- TICK-089 : moyen de déplacement du coursier (A_PIED | VELO | MOTO | VOITURE | TRICYCLE).
-- La zone du coursier est sa ville (users.city), déjà enregistrée et désormais demandée à l'inscription.
ALTER TABLE users ADD COLUMN vehicle VARCHAR(20) NULL;
