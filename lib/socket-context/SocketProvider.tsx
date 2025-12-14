"use client";

import React, { createContext, useReducer, useEffect, useCallback, useRef, useMemo } from 'react';
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
  BuffChangeData,
  DeathSaveChangeData,
  AmbientEffectData,
  PlayerPositionData,
  NotificationData,
  InventoryUpdateData,
  SpellSlotChangeData,
  // Loot types
  LootCreateSessionData,
  LootAddItemData,
  LootClaimItemData,
  LootUnclaimItemData,
  LootAssignItemData,
  LootUpdateCurrencyData,
} from './types';
import { initialSocketState } from './types';

// Create context
export const SocketContext = createContext<SocketContextType | null>(null);

interface SocketProviderProps {
  children: React.ReactNode;
}

// Session storage keys for persisting state
const SESSION_STORAGE_KEY = 'dnd-socket-session';
const DM_PASSWORD_KEY = 'dnd-dm-password';

function getPersistedState(): Partial<SocketState> {
  if (typeof window === 'undefined') return {};
  try {
    const saved = sessionStorage.getItem(SESSION_STORAGE_KEY);
    if (saved) {
      const parsed = JSON.parse(saved);
      return {
        mode: parsed.mode || null,
        // IMPORTANT: isJoined should NEVER be restored from storage
        // On page load, we're not connected yet - auto-rejoin will handle reconnection
        isJoined: false,
        campaignId: parsed.campaignId || 1,
      };
    }
  } catch {
    // Ignore parse errors
  }
  return {};
}

// Get stored DM password for auto-rejoin
function getStoredDmPassword(): string | null {
  if (typeof window === 'undefined') return null;
  return sessionStorage.getItem(DM_PASSWORD_KEY);
}

// Store DM password for auto-rejoin
function storeDmPassword(password: string): void {
  if (typeof window === 'undefined') return;
  sessionStorage.setItem(DM_PASSWORD_KEY, password);
}

