import { NextResponse } from 'next/server';
import { getCharactersByCampaign, updateCharacter } from '@/lib/db';

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const characters = await getCharactersByCampaign(parseInt(id, 10));
    return NextResponse.json(characters);
  } catch (error) {
    console.error('Failed to fetch characters:', error);
    return NextResponse.json({ error: 'Failed to fetch characters' }, { status: 500 });
  }
}

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const body = await request.json();
    const { characterId, ...updates } = body;

    if (!characterId) {
      return NextResponse.json({ error: 'characterId is required' }, { status: 400 });
    }

    const character = await updateCharacter(characterId, updates);
    if (!character) {
      return NextResponse.json({ error: 'Character not found or no updates provided' }, { status: 404 });
    }
    return NextResponse.json(character);
  } catch (error) {
    console.error('Failed to update character:', error);
    return NextResponse.json({ error: 'Failed to update character' }, { status: 500 });
  }
}
