/**
 * Script to extract saving throw types from spell descriptions
 * and update the JdS field in Notion database
 *
 * Run with: npx tsx scripts/extract-spell-jds.ts
 */

import { Client } from '@notionhq/client';

// Configuration
const NOTION_API_TOKEN = process.env.NOTION_API_TOKEN;
const DATABASE_ID = '245300de717f80cd8895f129f1b65119';

if (!NOTION_API_TOKEN) {
  console.error('Error: NOTION_API_TOKEN environment variable is required');
  process.exit(1);
}

const notion = new Client({ auth: NOTION_API_TOKEN });

// Types
type SaveType = 'FOR' | 'DEX' | 'CON' | 'INT' | 'SAG' | 'CHA' | 'Aucun';

interface SpellResult {
  name: string;
  saves: SaveType[];
  description_excerpt?: string;
}

// Statistics tracking
const stats = {
  total: 0,
  processed: 0,
  errors: 0,
  bySave: {
    FOR: 0,
    DEX: 0,
    CON: 0,
    INT: 0,
    SAG: 0,
    CHA: 0,
    Aucun: 0,
  },
  multiSave: 0,
};

/**
 * Extract saving throw types from spell description
 */
function extractSaveTypes(description: string): SaveType[] {
  if (!description) {
    return ['Aucun'];
  }

  const descLower = description.toLowerCase();
  const foundSaves: SaveType[] = [];

  // Patterns for each save type (case-insensitive)
  const patterns: [RegExp, SaveType][] = [
    [/jet de sauvegarde de force|sauvegarde de force|js de force/i, 'FOR'],
    [/jet de sauvegarde de dextérité|sauvegarde de dextérité|js de dextérité/i, 'DEX'],
    [/jet de sauvegarde de constitution|sauvegarde de constitution|js de constitution/i, 'CON'],
    [/jet de sauvegarde d'intelligence|sauvegarde d'intelligence|js d'intelligence/i, 'INT'],
    [/jet de sauvegarde de sagesse|sauvegarde de sagesse|js de sagesse/i, 'SAG'],
    [/jet de sauvegarde de charisme|sauvegarde de charisme|js de charisme/i, 'CHA'],
  ];

  for (const [pattern, saveType] of patterns) {
    if (pattern.test(descLower)) {
      if (!foundSaves.includes(saveType)) {
        foundSaves.push(saveType);
      }
    }
  }

  return foundSaves.length > 0 ? foundSaves : ['Aucun'];
}

/**
 * Get data source ID from database
 */
async function getDataSourceId(): Promise<string> {
  const database = await notion.databases.retrieve({ database_id: DATABASE_ID }) as any;
  const dataSources = database.data_sources;
  if (!dataSources || dataSources.length === 0) {
    throw new Error(`No data sources found for database ${DATABASE_ID}`);
  }
  return dataSources[0].id;
}

/**
 * Fetch all spells from the database
 */
async function fetchAllSpells(dataSourceId: string): Promise<any[]> {
  const pages: any[] = [];
  let hasMore = true;
  let startCursor: string | undefined;

  while (hasMore) {
    const response = await (notion as any).dataSources.query({
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
 * Extract text from Notion rich text property
 */
function extractText(richText: any[]): string {
  if (!richText || !Array.isArray(richText)) return '';
  return richText.map((rt) => rt.plain_text || '').join('');
}

/**
 * Extract title from Notion title property
 */
function extractTitle(titleProp: any): string {
  if (!titleProp || !titleProp.title) return '';
  return extractText(titleProp.title);
}

/**
 * Update a spell with its JdS values
 */
async function updateSpellJdS(pageId: string, saves: SaveType[]): Promise<void> {
  await notion.pages.update({
    page_id: pageId,
    properties: {
      JdS: {
        multi_select: saves.map(s => ({ name: s })),
      },
    },
  });
}

/**
 * Process a single spell
 */
async function processSpell(page: any): Promise<SpellResult> {
  const props = page.properties;
  const name = extractTitle(props.Nom) || 'Unknown';
  const description = extractText(props.Description?.rich_text || []);

  const saves = extractSaveTypes(description);

  // Update statistics
  for (const save of saves) {
    stats.bySave[save]++;
  }
  if (saves.length > 1 && saves[0] !== 'Aucun') {
    stats.multiSave++;
  }

  // Find excerpt with "sauvegarde" for logging
  let excerpt: string | undefined;
  if (saves[0] !== 'Aucun') {
    const match = description.match(/.{0,30}sauvegarde.{0,50}/i);
    if (match) {
      excerpt = `...${match[0]}...`;
    }
  }

  // Update the spell in Notion
  await updateSpellJdS(page.id, saves);

  return { name, saves, description_excerpt: excerpt };
}

/**
 * Main function
 */
async function main() {
  console.log('=== Extraction JdS des Sorts ===\n');

  // Get data source ID
  console.log('Fetching data source ID...');
  const dataSourceId = await getDataSourceId();
  console.log(`Data source ID: ${dataSourceId}\n`);

  // Fetch all spells
  console.log('Fetching all spells...');
  const spells = await fetchAllSpells(dataSourceId);
  stats.total = spells.length;
  console.log(`Found ${stats.total} spells\n`);

  console.log('Processing spells...\n');

  // Process each spell
  for (let i = 0; i < spells.length; i++) {
    const spell = spells[i];
    try {
      const result = await processSpell(spell);
      stats.processed++;

      // Log progress
      const savesStr = result.saves.join(', ');
      const excerptStr = result.description_excerpt ? ` | "${result.description_excerpt}"` : '';
      console.log(`[${i + 1}/${stats.total}] ${result.name} → [${savesStr}]${excerptStr}`);

      // Rate limiting: wait 350ms between requests
      await new Promise(resolve => setTimeout(resolve, 350));
    } catch (error) {
      stats.errors++;
      const name = extractTitle(spell.properties?.Nom) || spell.id;
      console.error(`[${i + 1}/${stats.total}] ERROR: ${name} - ${error}`);
    }
  }

  // Print summary
  console.log('\n=== Résumé ===\n');
  console.log(`Total des sorts: ${stats.total}`);
  console.log(`Traités avec succès: ${stats.processed}`);
  console.log(`Erreurs: ${stats.errors}\n`);
  console.log('Répartition par JdS:');
  console.log(`  FOR: ${stats.bySave.FOR}`);
  console.log(`  DEX: ${stats.bySave.DEX}`);
  console.log(`  CON: ${stats.bySave.CON}`);
  console.log(`  INT: ${stats.bySave.INT}`);
  console.log(`  SAG: ${stats.bySave.SAG}`);
  console.log(`  CHA: ${stats.bySave.CHA}`);
  console.log(`  Aucun: ${stats.bySave.Aucun}`);
  console.log(`\nSorts avec 2+ saves: ${stats.multiSave}`);
}

main().catch((error) => {
  console.error('Fatal error:', error);
  process.exit(1);
});
