import { Client } from '@notionhq/client';
import type { Note } from './types';

export interface SyncResult {
  success: boolean;
  updated: boolean;  // true if updated existing entry, false if created new
  notionId: string;
  error?: string;
}

// Cache for data source IDs (database_id -> data_source_id)
const dataSourceCache: Map<string, string> = new Map();

/**
 * Get Notion client instance
 */
function getNotionClient(): Client {
  const token = process.env.NOTION_API_TOKEN;

  if (!token) {
    throw new Error('NOTION_API_TOKEN is not defined');
  }

  return new Client({ auth: token });
}

/**
 * Get Journal database ID
 */
function getJournalDatabaseId(): string {
  const databaseId = process.env.NOTION_JOURNAL_DATABASE_ID;

  if (!databaseId) {
    throw new Error('NOTION_JOURNAL_DATABASE_ID is not defined');
  }

  return databaseId;
}

/**
 * Get the data_source_id from a database_id (v5 SDK requirement)
 */
async function getDataSourceId(notion: Client, databaseId: string): Promise<string> {
  const cached = dataSourceCache.get(databaseId);
  if (cached) {
    return cached;
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
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
 * Format notes as timestamped markdown for Notion
 */
function formatNotesForNotion(notes: Note[]): string {
  // Sort by time (oldest first for chronological order)
  const sortedNotes = [...notes].sort((a, b) => {
    const timeA = a.time || '00:00';
    const timeB = b.time || '00:00';
    return timeA.localeCompare(timeB);
  });

  return sortedNotes
    .map(note => `**${note.time || '??:??'}** - ${note.title}\n${note.content}`)
    .join('\n\n');
}

/**
 * Get the next session number by finding the highest existing N° Session
 */
async function getNextSessionNumber(): Promise<number> {
  const notion = getNotionClient();
  const databaseId = getJournalDatabaseId();

  try {
    const dataSourceId = await getDataSourceId(notion, databaseId);

    // Query all entries sorted by N° Session descending to find the highest
    const response = await notion.dataSources.query({
      data_source_id: dataSourceId,
      sorts: [
        {
          property: 'N° Session',
          direction: 'descending'
        }
      ],
      page_size: 1
    });

    if (response.results.length > 0) {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const firstResult = response.results[0] as any;
      const nSession = firstResult.properties?.['N° Session']?.number;
      if (typeof nSession === 'number') {
        return nSession + 1;
      }
    }
  } catch (error) {
    console.error('[Notion Journal] Error getting next session number:', error);
  }

  // Default to 1 if no entries found or error
  return 1;
}

/**
 * Generate session title from session number
 */
function generateSessionTitle(sessionNumber: number): string {
  return `Session ${sessionNumber}`;
}

/**
 * Generate short summary from notes
 */
function generateResumeCourt(notes: Note[]): string {
  const titles = notes.map(n => n.title).join(', ');
  return titles.length > 200 ? titles.substring(0, 197) + '...' : titles;
}

/**
 * Split text into chunks for Notion rich_text (max 2000 chars per chunk)
 */
function splitTextIntoChunks(text: string, maxLength: number = 2000): { text: { content: string } }[] {
  const chunks: { text: { content: string } }[] = [];
  let remaining = text;

  while (remaining.length > 0) {
    const chunk = remaining.substring(0, maxLength);
    chunks.push({ text: { content: chunk } });
    remaining = remaining.substring(maxLength);
  }

  return chunks.length > 0 ? chunks : [{ text: { content: '' } }];
}

/**
 * Create paragraph blocks for Notion
 */
function createParagraphBlocks(text: string): any[] {
  const paragraphs = text.split(/\n\n+/).filter(p => p.trim());

  if (paragraphs.length === 0) {
    return [];
  }

  return paragraphs.map(paragraph => ({
    object: 'block',
    type: 'paragraph',
    paragraph: {
      rich_text: splitTextIntoChunks(paragraph.trim())
    }
  }));
}

/**
 * Find existing entry for a given date
 */
async function findEntryByDate(date: string): Promise<string | null> {
  const notion = getNotionClient();
  const databaseId = getJournalDatabaseId();

  try {
    // v5 SDK: Get data source ID first
    const dataSourceId = await getDataSourceId(notion, databaseId);

    const response = await notion.dataSources.query({
      data_source_id: dataSourceId,
      filter: {
        property: 'Date',
        date: {
          equals: date
        }
      },
      page_size: 1
    });

    if (response.results.length > 0) {
      return response.results[0].id;
    }
  } catch (error) {
    console.error('[Notion Journal] Error finding entry:', error);
  }

  return null;
}

/**
 * Replace all content in existing Notion page with current notes
 */
async function replaceEntryContent(pageId: string, notes: Note[]): Promise<void> {
  const notion = getNotionClient();

  // 1. Get all existing blocks
  const existingBlocks = await notion.blocks.children.list({ block_id: pageId });

  // 2. Delete all existing blocks
  for (const block of existingBlocks.results) {
    if ('id' in block) {
      await notion.blocks.delete({ block_id: block.id });
    }
  }

  // 3. Add fresh content with current notes
  const formattedContent = formatNotesForNotion(notes);
  const blocks = createParagraphBlocks(formattedContent);

  if (blocks.length > 0) {
    await notion.blocks.children.append({
      block_id: pageId,
      children: blocks
    });
  }
}

/**
 * Create new entry in Notion
 */
async function createEntry(date: string, notes: Note[]): Promise<string> {
  const notion = getNotionClient();
  const databaseId = getJournalDatabaseId();

  // Get next session number
  const sessionNumber = await getNextSessionNumber();

  const formattedContent = formatNotesForNotion(notes);
  const blocks = createParagraphBlocks(formattedContent);

  const response = await notion.pages.create({
    parent: { database_id: databaseId },
    properties: {
      'Session': {
        title: [{ text: { content: generateSessionTitle(sessionNumber) } }]
      },
      'Date': {
        date: { start: date }
      },
      'N° Session': {
        number: sessionNumber
      },
      'Résumé Court': {
        rich_text: splitTextIntoChunks(generateResumeCourt(notes))
      }
    },
    children: blocks
  });

  console.log(`[Notion Journal] Created Session ${sessionNumber}`);
  return response.id;
}

/**
 * Sync notes to Notion - find existing entry or create new one
 */
export async function syncSessionNotes(notes: Note[], date: string): Promise<SyncResult> {
  try {
    // Check if entry already exists for this date
    const existingId = await findEntryByDate(date);

    if (existingId) {
      // Replace content in existing entry
      await replaceEntryContent(existingId, notes);
      console.log(`[Notion Journal] Replaced content in existing entry ${existingId} with ${notes.length} notes`);
      return {
        success: true,
        updated: true,
        notionId: existingId
      };
    } else {
      // Create new entry
      const newId = await createEntry(date, notes);
      console.log(`[Notion Journal] Created new entry ${newId} with ${notes.length} notes`);
      return {
        success: true,
        updated: false,
        notionId: newId
      };
    }
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Erreur inconnue';
    console.error('[Notion Journal] Sync error:', error);
    return {
      success: false,
      updated: false,
      notionId: '',
      error: errorMessage
    };
  }
}
