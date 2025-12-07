import { NextRequest, NextResponse } from 'next/server';
import pool from '@/lib/db';

// GET /api/characters/[characterId]/hp
// Returns HP, exhaustion, conditions, and buffs (full status)
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ characterId: string }> }
) {
  try {
    const { characterId } = await params;

    const result = await pool.query(
      'SELECT current_hp, exhaustion_level, conditions, buffs FROM character_hp WHERE character_id = $1',
      [characterId]
    );

    if (result.rows.length === 0) {
      // No status found, return nulls (use defaults from Notion)
      return NextResponse.json({
        currentHp: null,
        exhaustionLevel: null,
        conditions: null,
        buffs: null
      });
    }

    const row = result.rows[0];
    return NextResponse.json({
      currentHp: row.current_hp,
      exhaustionLevel: row.exhaustion_level ?? null,
      conditions: row.conditions ?? null,
      buffs: row.buffs ?? null
    });
  } catch (error) {
    console.error('Error fetching character status:', error);
    return NextResponse.json(
      { error: 'Failed to fetch status' },
      { status: 500 }
    );
  }
}

// PUT /api/characters/[characterId]/hp
// Saves HP, and optionally exhaustion, conditions, and buffs
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ characterId: string }> }
) {
  try {
    const { characterId } = await params;
    const { currentHp, exhaustionLevel, conditions, buffs, campaignId = 1 } = await request.json();

    // Check if row exists
    const existing = await pool.query(
      'SELECT id FROM character_hp WHERE character_id = $1 AND campaign_id = $2',
      [characterId, campaignId]
    );

    let result;
    if (existing.rows.length === 0) {
      // Row doesn't exist - only create if we have HP (required field)
      if (currentHp === undefined || currentHp === null) {
        // Cannot create without HP, but save exhaustion/conditions/buffs anyway
        // by first creating with a placeholder HP of 0
        result = await pool.query(
          `INSERT INTO character_hp (character_id, campaign_id, current_hp, exhaustion_level, conditions, buffs, updated_at)
           VALUES ($1, $2, 0, $3, $4, $5, CURRENT_TIMESTAMP)
           RETURNING current_hp, exhaustion_level, conditions, buffs`,
          [
            characterId,
            campaignId,
            exhaustionLevel ?? 0,
            conditions ? JSON.stringify(conditions) : '[]',
            buffs ? JSON.stringify(buffs) : '[]'
          ]
        );
      } else {
        result = await pool.query(
          `INSERT INTO character_hp (character_id, campaign_id, current_hp, exhaustion_level, conditions, buffs, updated_at)
           VALUES ($1, $2, $3, $4, $5, $6, CURRENT_TIMESTAMP)
           RETURNING current_hp, exhaustion_level, conditions, buffs`,
          [
            characterId,
            campaignId,
            currentHp,
            exhaustionLevel ?? 0,
            conditions ? JSON.stringify(conditions) : '[]',
            buffs ? JSON.stringify(buffs) : '[]'
          ]
        );
      }
    } else {
      // Row exists - update only provided fields
      const updates: string[] = ['updated_at = CURRENT_TIMESTAMP'];
      const values: (number | string)[] = [];
      let paramIndex = 1;

      if (currentHp !== undefined && currentHp !== null) {
        updates.push(`current_hp = $${paramIndex++}`);
        values.push(currentHp);
      }
      if (exhaustionLevel !== undefined && exhaustionLevel !== null) {
        updates.push(`exhaustion_level = $${paramIndex++}`);
        values.push(exhaustionLevel);
      }
      if (conditions !== undefined) {
        updates.push(`conditions = $${paramIndex++}`);
        values.push(JSON.stringify(conditions));
      }
      if (buffs !== undefined) {
        updates.push(`buffs = $${paramIndex++}`);
        values.push(JSON.stringify(buffs));
      }

      values.push(characterId);
      values.push(campaignId);

      result = await pool.query(
        `UPDATE character_hp SET ${updates.join(', ')}
         WHERE character_id = $${paramIndex++} AND campaign_id = $${paramIndex}
         RETURNING current_hp, exhaustion_level, conditions, buffs`,
        values
      );
    }

    const row = result.rows[0];
    return NextResponse.json({
      currentHp: row.current_hp,
      exhaustionLevel: row.exhaustion_level,
      conditions: row.conditions,
      buffs: row.buffs
    });
  } catch (error) {
    console.error('Error saving character status:', error);
    return NextResponse.json(
      { error: 'Failed to save status' },
      { status: 500 }
    );
  }
}