// Clear DM password on logout
function clearDmPassword(): void {
  if (typeof window === 'undefined') return;
  sessionStorage.removeItem(DM_PASSWORD_KEY);
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
  // NOTE: isJoined is intentionally NOT persisted - it should always start as false
  useEffect(() => {
    if (typeof window === 'undefined') return;
    sessionStorage.setItem(SESSION_STORAGE_KEY, JSON.stringify({
      mode: state.mode,
      campaignId: state.campaignId,
    }));
  }, [state.mode, state.campaignId]);

  // Initialize socket connection
  useEffect(() => {
    // Create socket only once
    if (socketRef.current) return;

    const socket: AppSocket = io({
      path: '/api/socketio',
      autoConnect: false,
      reconnection: true,
      reconnectionAttempts: 10,        // Increased from 5
      reconnectionDelay: 1000,         // Initial delay
      reconnectionDelayMax: 10000,     // Max 10 seconds
      randomizationFactor: 0.5,        // Add jitter to prevent thundering herd
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
      // Receiving connected-players means we're successfully joined (for both DM and player)
      if (!stateRef.current.isJoined) {
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
        tempHp: data.tempHp,
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

    socket.on('buff-change', (data) => {
      dispatch({
        type: 'BUFF_CHANGE',
        participantId: data.participantId,
        participantType: data.participantType,
        buffs: data.buffs,
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
      if (stateRef.current.mode === 'mj') {
        // Send combat state if active
        if (stateRef.current.combatState.active) {
          socket.emit('combat-update', {
            type: 'state-sync',
            combatActive: stateRef.current.combatState.active,
            currentTurn: stateRef.current.combatState.currentTurn,
            roundNumber: stateRef.current.combatState.roundNumber,
            participants: stateRef.current.combatState.participants,
          });
        }
        // Always send current ambient effect (even if "none")
        socket.emit('ambient-effect', { effect: stateRef.current.ambientEffect });
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

    // ============ DM DISCONNECT/RECONNECT EVENTS ============
    socket.on('dm-disconnected', (data) => {
      dispatch({ type: 'DM_DISCONNECTED', timestamp: data.timestamp });
    });

    socket.on('dm-reconnected', () => {
      dispatch({ type: 'DM_RECONNECTED' });
    });

    // ============ INVENTORY EVENTS ============
    socket.on('inventory-update', (data) => {
      dispatch({
        type: 'INVENTORY_UPDATE',
        participantId: data.participantId,
        inventory: data.inventory,
      });
    });

    // ============ SPELL SLOT EVENTS ============
    socket.on('spell-slot-change', (data) => {
      dispatch({
        type: 'SPELL_SLOT_CHANGE',
        participantId: data.participantId,
        spellSlots: data.spellSlots,
      });
    });

    // ============ LOOT DISTRIBUTION EVENTS ============
    socket.on('loot-session-update', (data) => {
      dispatch({ type: 'LOOT_SESSION_UPDATE', session: data.session });
    });

    socket.on('loot-item-add', (data) => {
      dispatch({
        type: 'LOOT_ITEM_ADD',
        sessionId: data.sessionId,
        item: data.item,
      });
    });

    socket.on('loot-item-update', (data) => {
      dispatch({
        type: 'LOOT_ITEM_UPDATE',
        sessionId: data.sessionId,
        item: data.item,
      });
    });

    socket.on('loot-item-remove', (data) => {
      dispatch({
        type: 'LOOT_ITEM_REMOVE',
        sessionId: data.sessionId,
        itemId: data.itemId,
      });
    });

    socket.on('loot-claim', (data) => {
      dispatch({
        type: 'LOOT_CLAIM',
        sessionId: data.sessionId,
        itemId: data.itemId,
        claim: data.claim,
      });
    });

    socket.on('loot-unclaim', (data) => {
      dispatch({
        type: 'LOOT_UNCLAIM',
        sessionId: data.sessionId,
        itemId: data.itemId,
        characterId: data.characterId,
      });
    });

    socket.on('loot-assign', (data) => {
      dispatch({
        type: 'LOOT_ASSIGN',
        sessionId: data.sessionId,
        itemId: data.itemId,
        characterId: data.characterId,
        characterName: data.characterName,
      });
    });

    socket.on('loot-to-treasury', (data) => {
      dispatch({
        type: 'LOOT_TO_TREASURY',
        sessionId: data.sessionId,
        itemId: data.itemId,
      });
    });

    socket.on('loot-currency-update', (data) => {
      dispatch({
        type: 'LOOT_CURRENCY_UPDATE',
        sessionId: data.sessionId,
        currency: data.currency,
        splitMethod: data.splitMethod,
      });
    });

    socket.on('loot-rolloff-start', (data) => {
      dispatch({
        type: 'LOOT_ROLLOFF_START',
        itemId: data.itemId,
        itemName: data.itemName,
        participants: data.participants,
      });
    });

    socket.on('loot-rolloff-result', (data) => {
      dispatch({
        type: 'LOOT_ROLLOFF_RESULT',
        result: data.result,
      });
    });

    socket.on('loot-finalized', (data) => {
      dispatch({
        type: 'LOOT_FINALIZED',
        distributions: data.distributions,
      });
    });

    socket.on('loot-cancelled', () => {
      dispatch({ type: 'LOOT_CLEAR_SESSION' });
    });

    socket.on('loot-error', (data) => {
      console.error('[Loot] Error:', data.error, data.code);
      dispatch({ type: 'LOOT_ERROR', error: data.error, code: data.code });
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
      socket.off('buff-change');
      socket.off('death-save-change');
      socket.off('request-state-sync');
      socket.off('ambient-effect');
      socket.off('player-positions');
      socket.off('request-player-positions');
      socket.off('notification');
      socket.off('dm-disconnected');
      socket.off('dm-reconnected');
      socket.off('inventory-update');
      socket.off('spell-slot-change');
      // Loot events
      socket.off('loot-session-update');
      socket.off('loot-item-add');
      socket.off('loot-item-update');
      socket.off('loot-item-remove');
      socket.off('loot-claim');
      socket.off('loot-unclaim');
      socket.off('loot-assign');
      socket.off('loot-to-treasury');
      socket.off('loot-currency-update');
      socket.off('loot-rolloff-start');
      socket.off('loot-rolloff-result');
      socket.off('loot-finalized');
      socket.off('loot-cancelled');
      socket.off('loot-error');

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
        console.log('[Socket] Auto-joining as player with stored characters');
        socket.emit('join-campaign', {
          campaignId: state.campaignId,
          role: 'player',
          characters,
        });
        // Don't dispatch JOIN_SUCCESS here - wait for 'connected-players' event
        // This prevents race conditions where server rejects but we think we're joined
      } catch {
        // Ignore parse errors
      }
    }
  }, [state.isConnected, state.isJoined, state.mode, state.campaignId]);

  // Auto-rejoin campaign for DM when socket connects (using stored password)
  useEffect(() => {
    if (!state.isConnected || state.isJoined) return;
    if (state.mode !== 'mj') return;

    const socket = socketRef.current;
    if (!socket) return;

    // Get stored password for auto-rejoin
    const storedPassword = getStoredDmPassword();
    if (storedPassword) {
      console.log('[Socket] Auto-joining as DM with stored password');
      socket.emit('join-campaign', {
        campaignId: state.campaignId,
        role: 'dm',
        password: storedPassword,
      });
      // Dispatch JOIN_SUCCESS immediately so periodic refresh starts
      // Server will send connected-players which will update the player list
      dispatch({ type: 'JOIN_SUCCESS' });
    } else {
      console.log('[Socket] No stored DM password, cannot auto-rejoin');
    }
  }, [state.isConnected, state.isJoined, state.mode, state.campaignId]);

  // Periodic refresh of connected players for all modes (in case socket reconnected and lost room membership)
  useEffect(() => {
    if (!state.isConnected || !state.isJoined) return;

    const socket = socketRef.current;
    if (!socket) return;

    // Request connected players every 10 seconds
    const interval = setInterval(() => {
      socket.emit('request-connected-players', { campaignId: state.campaignId });
    }, 10000);

    // Also request immediately when this effect runs
    socket.emit('request-connected-players', { campaignId: state.campaignId });

    return () => clearInterval(interval);
  }, [state.isConnected, state.isJoined, state.campaignId]);

  // ============ ACTION FUNCTIONS ============

  const joinCampaign = useCallback((params: JoinCampaignParams) => {
    const socket = socketRef.current;
    if (!socket?.connected) return;

    dispatch({ type: 'SET_MODE', mode: params.role === 'dm' ? 'mj' : 'joueur' });

    // NOTE: Don't store password here - only store after successful join
    // This is handled in page.tsx to avoid storing wrong passwords

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

    // Clear stored DM password on logout
    clearDmPassword();

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

  const emitBuffChange = useCallback((data: BuffChangeData) => {
    const socket = socketRef.current;
    if (!socket?.connected) return;

    socket.emit('buff-change', data);
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

  const emitInventoryUpdate = useCallback((data: InventoryUpdateData) => {
    const socket = socketRef.current;
    if (!socket?.connected) return;

    socket.emit('inventory-update', data);
    // Also update local state immediately
    dispatch({
      type: 'INVENTORY_UPDATE',
      participantId: data.participantId,
      inventory: data.inventory,
    });
  }, []);

  const emitSpellSlotChange = useCallback((data: SpellSlotChangeData) => {
    const socket = socketRef.current;
    if (!socket?.connected) return;

    socket.emit('spell-slot-change', data);
    // Also update local state immediately
    dispatch({
      type: 'SPELL_SLOT_CHANGE',
      participantId: data.participantId,
      spellSlots: data.spellSlots,
    });
  }, []);

  // ============ LOOT DISTRIBUTION ACTIONS ============

  const createLootSession = useCallback((data: Omit<LootCreateSessionData, 'campaignId'>) => {
    const socket = socketRef.current;
    if (!socket?.connected) return;

    socket.emit('loot-create-session', {
      ...data,
      campaignId: stateRef.current.campaignId,
    });
  }, []);

  const addLootItem = useCallback((data: Omit<LootAddItemData, 'sessionId'>) => {
    const socket = socketRef.current;
    if (!socket?.connected) return;

    const sessionId = stateRef.current.lootSession?.id;
    if (!sessionId) return;

    socket.emit('loot-add-item', { ...data, sessionId });
  }, []);

  const claimLootItem = useCallback((data: Omit<LootClaimItemData, 'sessionId'>) => {
    const socket = socketRef.current;
    if (!socket?.connected) return;

    const sessionId = stateRef.current.lootSession?.id;
    if (!sessionId) return;

    socket.emit('loot-claim-item', { ...data, sessionId });
  }, []);

  const unclaimLootItem = useCallback((data: Omit<LootUnclaimItemData, 'sessionId'>) => {
    const socket = socketRef.current;
    if (!socket?.connected) return;

    const sessionId = stateRef.current.lootSession?.id;
    if (!sessionId) return;

    socket.emit('loot-unclaim-item', { ...data, sessionId });
  }, []);

  const assignLootItem = useCallback((data: Omit<LootAssignItemData, 'sessionId'>) => {
    const socket = socketRef.current;
    if (!socket?.connected) {
      console.log('[Loot] assignLootItem: socket not connected');
      return;
    }

    const sessionId = stateRef.current.lootSession?.id;
    if (!sessionId) {
      console.log('[Loot] assignLootItem: no session ID');
      return;
    }

    console.log('[Loot] Emitting loot-assign-item:', { ...data, sessionId });
    socket.emit('loot-assign-item', { ...data, sessionId });
  }, []);

  const sendToTreasury = useCallback((itemId: string) => {
    const socket = socketRef.current;
    if (!socket?.connected) return;

    const sessionId = stateRef.current.lootSession?.id;
    if (!sessionId) return;

    socket.emit('loot-to-treasury-item', { sessionId, itemId });
  }, []);

  const triggerRollOff = useCallback((itemId: string) => {
    const socket = socketRef.current;
    if (!socket?.connected) return;

    const sessionId = stateRef.current.lootSession?.id;
    if (!sessionId) return;

    socket.emit('loot-trigger-rolloff', { sessionId, itemId });
  }, []);

  const updateLootCurrency = useCallback((data: Omit<LootUpdateCurrencyData, 'sessionId'>) => {
    const socket = socketRef.current;
    if (!socket?.connected) return;

    const sessionId = stateRef.current.lootSession?.id;
    if (!sessionId) return;

    socket.emit('loot-update-currency', { ...data, sessionId });
  }, []);

  const finalizeLoot = useCallback(() => {
    const socket = socketRef.current;
    if (!socket?.connected) return;

    const sessionId = stateRef.current.lootSession?.id;
    if (!sessionId) return;

    socket.emit('loot-finalize', { sessionId });
  }, []);

  const cancelLoot = useCallback(() => {
    const socket = socketRef.current;
    if (!socket?.connected) return;

    const sessionId = stateRef.current.lootSession?.id;
    if (!sessionId) return;

    socket.emit('loot-cancel', { sessionId });
  }, []);

  const requestLootSession = useCallback(() => {
    const socket = socketRef.current;
    if (!socket?.connected) return;

    socket.emit('loot-request-session', { campaignId: stateRef.current.campaignId });
  }, []);

  const clearRollOffResult = useCallback(() => {
    dispatch({ type: 'LOOT_CLEAR_ROLLOFF' });
  }, []);

  const clearLootSession = useCallback(() => {
    dispatch({ type: 'LOOT_CLEAR_SESSION' });
  }, []);

  // Context value - memoized to ensure proper React re-renders when state changes
  const value: SocketContextType = useMemo(() => ({
    state,
    dispatch,
    joinCampaign,
    leaveCampaign,
    emitCombatUpdate,
    emitHpChange,
    emitConditionChange,
    emitExhaustionChange,
    emitBuffChange,
    emitDeathSaveChange,
    emitInventoryUpdate,
    emitSpellSlotChange,
    emitAmbientEffect,
    emitPlayerPositions,
    requestPlayerPositions,
    requestConnectedPlayers,
    emitNotification,
    // Loot distribution
    createLootSession,
    addLootItem,
    claimLootItem,
    unclaimLootItem,
    assignLootItem,
    sendToTreasury,
    triggerRollOff,
    updateLootCurrency,
    finalizeLoot,
    cancelLoot,
    requestLootSession,
    clearRollOffResult,
    clearLootSession,
  }), [
    state,
    dispatch,
    joinCampaign,
    leaveCampaign,
    emitCombatUpdate,
    emitHpChange,
    emitConditionChange,
    emitExhaustionChange,
    emitBuffChange,
    emitDeathSaveChange,
    emitInventoryUpdate,
    emitSpellSlotChange,
    emitAmbientEffect,
    emitPlayerPositions,
    requestPlayerPositions,
    requestConnectedPlayers,
    emitNotification,
    // Loot distribution
    createLootSession,
    addLootItem,
    claimLootItem,
    unclaimLootItem,
    assignLootItem,
    sendToTreasury,
    triggerRollOff,
    updateLootCurrency,
    finalizeLoot,
    cancelLoot,
    requestLootSession,
    clearRollOffResult,
    clearLootSession,
  ]);

  return (
    <SocketContext.Provider value={value}>
      {children}
    </SocketContext.Provider>
  );
}
