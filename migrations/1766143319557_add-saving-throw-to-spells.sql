-- Add saving_throw column to spell_catalog for filtering spells by save characteristic
ALTER TABLE spell_catalog ADD COLUMN IF NOT EXISTS saving_throw VARCHAR(20);

-- Index for filtering by saving throw
CREATE INDEX IF NOT EXISTS idx_spell_catalog_saving_throw ON spell_catalog(saving_throw);
