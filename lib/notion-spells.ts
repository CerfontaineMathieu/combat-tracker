import { Client } from '@notionhq/client';
import type { CatalogSpellInput } from './types';

// Database ID from environment
const SPELLS_DATABASE_ID = process.env.NOTION_SPELLS_DATABASE_ID;

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
 * Helper function to extract title property
 */
function extractTitle(titleProp: any): string {
  if (!titleProp || !titleProp.title) return '';
  return extractText(titleProp.title);
}

/**
 * Helper function to extract number property
 */
function extractNumber(numberProp: any): number | null {
  if (numberProp === undefined || numberProp === null) return null;
  if (typeof numberProp === 'number') return numberProp;
  if (numberProp.number !== undefined) return numberProp.number;
  return null;
}

/**
 * Helper function to extract checkbox property
 */
function extractCheckbox(checkboxProp: any): boolean {
  if (!checkboxProp) return false;
  if (typeof checkboxProp === 'boolean') return checkboxProp;
  return checkboxProp.checkbox === true;
}

/**
 * Helper function to extract multi_select property (returns all values as array)
 */
function extractMultiSelectArray(multiSelectProp: any): string[] {
  if (!multiSelectProp || !multiSelectProp.multi_select) return [];
  if (!Array.isArray(multiSelectProp.multi_select)) return [];
  return multiSelectProp.multi_select.map((item: any) => item.name || '').filter(Boolean);
}

/**
 * Helper function to extract select property
 */
function extractSelect(selectProp: any): string {
  if (!selectProp || !selectProp.select) return '';
  return selectProp.select.name || '';
}

/**
 * Fetch all pages from the spells database
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
 * Recursively fetch blocks and their children for page content
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
      const blockType = block.type;
      const blockContent = block[blockType];

      if (blockContent?.rich_text) {
        const text = extractText(blockContent.rich_text);
        if (text) textParts.push(text);
      }

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
export async function fetchSpellPageContentById(notionId: string): Promise<string> {
  return fetchPageContent(notionId);
}

/**
 * Map a Notion page to a spell catalog item
 */
async function mapNotionPageToSpell(
  page: any,
  fetchContent: boolean = false
): Promise<CatalogSpellInput | null> {
  try {
    const props = page.properties;

    // Extract name (Nom is title property)
    const name = extractTitle(props.Nom) || '';
    if (!name) {
      console.warn('Skipping spell without name:', page.id);
      return null;
    }

    // Extract level (Niveau - number property)
    const level = extractNumber(props.Niveau) ?? 0;

    // Extract classes (Classe - multi_select)
    const classes = extractMultiSelectArray(props.Classe);

    // Extract casting time (Temps d'incantation - multi_select, rich_text, or select)
    const casting_time = extractMultiSelectArray(props["Temps d'incantation"]).join(', ') ||
      extractText(props["Temps d'incantation"]?.rich_text || []) ||
      extractSelect(props["Temps d'incantation"]) ||
      null;

    // Extract range (Portée - rich_text or select)
    const range = extractText(props.Portée?.rich_text || []) ||
      extractSelect(props.Portée) ||
      null;

    // Extract duration (Durée - rich_text or select)
    const duration = extractText(props.Durée?.rich_text || []) ||
      extractSelect(props.Durée) ||
      null;

    // Extract components (Composante - multi_select, rich_text, or select)
    const components = extractMultiSelectArray(props.Composante).map(c => {
      // Convert full French names to abbreviations
      if (c === 'Verbale') return 'V';
      if (c === 'Somatique') return 'S';
      if (c === 'Matériel') return 'M';
      return c;
    }).join(', ') ||
      extractText(props.Composante?.rich_text || []) ||
      extractSelect(props.Composante) ||
      null;

    // Extract concentration (Concentration - checkbox)
    const concentration = extractCheckbox(props.Concentration);

    // Extract school of magic (École de magie - select)
    const school = extractSelect(props['École de magie']) ||
      extractSelect(props['École']) ||
      null;

    // Extract material details (Matériel détaillé - rich_text)
    const material_details = extractText(props['Matériel détaillé']?.rich_text || []) ||
      extractText(props['Matériel']?.rich_text || []) ||
      null;

    // Extract description (Description - rich_text)
    let description = extractText(props.Description?.rich_text || []) || null;

    // If no description and fetchContent enabled, get page content
    if (!description && fetchContent) {
      const pageContent = await fetchPageContent(page.id);
      if (pageContent) {
        description = pageContent;
      }
    }

    // Extract higher levels text if available (might be in Description or separate)
    const higher_levels = extractText(props['Niveaux supérieurs']?.rich_text || []) ||
      extractText(props['À plus haut niveau']?.rich_text || []) ||
      null;

    // Extract saving throw characteristic (JdS - select)
    const saving_throw = extractSelect(props['JdS']) || null;

    return {
      notion_id: page.id,
      name,
      level,
      school,
      classes,
      casting_time,
      range,
      duration,
      components,
      material_details,
      concentration,
      description,
      higher_levels,
      saving_throw,
    };
  } catch (error) {
    console.error('Error mapping Notion page to spell:', error);
    return null;
  }
}

/**
 * Fetch all spells from the Notion database
 */
export async function fetchSpellsFromNotion(fetchContent: boolean = false): Promise<CatalogSpellInput[]> {
  if (!SPELLS_DATABASE_ID) {
    console.warn('NOTION_SPELLS_DATABASE_ID not configured');
    return [];
  }

  const pages = await fetchAllPagesFromDatabase(SPELLS_DATABASE_ID);
  const spells: CatalogSpellInput[] = [];

  for (const page of pages) {
    const spell = await mapNotionPageToSpell(page, fetchContent);
    if (spell) {
      spells.push(spell);
    }
  }

  return spells;
}

/**
 * Check if spells database is configured
 */
export function isSpellsDatabaseConfigured(): boolean {
  return !!SPELLS_DATABASE_ID;
}

/**
 * Test connection to the spells database
 */
export async function testSpellsDatabaseConnection(): Promise<{
  success: boolean;
  count?: number;
  error?: string;
}> {
  if (!SPELLS_DATABASE_ID) {
    return { success: false, error: 'NOTION_SPELLS_DATABASE_ID not configured' };
  }

  try {
    const spells = await fetchSpellsFromNotion(false);
    return { success: true, count: spells.length };
  } catch (error) {
    return { success: false, error: String(error) };
  }
}

/**
 * Debug function to get all properties of a spell by notion_id
 */
export async function debugGetSpellProperties(notionId: string): Promise<Record<string, string>> {
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
      } else if (prop.checkbox !== undefined) {
        result[key] = `checkbox: ${prop.checkbox}`;
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
