// Standard D&D 5e "XP by Challenge Rating" table for individual monsters
// (identical in the 2014 and 2024 rulesets)
export const CHALLENGE_RATING_TABLE: { cr: string; xp: number }[] = [
  { cr: "0", xp: 10 },
  { cr: "1/8", xp: 25 },
  { cr: "1/4", xp: 50 },
  { cr: "1/2", xp: 100 },
  { cr: "1", xp: 200 },
  { cr: "2", xp: 450 },
  { cr: "3", xp: 700 },
  { cr: "4", xp: 1100 },
  { cr: "5", xp: 1800 },
  { cr: "6", xp: 2300 },
  { cr: "7", xp: 2900 },
  { cr: "8", xp: 3900 },
  { cr: "9", xp: 5000 },
  { cr: "10", xp: 5900 },
  { cr: "11", xp: 7200 },
  { cr: "12", xp: 8400 },
  { cr: "13", xp: 10000 },
  { cr: "14", xp: 11500 },
  { cr: "15", xp: 13000 },
  { cr: "16", xp: 15000 },
  { cr: "17", xp: 18000 },
  { cr: "18", xp: 20000 },
  { cr: "19", xp: 22000 },
  { cr: "20", xp: 25000 },
  { cr: "21", xp: 33000 },
  { cr: "22", xp: 41000 },
  { cr: "23", xp: 50000 },
  { cr: "24", xp: 62000 },
  { cr: "25", xp: 75000 },
  { cr: "26", xp: 90000 },
  { cr: "27", xp: 105000 },
  { cr: "28", xp: 120000 },
  { cr: "29", xp: 135000 },
  { cr: "30", xp: 155000 },
]

const XP_TO_CR = new Map(CHALLENGE_RATING_TABLE.map(({ cr, xp }) => [xp, cr]))

/**
 * Maps a monster's raw XP value to its "FP" (Facteur de Puissance / Challenge
 * Rating) label, e.g. 25 -> "1/8". Falls back to the raw XP for values not on
 * the standard table (custom/homebrew monsters), and "?" when there is none.
 */
export function xpToChallengeRating(xp: number | null): string {
  if (xp == null) return "?"
  return XP_TO_CR.get(xp) ?? `${xp} XP`
}
