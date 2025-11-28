"use client";

import { useContext } from 'react';
import { SocketContext } from './SocketProvider';
import type { SocketContextType, SocketState } from './types';

/**
 * Main hook to access socket context
 * Throws error if used outside of SocketProvider
 */
export function useSocketContext(): SocketContextType {
  const context = useContext(SocketContext);
  if (!context) {
    throw new Error('useSocketContext must be used within a SocketProvider');
  }
  return context;
}

/**
 * Hook to access just the socket state
 * Useful for components that only need to read state
 */
export function useSocketState(): SocketState {
  const { state } = useSocketContext();
  return state;
}

/**
 * Hook to access socket actions (emit functions)
 * Useful for components that only need to emit events
 */
export function useSocketActions() {
  const {
    joinCampaign,
    leaveCampaign,
    emitCombatUpdate,
    emitHpChange,
    emitConditionChange,
    emitExhaustionChange,
    emitAmbientEffect,
    emitPlayerPositions,
    requestPlayerPositions,
    requestConnectedPlayers,
    emitNotification,
    dispatch,
  } = useSocketContext();

  return {
    joinCampaign,
    leaveCampaign,
    emitCombatUpdate,
    emitHpChange,
    emitConditionChange,
    emitExhaustionChange,
    emitAmbientEffect,
    emitPlayerPositions,
    requestPlayerPositions,
    requestConnectedPlayers,
    emitNotification,
    dispatch,
  };
}

/**
 * Selector hooks for specific pieces of state
 */

export function useIsConnected(): boolean {
  const { state } = useSocketContext();
  return state.isConnected;
}

export function useMode(): 'mj' | 'joueur' | null {
  const { state } = useSocketContext();
  return state.mode;
}

export function useConnectedPlayers() {
  const { state } = useSocketContext();
  return state.connectedPlayers;
}

export function useCombatState() {
  const { state } = useSocketContext();
  return state.combatState;
}

export function usePlayerPositions() {
  const { state } = useSocketContext();
  return state.playerPositions;
}

export function useAmbientEffect() {
  const { state } = useSocketContext();
  return state.ambientEffect;
}
