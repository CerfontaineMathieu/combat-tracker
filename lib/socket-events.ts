// Socket.io event type definitions

import type {
  CharacterInventory,
  ActiveBuff,
  PreparedSpell,
  LootSession,
  LootItem,
  LootClaim,
  LootCurrency,
  LootItemType,
  LootItemRarity,
  RollOffResult,
  LootDistribution,
  CurrencySplitMethod,
  ResistanceType,
  SavingThrowType,
} from './types';

export interface JoinCampaignData {
  campaignId: number;
  role: 'dm' | 'player';
  characters?: Array<{
    odNumber: string | number; // Notion UUID or legacy DB ID
    name: string;
    class: string;
    level: number;
    currentHp: number;
    maxHp: number;
    tempHp?: number; // Temporary hit points (D&D 5e)
    ac: number;
    initiative: number;
    conditions: string[];
    conditionDurations?: Record<string, number>; // conditionId -> remaining turns
    exhaustionLevel?: number;
    buffs?: ActiveBuff[]; // Character buffs/debuffs
    inventory?: CharacterInventory; // Character inventory for sync
    spellSlots?: Record<number, number>; // Current spell slots per level
    maxSpellSlots?: Record<number, number>; // Max spell slots from Notion
    isWarlock?: boolean; // Warlocks recover slots on short rest
  }>; // Characters array when joining as player
}

// Connected player info (characters chosen by player)
export interface ConnectedPlayer {
  socketId: string; // Socket ID
  playerName?: string; // Optional: player's real name
  characters: Array<{
    odNumber: string | number; // Notion UUID or legacy DB ID
    name: string;
    class: string;
    level: number;
    currentHp: number;
    maxHp: number;
    tempHp?: number; // Temporary hit points (D&D 5e)
    ac: number;
    initiative: number;
    conditions: string[];
    conditionDurations?: Record<string, number>; // conditionId -> remaining turns
    exhaustionLevel?: number;
    buffs?: ActiveBuff[]; // Character buffs/debuffs
    inventory?: CharacterInventory; // Character inventory for sync
    spellSlots?: Record<number, number>; // Current spell slots per level
    maxSpellSlots?: Record<number, number>; // Max spell slots from Notion
    isWarlock?: boolean; // Warlocks recover slots on short rest
  }>;
}

// Player connection events
export interface PlayerConnectedData {
  player: ConnectedPlayer;
}

export interface PlayerDisconnectedData {
  socketId: string;
}

export interface ConnectedPlayersData {
  players: ConnectedPlayer[];
}

export interface CombatUpdateData {
  type: 'start' | 'stop' | 'next-turn' | 'state-sync' | 'combat_end_xp';
  combatActive: boolean;
  currentTurn: number;
  roundNumber?: number;
  participants?: CombatParticipantData[];
  xpSummary?: {
    totalXp: number;
    perPlayerXp: number;
    playerCount: number;
    killedMonsters: { name: string; xp: number }[];
  };
}

export interface HpChangeData {
  participantId: string;
  participantType: 'player' | 'monster';
  newHp: number;
  tempHp?: number; // Temporary hit points (D&D 5e)
  change: number;
  source: 'dm' | 'player';
}

export interface InitiativeChangeData {
  participantId: string;
  participantType: 'player' | 'monster';
  newInitiative: number;
}

export interface MonsterAddData {
  monster: MonsterData;
}

export interface MonsterRemoveData {
  monsterId: string;
}

export interface StateSyncData {
  players: PlayerData[];
  monsters: MonsterData[];
  combatActive: boolean;
  currentTurn: number;
}

export interface CombatParticipantData {
  id: string;
  name: string;
  initiative: number;
  currentHp: number;
  maxHp: number;
  ac: number;
  conditions: string[];
  conditionDurations?: Record<string, number>;
  exhaustionLevel?: number;
  buffs?: ActiveBuff[];
  type: 'player' | 'monster';
}

export interface PlayerData {
  id: string;
  name: string;
  class: string;
  level: number;
  currentHp: number;
  maxHp: number;
  ac: number;
  initiative: number;
  conditions: string[];
}

export interface MonsterData {
  id: string;
  name: string;
  hp: number;
  maxHp: number;
  ac: number;
  initiative: number;
  notes: string;
  status: 'actif' | 'mort';
}

export interface NotificationData {
  type: 'success' | 'error' | 'info' | 'warning';
  message: string;
  description?: string;
}

