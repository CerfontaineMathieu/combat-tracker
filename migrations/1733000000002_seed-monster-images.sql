-- Migration: seed-monster-images
-- Description: Sets image URLs for monsters with AI-generated images
-- This migration is idempotent

-- Create mapping table for French monster names to local AI-generated image slugs
CREATE TEMP TABLE monster_image_mapping (
    french_name VARCHAR(255),
    image_slug VARCHAR(255)
);

-- Insert mappings (French name -> local image slug)
INSERT INTO monster_image_mapping (french_name, image_slug) VALUES
    ('Aboleth', 'aboleth'),
    ('Araignée de phase', 'araignee-de-phase'),
    ('Araignée géante', 'araignee-geante'),
    ('Assassin', 'assassin'),
    ('Bandit', 'bandit'),
    ('Bonnet-rouge', 'bonnet-rouge'),
    ('Bulette', 'bulette'),
    ('Capitaine Pirate', 'capitaine-pirate'),
    ('Chaman Grung', 'chaman-grung'),
    ('Chante-Brume', 'chante-brume'),
    ('Crânefeu', 'cranefeu'),
    ('Cultiste', 'cultiste'),
    ('Cultiste de la mort', 'cultiste-de-la-mort'),
    ('Cultiste fanatique', 'cultiste-fanatique'),
    ('Drider', 'drider'),
    ('Drow', 'drow'),
    ('Eclaireur', 'eclaireur'),
    ('Enlaceur', 'enlaceur'),
    ('Espion', 'espion'),
    ('Ettercap', 'ettercap'),
    ('Flagelleur Mental', 'flagelleur-mental'),
    ('Fomorien', 'fomorien'),
    ('Golem de Bric-à-Brac', 'golem-de-bric-a-brac'),
    ('Grung', 'grung'),
    ('Guenaude marine', 'guenaude-marine'),
    ('Guenaude Verte', 'guenaude-verte'),
    ('Kuo-Toa', 'kuo-toa'),
    ('Lierreux', 'lierreux'),
    ('Mage', 'mage'),
    ('Malfrat', 'malfrat'),
    ('Merrow', 'merrow'),
    ('Plésiosaure', 'plesiosaure'),
    ('Prestelin', 'prestelin'),
    ('Ptéranodon', 'pteranodon'),
    ('Quaggoth', 'quaggoth'),
    ('Sahuagin', 'sahuagin'),
    ('Sahuagin Baron', 'sahuagin-baron'),
    ('Squelette', 'squelette'),
    ('Vautour Géant', 'vautour-geant'),
    ('Vétéran', 'veteran'),
    ('Vouivre', 'vouivre');

-- Handle names with special apostrophes using LIKE pattern matching
UPDATE monsters m
SET image_url = '/monsters/devoreur-d-intellect.png'
WHERE m.name LIKE 'Dévoreur d%intellect'
AND (m.image_url IS NULL OR m.image_url = '');

UPDATE monsters m
SET image_url = '/monsters/guerrier-d-elite-drow.png'
WHERE m.name LIKE 'Guerrier d%élite Drow'
AND (m.image_url IS NULL OR m.image_url = '');

UPDATE monsters m
SET image_url = '/monsters/guerrier-d-elite-grung.png'
WHERE m.name LIKE 'Guerrier d%élite Grung'
AND (m.image_url IS NULL OR m.image_url = '');

UPDATE monsters m
SET image_url = '/monsters/horreur-cablee.png'
WHERE m.name LIKE 'Horreur câblée'
AND (m.image_url IS NULL OR m.image_url = '');

-- Update monsters with image URLs from mapping table (only if not already set)
UPDATE monsters m
SET image_url = '/monsters/' || mapping.image_slug || '.png'
FROM monster_image_mapping mapping
WHERE m.name = mapping.french_name
AND (m.image_url IS NULL OR m.image_url = '');

-- Cleanup
DROP TABLE monster_image_mapping;

-- Log results
DO $$
DECLARE
    with_images INTEGER;
    without_images INTEGER;
BEGIN
    SELECT COUNT(*) INTO with_images FROM monsters WHERE image_url IS NOT NULL AND image_url != '';
    SELECT COUNT(*) INTO without_images FROM monsters WHERE image_url IS NULL OR image_url = '';
    RAISE NOTICE 'Monsters with images: %, without images: %', with_images, without_images;
END $$;
