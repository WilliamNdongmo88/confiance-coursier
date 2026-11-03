-- La table reviews créée en V2 a une contrainte UNIQUE sur course_id seul,
-- ce qui n'autorise qu'un seul avis par course (au lieu de 2 : un par participant).
-- On remplace cette contrainte par une contrainte composite (course_id, author_id)
-- pour autoriser exactement 1 avis PAR AUTEUR par course.

ALTER TABLE reviews DROP CONSTRAINT IF EXISTS reviews_course_id_key;

ALTER TABLE reviews
    ADD CONSTRAINT reviews_course_author_unique UNIQUE (course_id, author_id);
