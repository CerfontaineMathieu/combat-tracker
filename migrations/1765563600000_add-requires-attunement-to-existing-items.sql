-- Migration: Add requiresAttunement to existing inventory equipment items
-- This updates equipment items that have a catalogNotionId matching a catalog item
-- with Harmonisation = true, setting requiresAttunement = true on them.
-- Also removes the old 'attuned' property if present.

WITH harmonization_items AS (
    SELECT notion_id
    FROM item_catalog
    WHERE properties->>'Harmonisation' = 'true'
),
inventories_to_update AS (
    SELECT
        ci.id,
        ci.inventory,
        (
            SELECT jsonb_agg(
                CASE
                    WHEN (elem->>'catalogNotionId') IN (SELECT notion_id FROM harmonization_items)
                    THEN (elem - 'attuned') || '{"requiresAttunement": true}'::jsonb
                    ELSE elem - 'attuned'
                END
            )
            FROM jsonb_array_elements(ci.inventory->'equipment') AS elem
        ) AS new_equipment
    FROM character_inventories ci
    WHERE jsonb_array_length(ci.inventory->'equipment') > 0
)
UPDATE character_inventories
SET inventory = jsonb_set(inventories_to_update.inventory, '{equipment}', COALESCE(inventories_to_update.new_equipment, '[]'::jsonb)),
    updated_at = CURRENT_TIMESTAMP
FROM inventories_to_update
WHERE character_inventories.id = inventories_to_update.id;
