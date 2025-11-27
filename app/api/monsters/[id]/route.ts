import { NextResponse } from 'next/server';
import { getMonsterById } from '@/lib/db';

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const monsterId = parseInt(id, 10);

    if (isNaN(monsterId)) {
      return NextResponse.json({ error: 'Invalid monster ID' }, { status: 400 });
    }

    const monster = await getMonsterById(monsterId);

    if (!monster) {
      return NextResponse.json({ error: 'Monster not found' }, { status: 404 });
    }

    return NextResponse.json(monster);
  } catch (error) {
    console.error('Error fetching monster:', error);
    return NextResponse.json({ error: 'Failed to fetch monster' }, { status: 500 });
  }
}
