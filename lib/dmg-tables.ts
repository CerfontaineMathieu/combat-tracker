/**
 * DMG Treasure Tables - Official D&D 5e rules
 * Based on Dungeon Master's Guide Chapter 7 (p. 133-149)
 */

import type { LootCurrency } from './types'

// ============================================
// Types
// ============================================

export type CRTier = '0-4' | '5-10' | '11-16' | '17+'
export type MagicItemTable = 'A' | 'B' | 'C' | 'D' | 'E' | 'F' | 'G' | 'H' | 'I'
export type TreasureType = 'hoard' | 'individual'

export interface MagicItemSpec {
  table: MagicItemTable
  count: number // Number of items to roll
}

export interface HoardRollResult {
  currency: LootCurrency
  gems?: { value: number, count: number }
  artObjects?: { value: number, count: number }
  magicItems?: MagicItemSpec
}

export interface GeneratedItem {
  rarity: string
  isConsumable: boolean
}

// ============================================
// Dice Utilities
// ============================================

function rollDice(count: number, sides: number): number {
  let total = 0
  for (let i = 0; i < count; i++) {
    total += Math.floor(Math.random() * sides) + 1
  }
  return total
}

function rollD100(): number {
  return Math.floor(Math.random() * 100) + 1
}

// ============================================
// Magic Item Table → Rarity Mapping
// ============================================

/**
 * Maps DMG Magic Item Tables to item rarities
 * Tables A-E: Consumables (potions, scrolls)
 * Tables F-I: Permanent items (weapons, armor, wondrous)
 */
const TABLE_RARITY_MAP: Record<MagicItemTable, { rarities: { rarity: string, weight: number }[], isConsumable: boolean }> = {
  // Consumables
  'A': {
    rarities: [
      { rarity: 'common', weight: 90 },
      { rarity: 'uncommon', weight: 10 }
    ],
    isConsumable: true
  },
  'B': {
    rarities: [{ rarity: 'uncommon', weight: 100 }],
    isConsumable: true
  },
  'C': {
    rarities: [
      { rarity: 'rare', weight: 96 },
      { rarity: 'uncommon', weight: 4 }
    ],
    isConsumable: true
  },
  'D': {
    rarities: [{ rarity: 'rare', weight: 100 }],
    isConsumable: true
  },
  'E': {
    rarities: [
      { rarity: 'very_rare', weight: 95 },
      { rarity: 'rare', weight: 5 }
    ],
    isConsumable: true
  },
  // Permanent items
  'F': {
    rarities: [{ rarity: 'uncommon', weight: 100 }],
    isConsumable: false
  },
  'G': {
    rarities: [
      { rarity: 'rare', weight: 98 },
      { rarity: 'uncommon', weight: 2 }
    ],
    isConsumable: false
  },
  'H': {
    rarities: [{ rarity: 'very_rare', weight: 100 }],
    isConsumable: false
  },
  'I': {
    rarities: [{ rarity: 'legendary', weight: 100 }],
    isConsumable: false
  },
}

/**
 * Roll on a magic item table to get a rarity
 */
export function rollRarityFromTable(table: MagicItemTable): GeneratedItem {
  const tableInfo = TABLE_RARITY_MAP[table]
  const roll = Math.random() * 100

  let cumulative = 0
  for (const entry of tableInfo.rarities) {
    cumulative += entry.weight
    if (roll <= cumulative) {
      return { rarity: entry.rarity, isConsumable: tableInfo.isConsumable }
    }
  }

  // Fallback to first rarity
  return {
    rarity: tableInfo.rarities[0].rarity,
    isConsumable: tableInfo.isConsumable
  }
}

// ============================================
// Treasure Hoard Tables
// ============================================

interface HoardTableEntry {
  range: [number, number]
  gems?: { diceCount: number, diceSides: number, value: number }
  artObjects?: { diceCount: number, diceSides: number, value: number }
  magicItems?: { diceCount: number, diceSides: number, table: MagicItemTable }
}

