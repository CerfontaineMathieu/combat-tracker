import { NextRequest, NextResponse } from 'next/server';
import pool from '@/lib/db';

// GET /api/characters/[characterId]/hp
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ characterId: string }> }
) {
  try {
    const { characterId } = await params;

    const result = await pool.query(
      'SELECT current_hp FROM character_hp WHERE character_id = $1',
      [characterId]
    );

    if (result.rows.length === 0) {
      // No HP override found, return null (use default from Notion)
      return NextResponse.json({ currentHp: null });
    }

    return NextResponse.json({ currentHp: result.rows[0].current_hp });
  } catch (error) {
    console.error('Error fetching character HP:', error);
    return NextResponse.json(
      { error: 'Failed to fetch HP' },
      { status: 500 }
    );
  }
}

// PUT /api/characters/[characterId]/hp
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ characterId: string }> }
) {
  try {
    const { characterId } = await params;
    const { currentHp, campaignId = 1 } = await request.json();

    // Upsert: insert or update if exists
    const result = await pool.query(
      `INSERT INTO character_hp (character_id, campaign_id, current_hp, updated_at)
       VALUES ($1, $2, $3, CURRENT_TIMESTAMP)
       ON CONFLICT (campaign_id, character_id)
       DO UPDATE SET
         current_hp = $3,
         updated_at = CURRENT_TIMESTAMP
       RETURNING current_hp`,
      [characterId, campaignId, currentHp]
    );

    return NextResponse.json({ currentHp: result.rows[0].current_hp });
  } catch (error) {
    console.error('Error saving character HP:', error);
    return NextResponse.json(
      { error: 'Failed to save HP' },
      { status: 500 }
    );
  }
}