export interface ConditionChangeData {
  participantId: string;
  participantType: 'player' | 'monster';
  conditions: string[];
  conditionDurations?: Record<string, number>;
}

export interface ExhaustionChangeData {
  participantId: string;
  participantType: 'player' | 'monster';
  exhaustionLevel: number;
}

export interface BuffChangeData {
  participantId: string;
  participantType: 'player' | 'monster';
  buffs: import('./types').ActiveBuff[];
}

export interface DeathSaveChangeData {
  participantId: string;
  participantType: 'player' | 'monster';
  deathSaves: { successes: number; failures: number };
  isStabilized: boolean;
  isDead: boolean;
}

export interface AmbientEffectData {
  effect: 'none' | 'rain' | 'fog' | 'fire' | 'snow' | 'sandstorm' | 'crit-fail' | 'crit-success' | 'concentration-broken';
}

export interface PlayerPositionData {
  odNumber: string | number;
  name: string;
  lng: number;
  lat: number;
}

export interface PlayerPositionsData {
  positions: PlayerPositionData[];
}

// Concentration check request (player to DM)
export interface ConcentrationCheckRequestData {
  participantId: string;
  participantName: string;
  participantType: 'player' | 'monster';
  damage: number;
  dc: number;
}

// Inventory update event
export interface InventoryUpdateData {
  participantId: string;
  participantType: 'player';
  inventory: import('./types').CharacterInventory;
  source: 'dm' | 'player';
}

// Spell slot change event
export interface SpellSlotChangeData {
  participantId: string;
  participantType: 'player';
  spellSlots: Record<number, number>;
  source: 'dm' | 'player';
}

// Prepared spells change event
export interface PreparedSpellsChangeData {
  participantId: string;
  participantType: 'player';
  preparedSpells: PreparedSpell[];
  source: 'dm' | 'player';
}

// ============================================
// Loot Distribution Events
// ============================================

// Loot session created/updated
export interface LootSessionUpdateData {
  session: LootSession;
}

// Loot session status change
export interface LootStatusChangeData {
  sessionId: string;
  status: LootSession['status'];
}

// Item added to loot pool
export interface LootItemAddData {
  sessionId: string;
  item: LootItem;
}

// Item updated (status, assignment, etc.)
export interface LootItemUpdateData {
  sessionId: string;
  item: LootItem;
}

// Item removed from loot pool
export interface LootItemRemoveData {
  sessionId: string;
  itemId: string;
}

// Claim added/updated
export interface LootClaimData {
  sessionId: string;
  itemId: string;
  claim: LootClaim;
}

// Claim removed
export interface LootUnclaimData {
  sessionId: string;
  itemId: string;
  characterId: string;
}

// Claims updated for an item (full replacement)
export interface LootClaimsUpdateData {
  sessionId: string;
  itemId: string;
  claims: LootClaim[];
}

// Item assigned to character
export interface LootAssignData {
  sessionId: string;
  itemId: string;
  characterId: string;
  characterName: string;
}

// Item sent to treasury
export interface LootToTreasuryData {
  sessionId: string;
  itemId: string;
}

// Item unassigned (back to unclaimed)
export interface LootUnassignData {
  sessionId: string;
  itemId: string;
}

// Currency updated
export interface LootCurrencyUpdateData {
  sessionId: string;
  currency: LootCurrency;
  splitMethod?: CurrencySplitMethod;
}

// Roll-off triggered
export interface LootRollOffStartData {
  sessionId: string;
  itemId: string;
  itemName: string;
  participants: Array<{ characterId: string; characterName: string }>;
}

// Roll-off result
export interface LootRollOffResultData {
  sessionId: string;
  result: RollOffResult;
}

// Session finalized
export interface LootFinalizedData {
  sessionId: string;
  distributions: LootDistribution[];
}

// Loot error
export interface LootErrorData {
  sessionId: string;
  error: string;
  code: string;
}

// Client requests to create loot session
export interface LootCreateSessionData {
  campaignId: number;
  currency?: LootCurrency;
  items?: Array<{
    name: string;
    description?: string;
    itemType: LootItemType;
    rarity?: LootItemRarity;
    quantity?: number;
    isIdentified?: boolean;
    estimatedValueGp?: number;
    catalogNotionId?: string;
  }>;
  claimingDeadlineMinutes?: number;
}

