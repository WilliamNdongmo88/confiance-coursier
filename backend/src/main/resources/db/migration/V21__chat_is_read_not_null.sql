-- Les messages créés après V20 avaient is_read = NULL (le builder JPA ignorait la valeur par défaut) :
-- ils n'étaient jamais comptés comme non lus. Messages des courses encore actives → non lus ;
-- courses closes → lus (pas de pastille sur d'anciens échanges).
UPDATE chat_messages m SET is_read = FALSE
WHERE m.is_read IS NULL
  AND EXISTS (SELECT 1 FROM chat_rooms r JOIN courses c ON c.id = r.course_id
              WHERE r.id = m.room_id AND c.status NOT IN ('COMPLETED', 'CANCELLED', 'REFUNDED'));
UPDATE chat_messages SET is_read = TRUE WHERE is_read IS NULL;
ALTER TABLE chat_messages ALTER COLUMN is_read SET DEFAULT FALSE;
ALTER TABLE chat_messages ALTER COLUMN is_read SET NOT NULL;
