import { NextResponse } from 'next/server';
import { getCombatMonstersByCampaign, addCombatMonster, updateCombatMonster, deleteCombatMonster } from '@/lib/db';

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const monsters = await getCombatMonstersByCampaign(parseInt(id, 10));
    return NextResponse.json(monsters);
  } catch (error) {
    console.error('Failed to fetch combat monsters:', error);
    return NextResponse.json({ error: 'Failed to fetch combat monsters' }, { status: 500 });
  }
}

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await request.json();
    const monster = await addCombatMonster(parseInt(id, 10), body);
    return NextResponse.json(monster, { status: 201 });
  } catch (error) {
    console.error('Failed to add combat monster:', error);
    return NextResponse.json({ error: 'Failed to add combat monster' }, { status: 500 });
  }
}

export async function PATCH(request: Request) {
  try {
    const body = await request.json();
    const { monsterId, ...updates } = body;

    if (!monsterId) {
      return NextResponse.json({ error: 'monsterId is required' }, { status: 400 });
    }

    const monster = await updateCombatMonster(monsterId, updates);
    if (!monster) {
      return NextResponse.json({ error: 'Monster not found or no updates provided' }, { status: 404 });
    }
    return NextResponse.json(monster);
  } catch (error) {
    console.error('Failed to update combat monster:', error);
    return NextResponse.json({ error: 'Failed to update combat monster' }, { status: 500 });
  }
}

export async function DELETE(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const monsterId = searchParams.get('monsterId');

    if (!monsterId) {
      return NextResponse.json({ error: 'monsterId is required' }, { status: 400 });
    }

    const success = await deleteCombatMonster(parseInt(monsterId, 10));
    if (!success) {
      return NextResponse.json({ error: 'Monster not found' }, { status: 404 });
    }
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Failed to delete combat monster:', error);
    return NextResponse.json({ error: 'Failed to delete combat monster' }, { status: 500 });
  }
}
