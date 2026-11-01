-- V4 : Ajout du type de message et du montant d'offre dans chat_messages
ALTER TABLE chat_messages
    ADD COLUMN IF NOT EXISTS message_type VARCHAR(20) NOT NULL DEFAULT 'TEXT',
    ADD COLUMN IF NOT EXISTS offer_amount DECIMAL(12, 2);
