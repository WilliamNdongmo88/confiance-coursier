-- TICK-062 : un seul litige OPEN par course.

-- 1. Données existantes : s'il reste plusieurs litiges OPEN sur une même course,
--    seul le plus ancien reste ouvert ; les suivants sont clos comme doublons.
UPDATE disputes d
SET status = 'RESOLVED',
    decision = 'DOUBLON',
    decided_at = NOW()
WHERE d.status = 'OPEN'
  AND EXISTS (
      SELECT 1 FROM disputes o
      WHERE o.course_id = d.course_id
        AND o.status = 'OPEN'
        AND o.id < d.id
  );

-- 2. Contrainte : au plus un litige OPEN par course (filet de sécurité du verrou de ligne).
CREATE UNIQUE INDEX IF NOT EXISTS idx_disputes_one_open_per_course
    ON disputes (course_id)
    WHERE status = 'OPEN';