// CR 0-4: 6d6×100 cp, 3d6×100 sp, 2d6×10 gp
const HOARD_CR_0_4: HoardTableEntry[] = [
  { range: [1, 6] },
  { range: [7, 16], gems: { diceCount: 2, diceSides: 6, value: 10 } },
  { range: [17, 26], artObjects: { diceCount: 2, diceSides: 4, value: 25 } },
  { range: [27, 36], gems: { diceCount: 2, diceSides: 6, value: 50 } },
  { range: [37, 44], gems: { diceCount: 2, diceSides: 6, value: 10 }, magicItems: { diceCount: 1, diceSides: 6, table: 'A' } },
  { range: [45, 52], artObjects: { diceCount: 2, diceSides: 4, value: 25 }, magicItems: { diceCount: 1, diceSides: 6, table: 'A' } },
  { range: [53, 60], gems: { diceCount: 2, diceSides: 6, value: 50 }, magicItems: { diceCount: 1, diceSides: 6, table: 'A' } },
  { range: [61, 65], gems: { diceCount: 2, diceSides: 6, value: 10 }, magicItems: { diceCount: 1, diceSides: 4, table: 'B' } },
  { range: [66, 70], artObjects: { diceCount: 2, diceSides: 4, value: 25 }, magicItems: { diceCount: 1, diceSides: 4, table: 'B' } },
  { range: [71, 75], gems: { diceCount: 2, diceSides: 6, value: 50 }, magicItems: { diceCount: 1, diceSides: 4, table: 'B' } },
  { range: [76, 78], gems: { diceCount: 2, diceSides: 6, value: 10 }, magicItems: { diceCount: 1, diceSides: 4, table: 'C' } },
  { range: [79, 80], artObjects: { diceCount: 2, diceSides: 4, value: 25 }, magicItems: { diceCount: 1, diceSides: 4, table: 'C' } },
  { range: [81, 85], gems: { diceCount: 2, diceSides: 6, value: 50 }, magicItems: { diceCount: 1, diceSides: 4, table: 'C' } },
  { range: [86, 92], artObjects: { diceCount: 2, diceSides: 4, value: 25 }, magicItems: { diceCount: 1, diceSides: 4, table: 'F' } },
  { range: [93, 97], gems: { diceCount: 2, diceSides: 6, value: 50 }, magicItems: { diceCount: 1, diceSides: 4, table: 'F' } },
  { range: [98, 99], artObjects: { diceCount: 2, diceSides: 4, value: 25 }, magicItems: { diceCount: 1, diceSides: 1, table: 'G' } },
  { range: [100, 100], gems: { diceCount: 2, diceSides: 6, value: 50 }, magicItems: { diceCount: 1, diceSides: 1, table: 'G' } },
]

