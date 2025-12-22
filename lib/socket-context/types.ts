import type { Socket } from 'socket.io-client';
import type { ServerToClientEvents, ClientToServerEvents } from '../socket-events';
import type {
  ConnectedPlayer,
  PlayerPositionData,
  NotificationData,
  AmbientEffectData,
  CombatUpdateData,
  HpChangeData,
  ConditionChangeData,
  ExhaustionChangeData,
  DeathSaveChangeData,
  InventoryUpdateData,
  BuffChangeData,
  SpellSlotChangeData,
  // Loot events
  LootSessionUpdateData,
  LootItemAddData,
  LootItemUpdateData,
  LootItemRemoveData,
  LootClaimData,
  LootUnclaimData,
  LootAssignData,
  LootToTreasuryData,
  LootCurrencyUpdateData,
  LootRollOffStartData,
  LootRollOffResultData,
  LootFinalizedData,
  LootCreateSessionData,
  LootAddItemData,
  LootClaimItemData,
  LootUnclaimItemData,
  LootAssignItemData,
  LootToTreasuryItemData,
  LootTriggerRollOffData,
  LootUpdateCurrencyData,
  LootFinalizeData,
  LootCancelData,
} from '../socket-events';
import type {
  Character,
  Monster,
  CombatParticipant,
  CharacterInventory,
  LootSession,
  LootItem,
  LootClaim,
  RollOffResult,
  LootDistribution,
} from '../types';

// Re-export types from socket-events for convenience
export type {
  ConnectedPlayer,
  PlayerPositionData,
  NotificationData,
  AmbientEffectData,
  CombatUpdateData,
  HpChangeData,
  ConditionChangeData,
  ExhaustionChangeData,
  DeathSaveChangeData,
  InventoryUpdateData,
  BuffChangeData,
  SpellSlotChangeData,
  // Loot types
  LootSessionUpdateData,
  LootItemAddData,
  LootItemUpdateData,
  LootItemRemoveData,
  LootClaimData,
  LootUnclaimData,
  LootAssignData,
  LootToTreasuryData,
  LootCurrencyUpdateData,
  LootRollOffStartData,
  LootRollOffResultData,
  LootFinalizedData,
  LootCreateSessionData,
  LootAddItemData,
  LootClaimItemData,
  LootUnclaimItemData,
  LootAssignItemData,
  LootToTreasuryItemData,
  LootTriggerRollOffData,
  LootUpdateCurrencyData,
  LootFinalizeData,
  LootCancelData,
};

// Typed socket
export type AppSocket = Socket<ServerToClientEvents, ClientToServerEvents>;

// Socket state
export interface SocketState {
  // Connection
  socket: AppSocket | null;
  isConnected: boolean;
  connectionError: string | null;

  // Session
  mode: 'mj' | 'joueur' | null;
  campaignId: number;
  isJoined: boolean;
  joinError: string | null;

  // Connected Players (for DM and map page)
  connectedPlayers: ConnectedPlayer[];

  // Map Positions
  playerPositions: PlayerPositionData[];

  // Ambient Effect
  ambientEffect: AmbientEffectData['effect'];

  // Combat state (synced via socket)
  combatState: {
    active: boolean;
    currentTurn: number;
    roundNumber: number;
    participants: CombatParticipant[];
  };

  // Players and monsters (for pre-combat setup)
  players: Character[];
  monsters: Monster[];

  // Notifications (toast queue)
  pendingNotification: NotificationData | null;

  // XP Summary (shown when combat ends)
  xpSummary: {
    totalXp: number;
    perPlayerXp: number;
    playerCount: number;
    killedMonsters: { name: string; xp: number }[];
  } | null;

  // Loot Distribution
  lootSession: LootSession | null;
  pendingRollOff: {
    itemId: string;
    itemName: string;
    participants: Array<{ characterId: string; characterName: string }>;
  } | null;
  rollOffResult: RollOffResult | null;
  lootDistributions: LootDistribution[] | null;
  lootError: { error: string; code: string } | null;
}

