"use client";

import React, { createContext, useReducer, useEffect, useCallback, useRef } from 'react';
import { io } from 'socket.io-client';
import { socketReducer } from './reducer';
import type {
  SocketState,
  SocketAction,
  SocketContextType,
  AppSocket,
  JoinCampaignParams,
  CombatUpdateData,
  HpChangeData,
  ConditionChangeData,
  ExhaustionChangeData,
  DeathSaveChangeData,
  AmbientEffectData,
  PlayerPositionData,
  NotificationData,
} from './types';
import { initialSocketState } from './types';

// Create context
export const SocketContext = createContext<SocketContextType | null>(null);

interface SocketProviderProps {
  children: React.ReactNode;
}

// Session storage key for persisting state
const SESSION_STORAGE_KEY = 'dnd-socket-session';

function getPersistedState(): Partial<SocketState> {
  if (typeof window === 'undefined') return {};
  try {
    const saved = sessionStorage.getItem(SESSION_STORAGE_KEY);
    if (saved) {
      const parsed = JSON.parse(saved);
      return {
        mode: parsed.mode || null,
        isJoined: parsed.isJoined || false,
        campaignId: parsed.campaignId || 1,
      };
    }
  } catch {
    // Ignore parse errors
  }
  return {};
}

export function SocketProvider({ children }: SocketProviderProps) {
  // Initialize state with persisted values
  const [state, dispatch] = useReducer(socketReducer, {
    ...initialSocketState,
    ...getPersistedState(),
  });

  // Refs for stable references in callbacks
  const stateRef = useRef(state);
  const socketRef = useRef<AppSocket | null>(null);

  // Keep refs in sync
  useEffect(() => {
    stateRef.current = state;
  }, [state]);

  // Persist relevant state to sessionStorage
  useEffect(() => {
    if (typeof window === 'undefined') return;
    sessionStorage.setItem(SESSION_STORAGE_KEY, JSON.stringify({
      mode: state.mode,
      isJoined: state.isJoined,
      campaignId: state.campaignId,
    }));
  }, [state.mode, state.isJoined, state.campaignId]);

  // Initialize socket connection
  useEffect(() => {
    // Create socket only once
    if (socketRef.current) return;

    const socket: AppSocket = io({
      path: '/api/socketio',
      autoConnect: false,
      reconnection: true,
      reconnectionAttempts: 5,
      reconnectionDelay: 1000,
    });

    socketRef.current = socket;

    // ============ CONNECTION EVENTS ============
    socket.on('connect', () => {
      dispatch({ type: 'SOCKET_CONNECT', socket });
      // If DM was previously joined, re-request connected players with campaignId
      if (stateRef.current.mode === 'mj' && stateRef.current.isJoined) {
        socket.emit('request-connected-players', { campaignId: stateRef.current.campaignId });
      }
    });

    socket.on('disconnect', () => {
      dispatch({ type: 'SOCKET_DISCONNECT' });
    });

    socket.on('connect_error', (error) => {
      dispatch({ type: 'CONNECTION_ERROR', error: error.message });
    });

    // ============ SESSION EVENTS ============
    socket.on('join-error', (data) => {
      dispatch({ type: 'JOIN_ERROR', error: data.message });
    });

    // ============ CONNECTED PLAYERS EVENTS ============
    socket.on('connected-players', (data) => {
      dispatch({ type: 'SET_CONNECTED_PLAYERS', players: data.players });
      // If we're DM and receive connected-players, we're successfully joined
      if (stateRef.current.mode === 'mj') {
        dispatch({ type: 'JOIN_SUCCESS' });
      }
    });

    socket.on('player-connected', (data) => {
      dispatch({ type: 'PLAYER_CONNECTED', player: data.player });
    });

    socket.on('player-disconnected', (data) => {
      dispatch({ type: 'PLAYER_DISCONNECTED', socketId: data.socketId });
    });

    // ============ COMBAT EVENTS ============
    socket.on('combat-update', (data) => {
      dispatch({ type: 'COMBAT_UPDATE', data });
    });

    socket.on('hp-change', (data) => {
      dispatch({
        type: 'HP_CHANGE',
        participantId: data.participantId,
        participantType: data.participantType,
        newHp: data.newHp,
      });
    });

    socket.on('condition-change', (data) => {
      dispatch({
        type: 'CONDITION_CHANGE',
        participantId: data.participantId,
        participantType: data.participantType,
        conditions: data.conditions,
        conditionDurations: data.conditionDurations,
      });
    });

    socket.on('exhaustion-change', (data) => {
      dispatch({
        type: 'EXHAUSTION_CHANGE',
        participantId: data.participantId,
        participantType: data.participantType,
        exhaustionLevel: data.exhaustionLevel,
      });
    });

    socket.on('death-save-change', (data) => {
      dispatch({
        type: 'DEATH_SAVE_CHANGE',
        participantId: data.participantId,
        participantType: data.participantType,
        deathSaves: data.deathSaves,
        isStabilized: data.isStabilized,
        isDead: data.isDead,
      });
    });

    socket.on('request-state-sync', () => {
      // DM should respond with current state
      if (stateRef.current.mode === 'mj' && stateRef.current.combatState.active) {
        socket.emit('combat-update', {
          type: 'state-sync',
          combatActive: stateRef.current.combatState.active,
          currentTurn: stateRef.current.combatState.currentTurn,
          roundNumber: stateRef.current.combatState.roundNumber,
          participants: stateRef.current.combatState.participants,
        });
      }
    });

    // ============ AMBIENT EFFECT EVENTS ============
    socket.on('ambient-effect', (data) => {
      dispatch({ type: 'SET_AMBIENT_EFFECT', effect: data.effect });
    });

    // ============ MAP POSITION EVENTS ============
    socket.on('player-positions', (data) => {
      dispatch({ type: 'SET_PLAYER_POSITIONS', positions: data.positions });
    });

    socket.on('request-player-positions', () => {
      // DM should respond with current positions
      if (stateRef.current.mode === 'mj' && stateRef.current.playerPositions.length > 0) {
        socket.emit('player-positions', { positions: stateRef.current.playerPositions });
      }
    });

    // ============ NOTIFICATION EVENTS ============
    socket.on('notification', (data) => {
      dispatch({ type: 'SET_NOTIFICATION', notification: data });
    });

    // Connect the socket
    socket.connect();

    // Cleanup on unmount
    return () => {
      socket.off('connect');
      socket.off('disconnect');
      socket.off('connect_error');
      socket.off('join-error');
      socket.off('connected-players');
      socket.off('player-connected');
      socket.off('player-disconnected');
      socket.off('combat-update');
      socket.off('hp-change');
      socket.off('condition-change');
      socket.off('exhaustion-change');
      socket.off('death-save-change');
      socket.off('request-state-sync');
      socket.off('ambient-effect');
      socket.off('player-positions');
      socket.off('request-player-positions');
      socket.off('notification');

      socket.disconnect();
      socketRef.current = null;
    };
  }, []);

  // Auto-rejoin campaign for players when socket connects (works across all pages)
  useEffect(() => {
    if (!state.isConnected || state.isJoined) return;
    if (state.mode !== 'joueur') return;

    const socket = socketRef.current;
    if (!socket) return;

    // Get stored characters for auto-rejoin
    const storedCharacters = localStorage.getItem("combatTrackerCharacters");
    if (storedCharacters) {
      try {
        const characters = JSON.parse(storedCharacters);
        socket.emit('join-campaign', {
          campaignId: state.campaignId,
          role: 'player',
          characters,
        });
        dispatch({ type: 'JOIN_SUCCESS' });
      } catch {
        // Ignore parse errors
      }
    }
  }, [state.isConnected, state.isJoined, state.mode, state.campaignId]);

  // Periodic refresh of connected players for DM (in case socket reconnected and lost room membership)
  useEffect(() => {
    if (!state.isConnected || !state.isJoined || state.mode !== 'mj') return;

    const socket = socketRef.current;
    if (!socket) return;

    // Request connected players every 10 seconds
    const interval = setInterval(() => {
      socket.emit('request-connected-players', { campaignId: state.campaignId });
    }, 10000);

    // Also request immediately when this effect runs
    socket.emit('request-connected-players', { campaignId: state.campaignId });

    return () => clearInterval(interval);
  }, [state.isConnected, state.isJoined, state.mode, state.campaignId]);

  // ============ ACTION FUNCTIONS ============

  const joinCampaign = useCallback((params: JoinCampaignParams) => {
    const socket = socketRef.current;
    if (!socket?.connected) return;

    dispatch({ type: 'SET_MODE', mode: params.role === 'dm' ? 'mj' : 'joueur' });

    socket.emit('join-campaign', {
      campaignId: stateRef.current.campaignId,
      role: params.role,
      password: params.password,
      characters: params.characters,
    });

    // For players, mark as joined immediately (no password check)
    if (params.role === 'player') {
      dispatch({ type: 'JOIN_SUCCESS' });
    }
  }, []);

  const leaveCampaign = useCallback(() => {
    const socket = socketRef.current;
    if (!socket?.connected) return;

    socket.emit('leave-campaign');
    dispatch({ type: 'LEAVE_CAMPAIGN' });
  }, []);

  const emitCombatUpdate = useCallback((data: CombatUpdateData) => {
    const socket = socketRef.current;
    if (!socket?.connected) return;

    socket.emit('combat-update', data);
    // Also update local state
    dispatch({ type: 'COMBAT_UPDATE', data });
  }, []);

  const emitHpChange = useCallback((data: HpChangeData) => {
    const socket = socketRef.current;
    if (!socket?.connected) return;

    socket.emit('hp-change', data);
    // Local state will be updated via the socket event handler
  }, []);

  const emitConditionChange = useCallback((data: ConditionChangeData) => {
    const socket = socketRef.current;
    if (!socket?.connected) return;

    socket.emit('condition-change', data);
  }, []);

  const emitExhaustionChange = useCallback((data: ExhaustionChangeData) => {
    const socket = socketRef.current;
    if (!socket?.connected) return;

    socket.emit('exhaustion-change', data);
  }, []);

  const emitDeathSaveChange = useCallback((data: DeathSaveChangeData) => {
    const socket = socketRef.current;
    if (!socket?.connected) return;

    socket.emit('death-save-change', data);
  }, []);

  const emitAmbientEffect = useCallback((data: AmbientEffectData) => {
    const socket = socketRef.current;
    if (!socket?.connected) return;

    socket.emit('ambient-effect', data);
    // Also update local state for DM
    dispatch({ type: 'SET_AMBIENT_EFFECT', effect: data.effect });
  }, []);

  const emitPlayerPositions = useCallback((positions: PlayerPositionData[]) => {
    const socket = socketRef.current;
    if (!socket?.connected) return;

    socket.emit('player-positions', { positions });
    // Also update local state immediately for DM
    dispatch({ type: 'SET_PLAYER_POSITIONS', positions });
  }, []);

  const requestPlayerPositions = useCallback(() => {
    const socket = socketRef.current;
    if (!socket?.connected) return;

    socket.emit('request-player-positions', { campaignId: stateRef.current.campaignId });
  }, []);

  const requestConnectedPlayers = useCallback(() => {
    const socket = socketRef.current;
    if (!socket?.connected) return;

    socket.emit('request-connected-players', { campaignId: stateRef.current.campaignId });
  }, []);

  const emitNotification = useCallback((data: NotificationData) => {
    const socket = socketRef.current;
    if (!socket?.connected) return;

    socket.emit('notification', data);
  }, []);

  // Context value
  const value: SocketContextType = {
    state,
    dispatch,
    joinCampaign,
    leaveCampaign,
    emitCombatUpdate,
    emitHpChange,
    emitConditionChange,
    emitExhaustionChange,
    emitDeathSaveChange,
    emitAmbientEffect,
    emitPlayerPositions,
    requestPlayerPositions,
    requestConnectedPlayers,
    emitNotification,
  };

  return (
    <SocketContext.Provider value={value}>
      {children}
    </SocketContext.Provider>
  );
}
