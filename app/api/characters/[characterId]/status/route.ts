import { NextRequest, NextResponse } from 'next/server';
import pool from '@/lib/db';

// GET /api/characters/[characterId]/status
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ characterId: string }> }
) {
  try {
    const { characterId } = await params;

    const result = await pool.query(
      'SELECT conditions, exhaustion_level FROM character_status WHERE character_id = $1',
      [characterId]
    );

    if (result.rows.length === 0) {
      // No status override found, return defaults
      return NextResponse.json({ conditions: null, exhaustionLevel: null });
    }

    return NextResponse.json({
      conditions: result.rows[0].conditions,
      exhaustionLevel: result.rows[0].exhaustion_level,
    });
  } catch (error) {
    console.error('Error fetching character status:', error);
    return NextResponse.json(
      { error: 'Failed to fetch status' },
      { status: 500 }
    );
  }
}

// PUT /api/characters/[characterId]/status
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ characterId: string }> }
) {
  try {
    const { characterId } = await params;
    const body = await request.json();
    const campaignId = body.campaignId ?? 1;

    // Only pass values that were explicitly provided (use null for COALESCE to work)
    const conditionsValue = body.conditions !== undefined ? JSON.stringify(body.conditions) : null;
    const exhaustionValue = body.exhaustionLevel !== undefined ? body.exhaustionLevel : null;

    // Upsert: insert or update if exists
    const result = await pool.query(
      `INSERT INTO character_status (character_id, campaign_id, conditions, exhaustion_level, updated_at)
       VALUES ($1, $2, COALESCE($3::jsonb, '[]'::jsonb), COALESCE($4, 0), CURRENT_TIMESTAMP)
       ON CONFLICT (campaign_id, character_id)
       DO UPDATE SET
         conditions = COALESCE($3::jsonb, character_status.conditions),
         exhaustion_level = COALESCE($4, character_status.exhaustion_level),
         updated_at = CURRENT_TIMESTAMP
       RETURNING conditions, exhaustion_level`,
      [characterId, campaignId, conditionsValue, exhaustionValue]
    );

    return NextResponse.json({
      conditions: result.rows[0].conditions,
      exhaustionLevel: result.rows[0].exhaustion_level,
    });
  } catch (error) {
    console.error('Error saving character status:', error);
    return NextResponse.json(
      { error: 'Failed to save status' },
      { status: 500 }
    );
  }
}