// Action types
export type SocketAction =
  // Connection
  | { type: 'SOCKET_CONNECT'; socket: AppSocket }
  | { type: 'SOCKET_DISCONNECT' }
  | { type: 'CONNECTION_ERROR'; error: string }

  // Session
  | { type: 'SET_MODE'; mode: 'mj' | 'joueur' }
  | { type: 'JOIN_SUCCESS' }
  | { type: 'JOIN_ERROR'; error: string }
  | { type: 'LEAVE_CAMPAIGN' }

  // Connected Players
  | { type: 'SET_CONNECTED_PLAYERS'; players: ConnectedPlayer[] }
  | { type: 'PLAYER_CONNECTED'; player: ConnectedPlayer }
  | { type: 'PLAYER_DISCONNECTED'; socketId: string }

  // Map Positions
  | { type: 'SET_PLAYER_POSITIONS'; positions: PlayerPositionData[] }

  // Combat Setup
  | { type: 'ADD_PLAYER'; player: Character }
  | { type: 'SET_PLAYERS'; players: Character[] }
  | { type: 'ADD_MONSTER'; monster: Monster }
  | { type: 'REMOVE_MONSTER'; monsterId: string }
  | { type: 'ADD_TO_COMBAT'; participant: CombatParticipant }
  | { type: 'REMOVE_FROM_COMBAT'; participantId: string }

  // Combat State
  | { type: 'COMBAT_UPDATE'; data: CombatUpdateData }
  | { type: 'HP_CHANGE'; participantId: string; participantType: 'player' | 'monster'; newHp: number; tempHp?: number }
  | { type: 'CONDITION_CHANGE'; participantId: string; participantType: 'player' | 'monster'; conditions: string[]; conditionDurations?: Record<string, number> }
  | { type: 'EXHAUSTION_CHANGE'; participantId: string; participantType: 'player' | 'monster'; exhaustionLevel: number }
  | { type: 'BUFF_CHANGE'; participantId: string; participantType: 'player' | 'monster'; buffs: import('../types').ActiveBuff[] }
  | { type: 'DEATH_SAVE_CHANGE'; participantId: string; participantType: 'player' | 'monster'; deathSaves: { successes: number; failures: number }; isStabilized: boolean; isDead: boolean }

  // Inventory
  | { type: 'INVENTORY_UPDATE'; participantId: string; inventory: CharacterInventory }

  // Spell Slots
  | { type: 'SPELL_SLOT_CHANGE'; participantId: string; spellSlots: Record<number, number> }

  // Effects
  | { type: 'SET_AMBIENT_EFFECT'; effect: AmbientEffectData['effect'] }
  | { type: 'SET_NOTIFICATION'; notification: NotificationData }
  | { type: 'CLEAR_NOTIFICATION' }

  // XP Summary
  | { type: 'SET_XP_SUMMARY'; xpSummary: SocketState['xpSummary'] }
  | { type: 'CLEAR_XP_SUMMARY' }

  // Loot Distribution
  | { type: 'LOOT_SESSION_UPDATE'; session: LootSession }
  | { type: 'LOOT_ITEM_ADD'; sessionId: string; item: LootItem }
  | { type: 'LOOT_ITEM_UPDATE'; sessionId: string; item: LootItem }
  | { type: 'LOOT_ITEM_REMOVE'; sessionId: string; itemId: string }
  | { type: 'LOOT_CLAIM'; sessionId: string; itemId: string; claim: LootClaim }
  | { type: 'LOOT_UNCLAIM'; sessionId: string; itemId: string; characterId: string }
  | { type: 'LOOT_ASSIGN'; sessionId: string; itemId: string; characterId: string; characterName: string }
  | { type: 'LOOT_TO_TREASURY'; sessionId: string; itemId: string }
  | { type: 'LOOT_UNASSIGN'; sessionId: string; itemId: string }
  | { type: 'LOOT_CURRENCY_UPDATE'; sessionId: string; currency: import('../types').LootCurrency; splitMethod?: import('../types').CurrencySplitMethod }
  | { type: 'LOOT_ROLLOFF_START'; itemId: string; itemName: string; participants: Array<{ characterId: string; characterName: string }> }
  | { type: 'LOOT_ROLLOFF_RESULT'; result: RollOffResult }
  | { type: 'LOOT_CLEAR_ROLLOFF' }
  | { type: 'LOOT_FINALIZED'; distributions: LootDistribution[] }
  | { type: 'LOOT_CLEAR_SESSION' }
  | { type: 'LOOT_ERROR'; error: string; code: string };

