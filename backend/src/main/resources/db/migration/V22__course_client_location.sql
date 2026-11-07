-- D'où le client paie : CAMEROON (Mobile Money) ou ABROAD (carte bancaire). NULL = course antérieure.
ALTER TABLE courses ADD COLUMN IF NOT EXISTS client_location VARCHAR(10);