// Client requests to add item
export interface LootAddItemData {
  sessionId: string;
  name: string;
  description?: string;
  itemType: LootItemType;
  rarity?: LootItemRarity;
  quantity?: number;
  isIdentified?: boolean;
  estimatedValueGp?: number;
  catalogNotionId?: string;
  // For scrolls (parchemins) - linked spell information
  linkedSpell?: {
    id: number;
    name: string;
    level: number;
  };
  // For resistance potions - selected damage type
  resistanceType?: ResistanceType;
}

// Client requests to claim item
export interface LootClaimItemData {
  sessionId: string;
  itemId: string;
  characterId: string;
  characterName: string;
  priority: 1 | 2 | 3;
  note?: string;
}

// Client requests to unclaim item
export interface LootUnclaimItemData {
  sessionId: string;
  itemId: string;
  characterId: string;
}

// Client requests to assign item (DM only)
export interface LootAssignItemData {
  sessionId: string;
  itemId: string;
  characterId: string;
  characterName: string;
  quantity?: number; // For partial assignment (splitting stacks)
}

// Client requests to send item to treasury (DM only)
export interface LootToTreasuryItemData {
  sessionId: string;
  itemId: string;
}

// Client requests to unassign an item (DM only)
export interface LootUnassignItemData {
  sessionId: string;
  itemId: string;
}

// Client requests roll-off (DM only)
export interface LootTriggerRollOffData {
  sessionId: string;
  itemId: string;
}

// Client requests to update currency (DM only)
export interface LootUpdateCurrencyData {
  sessionId: string;
  currency: LootCurrency;
  splitMethod?: CurrencySplitMethod;
}

// Client requests to finalize session (DM only)
export interface LootFinalizeData {
  sessionId: string;
}

// Client requests to cancel session (DM only)
export interface LootCancelData {
  sessionId: string;
}

// Client requests current loot session
export interface LootRequestSessionData {
  campaignId: number;
}

// ============================================
// Group Saving Throw Events
// ============================================

// Participant in a group save
export interface GroupSaveParticipant {
  participantId: string;
  participantType: 'player' | 'monster';
  participantName: string;
}

// Result for a single participant
export interface GroupSaveParticipantResult {
  participantId: string;
  participantType: 'player' | 'monster';
  participantName: string;
  rollResult: number | null;  // null = not yet submitted
  success: boolean | null;    // null = not yet determined
}

// DM initiates group save
export interface GroupSaveRequestData {
  saveId: string;
  campaignId: number;
  saveType: SavingThrowType;
  dc: number;
  participants: GroupSaveParticipant[];
}

// Player/DM submits a result
export interface GroupSaveResultData {
  saveId: string;
  participantId: string;
  rollResult: number;
  success: boolean;
}

// Full results update (broadcast to all)
export interface GroupSaveResultsUpdateData {
  saveId: string;
  saveType: SavingThrowType;
  dc: number;
  results: GroupSaveParticipantResult[];
  isComplete: boolean;
}

// DM cancels/closes the save session
export interface GroupSaveCancelData {
  saveId: string;
}

