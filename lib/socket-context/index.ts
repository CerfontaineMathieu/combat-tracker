// Main exports
export { SocketProvider, SocketContext } from './SocketProvider';
export {
  useSocketContext,
  useSocketState,
  useSocketActions,
  useIsConnected,
  useMode,
  useConnectedPlayers,
  useCombatState,
  usePlayerPositions,
  useAmbientEffect,
} from './useSocket';

// Type exports
export type {
  SocketState,
  SocketAction,
  SocketContextType,
  AppSocket,
  JoinCampaignParams,
  ConnectedPlayer,
  PlayerPositionData,
  NotificationData,
  AmbientEffectData,
  CombatUpdateData,
  HpChangeData,
  ConditionChangeData,
  ExhaustionChangeData,
} from './types';
export { initialSocketState } from './types';

// Reducer export (for testing)
export { socketReducer } from './reducer';