// Initial state
export const initialSocketState: SocketState = {
  // Connection
  socket: null,
  isConnected: false,
  connectionError: null,

  // Session
  mode: null,
  campaignId: 1, // Default campaign
  isJoined: false,
  joinError: null,

  // Connected Players
  connectedPlayers: [],

  // Map Positions
  playerPositions: [],

  // Ambient Effect
  ambientEffect: 'none',

  // Combat state
  combatState: {
    active: false,
    currentTurn: 0,
    roundNumber: 1,
    participants: [],
  },

  // Players and monsters
  players: [],
  monsters: [],

  // Notifications
  pendingNotification: null,

  // XP Summary
  xpSummary: null,

  // Loot Distribution
  lootSession: null,
  pendingRollOff: null,
  rollOffResult: null,
  lootDistributions: null,
  lootError: null,
};

// Join campaign data
export interface JoinCampaignParams {
  role: 'dm' | 'player';
  password?: string;
  characters?: Array<{
    odNumber: string | number;
    name: string;
    class: string;
    level: number;
    currentHp: number;
    maxHp: number;
    ac: number;
    initiative: number;
    conditions: string[];
    exhaustionLevel?: number;
    buffs?: import('../types').ActiveBuff[];
  }>;
}

// Context type for consumers
export interface SocketContextType {
  state: SocketState;
  dispatch: React.Dispatch<SocketAction>;

  // Connection actions
  joinCampaign: (params: JoinCampaignParams) => void;
  leaveCampaign: () => void;

  // Combat actions
  emitCombatUpdate: (data: CombatUpdateData) => void;
  emitHpChange: (data: HpChangeData) => void;
  emitConditionChange: (data: ConditionChangeData) => void;
  emitExhaustionChange: (data: ExhaustionChangeData) => void;
  emitBuffChange: (data: BuffChangeData) => void;
  emitDeathSaveChange: (data: DeathSaveChangeData) => void;

  // Inventory actions
  emitInventoryUpdate: (data: InventoryUpdateData) => void;

  // Spell slot actions
  emitSpellSlotChange: (data: SpellSlotChangeData) => void;

  // Ambient effect
  emitAmbientEffect: (data: AmbientEffectData) => void;

  // Map positions
  emitPlayerPositions: (positions: PlayerPositionData[]) => void;
  requestPlayerPositions: () => void;

  // Connected players
  requestConnectedPlayers: () => void;

  // Notifications
  emitNotification: (data: NotificationData) => void;

  // Loot distribution actions
  createLootSession: (data: Omit<LootCreateSessionData, 'campaignId'>) => void;
  addLootItem: (data: Omit<LootAddItemData, 'sessionId'>) => void;
  claimLootItem: (data: Omit<LootClaimItemData, 'sessionId'>) => void;
  unclaimLootItem: (data: Omit<LootUnclaimItemData, 'sessionId'>) => void;
  assignLootItem: (data: Omit<LootAssignItemData, 'sessionId'>) => void;
  sendToTreasury: (itemId: string) => void;
  unassignLootItem: (itemId: string) => void;
  triggerRollOff: (itemId: string) => void;
  updateLootCurrency: (data: Omit<LootUpdateCurrencyData, 'sessionId'>) => void;
  finalizeLoot: () => void;
  cancelLoot: () => void;
  requestLootSession: () => void;
  clearRollOffResult: () => void;
  clearLootSession: () => void;
}
