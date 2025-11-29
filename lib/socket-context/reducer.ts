import type { SocketState, SocketAction } from './types';
import type { CombatParticipant } from '../types';

export function socketReducer(state: SocketState, action: SocketAction): SocketState {
  switch (action.type) {
    // ============ CONNECTION ============
    case 'SOCKET_CONNECT':
      return {
        ...state,
        socket: action.socket,
        isConnected: true,
        connectionError: null,
      };

    case 'SOCKET_DISCONNECT':
      return {
        ...state,
        isConnected: false,
        isJoined: false,
      };

    case 'CONNECTION_ERROR':
      return {
        ...state,
        connectionError: action.error,
        isConnected: false,
      };

    // ============ SESSION ============
    case 'SET_MODE':
      return {
        ...state,
        mode: action.mode,
      };

    case 'JOIN_SUCCESS':
      return {
        ...state,
        isJoined: true,
        joinError: null,
      };

    case 'JOIN_ERROR':
      return {
        ...state,
        joinError: action.error,
        isJoined: false,
      };

    case 'LEAVE_CAMPAIGN':
      return {
        ...state,
        isJoined: false,
        mode: null,
        connectedPlayers: [],
        playerPositions: [],
        combatState: {
          active: false,
          currentTurn: 0,
          roundNumber: 1,
          participants: [],
        },
        players: [],
        monsters: [],
      };

    // ============ CONNECTED PLAYERS ============
    case 'SET_CONNECTED_PLAYERS':
      return {
        ...state,
        connectedPlayers: action.players,
      };

    case 'PLAYER_CONNECTED': {
      const exists = state.connectedPlayers.some(
        (p) => p.socketId === action.player.socketId
      );
      if (exists) return state;
      return {
        ...state,
        connectedPlayers: [...state.connectedPlayers, action.player],
      };
    }

    case 'PLAYER_DISCONNECTED':
      return {
        ...state,
        connectedPlayers: state.connectedPlayers.filter(
          (p) => p.socketId !== action.socketId
        ),
      };

    // ============ MAP POSITIONS ============
    case 'SET_PLAYER_POSITIONS':
      return {
        ...state,
        playerPositions: action.positions,
      };

    // ============ COMBAT SETUP ============
    case 'ADD_PLAYER':
      return {
        ...state,
        players: [...state.players, action.player],
      };

    case 'SET_PLAYERS':
      return {
        ...state,
        players: action.players,
      };

    case 'ADD_MONSTER':
      return {
        ...state,
        monsters: [...state.monsters, action.monster],
      };

    case 'REMOVE_MONSTER': {
      const monsters = state.monsters.filter((m) => m.id !== action.monsterId);
      const participants = state.combatState.participants.filter(
        (p) => !(p.id === action.monsterId && p.type === 'monster')
      );
      return {
        ...state,
        monsters,
        combatState: {
          ...state.combatState,
          participants,
        },
      };
    }

    case 'ADD_TO_COMBAT': {
      const participants = [...state.combatState.participants, action.participant];
      // Sort by initiative (descending)
      participants.sort((a, b) => b.initiative - a.initiative);
      return {
        ...state,
        combatState: {
          ...state.combatState,
          participants,
        },
      };
    }

    case 'REMOVE_FROM_COMBAT':
      return {
        ...state,
        combatState: {
          ...state.combatState,
          participants: state.combatState.participants.filter(
            (p) => p.id !== action.participantId
          ),
        },
      };

    // ============ COMBAT STATE ============
    case 'COMBAT_UPDATE': {
      const { data } = action;

      if (data.type === 'start') {
        return {
          ...state,
          combatState: {
            active: true,
            currentTurn: data.currentTurn,
            roundNumber: data.roundNumber ?? 1,
            participants: (data.participants as CombatParticipant[]) ?? [],
          },
        };
      }

      if (data.type === 'stop') {
        return {
          ...state,
          combatState: {
            active: false,
            currentTurn: 0,
            roundNumber: 1,
            participants: [],
          },
        };
      }

      if (data.type === 'next-turn') {
        return {
          ...state,
          combatState: {
            ...state.combatState,
            active: data.combatActive,
            currentTurn: data.currentTurn,
            roundNumber: data.roundNumber ?? state.combatState.roundNumber,
          },
        };
      }

      if (data.type === 'state-sync') {
        return {
          ...state,
          combatState: {
            active: data.combatActive,
            currentTurn: data.currentTurn,
            roundNumber: data.roundNumber ?? state.combatState.roundNumber,
            participants: (data.participants as CombatParticipant[]) ?? state.combatState.participants,
          },
        };
      }

      return state;
    }

    case 'HP_CHANGE': {
      const { participantId, participantType, newHp } = action;

      // Update in players/monsters arrays
      let players = state.players;
      let monsters = state.monsters;

      if (participantType === 'player') {
        players = state.players.map((p) =>
          p.id === participantId
            ? { ...p, currentHp: Math.max(0, Math.min(p.maxHp, newHp)) }
            : p
        );
      } else {
        monsters = state.monsters.map((m) =>
          m.id === participantId
            ? {
                ...m,
                hp: Math.max(0, Math.min(m.maxHp, newHp)),
                status: newHp <= 0 ? ('mort' as const) : m.status,
              }
            : m
        );
      }

      // Update in combat participants
      const participants = state.combatState.participants.map((p) =>
        p.id === participantId && p.type === participantType
          ? { ...p, currentHp: Math.max(0, Math.min(p.maxHp, newHp)) }
          : p
      );

      return {
        ...state,
        players,
        monsters,
        combatState: {
          ...state.combatState,
          participants,
        },
      };
    }

    case 'CONDITION_CHANGE': {
      const { participantId, participantType, conditions, conditionDurations } = action;

      // Update in players/monsters arrays
      let players = state.players;
      let monsters = state.monsters;

      if (participantType === 'player') {
        players = state.players.map((p) =>
          p.id === participantId ? { ...p, conditions } : p
        );
      } else {
        monsters = state.monsters.map((m) =>
          m.id === participantId ? { ...m, conditions } : m
        );
      }

      // Update in combat participants
      const participants = state.combatState.participants.map((p) =>
        p.id === participantId && p.type === participantType
          ? { ...p, conditions, conditionDurations: conditionDurations ?? p.conditionDurations }
          : p
      );

      return {
        ...state,
        players,
        monsters,
        combatState: {
          ...state.combatState,
          participants,
        },
      };
    }

    case 'EXHAUSTION_CHANGE': {
      const { participantId, participantType, exhaustionLevel } = action;

      // Update in players/monsters arrays
      let players = state.players;
      let monsters = state.monsters;

      if (participantType === 'player') {
        players = state.players.map((p) =>
          p.id === participantId ? { ...p, exhaustionLevel } : p
        );
      } else {
        monsters = state.monsters.map((m) =>
          m.id === participantId ? { ...m, exhaustionLevel } : m
        );
      }

      // Update in combat participants
      const participants = state.combatState.participants.map((p) =>
        p.id === participantId && p.type === participantType
          ? { ...p, exhaustionLevel }
          : p
      );

      return {
        ...state,
        players,
        monsters,
        combatState: {
          ...state.combatState,
          participants,
        },
      };
    }

    case 'DEATH_SAVE_CHANGE': {
      const { participantId, participantType, deathSaves, isStabilized, isDead } = action;

      // Update in combat participants only (death saves are combat-specific)
      const participants = state.combatState.participants.map((p) =>
        p.id === participantId && p.type === participantType
          ? { ...p, deathSaves, isStabilized, isDead }
          : p
      );

      return {
        ...state,
        combatState: {
          ...state.combatState,
          participants,
        },
      };
    }

    // ============ EFFECTS ============
    case 'SET_AMBIENT_EFFECT':
      return {
        ...state,
        ambientEffect: action.effect,
      };

    case 'SET_NOTIFICATION':
      return {
        ...state,
        pendingNotification: action.notification,
      };

    case 'CLEAR_NOTIFICATION':
      return {
        ...state,
        pendingNotification: null,
      };

    // ============ DM DISCONNECT/RECONNECT ============
    case 'DM_DISCONNECTED':
      return {
        ...state,
        dmDisconnected: true,
        dmDisconnectTime: action.timestamp,
      };

    case 'DM_RECONNECTED':
      return {
        ...state,
        dmDisconnected: false,
        dmDisconnectTime: null,
      };

    default:
      return state;
  }
}
