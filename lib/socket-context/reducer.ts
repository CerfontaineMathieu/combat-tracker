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
        // Clear previous join error when starting a new join attempt
        joinError: null,
        // Clear stale connected players when starting a new session
        connectedPlayers: [],
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
    case 'SET_CONNECTED_PLAYERS': {
      // Merge incoming player data with existing state to preserve local changes
      // (HP, conditions, exhaustion that were updated during combat)
      const mergedPlayers = action.players.map((incomingPlayer) => {
        const existingPlayer = state.connectedPlayers.find(
          (p) => p.socketId === incomingPlayer.socketId
        );

        if (!existingPlayer) {
          // New player, use incoming data as-is
          return incomingPlayer;
        }

        // Existing player - merge characters, preserving local HP/conditions/exhaustion
        return {
          ...incomingPlayer,
          characters: incomingPlayer.characters.map((incomingChar) => {
            const existingChar = existingPlayer.characters.find(
              (c) => String(c.odNumber) === String(incomingChar.odNumber)
            );

            if (!existingChar) {
              return incomingChar;
            }

            // Preserve local combat state (HP, conditions, exhaustion)
            return {
              ...incomingChar,
              currentHp: existingChar.currentHp,
              conditions: existingChar.conditions,
              exhaustionLevel: existingChar.exhaustionLevel,
            };
          }),
        };
      });

      return {
        ...state,
        connectedPlayers: mergedPlayers,
      };
    }

    case 'PLAYER_CONNECTED': {
      // Check if player with same socketId already exists
      const existsBySocket = state.connectedPlayers.some(
        (p) => p.socketId === action.player.socketId
      );
      if (existsBySocket) return state;

      // Remove any existing entries with same character IDs (stale reconnections)
      const newCharacterIds = new Set(
        action.player.characters.map((c) => String(c.odNumber))
      );
      const filteredPlayers = state.connectedPlayers.filter((p) => {
        const hasMatchingChar = p.characters.some((c) =>
          newCharacterIds.has(String(c.odNumber))
        );
        return !hasMatchingChar;
      });

      return {
        ...state,
        connectedPlayers: [...filteredPlayers, action.player],
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
        const participants = (data.participants as CombatParticipant[]) ?? state.combatState.participants;

        // Update connectedPlayers from restored participants (sync conditions, HP, exhaustion)
        const updatedConnectedPlayers = state.connectedPlayers.map(cp => ({
          ...cp,
          characters: cp.characters.map(char => {
            const participant = participants?.find(
              p => p.id === String(char.odNumber) && p.type === 'player'
            );
            if (participant) {
              return {
                ...char,
                conditions: participant.conditions,
                currentHp: participant.currentHp,
                exhaustionLevel: participant.exhaustionLevel ?? char.exhaustionLevel,
              };
            }
            return char;
          })
        }));

        return {
          ...state,
          connectedPlayers: updatedConnectedPlayers,
          combatState: {
            active: data.combatActive,
            currentTurn: data.currentTurn,
            roundNumber: data.roundNumber ?? state.combatState.roundNumber,
            participants,
          },
        };
      }

      // XP summary when combat ends (for players to show modal)
      if (data.type === 'combat_end_xp' && data.xpSummary) {
        return {
          ...state,
          xpSummary: data.xpSummary,
        };
      }

      return state;
    }

    // XP Summary
    case 'SET_XP_SUMMARY':
      return {
        ...state,
        xpSummary: action.xpSummary,
      };

    case 'CLEAR_XP_SUMMARY':
      return {
        ...state,
        xpSummary: null,
      };

    case 'HP_CHANGE': {
      const { participantId, participantType, newHp } = action;

      // Update in players/monsters arrays
      let players = state.players;
      let monsters = state.monsters;
      let connectedPlayers = state.connectedPlayers;

      if (participantType === 'player') {
        players = state.players.map((p) =>
          p.id === participantId
            ? { ...p, currentHp: Math.max(0, Math.min(p.maxHp, newHp)) }
            : p
        );

        // Also update in connectedPlayers (for MJ view "Groupe" panel)
        connectedPlayers = state.connectedPlayers.map((cp) => ({
          ...cp,
          characters: cp.characters.map((char) =>
            String(char.odNumber) === participantId
              ? { ...char, currentHp: Math.max(0, Math.min(char.maxHp, newHp)) }
              : char
          ),
        }));
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
        connectedPlayers,
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
      let connectedPlayers = state.connectedPlayers;

      if (participantType === 'player') {
        players = state.players.map((p) =>
          p.id === participantId ? { ...p, conditions } : p
        );

        // Also update in connectedPlayers (for MJ view "Groupe" panel)
        connectedPlayers = state.connectedPlayers.map((cp) => ({
          ...cp,
          characters: cp.characters.map((char) =>
            String(char.odNumber) === participantId
              ? { ...char, conditions }
              : char
          ),
        }));
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
        connectedPlayers,
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
      let connectedPlayers = state.connectedPlayers;

      if (participantType === 'player') {
        players = state.players.map((p) =>
          p.id === participantId ? { ...p, exhaustionLevel } : p
        );

        // Also update in connectedPlayers (for MJ view "Groupe" panel)
        connectedPlayers = state.connectedPlayers.map((cp) => ({
          ...cp,
          characters: cp.characters.map((char) =>
            String(char.odNumber) === participantId
              ? { ...char, exhaustionLevel }
              : char
          ),
        }));
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
        connectedPlayers,
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

    // ============ INVENTORY ============
    case 'INVENTORY_UPDATE': {
      const { participantId, inventory } = action

      // Update in players array
      const players = state.players.map((p) =>
        p.id === participantId ? { ...p, inventory } : p
      )

      // Update in connectedPlayers
      const connectedPlayers = state.connectedPlayers.map((cp) => ({
        ...cp,
        characters: cp.characters.map((char) =>
          String(char.odNumber) === participantId
            ? { ...char, inventory }
            : char
        ),
      }))

      // Update in combat participants
      const participants = state.combatState.participants.map((p) =>
        p.id === participantId && p.type === 'player'
          ? { ...p, inventory }
          : p
      )

      return {
        ...state,
        players,
        connectedPlayers,
        combatState: {
          ...state.combatState,
          participants,
        },
      }
    }

    default:
      return state;
  }
}
