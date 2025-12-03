import { NextResponse } from 'next/server';
import { fetchAllItemsFromNotion, fetchPageContentById } from '@/lib/notion-items';
import {
  upsertCatalogItem,
  deleteCatalogItemsByNotionId,
} from '@/lib/db';
import pool from '@/lib/db';
import type { ItemSyncResult, CatalogItemInput, CharacterInventory, EquipmentItem, ConsumableItem, MiscItem } from '@/lib/types';

interface ApplyRequest {
  operations: {
    add: string[]; // notion_ids to add
    update: string[]; // notion_ids to update
    delete: string[]; // notion_ids to delete
  };
}

export async function POST(request: Request) {
  try {
    const body: ApplyRequest = await request.json();
    console.log('Applying item sync operations:', {
      add: body.operations.add.length,
      update: body.operations.update.length,
      delete: body.operations.delete.length,
    });

    // Fetch Notion data WITHOUT content first (fast)
    const notionItems = await fetchAllItemsFromNotion(false);
    const notionMap = new Map(
      notionItems.map(item => [item.notion_id, item])
    );

    // Identify items that need content fetching (those being added/updated without description)
    const itemsNeedingContent = new Set<string>();
    for (const notionId of [...body.operations.add, ...body.operations.update]) {
      const item = notionMap.get(notionId);
      if (item && !item.description) {
        itemsNeedingContent.add(notionId);
      }
    }

    // Fetch content for items that need it (in parallel with limit)
    if (itemsNeedingContent.size > 0) {
      console.log(`Fetching page content for ${itemsNeedingContent.size} items...`);
      const contentPromises = Array.from(itemsNeedingContent).map(async (notionId) => {
        const content = await fetchPageContentById(notionId);
        const item = notionMap.get(notionId);
        if (item && content) {
          item.description = content;
        }
      });
      await Promise.all(contentPromises);
    }

    const results: ItemSyncResult = {
      success: true,
      added: 0,
      updated: 0,
      deleted: 0,
      errors: [],
    };

    // Phase 1: Deletions
    if (body.operations.delete.length > 0) {
      const deleteResult = await deleteCatalogItemsByNotionId(body.operations.delete);
      results.deleted = deleteResult.deleted;
      results.errors.push(...deleteResult.errors);
    }

    // Phase 2: Updates
    for (const notionId of body.operations.update) {
      try {
        const notionItem = notionMap.get(notionId);
        if (!notionItem) {
          results.errors.push(`Item avec notion_id "${notionId}" introuvable dans Notion`);
          continue;
        }

        await upsertCatalogItem(notionItem);
        results.updated++;
      } catch (error) {
        results.errors.push(
          `Échec de la mise à jour de "${notionId}": ${error instanceof Error ? error.message : 'Erreur inconnue'}`
        );
      }
    }

    // Phase 3: Additions
    for (const notionId of body.operations.add) {
      try {
        const notionItem = notionMap.get(notionId);
        if (!notionItem) {
          results.errors.push(`Item avec notion_id "${notionId}" introuvable dans Notion`);
          continue;
        }

        await upsertCatalogItem(notionItem);
        results.added++;
      } catch (error) {
        results.errors.push(
          `Échec de l'ajout de "${notionId}": ${error instanceof Error ? error.message : 'Erreur inconnue'}`
        );
      }
    }

    // Phase 4: Update inventory items that reference updated catalog items
    const updatedNotionIds = [...body.operations.add, ...body.operations.update];
    if (updatedNotionIds.length > 0) {
      console.log(`Checking inventories for items referencing ${updatedNotionIds.length} catalog items...`);

      try {
        // Get all inventories
        const inventoriesResult = await pool.query(
          'SELECT id, character_id, inventory FROM character_inventories'
        );

        let inventoriesUpdated = 0;

        for (const row of inventoriesResult.rows) {
          const inventory: CharacterInventory = row.inventory;
          let modified = false;

          // Update equipment items
          if (inventory.equipment) {
            inventory.equipment = inventory.equipment.map((item: EquipmentItem) => {
              if (item.catalogNotionId && updatedNotionIds.includes(item.catalogNotionId)) {
                const catalogItem = notionMap.get(item.catalogNotionId);
                if (catalogItem) {
                  modified = true;
                  return {
                    ...item,
                    name: catalogItem.name,
                    description: catalogItem.description || item.description,
                    rarity: catalogItem.rarity || item.rarity,
                  };
                }
              }
              return item;
            });
          }

          // Update consumable items
          if (inventory.consumables) {
            inventory.consumables = inventory.consumables.map((item: ConsumableItem) => {
              if (item.catalogNotionId && updatedNotionIds.includes(item.catalogNotionId)) {
                const catalogItem = notionMap.get(item.catalogNotionId);
                if (catalogItem) {
                  modified = true;
                  return {
                    ...item,
                    name: catalogItem.name,
                    description: catalogItem.description || item.description,
                    rarity: catalogItem.rarity || item.rarity,
                  };
                }
              }
              return item;
            });
          }

          // Update misc items
          if (inventory.items) {
            inventory.items = inventory.items.map((item: MiscItem) => {
              if (item.catalogNotionId && updatedNotionIds.includes(item.catalogNotionId)) {
                const catalogItem = notionMap.get(item.catalogNotionId);
                if (catalogItem) {
                  modified = true;
                  return {
                    ...item,
                    name: catalogItem.name,
                    description: catalogItem.description || item.description,
                    rarity: catalogItem.rarity || item.rarity,
                  };
                }
              }
              return item;
            });
          }

          // Save if modified
          if (modified) {
            await pool.query(
              'UPDATE character_inventories SET inventory = $1, updated_at = CURRENT_TIMESTAMP WHERE id = $2',
              [JSON.stringify(inventory), row.id]
            );
            inventoriesUpdated++;
            console.log(`Updated inventory for character ${row.character_id}`);
          }
        }

        if (inventoriesUpdated > 0) {
          console.log(`Updated ${inventoriesUpdated} inventories with catalog changes`);
        }
      } catch (error) {
        console.error('Error updating inventories:', error);
        results.errors.push(`Erreur lors de la mise à jour des inventaires: ${error instanceof Error ? error.message : 'Erreur inconnue'}`);
      }
    }

    console.log('Item sync apply completed:', results);

    return NextResponse.json(results);
  } catch (error) {
    console.error('Error applying item sync:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return NextResponse.json(
      {
        success: false,
        added: 0,
        updated: 0,
        deleted: 0,
        errors: [`Échec de l'application: ${errorMessage}`],
      } as ItemSyncResult,
      { status: 500 }
    );
  }
}