// CR 5-10: 2d6×100 cp, 2d6×1000 sp, 6d6×100 gp, 3d6×10 pp
const HOARD_CR_5_10: HoardTableEntry[] = [
  { range: [1, 4] },
  { range: [5, 10], artObjects: { diceCount: 2, diceSides: 4, value: 25 } },
  { range: [11, 16], gems: { diceCount: 3, diceSides: 6, value: 50 } },
  { range: [17, 22], gems: { diceCount: 3, diceSides: 6, value: 100 } },
  { range: [23, 28], artObjects: { diceCount: 2, diceSides: 4, value: 250 } },
  { range: [29, 32], artObjects: { diceCount: 2, diceSides: 4, value: 25 }, magicItems: { diceCount: 1, diceSides: 6, table: 'A' } },
  { range: [33, 36], gems: { diceCount: 3, diceSides: 6, value: 50 }, magicItems: { diceCount: 1, diceSides: 6, table: 'A' } },
  { range: [37, 40], gems: { diceCount: 3, diceSides: 6, value: 100 }, magicItems: { diceCount: 1, diceSides: 6, table: 'A' } },
  { range: [41, 44], artObjects: { diceCount: 2, diceSides: 4, value: 250 }, magicItems: { diceCount: 1, diceSides: 6, table: 'A' } },
  { range: [45, 49], artObjects: { diceCount: 2, diceSides: 4, value: 25 }, magicItems: { diceCount: 1, diceSides: 4, table: 'B' } },
  { range: [50, 54], gems: { diceCount: 3, diceSides: 6, value: 50 }, magicItems: { diceCount: 1, diceSides: 4, table: 'B' } },
  { range: [55, 59], gems: { diceCount: 3, diceSides: 6, value: 100 }, magicItems: { diceCount: 1, diceSides: 4, table: 'B' } },
  { range: [60, 63], artObjects: { diceCount: 2, diceSides: 4, value: 250 }, magicItems: { diceCount: 1, diceSides: 4, table: 'B' } },
  { range: [64, 66], artObjects: { diceCount: 2, diceSides: 4, value: 25 }, magicItems: { diceCount: 1, diceSides: 4, table: 'C' } },
  { range: [67, 69], gems: { diceCount: 3, diceSides: 6, value: 50 }, magicItems: { diceCount: 1, diceSides: 4, table: 'C' } },
  { range: [70, 72], gems: { diceCount: 3, diceSides: 6, value: 100 }, magicItems: { diceCount: 1, diceSides: 4, table: 'C' } },
  { range: [73, 74], artObjects: { diceCount: 2, diceSides: 4, value: 250 }, magicItems: { diceCount: 1, diceSides: 4, table: 'C' } },
  { range: [75, 76], artObjects: { diceCount: 2, diceSides: 4, value: 25 }, magicItems: { diceCount: 1, diceSides: 1, table: 'D' } },
  { range: [77, 78], gems: { diceCount: 3, diceSides: 6, value: 50 }, magicItems: { diceCount: 1, diceSides: 1, table: 'D' } },
  { range: [79, 79], gems: { diceCount: 3, diceSides: 6, value: 100 }, magicItems: { diceCount: 1, diceSides: 1, table: 'D' } },
  { range: [80, 80], artObjects: { diceCount: 2, diceSides: 4, value: 250 }, magicItems: { diceCount: 1, diceSides: 1, table: 'D' } },
  { range: [81, 84], artObjects: { diceCount: 2, diceSides: 4, value: 25 }, magicItems: { diceCount: 1, diceSides: 4, table: 'F' } },
  { range: [85, 88], gems: { diceCount: 3, diceSides: 6, value: 50 }, magicItems: { diceCount: 1, diceSides: 4, table: 'F' } },
  { range: [89, 91], gems: { diceCount: 3, diceSides: 6, value: 100 }, magicItems: { diceCount: 1, diceSides: 4, table: 'F' } },
  { range: [92, 94], artObjects: { diceCount: 2, diceSides: 4, value: 250 }, magicItems: { diceCount: 1, diceSides: 4, table: 'F' } },
  { range: [95, 96], gems: { diceCount: 3, diceSides: 6, value: 100 }, magicItems: { diceCount: 1, diceSides: 4, table: 'G' } },
  { range: [97, 98], artObjects: { diceCount: 2, diceSides: 4, value: 250 }, magicItems: { diceCount: 1, diceSides: 4, table: 'G' } },
  { range: [99, 99], gems: { diceCount: 3, diceSides: 6, value: 100 }, magicItems: { diceCount: 1, diceSides: 1, table: 'H' } },
  { range: [100, 100], artObjects: { diceCount: 2, diceSides: 4, value: 250 }, magicItems: { diceCount: 1, diceSides: 1, table: 'H' } },
]

