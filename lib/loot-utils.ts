import type {
  LootCurrency,
  LootSession,
  LootItem,
  LootClaim,
  LootDistribution,
  LootItemStatus,
  LootItemRarity,
} from './types';

// ============================================
// Currency Utilities
// ============================================

/**
 * Convert currency to total copper pieces for calculations
 * D&D 5e rates: 1pp = 1000cp, 1gp = 100cp, 1ep = 50cp, 1sp = 10cp
 */
export function currencyToCopper(currency: LootCurrency): number {
  return (
    (currency.platinum * 1000) +
    (currency.gold * 100) +
    (currency.electrum * 50) +
    (currency.silver * 10) +
    currency.copper
  );
}

/**
 * Convert copper pieces to currency breakdown
 * Keeps existing denominations when possible (doesn't auto-convert up)
 */
export function copperToCurrency(copper: number): LootCurrency {
  const platinum = Math.floor(copper / 1000);
  const remainingAfterPlatinum = copper % 1000;
  const gold = Math.floor(remainingAfterPlatinum / 100);
  const remainingAfterGold = remainingAfterPlatinum % 100;
  // Note: We skip electrum in conversion as it's rarely used
  const silver = Math.floor(remainingAfterGold / 10);
  const copperCoins = remainingAfterGold % 10;

  return { platinum, gold, electrum: 0, silver, copper: copperCoins };
}

/**
 * Split currency equally among characters
 * Returns a map of characterId -> currency share
 */
export function splitCurrencyEqually(
  currency: LootCurrency,
  characterIds: string[]
): Map<string, LootCurrency> {
  const result = new Map<string, LootCurrency>();
  const count = characterIds.length;

  if (count === 0) return result;

  const totalCopper = currencyToCopper(currency);
  const perCharacterCopper = Math.floor(totalCopper / count);
  const remainder = totalCopper % count;

  characterIds.forEach((charId, index) => {
    // Distribute remainder to first N characters (1 copper each)
    const extra = index < remainder ? 1 : 0;
    result.set(charId, copperToCurrency(perCharacterCopper + extra));
  });

  return result;
}

/**
 * Format currency for display (e.g., "10 pp, 150 po, 5 pe, 23 pa, 5 pc")
 */
export function formatCurrency(currency: LootCurrency): string {
  const parts: string[] = [];

  if (currency.platinum > 0) parts.push(`${currency.platinum} pp`);
  if (currency.gold > 0) parts.push(`${currency.gold} po`);
  if (currency.electrum > 0) parts.push(`${currency.electrum} pe`);
  if (currency.silver > 0) parts.push(`${currency.silver} pa`);
  if (currency.copper > 0) parts.push(`${currency.copper} pc`);

  return parts.length > 0 ? parts.join(', ') : '0 po';
}

/**
 * Format currency compactly (e.g., "150po")
 */
export function formatCurrencyCompact(currency: LootCurrency): string {
  const totalCopper = currencyToCopper(currency);

  if (totalCopper >= 100) {
    const gp = totalCopper / 100;
    return `${gp.toFixed(gp % 1 === 0 ? 0 : 2)} po`;
  } else if (totalCopper >= 10) {
    const sp = totalCopper / 10;
    return `${sp.toFixed(sp % 1 === 0 ? 0 : 1)} pa`;
  } else {
    return `${totalCopper} pc`;
  }
}

/**
 * Add two currencies together
 */
export function addCurrency(a: LootCurrency, b: LootCurrency): LootCurrency {
  const totalCopper = currencyToCopper(a) + currencyToCopper(b);
  return copperToCurrency(totalCopper);
}

/**
 * Check if currency is empty (all zeros)
 */
export function isCurrencyEmpty(currency: LootCurrency): boolean {
  return (
    currency.platinum === 0 &&
    currency.gold === 0 &&
    currency.electrum === 0 &&
    currency.silver === 0 &&
    currency.copper === 0
  );
}

// ============================================
// Loot Item Utilities
// ============================================

/**
 * Calculate item status based on claims
 */
export function calculateItemStatus(item: LootItem): LootItemStatus {
  if (item.assignedTo) return 'assigned';
  if (item.status === 'treasury') return 'treasury';
  if (item.status === 'sold') return 'sold';
  if (item.claims.length === 0) return 'unclaimed';
  if (item.claims.length === 1) return 'unclaimed'; // Single claim = not contested yet
  return 'contested';
}

/**
 * Sort items by status priority (contested first, then unclaimed, then assigned)
 */
export function sortItemsByStatus(items: LootItem[]): LootItem[] {
  const statusPriority: Record<LootItemStatus, number> = {
    contested: 0,
    unclaimed: 1,
    assigned: 2,
    treasury: 3,
    sold: 4,
  };

  return [...items].sort((a, b) => {
    return statusPriority[a.status] - statusPriority[b.status];
  });
}

/**
 * Sort items by rarity (legendary first)
 */
export function sortItemsByRarity(items: LootItem[]): LootItem[] {
  const rarityPriority: Record<LootItemRarity, number> = {
    artifact: 0,
    legendary: 1,
    very_rare: 2,
    rare: 3,
    uncommon: 4,
    common: 5,
  };

  return [...items].sort((a, b) => {
    return rarityPriority[a.rarity] - rarityPriority[b.rarity];
  });
}

