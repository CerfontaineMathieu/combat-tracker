// D&D 5e XP Thresholds for encounter difficulty calculation
// Based on DMG Chapter 3: Creating Adventures

export type DifficultyTier = 'trivial' | 'easy' | 'medium' | 'hard' | 'deadly'

interface XpThreshold {
  easy: number
  medium: number
  hard: number
  deadly: number
}

// XP thresholds per character level (DMG p. 82)
const XP_THRESHOLDS: Record<number, XpThreshold> = {
  1: { easy: 25, medium: 50, hard: 75, deadly: 100 },
  2: { easy: 50, medium: 100, hard: 150, deadly: 200 },
  3: { easy: 75, medium: 150, hard: 225, deadly: 400 },
  4: { easy: 125, medium: 250, hard: 375, deadly: 500 },
  5: { easy: 250, medium: 500, hard: 750, deadly: 1100 },
  6: { easy: 300, medium: 600, hard: 900, deadly: 1400 },
  7: { easy: 350, medium: 750, hard: 1100, deadly: 1700 },
  8: { easy: 450, medium: 900, hard: 1400, deadly: 2100 },
  9: { easy: 550, medium: 1100, hard: 1600, deadly: 2400 },
  10: { easy: 600, medium: 1200, hard: 1900, deadly: 2800 },
  11: { easy: 800, medium: 1600, hard: 2400, deadly: 3600 },
  12: { easy: 1000, medium: 2000, hard: 3000, deadly: 4500 },
  13: { easy: 1100, medium: 2200, hard: 3400, deadly: 5100 },
  14: { easy: 1250, medium: 2500, hard: 3800, deadly: 5700 },
  15: { easy: 1400, medium: 2800, hard: 4300, deadly: 6400 },
  16: { easy: 1600, medium: 3200, hard: 4800, deadly: 7200 },
  17: { easy: 2000, medium: 3900, hard: 5900, deadly: 8800 },
  18: { easy: 2100, medium: 4200, hard: 6300, deadly: 9500 },
  19: { easy: 2400, medium: 4900, hard: 7300, deadly: 10900 },
  20: { easy: 2800, medium: 5700, hard: 8500, deadly: 12700 },
}

// Difficulty labels in French
export const DIFFICULTY_LABELS: Record<DifficultyTier, string> = {
  trivial: 'Trivial',
  easy: 'Facile',
  medium: 'Moyen',
  hard: 'Difficile',
  deadly: 'Mortel',
}

// Difficulty colors for UI (Tailwind classes)
export const DIFFICULTY_COLORS: Record<DifficultyTier, string> = {
  trivial: 'text-gray-400 border-gray-400/30',
  easy: 'text-green-400 border-green-400/30',
  medium: 'text-yellow-400 border-yellow-400/30',
  hard: 'text-orange-400 border-orange-400/30',
  deadly: 'text-red-400 border-red-400/30',
}

/**
 * Calculate encounter difficulty based on total XP and party composition
 * @param totalXp - Total XP of all monsters in the encounter
 * @param players - Array of players with their levels
 * @returns Difficulty tier (trivial, easy, medium, hard, deadly)
 */
export function calculateDifficulty(
  totalXp: number,
  players: { level: number }[]
): DifficultyTier {
  if (players.length === 0) {
    return 'trivial'
  }

  // Sum up thresholds for all party members
  const partyThresholds = players.reduce(
    (acc, player) => {
      // Clamp level between 1 and 20
      const level = Math.max(1, Math.min(20, player.level || 1))
      const thresholds = XP_THRESHOLDS[level]

      return {
        easy: acc.easy + thresholds.easy,
        medium: acc.medium + thresholds.medium,
        hard: acc.hard + thresholds.hard,
        deadly: acc.deadly + thresholds.deadly,
      }
    },
    { easy: 0, medium: 0, hard: 0, deadly: 0 }
  )

  // Determine difficulty tier
  if (totalXp >= partyThresholds.deadly) return 'deadly'
  if (totalXp >= partyThresholds.hard) return 'hard'
  if (totalXp >= partyThresholds.medium) return 'medium'
  if (totalXp >= partyThresholds.easy) return 'easy'
  return 'trivial'
}

/**
 * Get the XP thresholds for a party
 * Useful for displaying threshold ranges in UI
 */
export function getPartyThresholds(players: { level: number }[]): XpThreshold {
  if (players.length === 0) {
    return { easy: 0, medium: 0, hard: 0, deadly: 0 }
  }

  return players.reduce(
    (acc, player) => {
      const level = Math.max(1, Math.min(20, player.level || 1))
      const thresholds = XP_THRESHOLDS[level]

      return {
        easy: acc.easy + thresholds.easy,
        medium: acc.medium + thresholds.medium,
        hard: acc.hard + thresholds.hard,
        deadly: acc.deadly + thresholds.deadly,
      }
    },
    { easy: 0, medium: 0, hard: 0, deadly: 0 }
  )
}
