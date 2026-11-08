-- Rattrapage des discussions « Offre déclinée » ouvertes avant la règle de OfferService.acceptOffer :
-- quand une course a un coursier retenu, les discussions des autres coursiers passent en lecture seule (archivées).
-- Les messages sont conservés ; seule la saisie est fermée. Rejouable sans effet (ne touche que les discussions encore ouvertes).
UPDATE chat_rooms r
SET is_archived = TRUE
FROM courses c
WHERE c.id = r.course_id
  AND c.courier_id IS NOT NULL
  AND r.courier_id <> c.courier_id
  AND (r.is_archived IS NULL OR r.is_archived = FALSE);