// CR 11-16: 4d6×1000 gp, 5d6×100 pp
const HOARD_CR_11_16: HoardTableEntry[] = [
  { range: [1, 3] },
  { range: [4, 6], artObjects: { diceCount: 2, diceSides: 4, value: 250 } },
  { range: [7, 9], artObjects: { diceCount: 2, diceSides: 4, value: 750 } },
  { range: [10, 12], gems: { diceCount: 3, diceSides: 6, value: 500 } },
  { range: [13, 15], gems: { diceCount: 3, diceSides: 6, value: 1000 } },
  { range: [16, 19], artObjects: { diceCount: 2, diceSides: 4, value: 250 }, magicItems: { diceCount: 1, diceSides: 4, table: 'A' } },
  { range: [20, 23], artObjects: { diceCount: 2, diceSides: 4, value: 750 }, magicItems: { diceCount: 1, diceSides: 4, table: 'A' } },
  { range: [24, 26], gems: { diceCount: 3, diceSides: 6, value: 500 }, magicItems: { diceCount: 1, diceSides: 4, table: 'A' } },
  { range: [27, 29], gems: { diceCount: 3, diceSides: 6, value: 1000 }, magicItems: { diceCount: 1, diceSides: 4, table: 'A' } },
  { range: [30, 35], artObjects: { diceCount: 2, diceSides: 4, value: 250 }, magicItems: { diceCount: 1, diceSides: 6, table: 'B' } },
  { range: [36, 40], artObjects: { diceCount: 2, diceSides: 4, value: 750 }, magicItems: { diceCount: 1, diceSides: 6, table: 'B' } },
  { range: [41, 45], gems: { diceCount: 3, diceSides: 6, value: 500 }, magicItems: { diceCount: 1, diceSides: 6, table: 'B' } },
  { range: [46, 50], gems: { diceCount: 3, diceSides: 6, value: 1000 }, magicItems: { diceCount: 1, diceSides: 6, table: 'B' } },
  { range: [51, 54], artObjects: { diceCount: 2, diceSides: 4, value: 250 }, magicItems: { diceCount: 1, diceSides: 4, table: 'C' } },
  { range: [55, 58], artObjects: { diceCount: 2, diceSides: 4, value: 750 }, magicItems: { diceCount: 1, diceSides: 4, table: 'C' } },
  { range: [59, 62], gems: { diceCount: 3, diceSides: 6, value: 500 }, magicItems: { diceCount: 1, diceSides: 4, table: 'C' } },
  { range: [63, 66], gems: { diceCount: 3, diceSides: 6, value: 1000 }, magicItems: { diceCount: 1, diceSides: 4, table: 'C' } },
  { range: [67, 68], artObjects: { diceCount: 2, diceSides: 4, value: 250 }, magicItems: { diceCount: 1, diceSides: 1, table: 'D' } },
  { range: [69, 70], artObjects: { diceCount: 2, diceSides: 4, value: 750 }, magicItems: { diceCount: 1, diceSides: 1, table: 'D' } },
  { range: [71, 72], gems: { diceCount: 3, diceSides: 6, value: 500 }, magicItems: { diceCount: 1, diceSides: 1, table: 'D' } },
  { range: [73, 74], gems: { diceCount: 3, diceSides: 6, value: 1000 }, magicItems: { diceCount: 1, diceSides: 1, table: 'D' } },
  { range: [75, 76], artObjects: { diceCount: 2, diceSides: 4, value: 250 }, magicItems: { diceCount: 1, diceSides: 1, table: 'E' } },
  { range: [77, 78], artObjects: { diceCount: 2, diceSides: 4, value: 750 }, magicItems: { diceCount: 1, diceSides: 1, table: 'E' } },
  { range: [79, 80], gems: { diceCount: 3, diceSides: 6, value: 500 }, magicItems: { diceCount: 1, diceSides: 1, table: 'E' } },
  { range: [81, 82], gems: { diceCount: 3, diceSides: 6, value: 1000 }, magicItems: { diceCount: 1, diceSides: 1, table: 'E' } },
  { range: [83, 85], artObjects: { diceCount: 2, diceSides: 4, value: 250 }, magicItems: { diceCount: 1, diceSides: 4, table: 'F' } },
  { range: [86, 88], artObjects: { diceCount: 2, diceSides: 4, value: 750 }, magicItems: { diceCount: 1, diceSides: 4, table: 'F' } },
  { range: [89, 90], gems: { diceCount: 3, diceSides: 6, value: 500 }, magicItems: { diceCount: 1, diceSides: 4, table: 'F' } },
  { range: [91, 92], gems: { diceCount: 3, diceSides: 6, value: 1000 }, magicItems: { diceCount: 1, diceSides: 4, table: 'F' } },
  { range: [93, 94], artObjects: { diceCount: 2, diceSides: 4, value: 250 }, magicItems: { diceCount: 1, diceSides: 4, table: 'G' } },
  { range: [95, 96], artObjects: { diceCount: 2, diceSides: 4, value: 750 }, magicItems: { diceCount: 1, diceSides: 4, table: 'G' } },
  { range: [97, 98], gems: { diceCount: 3, diceSides: 6, value: 500 }, magicItems: { diceCount: 1, diceSides: 4, table: 'G' } },
  { range: [99, 99], gems: { diceCount: 3, diceSides: 6, value: 1000 }, magicItems: { diceCount: 1, diceSides: 4, table: 'G' } },
  { range: [100, 100], gems: { diceCount: 3, diceSides: 6, value: 1000 }, magicItems: { diceCount: 1, diceSides: 1, table: 'H' } },
]

