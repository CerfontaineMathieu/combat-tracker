import { NextResponse } from 'next/server';
import { fetchPlayableCharactersFromNotion } from '@/lib/notion';

export async function GET() {
  try {
    const characters = await fetchPlayableCharactersFromNotion();
    return NextResponse.json(characters);
  } catch (error) {
    console.error('Failed to fetch characters from Notion:', error);
    return NextResponse.json(
      { error: 'Failed to fetch characters from Notion' },
      { status: 500 }
    );
  }
}
