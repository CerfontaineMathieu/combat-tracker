"use client";

import React, { createContext, useContext, useReducer, useCallback, useEffect, useRef } from 'react';
import { useSocket } from '@/hooks/use-socket';
import { toast } from 'sonner';
import type { Character, Monster, CombatParticipant, DiceRoll, Note } from './types';
import type {
  CombatUpdateData,
  HpChangeData,
  InitiativeChangeData,
  MonsterAddData,
  MonsterRemoveData,
  StateSyncData,
} from './socket-events';

// State interface
interface CombatState {
  // Campaign
  campaignId: number | null;
  campaignName: string;
  roomCode: string | null;
  mode: 'mj' | 'joueur';

  // Characters & Monsters
  players: Character[];
  monsters: Monster[];

  // Combat
  combatActive: boolean;
  currentTurn: number;
  combatParticipants: CombatParticipant[];

  // Other
  diceHistory: DiceRoll[];
  notes: Note[];

  // Loading state
  isLoading: boolean;
}

// Action types
type CombatAction =
  | { type: 'SET_CAMPAIGN'; campaignId: number; campaignName: string; roomCode: string | null }
  | { type: 'SET_MODE'; mode: 'mj' | 'joueur' }
  | { type: 'SET_ROOM_CODE'; roomCode: string | null }
  | { type: 'SET_LOADING'; isLoading: boolean }
  | { type: 'LOAD_DATA'; players: Character[]; monsters: Monster[]; notes: Note[] }
  | { type: 'UPDATE_PLAYER_HP'; id: string; change: number }
  | { type: 'SET_PLAYER_HP'; id: string; newHp: number }
  | { type: 'UPDATE_PLAYER_INITIATIVE'; id: string; initiative: number }
  | { type: 'UPDATE_PLAYER_CONDITIONS'; id: string; conditions: string[] }
  | { type: 'ADD_MONSTER'; monster: Monster }
  | { type: 'REMOVE_MONSTER'; id: string }
  | { type: 'UPDATE_MONSTER_HP'; id: string; change: number }
  | { type: 'SET_MONSTER_HP'; id: string; newHp: number }
  | { type: 'START_COMBAT'; participants: CombatParticipant[] }
  | { type: 'STOP_COMBAT' }
  | { type: 'NEXT_TURN' }
  | { type: 'SET_COMBAT_STATE'; combatActive: boolean; currentTurn: number; participants?: CombatParticipant[] }
  | { type: 'ADD_DICE_ROLL'; roll: DiceRoll }
  | { type: 'ADD_NOTE'; note: Note }
  | { type: 'UPDATE_NOTE'; id: string; title: string; content: string }
  | { type: 'DELETE_NOTE'; id: string }
  | { type: 'SYNC_STATE'; data: StateSyncData };

// Initial state
const initialState: CombatState = {
  campaignId: null,
  campaignName: '',
  roomCode: null,
  mode: 'mj',
  players: [],
  monsters: [],
  combatActive: false,
  currentTurn: 0,
  combatParticipants: [],
  diceHistory: [],
  notes: [],
  isLoading: true,
};

