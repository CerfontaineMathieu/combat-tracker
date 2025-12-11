-- Add school and material_details columns to spell_catalog
ALTER TABLE spell_catalog ADD COLUMN IF NOT EXISTS school VARCHAR(50);
ALTER TABLE spell_catalog ADD COLUMN IF NOT EXISTS material_details TEXT;

-- Create index on school for filtering
CREATE INDEX IF NOT EXISTS idx_spell_catalog_school ON spell_catalog(school);
