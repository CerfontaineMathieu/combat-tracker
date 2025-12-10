import { Client } from '@notionhq/client';

export interface JournalEntry {
  session: string;       // Session title (becomes Notion page title)
  date: string;          // ISO date string (YYYY-MM-DD)
  resumeCourt: string;   // Short summary (Résumé Court property)
  resumeLong: string;    // Full content (page body)
  acte?: string;         // Optional: Acte
  lieu?: string;         // Optional: Lieu
  sessionNumber?: number; // Optional: Numero de Session
}

export interface SyncResult {
  success: number;
  errors: string[];
  notionIds: string[];
}

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
 * Split text into paragraph blocks for Notion page body
 */
function createParagraphBlocks(text: string): any[] {
  // Split by double newlines for natural paragraph breaks
  const paragraphs = text.split(/\n\n+/).filter(p => p.trim());

  if (paragraphs.length === 0) {
    return [{
      object: 'block',
      type: 'paragraph',
      paragraph: {
        rich_text: [{ type: 'text', text: { content: '' } }]
      }
    }];
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
 * Sync a single journal entry to Notion
 */
export async function syncNoteToNotion(entry: JournalEntry): Promise<string> {
  const notion = getNotionClient();
  const databaseId = getJournalDatabaseId();

  // Build properties object
  const properties: Record<string, any> = {
    'Session': {
      title: [{ text: { content: entry.session } }]
    },
    'Date': {
      date: { start: entry.date }
    },
    'Résumé Court': {
      rich_text: splitTextIntoChunks(entry.resumeCourt.substring(0, 2000))
    }
  };

  // Add optional properties if provided
  if (entry.acte) {
    properties['Acte'] = {
      rich_text: [{ text: { content: entry.acte } }]
    };
  }

  if (entry.lieu) {
    properties['Lieu'] = {
      rich_text: [{ text: { content: entry.lieu } }]
    };
  }

  if (entry.sessionNumber !== undefined) {
    properties['Numero de Session'] = {
      number: entry.sessionNumber
    };
  }

  // Create page with properties and body content
  const response = await notion.pages.create({
    parent: { database_id: databaseId },
    properties,
    children: createParagraphBlocks(entry.resumeLong)
  });

  return response.id;
}

/**
 * Sync multiple journal entries to Notion
 */
export async function syncMultipleNotesToNotion(entries: JournalEntry[]): Promise<SyncResult> {
  const results: SyncResult = {
    success: 0,
    errors: [],
    notionIds: []
  };

  for (const entry of entries) {
    try {
      const notionId = await syncNoteToNotion(entry);
      results.success++;
      results.notionIds.push(notionId);
    } catch (error) {
      const errorMessage = `Échec sync "${entry.session}": ${error instanceof Error ? error.message : 'Erreur inconnue'}`;
      console.error('[Notion Journal]', errorMessage, error);
      results.errors.push(errorMessage);
    }
  }

  return results;
}
