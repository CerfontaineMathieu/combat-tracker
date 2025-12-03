import { Client } from '@notionhq/client';
import type { CatalogItemInput, ItemCategory, ItemSubcategory } from './types';

// Database IDs from environment
const ARMES_DATABASE_ID = process.env.NOTION_ITEMS_ARMES_DATABASE_ID;
const OBJETS_DATABASE_ID = process.env.NOTION_ITEMS_OBJETS_DATABASE_ID;
const PLANTES_DATABASE_ID = process.env.NOTION_ITEMS_PLANTES_DATABASE_ID;
const POISONS_DATABASE_ID = process.env.NOTION_ITEMS_POISONS_DATABASE_ID;
const ARMURES_DATABASE_ID = process.env.NOTION_ITEMS_ARMURES_DATABASE_ID;

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
 * Extract text from a single block
 */
function extractBlockText(block: any): string {
  const blockType = block.type;
  const blockContent = block[blockType];

  if (!blockContent) return '';

  // Handle rich_text blocks (paragraph, headings, lists, quotes, callouts, toggles)
  if (blockContent.rich_text) {
    return extractText(blockContent.rich_text);
  }

  // Handle code blocks
  if (blockContent.language && blockContent.rich_text) {
    return extractText(blockContent.rich_text);
  }

  return '';
}

/**
 * Recursively fetch blocks and their children
 */
async function fetchBlocksRecursively(notion: Client, blockId: string, depth: number = 0): Promise<string[]> {
  if (depth > 3) return []; // Limit recursion depth

  const textParts: string[] = [];
  let hasMore = true;
  let startCursor: string | undefined;

  while (hasMore) {
    const response = await notion.blocks.children.list({
      block_id: blockId,
      start_cursor: startCursor,
    });

    for (const block of response.results as any[]) {
      // Extract text from this block
      const text = extractBlockText(block);
      if (text) textParts.push(text);

      // If block has children (like toggle, callout, etc.), fetch them recursively
      if (block.has_children) {
        const childTexts = await fetchBlocksRecursively(notion, block.id, depth + 1);
        textParts.push(...childTexts);
      }
    }

    hasMore = response.has_more;
    startCursor = response.next_cursor ?? undefined;
  }

  return textParts;
}

/**
 * Fetch page content (blocks) and extract text
 */
async function fetchPageContent(pageId: string): Promise<string> {
  try {
    const notion = getNotionClient();
    const textParts = await fetchBlocksRecursively(notion, pageId);
    return textParts.join('\n').trim();
  } catch (error) {
    console.error(`Error fetching page content for ${pageId}:`, error);
    return '';
  }
}

/**
 * Fetch page content for a specific notion_id (exported for use in sync apply)
 */
export async function fetchPageContentById(notionId: string): Promise<string> {
  const content = await fetchPageContent(notionId);
  if (!content) {
    console.log(`[fetchPageContentById] No content found for ${notionId}`);
  }
  return content;
}

/**
 * Debug function to get all properties of an item by notion_id
 */
