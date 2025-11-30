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
} from '../socket-events';
import type { Character, Monster, CombatParticipant, CharacterInventory } from '../types';

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

  // DM disconnect tracking (for player overlay)
  dmDisconnected: boolean;
  dmDisconnectTime: number | null;
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
  | { type: 'HP_CHANGE'; participantId: string; participantType: 'player' | 'monster'; newHp: number }
  | { type: 'CONDITION_CHANGE'; participantId: string; participantType: 'player' | 'monster'; conditions: string[]; conditionDurations?: Record<string, number> }
  | { type: 'EXHAUSTION_CHANGE'; participantId: string; participantType: 'player' | 'monster'; exhaustionLevel: number }
  | { type: 'DEATH_SAVE_CHANGE'; participantId: string; participantType: 'player' | 'monster'; deathSaves: { successes: number; failures: number }; isStabilized: boolean; isDead: boolean }

  // Inventory
  | { type: 'INVENTORY_UPDATE'; participantId: string; inventory: CharacterInventory }

  // Effects
  | { type: 'SET_AMBIENT_EFFECT'; effect: AmbientEffectData['effect'] }
  | { type: 'SET_NOTIFICATION'; notification: NotificationData }
  | { type: 'CLEAR_NOTIFICATION' }

  // DM disconnect/reconnect
  | { type: 'DM_DISCONNECTED'; timestamp: number }
  | { type: 'DM_RECONNECTED' };

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

  // DM disconnect tracking
  dmDisconnected: false,
  dmDisconnectTime: null,
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
  emitDeathSaveChange: (data: DeathSaveChangeData) => void;

  // Inventory actions
  emitInventoryUpdate: (data: InventoryUpdateData) => void;

  // Ambient effect
  emitAmbientEffect: (data: AmbientEffectData) => void;

  // Map positions
  emitPlayerPositions: (positions: PlayerPositionData[]) => void;
  requestPlayerPositions: () => void;

  // Connected players
  requestConnectedPlayers: () => void;

  // Notifications
  emitNotification: (data: NotificationData) => void;
}