// Server to client events
export interface ServerToClientEvents {
  'combat-update': (data: CombatUpdateData) => void;
  'hp-change': (data: HpChangeData) => void;
  'initiative-change': (data: InitiativeChangeData) => void;
  'monster-add': (data: MonsterAddData) => void;
  'monster-remove': (data: MonsterRemoveData) => void;
  'state-sync': (data: StateSyncData) => void;
  'user-joined': (data: { role: 'dm' | 'player' }) => void;
  'user-left': (data: { role: 'dm' | 'player' }) => void;
  'request-state-sync': () => void;
  // Player connection events
  'player-connected': (data: PlayerConnectedData) => void;
  'player-disconnected': (data: PlayerDisconnectedData) => void;
  'connected-players': (data: ConnectedPlayersData) => void;
  // Notification events
  'notification': (data: NotificationData) => void;
  // Condition, buff, and state events
  'condition-change': (data: ConditionChangeData) => void;
  'exhaustion-change': (data: ExhaustionChangeData) => void;
  'buff-change': (data: BuffChangeData) => void;
  'death-save-change': (data: DeathSaveChangeData) => void;
  'ambient-effect': (data: AmbientEffectData) => void;
  // Map position events
  'player-positions': (data: PlayerPositionsData) => void;
  'request-player-positions': () => void;
  // Join error event
  'join-error': (data: { error: string; message: string }) => void;
  // Concentration check request (from player, relayed to DM)
  'concentration-check-request': (data: ConcentrationCheckRequestData) => void;
  // Inventory events
  'inventory-update': (data: InventoryUpdateData) => void;
  // Spell slot events
  'spell-slot-change': (data: SpellSlotChangeData) => void;
  // Prepared spells events
  'prepared-spells-change': (data: PreparedSpellsChangeData) => void;
  // Loot distribution events
  'loot-session-update': (data: LootSessionUpdateData) => void;
  'loot-status-change': (data: LootStatusChangeData) => void;
  'loot-item-add': (data: LootItemAddData) => void;
  'loot-item-update': (data: LootItemUpdateData) => void;
  'loot-item-remove': (data: LootItemRemoveData) => void;
  'loot-claim': (data: LootClaimData) => void;
  'loot-unclaim': (data: LootUnclaimData) => void;
  'loot-claims-update': (data: LootClaimsUpdateData) => void;
  'loot-assign': (data: LootAssignData) => void;
  'loot-to-treasury': (data: LootToTreasuryData) => void;
  'loot-unassign': (data: LootUnassignData) => void;
  'loot-currency-update': (data: LootCurrencyUpdateData) => void;
  'loot-rolloff-start': (data: LootRollOffStartData) => void;
  'loot-rolloff-result': (data: LootRollOffResultData) => void;
  'loot-finalized': (data: LootFinalizedData) => void;
  'loot-cancelled': () => void;
  'loot-error': (data: LootErrorData) => void;
  // Group saving throw events
  'group-save-request': (data: GroupSaveRequestData) => void;
  'group-save-results-update': (data: GroupSaveResultsUpdateData) => void;
  'group-save-cancelled': (data: GroupSaveCancelData) => void;
}

// Client to server events
export interface ClientToServerEvents {
  'join-campaign': (data: JoinCampaignData) => void;
  'leave-campaign': () => void;
  'combat-update': (data: CombatUpdateData) => void;
  'hp-change': (data: HpChangeData) => void;
  'initiative-change': (data: InitiativeChangeData) => void;
  'monster-add': (data: MonsterAddData) => void;
  'monster-remove': (data: MonsterRemoveData) => void;
  'state-sync': (data: StateSyncData) => void;
  'request-connected-players': () => void;
  // Notification events
  'notification': (data: NotificationData) => void;
  // Condition, buff, and state events
  'condition-change': (data: ConditionChangeData) => void;
  'exhaustion-change': (data: ExhaustionChangeData) => void;
  'buff-change': (data: BuffChangeData) => void;
  'death-save-change': (data: DeathSaveChangeData) => void;
  'ambient-effect': (data: AmbientEffectData) => void;
  // Map position events
  'player-positions': (data: PlayerPositionsData) => void;
  'request-player-positions': () => void;
  // Inventory events
  'inventory-update': (data: InventoryUpdateData) => void;
  // Spell slot events
  'spell-slot-change': (data: SpellSlotChangeData) => void;
  // Prepared spells events
  'prepared-spells-change': (data: PreparedSpellsChangeData) => void;
  // Concentration check request (player sends when taking damage while concentrating)
  'concentration-check-request': (data: ConcentrationCheckRequestData) => void;
  // Loot distribution events (client to server)
  'loot-create-session': (data: LootCreateSessionData) => void;
  'loot-add-item': (data: LootAddItemData) => void;
  'loot-claim-item': (data: LootClaimItemData) => void;
  'loot-unclaim-item': (data: LootUnclaimItemData) => void;
  'loot-assign-item': (data: LootAssignItemData) => void;
  'loot-to-treasury-item': (data: LootToTreasuryItemData) => void;
  'loot-unassign-item': (data: LootUnassignItemData) => void;
  'loot-trigger-rolloff': (data: LootTriggerRollOffData) => void;
  'loot-update-currency': (data: LootUpdateCurrencyData) => void;
  'loot-finalize': (data: LootFinalizeData) => void;
  'loot-cancel': (data: LootCancelData) => void;
  'loot-request-session': (data: LootRequestSessionData) => void;
  // Group saving throw events
  'group-save-request': (data: GroupSaveRequestData) => void;
  'group-save-result': (data: GroupSaveResultData) => void;
  'group-save-cancel': (data: GroupSaveCancelData) => void;
}
