import { Client } from '@notionhq/client';
import type { CatalogItemInput, ItemCategory, ItemSubcategory } from './types';

// Database IDs from environment
const ARMES_DATABASE_ID = process.env.NOTION_ITEMS_ARMES_DATABASE_ID;
const OBJETS_DATABASE_ID = process.env.NOTION_ITEMS_OBJETS_DATABASE_ID;
const PLANTES_DATABASE_ID = process.env.NOTION_ITEMS_PLANTES_DATABASE_ID;
const POISONS_DATABASE_ID = process.env.NOTION_ITEMS_POISONS_DATABASE_ID;

// Cache for data source IDs (database_id -> data_source_id)
const dataSourceCache: Map<string, string> = new Map();

/**
 * Get Notion client instance
 */
function getNotionClient() {
  const token = process.env.NOTION_API_TOKEN;

  if (!token) {
    throw new Error('NOTION_API_TOKEN is not defined');
  }

  return new Client({ auth: token });
}

/**
 * Get the data_source_id from a database_id (v5 SDK requirement)
 */
async function getDataSourceId(notion: Client, databaseId: string): Promise<string> {
  const cached = dataSourceCache.get(databaseId);
  if (cached) {
    return cached;
  }

  const database = await notion.databases.retrieve({ database_id: databaseId }) as any;
  const dataSources = database.data_sources;
  if (!dataSources || dataSources.length === 0) {
    throw new Error(`No data sources found for database ${databaseId}`);
  }

  const dataSourceId = dataSources[0].id;
  dataSourceCache.set(databaseId, dataSourceId);

  return dataSourceId;
}

/**
 * Helper function to extract text from Notion rich text property
 */
function extractText(richText: any[]): string {
  if (!richText || !Array.isArray(richText)) return '';
  return richText.map((rt) => rt.plain_text || '').join('');
}

/**
 * Helper function to extract select property
 */
function extractSelect(selectProp: any): string {
  if (!selectProp || !selectProp.select) return '';
  return selectProp.select.name || '';
}

/**
 * Helper function to extract multi_select property (returns first value)
 */
function extractMultiSelect(multiSelectProp: any): string {
  if (!multiSelectProp || !multiSelectProp.multi_select) return '';
  if (!Array.isArray(multiSelectProp.multi_select) || multiSelectProp.multi_select.length === 0) return '';
  return multiSelectProp.multi_select[0].name || '';
}

/**
 * Helper function to extract title property
 */
function extractTitle(titleProp: any): string {
  if (!titleProp || !titleProp.title) return '';
  return extractText(titleProp.title);
}

/**
 * Fetch all pages from a Notion database
 */
async function fetchAllPagesFromDatabase(databaseId: string): Promise<any[]> {
  const notion = getNotionClient();
  const dataSourceId = await getDataSourceId(notion, databaseId);

  const pages: any[] = [];
  let hasMore = true;
  let startCursor: string | undefined;

  while (hasMore) {
    const response = await notion.dataSources.query({
      data_source_id: dataSourceId,
      start_cursor: startCursor,
    });

    pages.push(...response.results);
    hasMore = response.has_more;
    startCursor = response.next_cursor ?? undefined;
  }

  return pages;
}

/**
 * Map a Notion page to a catalog item
 * Uses dynamic property detection based on common French field names
 */
