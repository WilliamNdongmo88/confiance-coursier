-- Rétractation (option 1) : le client peut annuler une course payée et être remboursé intégralement
-- tant que le coursier ne l'a pas démarrée. started_at est posé quand le coursier clique sur « Je démarre »
-- ou envoie sa première preuve ; au-delà, l'annulation libre n'est plus possible.
ALTER TABLE courses ADD COLUMN started_at TIMESTAMP NULL;

-- Courses déjà en cours avec au moins une preuve : considérées comme démarrées.
UPDATE courses c SET started_at = COALESCE(c.paid_at, NOW())
WHERE c.status IN ('IN_PROGRESS', 'OVERDUE', 'PROOFS_SUBMITTED', 'DISPUTED', 'COMPLETED')
  AND EXISTS (SELECT 1 FROM proofs p WHERE p.course_id = c.id);
