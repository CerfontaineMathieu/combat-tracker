// D&D 2024 Encounter Difficulty Calculation
// Based on 2024 Dungeon Master's Guide XP Budget System
// Source: https://roll20.net/compendium/dnd5e/Rules:Plan%20Encounters

export type DifficultyTier = 'trivial' | 'low' | 'moderate' | 'high' | 'deadly'

// XP Budget per Character table (2024 DMG)
// For each character level, defines XP thresholds for Low, Moderate, and High difficulty
const XP_BUDGET_TABLE: Record<number, { low: number; moderate: number; high: number }> = {
  1: { low: 50, moderate: 75, high: 100 },
  2: { low: 100, moderate: 150, high: 200 },
  3: { low: 150, moderate: 225, high: 400 },
  4: { low: 250, moderate: 375, high: 500 },
  5: { low: 500, moderate: 750, high: 1100 },
  6: { low: 600, moderate: 1000, high: 1400 },
  7: { low: 750, moderate: 1300, high: 1700 },
  8: { low: 1000, moderate: 1700, high: 2100 },
  9: { low: 1300, moderate: 2000, high: 2600 },
  10: { low: 1600, moderate: 2300, high: 3100 },
  11: { low: 1900, moderate: 2900, high: 4100 },
  12: { low: 2200, moderate: 3700, high: 4700 },
  13: { low: 2600, moderate: 4200, high: 5400 },
  14: { low: 2900, moderate: 4900, high: 6200 },
  15: { low: 3300, moderate: 5400, high: 7800 },
  16: { low: 3800, moderate: 6100, high: 9800 },
  17: { low: 4500, moderate: 7200, high: 11700 },
  18: { low: 5000, moderate: 8700, high: 14200 },
  19: { low: 5500, moderate: 10700, high: 17200 },
  20: { low: 6400, moderate: 13200, high: 22000 },
}

// Difficulty labels in French (2024 terminology)
export const DIFFICULTY_LABELS: Record<DifficultyTier, string> = {
  trivial: 'Trivial',
  low: 'Faible',
  moderate: 'Modéré',
  high: 'Élevé',
  deadly: 'Mortel',
}

// Difficulty colors for UI (Tailwind classes)
export const DIFFICULTY_COLORS: Record<DifficultyTier, string> = {
  trivial: 'text-gray-400 border-gray-400/30',
  low: 'text-green-400 border-green-400/30',
  moderate: 'text-yellow-400 border-yellow-400/30',
  high: 'text-orange-400 border-orange-400/30',
  deadly: 'text-red-400 border-red-400/30',
}

interface XPBudget {
  low: number
  moderate: number
  high: number
}

/**
 * Calculate the party's XP budget thresholds (2024 rules)
 * Sums up the XP budget for each character based on their level
 *
 * @param players - Array of players with their levels
 * @returns XP budget thresholds for low, moderate, and high difficulty
 */
export function getPartyXPBudget(players: { level: number }[]): XPBudget {
  if (players.length === 0) {
    return { low: 0, moderate: 0, high: 0 }
  }

  let low = 0
  let moderate = 0
  let high = 0

  for (const player of players) {
    // Clamp level between 1 and 20
    const level = Math.max(1, Math.min(20, player.level || 1))
    const budget = XP_BUDGET_TABLE[level]
    low += budget.low
    moderate += budget.moderate
    high += budget.high
  }

  return { low, moderate, high }
}

/**
 * Calculate encounter difficulty based on 2024 XP Budget system
 *
 * The 2024 DMG uses XP directly (no CR conversion, no multipliers):
 * 1. Look up XP budget for each character's level
 * 2. Sum the budgets for all party members
 * 3. Compare total monster XP to the party's budget thresholds
 *
 * @param totalXp - Total XP of all monsters in the encounter
 * @param players - Array of players with their levels
 * @returns Difficulty tier (trivial, low, moderate, high, deadly)
 */
export function calculateDifficulty(
  totalXp: number,
  players: { level: number }[]
): DifficultyTier {
  if (players.length === 0 || totalXp === 0) {
    return 'trivial'
  }

  const budget = getPartyXPBudget(players)

  // Compare total monster XP directly to party budget
  // 2024 rules: Low → Moderate → High → Deadly (above High)
  if (totalXp >= budget.high) return 'deadly'
  if (totalXp >= budget.moderate) return 'high'
  if (totalXp >= budget.low) return 'moderate'
  return 'low'
}

/**
 * Get the XP thresholds for a party (for UI display)
 * Returns the actual XP values for each difficulty tier
 */
export function getPartyThresholds(players: { level: number }[]): { easy: number; medium: number; hard: number; deadly: number } {
  const budget = getPartyXPBudget(players)
  // Map to legacy format for backwards compatibility with UI
  return {
    easy: budget.low,
    medium: budget.moderate,
    hard: budget.high,
    deadly: Math.round(budget.high * 1.5), // Approximate: anything significantly above high
  }
}
