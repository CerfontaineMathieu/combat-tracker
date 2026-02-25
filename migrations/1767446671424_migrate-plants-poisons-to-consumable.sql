-- Migrate plants and poisons from misc to consumable category
UPDATE item_catalog
SET category = 'consumable'
WHERE subcategory IN ('plante', 'poison') AND category = 'misc';