function mapNotionPageToCatalogItem(
  page: any,
  sourceDatabase: string,
  defaultCategory: ItemCategory,
  defaultSubcategory: ItemSubcategory | null
): CatalogItemInput | null {
  try {
    const props = page.properties;

    // Try to find the name field (common names: Nom, Name, Titre)
    const name = extractTitle(props.Nom) || extractTitle(props.Name) || extractTitle(props.Titre) || '';
    if (!name) {
      console.warn(`Skipping item without name in ${sourceDatabase}:`, page.id);
      return null;
    }

    // Extract description (common names: Description, Détails, Notes)
    const description = extractText(props.Description?.rich_text || []) ||
      extractText(props.Détails?.rich_text || []) ||
      extractText(props.Notes?.rich_text || []) ||
      null;

    // Extract rarity (common names: Rareté, Rarity)
    const rarity = extractSelect(props.Rareté) || extractSelect(props.Rarity) || null;

    // Extract type for subcategory determination (for Objets database)
    // Type can be either select or multi_select depending on the database
    const type = extractSelect(props.Type) || extractMultiSelect(props.Type) || '';

    // Determine category and subcategory based on type
    let category = defaultCategory;
    let subcategory = defaultSubcategory;

    if (sourceDatabase === 'objets' && type) {
      const typeLower = type.toLowerCase();
      // Consumables: potions, flèches, parchemins
      if (typeLower === 'potion' || typeLower.includes('potion')) {
        category = 'consumable';
        subcategory = 'potion';
      } else if (typeLower === 'flèches' || typeLower === 'fleches' || typeLower.includes('flèche') || typeLower.includes('fleche')) {
        category = 'consumable';
        subcategory = 'fleche';
      } else if (typeLower === 'parchemin' || typeLower.includes('parchemin')) {
        category = 'consumable';
        subcategory = 'parchemin';
      } else {
        // Equipment: wearable items (anneau, amulette, bottes, cape, gants, lunettes)
        const equipmentTypes = ['anneau', 'amulette', 'bottes', 'cape', 'gants', 'lunettes'];
        if (equipmentTypes.includes(typeLower)) {
          category = 'equipment';
          subcategory = 'objet_magique';
        } else {
          category = 'misc';
          subcategory = 'objet_magique';
        }
      }
    }

    // Extract image URL from cover
    const image_url = page.cover?.external?.url || page.cover?.file?.url || null;

    // Collect all other properties as extra data
    const properties: Record<string, unknown> = {};
    const excludeFields = ['Nom', 'Name', 'Titre', 'Description', 'Détails', 'Notes', 'Rareté', 'Rarity', 'Type'];

    for (const [key, value] of Object.entries(props)) {
      if (excludeFields.includes(key)) continue;

      const prop = value as any;
      if (prop.rich_text) {
        const text = extractText(prop.rich_text);
        if (text) properties[key] = text;
      } else if (prop.number !== undefined && prop.number !== null) {
        properties[key] = prop.number;
      } else if (prop.select) {
        const selectValue = extractSelect(prop);
        if (selectValue) properties[key] = selectValue;
      } else if (prop.checkbox !== undefined) {
        properties[key] = prop.checkbox;
      } else if (prop.formula?.number !== undefined) {
        properties[key] = prop.formula.number;
      } else if (prop.formula?.string) {
        properties[key] = prop.formula.string;
      }
    }

    return {
      notion_id: page.id,
      name,
      category,
      subcategory,
      source_database: sourceDatabase,
      description,
      rarity,
      properties,
      image_url,
    };
  } catch (error) {
    console.error('Error mapping Notion page to catalog item:', error);
    return null;
  }
}

/**
 * Fetch items from Armes Magiques database
 */
export async function fetchArmesFromNotion(): Promise<CatalogItemInput[]> {
  if (!ARMES_DATABASE_ID) {
    console.warn('NOTION_ITEMS_ARMES_DATABASE_ID not configured');
    return [];
  }

  const pages = await fetchAllPagesFromDatabase(ARMES_DATABASE_ID);
  const items: CatalogItemInput[] = [];

  for (const page of pages) {
    const item = mapNotionPageToCatalogItem(page, 'armes', 'equipment', 'weapon');
    if (item) {
      items.push(item);
    }
  }

  return items;
}

/**
 * Fetch items from Objets et Objets Magiques database
 */
export async function fetchObjetsFromNotion(): Promise<CatalogItemInput[]> {
  if (!OBJETS_DATABASE_ID) {
    console.warn('NOTION_ITEMS_OBJETS_DATABASE_ID not configured');
    return [];
  }

  const pages = await fetchAllPagesFromDatabase(OBJETS_DATABASE_ID);
  const items: CatalogItemInput[] = [];

  for (const page of pages) {
    // Category and subcategory determined by Type property in mapNotionPageToCatalogItem
    const item = mapNotionPageToCatalogItem(page, 'objets', 'misc', 'objet_magique');
    if (item) {
      items.push(item);
    }
  }

  return items;
}

/**
 * Fetch items from Plantes database
 */