// Reducer
function combatReducer(state: CombatState, action: CombatAction): CombatState {
  switch (action.type) {
    case 'SET_CAMPAIGN':
      return {
        ...state,
        campaignId: action.campaignId,
        campaignName: action.campaignName,
        roomCode: action.roomCode,
      };

    case 'SET_MODE':
      return { ...state, mode: action.mode };

    case 'SET_ROOM_CODE':
      return { ...state, roomCode: action.roomCode };

    case 'SET_LOADING':
      return { ...state, isLoading: action.isLoading };

    case 'LOAD_DATA':
      return {
        ...state,
        players: action.players,
        monsters: action.monsters,
        notes: action.notes,
        isLoading: false,
      };

    case 'UPDATE_PLAYER_HP': {
      const players = state.players.map((p) =>
        p.id === action.id
          ? { ...p, currentHp: Math.max(0, Math.min(p.maxHp, p.currentHp + action.change)) }
          : p
      );
      const combatParticipants = state.combatParticipants.map((cp) =>
        cp.id === action.id && cp.type === 'player'
          ? { ...cp, currentHp: Math.max(0, Math.min(cp.maxHp, cp.currentHp + action.change)) }
          : cp
      );
      return { ...state, players, combatParticipants };
    }

    case 'SET_PLAYER_HP': {
      const players = state.players.map((p) =>
        p.id === action.id ? { ...p, currentHp: Math.max(0, Math.min(p.maxHp, action.newHp)) } : p
      );
      const combatParticipants = state.combatParticipants.map((cp) =>
        cp.id === action.id && cp.type === 'player'
          ? { ...cp, currentHp: Math.max(0, Math.min(cp.maxHp, action.newHp)) }
          : cp
      );
      return { ...state, players, combatParticipants };
    }

    case 'UPDATE_PLAYER_INITIATIVE': {
      const players = state.players.map((p) =>
        p.id === action.id ? { ...p, initiative: action.initiative } : p
      );
      return { ...state, players };
    }

    case 'UPDATE_PLAYER_CONDITIONS': {
      const players = state.players.map((p) =>
        p.id === action.id ? { ...p, conditions: action.conditions } : p
      );
      const combatParticipants = state.combatParticipants.map((cp) =>
        cp.id === action.id && cp.type === 'player' ? { ...cp, conditions: action.conditions } : cp
      );
      return { ...state, players, combatParticipants };
    }

    case 'ADD_MONSTER':
      return { ...state, monsters: [...state.monsters, action.monster] };

    case 'REMOVE_MONSTER': {
      const monsters = state.monsters.filter((m) => m.id !== action.id);
      const combatParticipants = state.combatParticipants.filter(
        (cp) => !(cp.id === action.id && cp.type === 'monster')
      );
      return { ...state, monsters, combatParticipants };
    }

    case 'UPDATE_MONSTER_HP': {
      const monsters = state.monsters.map((m) =>
        m.id === action.id
          ? {
              ...m,
              hp: Math.max(0, Math.min(m.maxHp, m.hp + action.change)),
              status: m.hp + action.change <= 0 ? ('mort' as const) : m.status,
            }
          : m
      );
      const combatParticipants = state.combatParticipants.map((cp) =>
        cp.id === action.id && cp.type === 'monster'
          ? { ...cp, currentHp: Math.max(0, Math.min(cp.maxHp, cp.currentHp + action.change)) }
          : cp
      );
      return { ...state, monsters, combatParticipants };
    }

    case 'SET_MONSTER_HP': {
      const monsters = state.monsters.map((m) =>
        m.id === action.id
          ? {
              ...m,
              hp: Math.max(0, Math.min(m.maxHp, action.newHp)),
              status: action.newHp <= 0 ? ('mort' as const) : m.status,
            }
          : m
      );
      const combatParticipants = state.combatParticipants.map((cp) =>
        cp.id === action.id && cp.type === 'monster'
          ? { ...cp, currentHp: Math.max(0, Math.min(cp.maxHp, action.newHp)) }
          : cp
      );
      return { ...state, monsters, combatParticipants };
    }

    case 'START_COMBAT':
      return {
        ...state,
        combatActive: true,
        currentTurn: 0,
        combatParticipants: action.participants,
      };

    case 'STOP_COMBAT':
      return {
        ...state,
        combatActive: false,
        currentTurn: 0,
        combatParticipants: [],
      };

    case 'NEXT_TURN': {
      const nextTurn =
        state.combatParticipants.length > 0
          ? (state.currentTurn + 1) % state.combatParticipants.length
          : 0;
      return { ...state, currentTurn: nextTurn };
    }

    case 'SET_COMBAT_STATE':
      return {
        ...state,
        combatActive: action.combatActive,
        currentTurn: action.currentTurn,
        combatParticipants: action.participants ?? state.combatParticipants,
      };

    case 'ADD_DICE_ROLL':
      return {
        ...state,
        diceHistory: [action.roll, ...state.diceHistory].slice(0, 10),
      };

    case 'ADD_NOTE':
      return { ...state, notes: [action.note, ...state.notes] };

    case 'UPDATE_NOTE':
      return {
        ...state,
        notes: state.notes.map((n) =>
          n.id === action.id ? { ...n, title: action.title, content: action.content } : n
        ),
      };

    case 'DELETE_NOTE':
      return { ...state, notes: state.notes.filter((n) => n.id !== action.id) };

    case 'SYNC_STATE': {
      // Convert socket data to local format
      const players: Character[] = action.data.players.map((p) => ({
        id: p.id,
        name: p.name,
        class: p.class,
        level: p.level,
        currentHp: p.currentHp,
        maxHp: p.maxHp,
        ac: p.ac,
        initiative: p.initiative,
        conditions: p.conditions,
      }));
      const monsters: Monster[] = action.data.monsters.map((m) => ({
        id: m.id,
        name: m.name,
        hp: m.hp,
        maxHp: m.maxHp,
        ac: m.ac,
        initiative: m.initiative,
        notes: m.notes,
        status: m.status,
      }));
      return {
        ...state,
        players,
        monsters,
        combatActive: action.data.combatActive,
        currentTurn: action.data.currentTurn,
      };
    }

    default:
      return state;
  }
}