export async function debugGetItemProperties(notionId: string): Promise<Record<string, string>> {
  try {
    const notion = getNotionClient();
    const page = await notion.pages.retrieve({ page_id: notionId }) as any;
    const props = page.properties;

    const result: Record<string, string> = {};
    for (const [key, value] of Object.entries(props)) {
      const prop = value as any;
      if (prop.rich_text) {
        const text = extractText(prop.rich_text);
        if (text) result[key] = `rich_text: "${text.substring(0, 100)}..."`;
      } else if (prop.title) {
        result[key] = `title: "${extractText(prop.title)}"`;
      } else if (prop.select) {
        result[key] = `select: "${prop.select?.name || ''}"`;
      } else if (prop.multi_select) {
        result[key] = `multi_select: [${prop.multi_select.map((s: any) => s.name).join(', ')}]`;
      } else if (prop.number !== undefined) {
        result[key] = `number: ${prop.number}`;
      } else {
        result[key] = prop.type || 'unknown';
      }
    }
    return result;
  } catch (error) {
    console.error(`Error getting properties for ${notionId}:`, error);
    return {};
  }
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
async function mapNotionPageToCatalogItem(
  page: any,
  sourceDatabase: string,
  defaultCategory: ItemCategory,
  defaultSubcategory: ItemSubcategory | null,
  fetchContent: boolean = false
): Promise<CatalogItemInput | null> {
  try {
    const props = page.properties;

    // Try to find the name field (common names: Nom, Name, Titre)
    const name = extractTitle(props.Nom) || extractTitle(props.Name) || extractTitle(props.Titre) || '';
    if (!name) {
      console.warn(`Skipping item without name in ${sourceDatabase}:`, page.id);
      return null;
    }

    // Extract description (common French property names)
    let description = extractText(props.Description?.rich_text || []) ||
      extractText(props.Détails?.rich_text || []) ||
      extractText(props.Notes?.rich_text || []) ||
      extractText(props.Effet?.rich_text || []) ||
      extractText(props.Effets?.rich_text || []) ||
      extractText(props.Propriétés?.rich_text || []) ||
      extractText(props.Capacité?.rich_text || []) ||
      extractText(props.Capacités?.rich_text || []) ||
      null;

    // If no description found, log available properties for debugging
    if (!description) {
      const richTextProps = Object.keys(props).filter(key => props[key]?.rich_text);
      if (richTextProps.length > 0) {
        console.log(`[${name}] Available rich_text properties: ${richTextProps.join(', ')}`);
      }
    }

    // If no description found and fetchContent is enabled, get page content
    if (!description && fetchContent) {
      const pageContent = await fetchPageContent(page.id);
      if (pageContent) {
        description = pageContent;
      }
    }

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
export async function fetchArmesFromNotion(fetchContent: boolean = true): Promise<CatalogItemInput[]> {
  if (!ARMES_DATABASE_ID) {
    console.warn('NOTION_ITEMS_ARMES_DATABASE_ID not configured');
    return [];
  }

  const pages = await fetchAllPagesFromDatabase(ARMES_DATABASE_ID);
  const items: CatalogItemInput[] = [];

  for (const page of pages) {
    const item = await mapNotionPageToCatalogItem(page, 'armes', 'equipment', 'weapon', fetchContent);
    if (item) {
      items.push(item);
    }
  }

  return items;
}

/**
 * Fetch items from Objets et Objets Magiques database
 */
export async function fetchObjetsFromNotion(fetchContent: boolean = true): Promise<CatalogItemInput[]> {
  if (!OBJETS_DATABASE_ID) {
    console.warn('NOTION_ITEMS_OBJETS_DATABASE_ID not configured');
    return [];
  }

  const pages = await fetchAllPagesFromDatabase(OBJETS_DATABASE_ID);
  const items: CatalogItemInput[] = [];

  for (const page of pages) {
    // Category and subcategory determined by Type property in mapNotionPageToCatalogItem
    const item = await mapNotionPageToCatalogItem(page, 'objets', 'misc', 'objet_magique', fetchContent);
    if (item) {
      items.push(item);
    }
  }

  return items;
}

/**
 * Fetch items from Plantes database
 */
export async function fetchPlantesFromNotion(fetchContent: boolean = true): Promise<CatalogItemInput[]> {
  if (!PLANTES_DATABASE_ID) {
    console.warn('NOTION_ITEMS_PLANTES_DATABASE_ID not configured');
    return [];
  }

  const pages = await fetchAllPagesFromDatabase(PLANTES_DATABASE_ID);
  const items: CatalogItemInput[] = [];

  for (const page of pages) {
    const item = await mapNotionPageToCatalogItem(page, 'plantes', 'misc', 'plante', fetchContent);
    if (item) {
      items.push(item);
    }
  }

  return items;
}

/**
 * Fetch items from Poisons database
 */
export async function fetchPoisonsFromNotion(fetchContent: boolean = true): Promise<CatalogItemInput[]> {
  if (!POISONS_DATABASE_ID) {
    console.warn('NOTION_ITEMS_POISONS_DATABASE_ID not configured');
    return [];
  }

  const pages = await fetchAllPagesFromDatabase(POISONS_DATABASE_ID);
  const items: CatalogItemInput[] = [];

  for (const page of pages) {
    const item = await mapNotionPageToCatalogItem(page, 'poisons', 'misc', 'poison', fetchContent);
    if (item) {
      items.push(item);
    }
  }

  return items;
}

/**
 * Fetch items from Armures et bouclier magiques database
 */
export async function fetchArmuresFromNotion(fetchContent: boolean = true): Promise<CatalogItemInput[]> {
  if (!ARMURES_DATABASE_ID) {
    console.warn('NOTION_ITEMS_ARMURES_DATABASE_ID not configured');
    return [];
  }

  const pages = await fetchAllPagesFromDatabase(ARMURES_DATABASE_ID);
  const items: CatalogItemInput[] = [];

  for (const page of pages) {
    const item = await mapNotionPageToCatalogItem(page, 'armures', 'equipment', 'other', fetchContent);
    if (item) {
      items.push(item);
    }
  }

  return items;
}

/**
 * Fetch all items from all configured Notion databases
 */
export async function fetchAllItemsFromNotion(fetchContent: boolean = true): Promise<CatalogItemInput[]> {
  const results = await Promise.allSettled([
    fetchArmesFromNotion(fetchContent),
    fetchObjetsFromNotion(fetchContent),
    fetchPlantesFromNotion(fetchContent),
    fetchPoisonsFromNotion(fetchContent),
    fetchArmuresFromNotion(fetchContent),
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
    { name: 'Armures et Boucliers Magiques', configured: !!ARMURES_DATABASE_ID },
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

  // Test Armes database (fetchContent=false for fast testing)
  if (ARMES_DATABASE_ID) {
    try {
      const items = await fetchArmesFromNotion(false);
      databases.push({ name: 'Armes Magiques', status: 'ok', count: items.length });
    } catch (error) {
      databases.push({ name: 'Armes Magiques', status: 'error', error: String(error) });
    }
  } else {
    databases.push({ name: 'Armes Magiques', status: 'not_configured' });
  }

  // Test Objets database (fetchContent=false for fast testing)
  if (OBJETS_DATABASE_ID) {
    try {
      const items = await fetchObjetsFromNotion(false);
      databases.push({ name: 'Objets et Objets Magiques', status: 'ok', count: items.length });
    } catch (error) {
      databases.push({ name: 'Objets et Objets Magiques', status: 'error', error: String(error) });
    }
  } else {
    databases.push({ name: 'Objets et Objets Magiques', status: 'not_configured' });
  }

  // Test Plantes database (fetchContent=false for fast testing)
  if (PLANTES_DATABASE_ID) {
    try {
      const items = await fetchPlantesFromNotion(false);
      databases.push({ name: 'Plantes', status: 'ok', count: items.length });
    } catch (error) {
      databases.push({ name: 'Plantes', status: 'error', error: String(error) });
    }
  } else {
    databases.push({ name: 'Plantes', status: 'not_configured' });
  }

  // Test Poisons database (fetchContent=false for fast testing)
  if (POISONS_DATABASE_ID) {
    try {
      const items = await fetchPoisonsFromNotion(false);
      databases.push({ name: 'Poisons', status: 'ok', count: items.length });
    } catch (error) {
      databases.push({ name: 'Poisons', status: 'error', error: String(error) });
    }
  } else {
    databases.push({ name: 'Poisons', status: 'not_configured' });
  }

  // Test Armures database (fetchContent=false for fast testing)
  if (ARMURES_DATABASE_ID) {
    try {
      const items = await fetchArmuresFromNotion(false);
      databases.push({ name: 'Armures et Boucliers Magiques', status: 'ok', count: items.length });
    } catch (error) {
      databases.push({ name: 'Armures et Boucliers Magiques', status: 'error', error: String(error) });
    }
  } else {
    databases.push({ name: 'Armures et Boucliers Magiques', status: 'not_configured' });
  }

  const success = databases.some(db => db.status === 'ok');
  return { success, databases };
}
