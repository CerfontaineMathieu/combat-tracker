import { NextResponse } from 'next/server';
import { syncSessionNotes } from '@/lib/notion-journal';
import type { Note } from '@/lib/types';

interface SyncRequest {
  notes: Note[];
  date: string;
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

    if (!body.date) {
      return NextResponse.json(
        { success: false, error: 'Date requise' },
        { status: 400 }
      );
    }

    console.log(`[Notion Journal API] Syncing ${body.notes.length} note(s) to Notion for date ${body.date}...`);

    const result = await syncSessionNotes(body.notes, body.date);

    if (result.success) {
      console.log(`[Notion Journal API] Sync complete: ${result.updated ? 'updated' : 'created'} entry ${result.notionId}`);
      return NextResponse.json({
        success: true,
        updated: result.updated,
        notionId: result.notionId
      });
    } else {
      return NextResponse.json(
        {
          success: false,
          error: result.error || 'Erreur inconnue'
        },
        { status: 500 }
      );
    }
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
