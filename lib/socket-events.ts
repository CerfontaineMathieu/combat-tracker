// Socket.io event type definitions

export interface JoinCampaignData {
  campaignId: number;
  role: 'dm' | 'player';
  character?: ConnectedPlayer; // Character info when joining as player
}

// Connected player info (character chosen by player)
export interface ConnectedPlayer {
  socketId: string; // Socket ID
  odNumber: number; // Character ID from DB
  name: string;
  class: string;
  level: number;
  currentHp: number;
  maxHp: number;
  ac: number;
  initiative: number;
  conditions: string[];
}

// Player connection events
export interface PlayerConnectedData {
  player: ConnectedPlayer;
}

export interface PlayerDisconnectedData {
  odNumber: number; // Character ID that disconnected
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
}