// CR 17+: 12d6×1000 gp, 8d6×1000 pp
const HOARD_CR_17_PLUS: HoardTableEntry[] = [
  { range: [1, 2] },
  { range: [3, 5], gems: { diceCount: 3, diceSides: 6, value: 1000 } },
  { range: [6, 8], artObjects: { diceCount: 1, diceSides: 10, value: 2500 } },
  { range: [9, 11], artObjects: { diceCount: 1, diceSides: 4, value: 7500 } },
  { range: [12, 14], gems: { diceCount: 1, diceSides: 8, value: 5000 } },
  { range: [15, 22], gems: { diceCount: 3, diceSides: 6, value: 1000 }, magicItems: { diceCount: 1, diceSides: 6, table: 'C' } },
  { range: [23, 30], artObjects: { diceCount: 1, diceSides: 10, value: 2500 }, magicItems: { diceCount: 1, diceSides: 6, table: 'C' } },
  { range: [31, 38], artObjects: { diceCount: 1, diceSides: 4, value: 7500 }, magicItems: { diceCount: 1, diceSides: 6, table: 'C' } },
  { range: [39, 46], gems: { diceCount: 1, diceSides: 8, value: 5000 }, magicItems: { diceCount: 1, diceSides: 6, table: 'C' } },
  { range: [47, 52], gems: { diceCount: 3, diceSides: 6, value: 1000 }, magicItems: { diceCount: 1, diceSides: 4, table: 'D' } },
  { range: [53, 58], artObjects: { diceCount: 1, diceSides: 10, value: 2500 }, magicItems: { diceCount: 1, diceSides: 4, table: 'D' } },
  { range: [59, 63], artObjects: { diceCount: 1, diceSides: 4, value: 7500 }, magicItems: { diceCount: 1, diceSides: 4, table: 'D' } },
  { range: [64, 68], gems: { diceCount: 1, diceSides: 8, value: 5000 }, magicItems: { diceCount: 1, diceSides: 4, table: 'D' } },
  { range: [69, 69], gems: { diceCount: 3, diceSides: 6, value: 1000 }, magicItems: { diceCount: 1, diceSides: 1, table: 'E' } },
  { range: [70, 70], artObjects: { diceCount: 1, diceSides: 10, value: 2500 }, magicItems: { diceCount: 1, diceSides: 1, table: 'E' } },
  { range: [71, 71], artObjects: { diceCount: 1, diceSides: 4, value: 7500 }, magicItems: { diceCount: 1, diceSides: 1, table: 'E' } },
  { range: [72, 72], gems: { diceCount: 1, diceSides: 8, value: 5000 }, magicItems: { diceCount: 1, diceSides: 1, table: 'E' } },
  { range: [73, 74], gems: { diceCount: 3, diceSides: 6, value: 1000 }, magicItems: { diceCount: 1, diceSides: 4, table: 'G' } },
  { range: [75, 76], artObjects: { diceCount: 1, diceSides: 10, value: 2500 }, magicItems: { diceCount: 1, diceSides: 4, table: 'G' } },
  { range: [77, 78], artObjects: { diceCount: 1, diceSides: 4, value: 7500 }, magicItems: { diceCount: 1, diceSides: 4, table: 'G' } },
  { range: [79, 80], gems: { diceCount: 1, diceSides: 8, value: 5000 }, magicItems: { diceCount: 1, diceSides: 4, table: 'G' } },
  { range: [81, 85], gems: { diceCount: 3, diceSides: 6, value: 1000 }, magicItems: { diceCount: 1, diceSides: 4, table: 'H' } },
  { range: [86, 90], artObjects: { diceCount: 1, diceSides: 10, value: 2500 }, magicItems: { diceCount: 1, diceSides: 4, table: 'H' } },
  { range: [91, 95], artObjects: { diceCount: 1, diceSides: 4, value: 7500 }, magicItems: { diceCount: 1, diceSides: 4, table: 'H' } },
  { range: [96, 100], gems: { diceCount: 1, diceSides: 8, value: 5000 }, magicItems: { diceCount: 1, diceSides: 4, table: 'H' } },
]

