-- Personne à contacter sur place (facultatif) : visible du client, du coursier retenu et de l'admin.
ALTER TABLE courses ADD COLUMN IF NOT EXISTS contact_name  VARCHAR(120);
ALTER TABLE courses ADD COLUMN IF NOT EXISTS contact_phone VARCHAR(30);

-- Messages non lus : l'historique existant est considéré comme lu (pas de pastille sur d'anciens échanges).
UPDATE chat_messages SET is_read = TRUE WHERE is_read IS NULL OR is_read = FALSE;
ALTER TABLE chat_messages ALTER COLUMN is_read SET DEFAULT FALSE;
CREATE INDEX IF NOT EXISTS idx_chat_messages_unread ON chat_messages (room_id, sender_id) WHERE is_read = FALSE;