export async function fetchPlantesFromNotion(): Promise<CatalogItemInput[]> {
  if (!PLANTES_DATABASE_ID) {
    console.warn('NOTION_ITEMS_PLANTES_DATABASE_ID not configured');
    return [];
  }

  const pages = await fetchAllPagesFromDatabase(PLANTES_DATABASE_ID);
  const items: CatalogItemInput[] = [];

  for (const page of pages) {
    const item = mapNotionPageToCatalogItem(page, 'plantes', 'misc', 'plante');
    if (item) {
      items.push(item);
    }
  }

  return items;
}

/**
 * Fetch items from Poisons database
 */
export async function fetchPoisonsFromNotion(): Promise<CatalogItemInput[]> {
  if (!POISONS_DATABASE_ID) {
    console.warn('NOTION_ITEMS_POISONS_DATABASE_ID not configured');
    return [];
  }

  const pages = await fetchAllPagesFromDatabase(POISONS_DATABASE_ID);
  const items: CatalogItemInput[] = [];

  for (const page of pages) {
    const item = mapNotionPageToCatalogItem(page, 'poisons', 'misc', 'poison');
    if (item) {
      items.push(item);
    }
  }

  return items;
}

/**
 * Fetch all items from all configured Notion databases
 */
export async function fetchAllItemsFromNotion(): Promise<CatalogItemInput[]> {
  const results = await Promise.allSettled([
    fetchArmesFromNotion(),
    fetchObjetsFromNotion(),
    fetchPlantesFromNotion(),
    fetchPoisonsFromNotion(),
  ]);

  const allItems: CatalogItemInput[] = [];

  for (const result of results) {
    if (result.status === 'fulfilled') {
      allItems.push(...result.value);
    } else {
      console.error('Error fetching items from Notion:', result.reason);
    }
  }

  return allItems;
}

/**
 * Check which databases are configured
 */
export function getConfiguredDatabases(): { name: string; configured: boolean }[] {
  return [
    { name: 'Armes Magiques', configured: !!ARMES_DATABASE_ID },
    { name: 'Objets et Objets Magiques', configured: !!OBJETS_DATABASE_ID },
    { name: 'Plantes', configured: !!PLANTES_DATABASE_ID },
    { name: 'Poisons', configured: !!POISONS_DATABASE_ID },
  ];
}

/**
 * Test connection to all configured databases
 */
export async function testItemDatabasesConnection(): Promise<{
  success: boolean;
  databases: { name: string; status: 'ok' | 'error' | 'not_configured'; count?: number; error?: string }[];
}> {
  const databases: { name: string; status: 'ok' | 'error' | 'not_configured'; count?: number; error?: string }[] = [];

  // Test Armes database
  if (ARMES_DATABASE_ID) {
    try {
      const items = await fetchArmesFromNotion();
      databases.push({ name: 'Armes Magiques', status: 'ok', count: items.length });
    } catch (error) {
      databases.push({ name: 'Armes Magiques', status: 'error', error: String(error) });
    }
  } else {
    databases.push({ name: 'Armes Magiques', status: 'not_configured' });
  }

  // Test Objets database
  if (OBJETS_DATABASE_ID) {
    try {
      const items = await fetchObjetsFromNotion();
      databases.push({ name: 'Objets et Objets Magiques', status: 'ok', count: items.length });
    } catch (error) {
      databases.push({ name: 'Objets et Objets Magiques', status: 'error', error: String(error) });
    }
  } else {
    databases.push({ name: 'Objets et Objets Magiques', status: 'not_configured' });
  }

  // Test Plantes database
  if (PLANTES_DATABASE_ID) {
    try {
      const items = await fetchPlantesFromNotion();
      databases.push({ name: 'Plantes', status: 'ok', count: items.length });
    } catch (error) {
      databases.push({ name: 'Plantes', status: 'error', error: String(error) });
    }
  } else {
    databases.push({ name: 'Plantes', status: 'not_configured' });
  }

  // Test Poisons database
  if (POISONS_DATABASE_ID) {
    try {
      const items = await fetchPoisonsFromNotion();
      databases.push({ name: 'Poisons', status: 'ok', count: items.length });
    } catch (error) {
      databases.push({ name: 'Poisons', status: 'error', error: String(error) });
    }
  } else {
    databases.push({ name: 'Poisons', status: 'not_configured' });
  }

  const success = databases.some(db => db.status === 'ok');
  return { success, databases };
}
