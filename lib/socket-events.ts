// Socket.io event type definitions

import type { CharacterInventory, ActiveBuff, PreparedSpell } from './types';

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

// DM disconnect/reconnect events
export interface DmDisconnectedData {
  timestamp: number;
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
  // DM disconnect/reconnect events
  'dm-disconnected': (data: DmDisconnectedData) => void;
  'dm-reconnected': () => void;
  // Inventory events
  'inventory-update': (data: InventoryUpdateData) => void;
  // Spell slot events
  'spell-slot-change': (data: SpellSlotChangeData) => void;
  // Prepared spells events
  'prepared-spells-change': (data: PreparedSpellsChangeData) => void;
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
}
