import { NextRequest, NextResponse } from 'next/server';
import pool from '@/lib/db';
import type { CharacterInventory } from '@/lib/types';
import { DEFAULT_INVENTORY } from '@/lib/types';

// GET /api/characters/[characterId]/inventory
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ characterId: string }> }
) {
  try {
    const { characterId } = await params;

    const result = await pool.query(
      'SELECT inventory FROM character_inventories WHERE character_id = $1',
      [characterId]
    );

    if (result.rows.length === 0) {
      // No inventory found, return default
      return NextResponse.json(DEFAULT_INVENTORY);
    }

    return NextResponse.json(result.rows[0].inventory);
  } catch (error) {
    console.error('Error fetching character inventory:', error);
    return NextResponse.json(
      { error: 'Failed to fetch inventory' },
      { status: 500 }
    );
  }
}

// PUT /api/characters/[characterId]/inventory
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ characterId: string }> }
) {
  try {
    const { characterId } = await params;
    const body = await request.json();
    const inventory: CharacterInventory = body.inventory || body;
    const campaignId: number | null = body.campaignId || null;

    // Upsert: insert or update if exists
    const result = await pool.query(
      `INSERT INTO character_inventories (character_id, campaign_id, inventory, updated_at)
       VALUES ($1, $2, $3, CURRENT_TIMESTAMP)
       ON CONFLICT (character_id)
       DO UPDATE SET
         inventory = $3,
         campaign_id = COALESCE($2, character_inventories.campaign_id),
         updated_at = CURRENT_TIMESTAMP
       RETURNING inventory`,
      [characterId, campaignId, JSON.stringify(inventory)]
    );

    return NextResponse.json(result.rows[0].inventory);
  } catch (error) {
    console.error('Error saving character inventory:', error);
    return NextResponse.json(
      { error: 'Failed to save inventory' },
      { status: 500 }
    );
  }
}