/**
 * Get claims sorted by priority (highest first)
 */
export function sortClaimsByPriority(claims: LootClaim[]): LootClaim[] {
  return [...claims].sort((a, b) => b.priority - a.priority);
}

/**
 * Check if a character has claimed an item
 */
export function hasCharacterClaimed(item: LootItem, characterId: string): boolean {
  return item.claims.some(c => c.characterId === characterId);
}

/**
 * Get character's claim on an item (if any)
 */
export function getCharacterClaim(item: LootItem, characterId: string): LootClaim | undefined {
  return item.claims.find(c => c.characterId === characterId);
}

/**
 * Get highest priority claim for an item
 */
export function getHighestPriorityClaim(item: LootItem): LootClaim | undefined {
  if (item.claims.length === 0) return undefined;
  return sortClaimsByPriority(item.claims)[0];
}

/**
 * Check if item has competing claims (same priority)
 */
export function hasCompetingClaims(item: LootItem): boolean {
  if (item.claims.length < 2) return false;

  const sorted = sortClaimsByPriority(item.claims);
  return sorted[0].priority === sorted[1].priority;
}

/**
 * Get priority label in French
 */
export function getPriorityLabel(priority: 1 | 2 | 3): string {
  switch (priority) {
    case 1: return 'Intéressé';
    case 2: return 'Très intéressé';
    case 3: return 'BESOIN';
  }
}

/**
 * Get priority emoji string (👍, 👍👍, 👍👍👍)
 */
export function getPriorityEmoji(priority: 1 | 2 | 3): string {
  return '👍'.repeat(priority);
}

// ============================================
// Loot Session Utilities
// ============================================

/**
 * Calculate time remaining until deadline
 */
export function getTimeRemaining(deadline: Date): { minutes: number; seconds: number } | null {
  const now = new Date();
  const diff = deadline.getTime() - now.getTime();

  if (diff <= 0) return null;

  const minutes = Math.floor(diff / 60000);
  const seconds = Math.floor((diff % 60000) / 1000);

  return { minutes, seconds };
}

/**
 * Format time remaining as "M:SS"
 */
export function formatTimeRemaining(deadline: Date): string {
  const remaining = getTimeRemaining(deadline);
  if (!remaining) return '0:00';

  return `${remaining.minutes}:${remaining.seconds.toString().padStart(2, '0')}`;
}

/**
 * Check if session is in claiming phase
 */
export function isClaimingPhase(session: LootSession): boolean {
  return session.status === 'claiming';
}

/**
 * Check if session is completed
 */
export function isSessionCompleted(session: LootSession): boolean {
  return session.status === 'completed' || session.status === 'cancelled';
}

/**
 * Check if all items are resolved (assigned, treasury, or sold)
 */
export function areAllItemsResolved(session: LootSession): boolean {
  return session.items.every(item =>
    item.status === 'assigned' || item.status === 'treasury' || item.status === 'sold'
  );
}

/**
 * Get unresolved items (unclaimed or contested)
 */
export function getUnresolvedItems(session: LootSession): LootItem[] {
  return session.items.filter(item =>
    item.status === 'unclaimed' || item.status === 'contested'
  );
}

/**
 * Get contested items
 */
export function getContestedItems(session: LootSession): LootItem[] {
  return session.items.filter(item => item.status === 'contested');
}

/**
 * Calculate distribution preview
 */
export function calculateDistributionPreview(
  session: LootSession,
  characterIds: string[],
  characterNames: Record<string, string>
): LootDistribution[] {
  const currencySplit = session.currencySplitMethod === 'equal'
    ? splitCurrencyEqually(session.currency, characterIds)
    : new Map<string, LootCurrency>();

  return characterIds.map(charId => {
    const assignedItems = session.items.filter(item => item.assignedTo === charId);
    const currency = currencySplit.get(charId) || { platinum: 0, gold: 0, electrum: 0, silver: 0, copper: 0 };

    return {
      id: `preview-${charId}`,
      sessionId: session.id,
      characterId: charId,
      characterName: characterNames[charId] || charId,
      currency,
      items: assignedItems.map(item => ({
        itemId: item.id,
        name: item.name,
        quantity: item.quantity,
        rarity: item.rarity,
      })),
    };
  });
}

/**
 * Get treasury items (unclaimed items that will go to group treasury)
 */
export function getTreasuryItems(session: LootSession): LootItem[] {
  return session.items.filter(item => item.status === 'treasury');
}

// ============================================
// Roll-off Utilities
// ============================================

/**
 * Simulate a d20 roll
 */
export function rollD20(): number {
  return Math.floor(Math.random() * 20) + 1;
}

/**
 * Run a roll-off between claimants
 * Returns sorted results with winner first
 */
export function runRollOff(
  claims: LootClaim[]
): Array<{ characterId: string; characterName: string; roll: number }> {
  const results = claims.map(claim => ({
    characterId: claim.characterId,
    characterName: claim.characterName,
    roll: rollD20(),
  }));

  // Sort by roll descending
  return results.sort((a, b) => b.roll - a.roll);
}

/**
 * Check if there's a tie in roll-off results
 */
export function hasRollOffTie(
  results: Array<{ characterId: string; roll: number }>
): boolean {
  if (results.length < 2) return false;
  return results[0].roll === results[1].roll;
}
