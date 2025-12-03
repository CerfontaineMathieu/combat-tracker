import type { CatalogItem, CatalogItemInput, ItemSyncPreview } from './types';

/**
 * Compare two items and return a list of changed fields
 *
 * @param existing - Item from database
 * @param updated - Item from Notion
 * @param skipNullDescription - If true, don't flag description as changed when
 *                              Notion has null description (used during preview
 *                              when content isn't fetched yet)
 */
export function compareItems(
  existing: CatalogItem,
  updated: CatalogItemInput,
  skipNullDescription: boolean = false
): string[] {
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

  // Description comparison:
  // - If skipNullDescription is true and updated.description is null, don't flag as changed
  //   (because we didn't fetch page content during preview)
  // - Otherwise, compare normally
  if (skipNullDescription) {
    // Only flag if Notion has a description that differs from DB
    if (updated.description !== null && existing.description !== updated.description) {
      changes.push('description');
    }
  } else {
    if (existing.description !== updated.description) {
      changes.push('description');
    }
  }

  if (existing.rarity !== updated.rarity) {
    changes.push('rarity');
  }
  if (existing.image_url !== updated.image_url) {
    changes.push('image_url');
  }

  // Compare properties (JSONB) - use sorted keys for consistent comparison
  const sortedStringify = (obj: Record<string, unknown> | null | undefined) => {
    if (!obj) return '{}';
    const sorted = Object.keys(obj).sort().reduce((acc, key) => {
      acc[key] = obj[key];
      return acc;
    }, {} as Record<string, unknown>);
    return JSON.stringify(sorted);
  };

  const existingProps = sortedStringify(existing.properties);
  const updatedProps = sortedStringify(updated.properties);
  if (existingProps !== updatedProps) {
    changes.push('properties');
  }

  return changes;
}

/**
 * Build a sync preview comparing Notion items with database items
 *
 * @param notionItems - Items fetched from Notion
 * @param dbItems - Items from local database
 * @param skipNullDescription - If true, don't flag items as changed when
 *                              Notion description is null (preview mode)
 */
export function buildItemSyncPreview(
  notionItems: CatalogItemInput[],
  dbItems: CatalogItem[],
  skipNullDescription: boolean = false
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
      // Check if item has changed (pass skipNullDescription flag)
      const changes = compareItems(existingItem, notionItem, skipNullDescription);
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
