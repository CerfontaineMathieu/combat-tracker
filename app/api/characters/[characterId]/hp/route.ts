import { NextRequest, NextResponse } from 'next/server';
import pool from '@/lib/db';

// GET /api/characters/[characterId]/hp
// Returns HP, tempHp, exhaustion, conditions, conditionDurations, buffs, and spellSlots (full status)
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ characterId: string }> }
) {
  try {
    const { characterId } = await params;

    const result = await pool.query(
      'SELECT current_hp, temp_hp, exhaustion_level, conditions, condition_durations, buffs, spell_slots FROM character_hp WHERE character_id = $1',
      [characterId]
    );

    if (result.rows.length === 0) {
      // No status found, return nulls (use defaults from Notion)
      return NextResponse.json({
        currentHp: null,
        tempHp: null,
        exhaustionLevel: null,
        conditions: null,
        conditionDurations: null,
        buffs: null,
        spellSlots: null
      });
    }

    const row = result.rows[0];
    return NextResponse.json({
      currentHp: row.current_hp,
      tempHp: row.temp_hp ?? null,
      exhaustionLevel: row.exhaustion_level ?? null,
      conditions: row.conditions ?? null,
      conditionDurations: row.condition_durations ?? null,
      buffs: row.buffs ?? null,
      spellSlots: row.spell_slots ?? null
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
// Saves HP, tempHp, and optionally exhaustion, conditions, conditionDurations, buffs, and spellSlots
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ characterId: string }> }
) {
  try {
    const { characterId } = await params;
    const { currentHp, tempHp, exhaustionLevel, conditions, conditionDurations, buffs, spellSlots, campaignId = 1 } = await request.json();

    console.log('[HP API] PUT request for', characterId, '- tempHp:', tempHp, '- conditionDurations:', conditionDurations, '- spellSlots:', spellSlots);

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
          `INSERT INTO character_hp (character_id, campaign_id, current_hp, temp_hp, exhaustion_level, conditions, condition_durations, buffs, spell_slots, updated_at)
           VALUES ($1, $2, 0, $3, $4, $5, $6, $7, $8, CURRENT_TIMESTAMP)
           RETURNING current_hp, temp_hp, exhaustion_level, conditions, condition_durations, buffs, spell_slots`,
          [
            characterId,
            campaignId,
            tempHp ?? 0,
            exhaustionLevel ?? 0,
            conditions ? JSON.stringify(conditions) : '[]',
            conditionDurations ? JSON.stringify(conditionDurations) : '{}',
            buffs ? JSON.stringify(buffs) : '[]',
            spellSlots ? JSON.stringify(spellSlots) : '{}'
          ]
        );
      } else {
        result = await pool.query(
          `INSERT INTO character_hp (character_id, campaign_id, current_hp, temp_hp, exhaustion_level, conditions, condition_durations, buffs, spell_slots, updated_at)
           VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, CURRENT_TIMESTAMP)
           RETURNING current_hp, temp_hp, exhaustion_level, conditions, condition_durations, buffs, spell_slots`,
          [
            characterId,
            campaignId,
            currentHp,
            tempHp ?? 0,
            exhaustionLevel ?? 0,
            conditions ? JSON.stringify(conditions) : '[]',
            conditionDurations ? JSON.stringify(conditionDurations) : '{}',
            buffs ? JSON.stringify(buffs) : '[]',
            spellSlots ? JSON.stringify(spellSlots) : '{}'
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
      if (tempHp !== undefined) {
        updates.push(`temp_hp = $${paramIndex++}`);
        values.push(tempHp ?? 0);
      }
      if (exhaustionLevel !== undefined && exhaustionLevel !== null) {
        updates.push(`exhaustion_level = $${paramIndex++}`);
        values.push(exhaustionLevel);
      }
      if (conditions !== undefined) {
        updates.push(`conditions = $${paramIndex++}`);
        values.push(JSON.stringify(conditions));
      }
      // Only update conditionDurations if explicitly provided with content
      // Skip empty objects {} to avoid accidentally clearing durations
      if (conditionDurations !== undefined && (conditionDurations === null || Object.keys(conditionDurations).length > 0)) {
        updates.push(`condition_durations = $${paramIndex++}`);
        values.push(JSON.stringify(conditionDurations));
      }
      if (buffs !== undefined) {
        updates.push(`buffs = $${paramIndex++}`);
        values.push(JSON.stringify(buffs));
      }
      if (spellSlots !== undefined) {
        updates.push(`spell_slots = $${paramIndex++}`);
        values.push(JSON.stringify(spellSlots));
      }

      values.push(characterId);
      values.push(campaignId);

      result = await pool.query(
        `UPDATE character_hp SET ${updates.join(', ')}
         WHERE character_id = $${paramIndex++} AND campaign_id = $${paramIndex}
         RETURNING current_hp, temp_hp, exhaustion_level, conditions, condition_durations, buffs, spell_slots`,
        values
      );
    }

    const row = result.rows[0];
    return NextResponse.json({
      currentHp: row.current_hp,
      tempHp: row.temp_hp,
      exhaustionLevel: row.exhaustion_level,
      conditions: row.conditions,
      conditionDurations: row.condition_durations,
      buffs: row.buffs,
      spellSlots: row.spell_slots
    });
  } catch (error) {
    console.error('Error saving character status:', error);
    return NextResponse.json(
      { error: 'Failed to save status' },
      { status: 500 }
    );
  }
}
