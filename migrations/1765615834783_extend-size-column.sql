-- Extend size column to accommodate longer French size names like "Très Grande" (11 chars)
ALTER TABLE monsters ALTER COLUMN size TYPE VARCHAR(20);