// Map CR tiers to their hoard tables and currency formulas
const HOARD_TABLES: Record<CRTier, { table: HoardTableEntry[], currency: () => LootCurrency }> = {
  '0-4': {
    table: HOARD_CR_0_4,
    currency: () => ({
      platinum: 0,
      gold: rollDice(2, 6) * 10,
      electrum: 0,
      silver: rollDice(3, 6) * 100,
      copper: rollDice(6, 6) * 100,
    })
  },
  '5-10': {
    table: HOARD_CR_5_10,
    currency: () => ({
      platinum: rollDice(3, 6) * 10,
      gold: rollDice(6, 6) * 100,
      electrum: 0,
      silver: rollDice(2, 6) * 1000,
      copper: rollDice(2, 6) * 100,
    })
  },
  '11-16': {
    table: HOARD_CR_11_16,
    currency: () => ({
      platinum: rollDice(5, 6) * 100,
      gold: rollDice(4, 6) * 1000,
      electrum: 0,
      silver: 0,
      copper: 0,
    })
  },
  '17+': {
    table: HOARD_CR_17_PLUS,
    currency: () => ({
      platinum: rollDice(8, 6) * 1000,
      gold: rollDice(12, 6) * 1000,
      electrum: 0,
      silver: 0,
      copper: 0,
    })
  },
}

// ============================================
// Individual Treasure Tables
// ============================================

interface IndividualTableEntry {
  range: [number, number]
  copper?: { diceCount: number, diceSides: number, multiplier?: number }
  silver?: { diceCount: number, diceSides: number, multiplier?: number }
  electrum?: { diceCount: number, diceSides: number, multiplier?: number }
  gold?: { diceCount: number, diceSides: number, multiplier?: number }
  platinum?: { diceCount: number, diceSides: number, multiplier?: number }
}

const INDIVIDUAL_CR_0_4: IndividualTableEntry[] = [
  { range: [1, 30], copper: { diceCount: 5, diceSides: 6 } },
  { range: [31, 60], silver: { diceCount: 4, diceSides: 6 } },
  { range: [61, 70], electrum: { diceCount: 3, diceSides: 6 } },
  { range: [71, 95], gold: { diceCount: 3, diceSides: 6 } },
  { range: [96, 100], platinum: { diceCount: 1, diceSides: 6 } },
]

const INDIVIDUAL_CR_5_10: IndividualTableEntry[] = [
  { range: [1, 30], copper: { diceCount: 4, diceSides: 6, multiplier: 100 }, electrum: { diceCount: 1, diceSides: 6, multiplier: 10 } },
  { range: [31, 60], silver: { diceCount: 6, diceSides: 6, multiplier: 10 }, gold: { diceCount: 2, diceSides: 6, multiplier: 10 } },
  { range: [61, 70], electrum: { diceCount: 3, diceSides: 6, multiplier: 10 }, gold: { diceCount: 2, diceSides: 6, multiplier: 10 } },
  { range: [71, 95], gold: { diceCount: 4, diceSides: 6, multiplier: 10 } },
  { range: [96, 100], gold: { diceCount: 2, diceSides: 6, multiplier: 10 }, platinum: { diceCount: 3, diceSides: 6 } },
]

const INDIVIDUAL_CR_11_16: IndividualTableEntry[] = [
  { range: [1, 20], silver: { diceCount: 4, diceSides: 6, multiplier: 100 }, gold: { diceCount: 1, diceSides: 6, multiplier: 100 } },
  { range: [21, 35], electrum: { diceCount: 1, diceSides: 6, multiplier: 100 }, gold: { diceCount: 1, diceSides: 6, multiplier: 100 } },
  { range: [36, 75], gold: { diceCount: 2, diceSides: 6, multiplier: 100 }, platinum: { diceCount: 1, diceSides: 6, multiplier: 10 } },
  { range: [76, 100], gold: { diceCount: 2, diceSides: 6, multiplier: 100 }, platinum: { diceCount: 2, diceSides: 6, multiplier: 10 } },
]

const INDIVIDUAL_CR_17_PLUS: IndividualTableEntry[] = [
  { range: [1, 15], electrum: { diceCount: 2, diceSides: 6, multiplier: 1000 }, gold: { diceCount: 8, diceSides: 6, multiplier: 100 } },
  { range: [16, 55], gold: { diceCount: 1, diceSides: 6, multiplier: 1000 }, platinum: { diceCount: 1, diceSides: 6, multiplier: 100 } },
  { range: [56, 100], gold: { diceCount: 1, diceSides: 6, multiplier: 1000 }, platinum: { diceCount: 2, diceSides: 6, multiplier: 100 } },
]

