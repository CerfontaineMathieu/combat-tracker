import { NextResponse } from 'next/server';
import { getSessionNotes, saveSessionNotes, clearSessionNotes } from '@/lib/redis';
import type { Note } from '@/lib/types';

// Get today's date in YYYY-MM-DD format
function getTodayDate(): string {
  return new Date().toISOString().split('T')[0];
}

// Get current time in HH:mm:ss format (with seconds for precise ordering)
function getCurrentTime(): string {
  return new Date().toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit', second: '2-digit' });
}

// Generate a unique ID for a note
function generateNoteId(): string {
  return `note-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;
}

// GET - Fetch today's notes
export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const campaignId = parseInt(id, 10);

    if (isNaN(campaignId)) {
      return NextResponse.json({ error: 'Invalid campaign ID' }, { status: 400 });
    }

    const date = getTodayDate();
    const notes = await getSessionNotes(campaignId, date);

    return NextResponse.json({ notes, date });
  } catch (error) {
    console.error('[Session Notes API] GET error:', error);
    return NextResponse.json({ error: 'Failed to fetch notes' }, { status: 500 });
  }
}

// POST - Add a new note
export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const campaignId = parseInt(id, 10);

    if (isNaN(campaignId)) {
      return NextResponse.json({ error: 'Invalid campaign ID' }, { status: 400 });
    }

    const body = await request.json();
    const { title, content } = body;

    if (!title) {
      return NextResponse.json({ error: 'Title is required' }, { status: 400 });
    }

    const date = getTodayDate();
    const notes = await getSessionNotes(campaignId, date);

    const newNote: Note = {
      id: generateNoteId(),
      date,
      time: getCurrentTime(),
      title,
      content: content || '',
    };

    // Add new note at the beginning (most recent first)
    const updatedNotes = [newNote, ...notes];
    await saveSessionNotes(campaignId, date, updatedNotes);

    return NextResponse.json({ note: newNote, notes: updatedNotes });
  } catch (error) {
    console.error('[Session Notes API] POST error:', error);
    return NextResponse.json({ error: 'Failed to create note' }, { status: 500 });
  }
}

// PUT - Update an existing note
export async function PUT(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const campaignId = parseInt(id, 10);

    if (isNaN(campaignId)) {
      return NextResponse.json({ error: 'Invalid campaign ID' }, { status: 400 });
    }

    const body = await request.json();
    const { noteId, title, content } = body;

    if (!noteId) {
      return NextResponse.json({ error: 'Note ID is required' }, { status: 400 });
    }

    const date = getTodayDate();
    const notes = await getSessionNotes(campaignId, date);

    const noteIndex = notes.findIndex((n) => n.id === noteId);
    if (noteIndex === -1) {
      return NextResponse.json({ error: 'Note not found' }, { status: 404 });
    }

    // Update the note
    if (title !== undefined) notes[noteIndex].title = title;
    if (content !== undefined) notes[noteIndex].content = content;

    await saveSessionNotes(campaignId, date, notes);

    return NextResponse.json({ note: notes[noteIndex], notes });
  } catch (error) {
    console.error('[Session Notes API] PUT error:', error);
    return NextResponse.json({ error: 'Failed to update note' }, { status: 500 });
  }
}

// DELETE - Delete a note or clear all notes
export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const campaignId = parseInt(id, 10);

    if (isNaN(campaignId)) {
      return NextResponse.json({ error: 'Invalid campaign ID' }, { status: 400 });
    }

    const { searchParams } = new URL(request.url);
    const noteId = searchParams.get('noteId');
    const clearAll = searchParams.get('clearAll') === 'true';
    const date = getTodayDate();

    if (clearAll) {
      // Clear all notes for today
      await clearSessionNotes(campaignId, date);
      return NextResponse.json({ success: true, notes: [] });
    }

    if (!noteId) {
      return NextResponse.json({ error: 'Note ID or clearAll flag required' }, { status: 400 });
    }

    const notes = await getSessionNotes(campaignId, date);
    const updatedNotes = notes.filter((n) => n.id !== noteId);

    if (updatedNotes.length === notes.length) {
      return NextResponse.json({ error: 'Note not found' }, { status: 404 });
    }

    await saveSessionNotes(campaignId, date, updatedNotes);

    return NextResponse.json({ success: true, notes: updatedNotes });
  } catch (error) {
    console.error('[Session Notes API] DELETE error:', error);
    return NextResponse.json({ error: 'Failed to delete note' }, { status: 500 });
  }
}
