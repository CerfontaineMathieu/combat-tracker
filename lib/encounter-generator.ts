/**
 * Encounter Generator
 * Picks real bestiary monsters that fit an XP budget, given a target XP
 * and an encounter "composition" (monster count shape).
 */

import type { DbMonster } from './types'

// ============================================
// Types
// ============================================

export type EncounterComposition = 'solo' | 'duo' | 'group' | 'mob'

export interface GeneratedEncounterRow {
  id: string
  monster: DbMonster
  targetShareXp: number
  withinTolerance: boolean
}

export interface GeneratedEncounterResult {
  rows: GeneratedEncounterRow[]
  targetXp: number
  totalXp: number
  isBestEffort: boolean
}

// ============================================
// Composition config
// ============================================

export const COMPOSITION_CONFIG: Record<EncounterComposition, {
  label: string
  description: string
  minCount: number
  maxCount: number
  defaultCount: number
}> = {
  solo: {
    label: 'Solo (boss unique)',
    description: 'Un monstre unique absorbe tout le budget',
    minCount: 1,
    maxCount: 1,
    defaultCount: 1,
  },
  duo: {
    label: 'Duo élite',
    description: 'Deux monstres puissants se partagent le budget',
    minCount: 2,
    maxCount: 2,
    defaultCount: 2,
  },
  group: {
    label: 'Groupe standard',
    description: '3 à 5 monstres de force comparable',
    minCount: 3,
    maxCount: 5,
    defaultCount: 4,
  },
  mob: {
    label: 'Horde',
    description: '6 à 12 monstres faibles, nombreux',
    minCount: 6,
    maxCount: 12,
    defaultCount: 8,
  },
}

// ============================================
// Selection
// ============================================

const TOLERANCE_BANDS = [0.15, 0.30, 0.50]

export function filterBestiaryByCreatureType(bestiary: DbMonster[], typeFilters: string[]): DbMonster[] {
  const pool = bestiary.filter(m => m.challenge_rating_xp != null && m.challenge_rating_xp > 0)
  if (typeFilters.length === 0) return pool
  const set = new Set(typeFilters.map(t => t.toLowerCase()))
  return pool.filter(m => m.creature_type != null && set.has(m.creature_type.toLowerCase()))
}

export function filterBestiaryByHabitat(bestiary: DbMonster[], habitatFilters: string[]): DbMonster[] {
  if (habitatFilters.length === 0) return bestiary
  const set = new Set(habitatFilters.map(h => h.toLowerCase()))
  return bestiary.filter(m => m.habitat?.some(h => set.has(h.toLowerCase())))
}

function pickMonsterNear(target: number, candidates: DbMonster[]): { monster: DbMonster; withinTolerance: boolean } {
  for (const tolerance of TOLERANCE_BANDS) {
    const lo = target * (1 - tolerance)
    const hi = target * (1 + tolerance)
    const inBand = candidates.filter(m => {
      const xp = m.challenge_rating_xp as number
      return xp >= lo && xp <= hi
    })
    if (inBand.length > 0) {
      const chosen = inBand[Math.floor(Math.random() * inBand.length)]
      return { monster: chosen, withinTolerance: tolerance <= 0.30 }
    }
  }

  const closest = candidates.reduce((best, m) =>
    Math.abs((m.challenge_rating_xp as number) - target) < Math.abs((best.challenge_rating_xp as number) - target) ? m : best
  )
  return { monster: closest, withinTolerance: false }
}

export function generateEncounter(params: {
  targetXp: number
  monsterCount: number
  candidates: DbMonster[]
}): GeneratedEncounterResult {
  if (params.candidates.length === 0) {
    throw new Error('Aucun monstre disponible dans le bestiaire pour ce filtre')
  }

  const perMonsterTarget = params.targetXp / params.monsterCount
  const rows: GeneratedEncounterRow[] = Array.from({ length: params.monsterCount }, () => {
    const { monster, withinTolerance } = pickMonsterNear(perMonsterTarget, params.candidates)
    return { id: crypto.randomUUID(), monster, targetShareXp: perMonsterTarget, withinTolerance }
  })

  const totalXp = rows.reduce((sum, row) => sum + (row.monster.challenge_rating_xp || 0), 0)

  return {
    rows,
    targetXp: params.targetXp,
    totalXp,
    isBestEffort: rows.some(row => !row.withinTolerance),
  }
}

export function regenerateRow(row: GeneratedEncounterRow, candidates: DbMonster[]): GeneratedEncounterRow {
  const { monster, withinTolerance } = pickMonsterNear(row.targetShareXp, candidates)
  return { ...row, monster, withinTolerance }
}
