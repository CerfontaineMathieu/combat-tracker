"use client";

import { useEffect, useRef, useCallback } from 'react';
import { connectSocket, disconnectSocket, type AppSocket } from '@/lib/socket';
import type {
  CombatUpdateData,
  HpChangeData,
  InitiativeChangeData,
  MonsterAddData,
  MonsterRemoveData,
  StateSyncData,
} from '@/lib/socket-events';

interface UseSocketOptions {
  campaignId: number | null;
  mode: 'mj' | 'joueur';
  onCombatUpdate?: (data: CombatUpdateData) => void;
  onHpChange?: (data: HpChangeData) => void;
  onInitiativeChange?: (data: InitiativeChangeData) => void;
  onMonsterAdd?: (data: MonsterAddData) => void;
  onMonsterRemove?: (data: MonsterRemoveData) => void;
  onStateSync?: (data: StateSyncData) => void;
  onRequestStateSync?: () => void;
  onUserJoined?: (data: { role: 'dm' | 'player' }) => void;
  onUserLeft?: (data: { role: 'dm' | 'player' }) => void;
}

export function useSocket(options: UseSocketOptions) {
  const {
    campaignId,
    mode,
    onCombatUpdate,
    onHpChange,
    onInitiativeChange,
    onMonsterAdd,
    onMonsterRemove,
    onStateSync,
    onRequestStateSync,
    onUserJoined,
    onUserLeft,
  } = options;

  const socketRef = useRef<AppSocket | null>(null);
  const joinedRef = useRef(false);

  useEffect(() => {
    if (!campaignId) return;

    const socket = connectSocket();
    socketRef.current = socket;

    // Set up event listeners
    if (onCombatUpdate) socket.on('combat-update', onCombatUpdate);
    if (onHpChange) socket.on('hp-change', onHpChange);
    if (onInitiativeChange) socket.on('initiative-change', onInitiativeChange);
    if (onMonsterAdd) socket.on('monster-add', onMonsterAdd);
    if (onMonsterRemove) socket.on('monster-remove', onMonsterRemove);
    if (onStateSync) socket.on('state-sync', onStateSync);
    if (onRequestStateSync) socket.on('request-state-sync', onRequestStateSync);
    if (onUserJoined) socket.on('user-joined', onUserJoined);
    if (onUserLeft) socket.on('user-left', onUserLeft);

    // Join campaign room when connected
    const handleConnect = () => {
      if (!joinedRef.current && campaignId) {
        socket.emit('join-campaign', {
          campaignId,
          role: mode === 'mj' ? 'dm' : 'player',
        });
        joinedRef.current = true;
      }
    };

    if (socket.connected) {
      handleConnect();
    } else {
      socket.on('connect', handleConnect);
    }

    return () => {
      // Clean up listeners
      socket.off('combat-update', onCombatUpdate);
      socket.off('hp-change', onHpChange);
      socket.off('initiative-change', onInitiativeChange);
      socket.off('monster-add', onMonsterAdd);
      socket.off('monster-remove', onMonsterRemove);
      socket.off('state-sync', onStateSync);
      socket.off('request-state-sync', onRequestStateSync);
      socket.off('user-joined', onUserJoined);
      socket.off('user-left', onUserLeft);
      socket.off('connect', handleConnect);

      // Leave campaign
      if (joinedRef.current) {
        socket.emit('leave-campaign');
        joinedRef.current = false;
      }

      disconnectSocket();
    };
  }, [
    campaignId,
    mode,
    onCombatUpdate,
    onHpChange,
    onInitiativeChange,
    onMonsterAdd,
    onMonsterRemove,
    onStateSync,
    onRequestStateSync,
    onUserJoined,
    onUserLeft,
  ]);

  // Emit functions
  const emitCombatUpdate = useCallback((data: CombatUpdateData) => {
    socketRef.current?.emit('combat-update', data);
  }, []);

  const emitHpChange = useCallback((data: HpChangeData) => {
    socketRef.current?.emit('hp-change', data);
  }, []);

  const emitInitiativeChange = useCallback((data: InitiativeChangeData) => {
    socketRef.current?.emit('initiative-change', data);
  }, []);

  const emitMonsterAdd = useCallback((data: MonsterAddData) => {
    socketRef.current?.emit('monster-add', data);
  }, []);

  const emitMonsterRemove = useCallback((data: MonsterRemoveData) => {
    socketRef.current?.emit('monster-remove', data);
  }, []);

  const emitStateSync = useCallback((data: StateSyncData) => {
    socketRef.current?.emit('state-sync', data);
  }, []);

  return {
    emitCombatUpdate,
    emitHpChange,
    emitInitiativeChange,
    emitMonsterAdd,
    emitMonsterRemove,
    emitStateSync,
    socket: socketRef.current,
  };
}
