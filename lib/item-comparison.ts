import type { CatalogItem, CatalogItemInput, ItemSyncPreview } from './types';

/**
 * Compare two items and return a list of changed fields
 */
export function compareItems(existing: CatalogItem, updated: CatalogItemInput): string[] {
  const changes: string[] = [];

  if (existing.name !== updated.name) {
    changes.push('name');
  }
  if (existing.category !== updated.category) {
    changes.push('category');
  }
  if (existing.subcategory !== updated.subcategory) {
    changes.push('subcategory');
  }
  if (existing.source_database !== updated.source_database) {
    changes.push('source_database');
  }
  if (existing.description !== updated.description) {
    changes.push('description');
  }
  if (existing.rarity !== updated.rarity) {
    changes.push('rarity');
  }
  if (existing.image_url !== updated.image_url) {
    changes.push('image_url');
  }

  // Compare properties (JSONB)
  const existingProps = JSON.stringify(existing.properties || {});
  const updatedProps = JSON.stringify(updated.properties || {});
  if (existingProps !== updatedProps) {
    changes.push('properties');
  }

  return changes;
}

/**
 * Build a sync preview comparing Notion items with database items
 */
export function buildItemSyncPreview(
  notionItems: CatalogItemInput[],
  dbItems: CatalogItem[]
): ItemSyncPreview {
  // Create a map of existing items by notion_id for quick lookup
  const dbItemsByNotionId = new Map<string, CatalogItem>();
  for (const item of dbItems) {
    dbItemsByNotionId.set(item.notion_id, item);
  }

  // Track which notion_ids are in the new data
  const notionIds = new Set<string>();

  const toAdd: CatalogItemInput[] = [];
  const toUpdate: { existing: CatalogItem; updated: CatalogItemInput; changes: string[] }[] = [];
  let unchanged = 0;

  // Process each Notion item
  for (const notionItem of notionItems) {
    notionIds.add(notionItem.notion_id);

    const existingItem = dbItemsByNotionId.get(notionItem.notion_id);

    if (!existingItem) {
      // New item to add
      toAdd.push(notionItem);
    } else {
      // Check if item has changed
      const changes = compareItems(existingItem, notionItem);
      if (changes.length > 0) {
        toUpdate.push({
          existing: existingItem,
          updated: notionItem,
          changes,
        });
      } else {
        unchanged++;
      }
    }
  }

  // Find items to delete (in DB but not in Notion anymore)
  const toDelete: CatalogItem[] = [];
  for (const dbItem of dbItems) {
    if (!notionIds.has(dbItem.notion_id)) {
      toDelete.push(dbItem);
    }
  }

  return {
    toAdd,
    toUpdate,
    toDelete,
    unchanged,
  };
}

/**
 * Get a human-readable summary of changes
 */
export function getChangesSummary(changes: string[]): string {
  const fieldLabels: Record<string, string> = {
    name: 'Nom',
    category: 'Catégorie',
    subcategory: 'Sous-catégorie',
    source_database: 'Base source',
    description: 'Description',
    rarity: 'Rareté',
    image_url: 'Image',
    properties: 'Propriétés',
  };

  return changes.map(field => fieldLabels[field] || field).join(', ');
}