const INDIVIDUAL_TABLES: Record<CRTier, IndividualTableEntry[]> = {
  '0-4': INDIVIDUAL_CR_0_4,
  '5-10': INDIVIDUAL_CR_5_10,
  '11-16': INDIVIDUAL_CR_11_16,
  '17+': INDIVIDUAL_CR_17_PLUS,
}

// ============================================
// Main Generation Functions
// ============================================

/**
 * Generate treasure hoard based on CR tier
 */
export function generateTreasureHoard(crTier: CRTier): HoardRollResult {
  const { table, currency: currencyFn } = HOARD_TABLES[crTier]
  const roll = rollD100()

  // Find matching entry
  const entry = table.find(e => roll >= e.range[0] && roll <= e.range[1])
  if (!entry) {
    // Fallback to first entry
    return { currency: currencyFn() }
  }

  const result: HoardRollResult = {
    currency: currencyFn(),
  }

  // Add gems if present
  if (entry.gems) {
    result.gems = {
      value: entry.gems.value,
      count: rollDice(entry.gems.diceCount, entry.gems.diceSides),
    }
  }

  // Add art objects if present
  if (entry.artObjects) {
    result.artObjects = {
      value: entry.artObjects.value,
      count: rollDice(entry.artObjects.diceCount, entry.artObjects.diceSides),
    }
  }

  // Add magic items if present
  if (entry.magicItems) {
    result.magicItems = {
      table: entry.magicItems.table,
      count: rollDice(entry.magicItems.diceCount, entry.magicItems.diceSides),
    }
  }

  return result
}

/**
 * Generate individual treasure for a single monster
 */
export function generateIndividualTreasure(crTier: CRTier): LootCurrency {
  const table = INDIVIDUAL_TABLES[crTier]
  const roll = rollD100()

  const entry = table.find(e => roll >= e.range[0] && roll <= e.range[1])
  if (!entry) {
    return { platinum: 0, gold: 0, electrum: 0, silver: 0, copper: 0 }
  }

  const currency: LootCurrency = {
    platinum: 0,
    gold: 0,
    electrum: 0,
    silver: 0,
    copper: 0,
  }

  if (entry.copper) {
    currency.copper = rollDice(entry.copper.diceCount, entry.copper.diceSides) * (entry.copper.multiplier || 1)
  }
  if (entry.silver) {
    currency.silver = rollDice(entry.silver.diceCount, entry.silver.diceSides) * (entry.silver.multiplier || 1)
  }
  if (entry.electrum) {
    currency.electrum = rollDice(entry.electrum.diceCount, entry.electrum.diceSides) * (entry.electrum.multiplier || 1)
  }
  if (entry.gold) {
    currency.gold = rollDice(entry.gold.diceCount, entry.gold.diceSides) * (entry.gold.multiplier || 1)
  }
  if (entry.platinum) {
    currency.platinum = rollDice(entry.platinum.diceCount, entry.platinum.diceSides) * (entry.platinum.multiplier || 1)
  }

  return currency
}

/**
 * Generate individual treasure for multiple monsters
 */
export function generateIndividualTreasureMultiple(crTier: CRTier, monsterCount: number): LootCurrency {
  const total: LootCurrency = { platinum: 0, gold: 0, electrum: 0, silver: 0, copper: 0 }

  for (let i = 0; i < monsterCount; i++) {
    const treasure = generateIndividualTreasure(crTier)
    total.platinum += treasure.platinum
    total.gold += treasure.gold
    total.electrum += treasure.electrum
    total.silver += treasure.silver
    total.copper += treasure.copper
  }

  return total
}

/**
 * Rarity fallback order (from highest to lowest)
 */
export const RARITY_FALLBACK_ORDER = ['legendary', 'very_rare', 'rare', 'uncommon', 'common']

/**
 * Get the next lower rarity for fallback
 */
export function getNextLowerRarity(rarity: string): string | null {
  const index = RARITY_FALLBACK_ORDER.indexOf(rarity)
  if (index === -1 || index === RARITY_FALLBACK_ORDER.length - 1) {
    return null
  }
  return RARITY_FALLBACK_ORDER[index + 1]
}
