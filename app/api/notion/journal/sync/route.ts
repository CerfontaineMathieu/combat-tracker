import { NextResponse } from 'next/server';
import { syncMultipleNotesToNotion, type JournalEntry } from '@/lib/notion-journal';

interface SyncRequest {
  notes: JournalEntry[];
}

export async function POST(request: Request) {
  try {
    const body: SyncRequest = await request.json();

    if (!body.notes || body.notes.length === 0) {
      return NextResponse.json(
        { success: false, error: 'Aucune note à synchroniser' },
        { status: 400 }
      );
    }

    console.log(`[Notion Journal API] Syncing ${body.notes.length} note(s) to Notion...`);

    const results = await syncMultipleNotesToNotion(body.notes);

    console.log(`[Notion Journal API] Sync complete: ${results.success} success, ${results.errors.length} errors`);

    return NextResponse.json({
      success: true,
      synced: results.success,
      notionIds: results.notionIds,
      errors: results.errors
    });
  } catch (error) {
    console.error('[Notion Journal API] Error syncing to Notion:', error);
    return NextResponse.json(
      {
        success: false,
        error: 'Erreur lors de la synchronisation vers Notion',
        details: error instanceof Error ? error.message : 'Erreur inconnue'
      },
      { status: 500 }
    );
  }
}