// Context type
interface CombatContextType {
  state: CombatState;
  dispatch: React.Dispatch<CombatAction>;
  // Actions
  setCampaign: (campaignId: number, campaignName: string, roomCode: string | null) => void;
  setMode: (mode: 'mj' | 'joueur') => void;
  updatePlayerHp: (id: string, change: number) => void;
  updatePlayerInitiative: (id: string, initiative: number) => void;
  updatePlayerConditions: (id: string, conditions: string[]) => void;
  addMonster: (monster: Monster) => void;
  removeMonster: (id: string) => void;
  updateMonsterHp: (id: string, change: number) => void;
  startCombat: () => void;
  stopCombat: () => void;
  nextTurn: () => void;
  addDiceRoll: (roll: DiceRoll) => void;
  generateRoomCode: () => Promise<string | null>;
  // Player action
  reportDamage: (playerId: string, damage: number) => void;
}

const CombatContext = createContext<CombatContextType | null>(null);

export function CombatProvider({ children }: { children: React.ReactNode }) {
  const [state, dispatch] = useReducer(combatReducer, initialState);
  const isInitializedRef = useRef(false);

  // Socket event handlers
  const handleCombatUpdate = useCallback((data: CombatUpdateData) => {
    if (data.type === 'start') {
      dispatch({
        type: 'SET_COMBAT_STATE',
        combatActive: true,
        currentTurn: data.currentTurn,
        participants: data.participants as CombatParticipant[],
      });
    } else if (data.type === 'stop') {
      dispatch({ type: 'STOP_COMBAT' });
    } else if (data.type === 'next-turn') {
      dispatch({
        type: 'SET_COMBAT_STATE',
        combatActive: data.combatActive,
        currentTurn: data.currentTurn,
      });
    }
  }, []);

  const handleHpChange = useCallback((data: HpChangeData) => {
    if (data.participantType === 'player') {
      dispatch({ type: 'SET_PLAYER_HP', id: data.participantId, newHp: data.newHp });
    } else {
      dispatch({ type: 'SET_MONSTER_HP', id: data.participantId, newHp: data.newHp });
    }
  }, []);

  const handleInitiativeChange = useCallback((data: InitiativeChangeData) => {
    if (data.participantType === 'player') {
      dispatch({
        type: 'UPDATE_PLAYER_INITIATIVE',
        id: data.participantId,
        initiative: data.newInitiative,
      });
    }
  }, []);

  const handleMonsterAdd = useCallback((data: MonsterAddData) => {
    dispatch({ type: 'ADD_MONSTER', monster: data.monster as Monster });
  }, []);

  const handleMonsterRemove = useCallback((data: MonsterRemoveData) => {
    dispatch({ type: 'REMOVE_MONSTER', id: data.monsterId });
  }, []);

  const handleStateSync = useCallback((data: StateSyncData) => {
    dispatch({ type: 'SYNC_STATE', data });
    toast.info('État synchronisé avec le MJ');
  }, []);

  const handleRequestStateSync = useCallback(() => {
    // DM should send current state when a player requests sync
    if (state.mode === 'mj') {
      emitStateSync({
        players: state.players.map((p) => ({
          id: p.id,
          name: p.name,
          class: p.class,
          level: p.level,
          currentHp: p.currentHp,
          maxHp: p.maxHp,
          ac: p.ac,
          initiative: p.initiative,
          conditions: p.conditions,
        })),
        monsters: state.monsters.map((m) => ({
          id: m.id,
          name: m.name,
          hp: m.hp,
          maxHp: m.maxHp,
          ac: m.ac,
          initiative: m.initiative,
          notes: m.notes,
          status: m.status,
        })),
        combatActive: state.combatActive,
        currentTurn: state.currentTurn,
      });
    }
  }, [state]);

  const handleUserJoined = useCallback((data: { role: 'dm' | 'player' }) => {
    toast.info(data.role === 'dm' ? 'Le MJ a rejoint' : 'Un joueur a rejoint');
  }, []);

  const handleUserLeft = useCallback((data: { role: 'dm' | 'player' }) => {
    toast.info(data.role === 'dm' ? 'Le MJ a quitté' : 'Un joueur a quitté');
  }, []);

  const {
    emitCombatUpdate,
    emitHpChange,
    emitInitiativeChange,
    emitMonsterAdd,
    emitMonsterRemove,
    emitStateSync,
  } = useSocket({
    campaignId: state.campaignId,
    mode: state.mode,
    onCombatUpdate: handleCombatUpdate,
    onHpChange: handleHpChange,
    onInitiativeChange: handleInitiativeChange,
    onMonsterAdd: handleMonsterAdd,
    onMonsterRemove: handleMonsterRemove,
    onStateSync: handleStateSync,
    onRequestStateSync: handleRequestStateSync,
    onUserJoined: handleUserJoined,
    onUserLeft: handleUserLeft,
  });

  // Actions
  const setCampaign = useCallback(
    (campaignId: number, campaignName: string, roomCode: string | null) => {
      dispatch({ type: 'SET_CAMPAIGN', campaignId, campaignName, roomCode });
    },
    []
  );

  const setMode = useCallback((mode: 'mj' | 'joueur') => {
    dispatch({ type: 'SET_MODE', mode });
  }, []);

  const updatePlayerHp = useCallback(
    (id: string, change: number) => {
      dispatch({ type: 'UPDATE_PLAYER_HP', id, change });
      const player = state.players.find((p) => p.id === id);
      if (player) {
        const newHp = Math.max(0, Math.min(player.maxHp, player.currentHp + change));
        emitHpChange({
          participantId: id,
          participantType: 'player',
          newHp,
          change,
          source: state.mode === 'mj' ? 'dm' : 'player',
        });
      }
    },
    [state.players, state.mode, emitHpChange]
  );

  const updatePlayerInitiative = useCallback(
    (id: string, initiative: number) => {
      dispatch({ type: 'UPDATE_PLAYER_INITIATIVE', id, initiative });
      emitInitiativeChange({
        participantId: id,
        participantType: 'player',
        newInitiative: initiative,
      });
    },
    [emitInitiativeChange]
  );

  const updatePlayerConditions = useCallback((id: string, conditions: string[]) => {
    dispatch({ type: 'UPDATE_PLAYER_CONDITIONS', id, conditions });
  }, []);

  const addMonster = useCallback(
    (monster: Monster) => {
      dispatch({ type: 'ADD_MONSTER', monster });
      emitMonsterAdd({ monster });
    },
    [emitMonsterAdd]
  );

  const removeMonster = useCallback(
    (id: string) => {
      dispatch({ type: 'REMOVE_MONSTER', id });
      emitMonsterRemove({ monsterId: id });
    },
    [emitMonsterRemove]
  );

  const updateMonsterHp = useCallback(
    (id: string, change: number) => {
      dispatch({ type: 'UPDATE_MONSTER_HP', id, change });
      const monster = state.monsters.find((m) => m.id === id);
      if (monster) {
        const newHp = Math.max(0, Math.min(monster.maxHp, monster.hp + change));
        emitHpChange({
          participantId: id,
          participantType: 'monster',
          newHp,
          change,
          source: state.mode === 'mj' ? 'dm' : 'player',
        });
      }
    },
    [state.monsters, state.mode, emitHpChange]
  );

  const startCombat = useCallback(() => {
    // Create sorted combat participants
    const participants: CombatParticipant[] = [
      ...state.players.map((p) => ({
        id: p.id,
        name: p.name,
        initiative: p.initiative,
        currentHp: p.currentHp,
        maxHp: p.maxHp,
        conditions: p.conditions,
        type: 'player' as const,
      })),
      ...state.monsters
        .filter((m) => m.status === 'actif')
        .map((m) => ({
          id: m.id,
          name: m.name,
          initiative: m.initiative,
          currentHp: m.hp,
          maxHp: m.maxHp,
          conditions: [] as string[],
          type: 'monster' as const,
        })),
    ].sort((a, b) => b.initiative - a.initiative);

    dispatch({ type: 'START_COMBAT', participants });
    emitCombatUpdate({
      type: 'start',
      combatActive: true,
      currentTurn: 0,
      participants,
    });
  }, [state.players, state.monsters, emitCombatUpdate]);

  const stopCombat = useCallback(() => {
    dispatch({ type: 'STOP_COMBAT' });
    emitCombatUpdate({
      type: 'stop',
      combatActive: false,
      currentTurn: 0,
    });
  }, [emitCombatUpdate]);

  const nextTurn = useCallback(() => {
    const nextTurnIndex =
      state.combatParticipants.length > 0
        ? (state.currentTurn + 1) % state.combatParticipants.length
        : 0;
    dispatch({ type: 'NEXT_TURN' });
    emitCombatUpdate({
      type: 'next-turn',
      combatActive: true,
      currentTurn: nextTurnIndex,
    });
  }, [state.combatParticipants.length, state.currentTurn, emitCombatUpdate]);

  const addDiceRoll = useCallback((roll: DiceRoll) => {
    dispatch({ type: 'ADD_DICE_ROLL', roll });
  }, []);

  const generateRoomCode = useCallback(async (): Promise<string | null> => {
    if (!state.campaignId) return null;
    try {
      const response = await fetch(`/api/campaigns/${state.campaignId}/room-code`, {
        method: 'POST',
      });
      if (response.ok) {
        const data = await response.json();
        dispatch({ type: 'SET_ROOM_CODE', roomCode: data.code });
        return data.code;
      }
    } catch (error) {
      console.error('Failed to generate room code:', error);
    }
    return null;
  }, [state.campaignId]);

  // Player damage reporting (auto-applied)
  const reportDamage = useCallback(
    (playerId: string, damage: number) => {
      updatePlayerHp(playerId, -Math.abs(damage));
      toast.success(`${Math.abs(damage)} dégâts appliqués`);
    },
    [updatePlayerHp]
  );

  const value: CombatContextType = {
    state,
    dispatch,
    setCampaign,
    setMode,
    updatePlayerHp,
    updatePlayerInitiative,
    updatePlayerConditions,
    addMonster,
    removeMonster,
    updateMonsterHp,
    startCombat,
    stopCombat,
    nextTurn,
    addDiceRoll,
    generateRoomCode,
    reportDamage,
  };

  return <CombatContext.Provider value={value}>{children}</CombatContext.Provider>;
}

export function useCombat() {
  const context = useContext(CombatContext);
  if (!context) {
    throw new Error('useCombat must be used within a CombatProvider');
  }
  return context;
}
