import { NextResponse } from 'next/server';
import { getMonsters, searchMonsters } from '@/lib/db';

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const query = searchParams.get('q');

    const monsters = query ? await searchMonsters(query) : await getMonsters();

    return NextResponse.json(monsters);
  } catch (error) {
    console.error('Error fetching monsters:', error);
    return NextResponse.json({ error: 'Failed to fetch monsters' }, { status: 500 });
  }
}
