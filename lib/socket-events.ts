// Socket.io event type definitions

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
    ac: number;
    initiative: number;
    conditions: string[];
    exhaustionLevel?: number;
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
    ac: number;
    initiative: number;
    conditions: string[];
    exhaustionLevel?: number;
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
  type: 'start' | 'stop' | 'next-turn' | 'state-sync';
  combatActive: boolean;
  currentTurn: number;
  roundNumber?: number;
  participants?: CombatParticipantData[];
}

export interface HpChangeData {
  participantId: string;
  participantType: 'player' | 'monster';
  newHp: number;
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

export interface DeathSaveChangeData {
  participantId: string;
  participantType: 'player' | 'monster';
  deathSaves: { successes: number; failures: number };
  isStabilized: boolean;
  isDead: boolean;
}

export interface AmbientEffectData {
  effect: 'none' | 'rain' | 'fog' | 'fire' | 'snow' | 'sandstorm';
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
  // Condition and state events
  'condition-change': (data: ConditionChangeData) => void;
  'exhaustion-change': (data: ExhaustionChangeData) => void;
  'death-save-change': (data: DeathSaveChangeData) => void;
  'ambient-effect': (data: AmbientEffectData) => void;
  // Map position events
  'player-positions': (data: PlayerPositionsData) => void;
  'request-player-positions': () => void;
  // Join error event
  'join-error': (data: { error: string; message: string }) => void;
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
  // Condition and state events
  'condition-change': (data: ConditionChangeData) => void;
  'exhaustion-change': (data: ExhaustionChangeData) => void;
  'death-save-change': (data: DeathSaveChangeData) => void;
  'ambient-effect': (data: AmbientEffectData) => void;
  // Map position events
  'player-positions': (data: PlayerPositionsData) => void;
  'request-player-positions': () => void;
}
