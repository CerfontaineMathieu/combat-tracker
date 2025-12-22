import { createServer } from 'http';
import { parse } from 'url';
import next from 'next';
import { Server as SocketServer, Socket } from 'socket.io';
import 'dotenv/config';
import { getDmPassword, getCharacterInventory, getCharacterStatus, getBatchCharacterStatus, saveCharacterInventory } from './lib/db';
import {
  getRedis,
  getDmSession,
  setDmSession,
  deleteDmSession,
  getConnectedPlayers,
  addConnectedPlayer,
  removeConnectedPlayer,
  getCombatState,
  setCombatState,
  deleteCombatState,
  updateCharacterHp,
  updateCharacterInventory,
  type DmSession,
  type ConnectedPlayer as RedisConnectedPlayer,
  type CombatState,
} from './lib/redis';

const dev = process.env.NODE_ENV !== 'production';
const hostname = process.env.HOSTNAME || 'localhost';
const port = parseInt(process.env.PORT || '3000', 10);
const DEFAULT_DM_PASSWORD = process.env.DM_PASSWORD || 'defaultpassword';

// Get effective password: DB first, then .env fallback
async function getEffectivePassword(campaignId: number): Promise<string> {
  try {
    const dbPassword = await getDmPassword(campaignId);
    return dbPassword || DEFAULT_DM_PASSWORD;
  } catch (error) {
    console.error('[Auth] Error fetching password from DB, using default:', error);
    return DEFAULT_DM_PASSWORD;
  }
}

const app = next({ dev, hostname, port });
const handle = app.getRequestHandler();

// Note: ConnectedPlayer and DmSession types are now imported from ./lib/redis
// In-memory Maps replaced with Redis for better reliability and multi-instance support

// Generate a unique session token for DM sessions
function generateSessionToken(socketId: string): string {
  return `${socketId}-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;
}

// Socket event types
interface JoinCampaignData {
  campaignId: number;
  role: 'dm' | 'player';
  password?: string; // Required for DM role
  characters?: Array<{
    odNumber: string | number; // Notion UUID or legacy DB ID
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

interface CombatUpdateData {
  type: 'start' | 'stop' | 'next-turn' | 'state-sync' | 'combat_end_xp';
  combatActive: boolean;
  currentTurn: number;
  roundNumber?: number;
  participants?: unknown[];
  xpSummary?: {
    totalXp: number;
    perPlayerXp: number;
    playerCount: number;
    killedMonsters: { name: string; xp: number }[];
  };
}

interface HpChangeData {
  participantId: string;
  participantType: 'player' | 'monster';
  newHp: number;
  change: number;
  source: 'dm' | 'player';
}

interface InitiativeChangeData {
  participantId: string;
  participantType: 'player' | 'monster';
  newInitiative: number;
}

interface MonsterAddData {
  monster: unknown;
}

interface MonsterRemoveData {
  monsterId: string;
}

interface StateSyncData {
  players: unknown[];
  monsters: unknown[];
  combatActive: boolean;
  currentTurn: number;
}

interface NotificationData {
  type: 'success' | 'error' | 'info' | 'warning';
  message: string;
  description?: string;
}

interface ConditionChangeData {
  participantId: string;
  participantType: 'player' | 'monster';
  conditions: string[];
}

interface ExhaustionChangeData {
  participantId: string;
  participantType: 'player' | 'monster';
  exhaustionLevel: number;
}

interface BuffChangeData {
  participantId: string;
  participantType: 'player' | 'monster';
  buffs: import('@/lib/types').ActiveBuff[];
}

interface DeathSaveChangeData {
  participantId: string;
  participantType: 'player' | 'monster';
  deathSaves: { successes: number; failures: number };
  isStabilized: boolean;
  isDead: boolean;
}

interface InventoryUpdateData {
  participantId: string;
  participantType: 'player';
  inventory: any; // Use any for now to avoid importing full type definition
  source: 'dm' | 'player';
}

interface SpellSlotChangeData {
  participantId: string;
  participantType: 'player';
  spellSlots: Record<number, number>;
  source: 'dm' | 'player';
}

interface PreparedSpellsChangeData {
  participantId: string;
  participantType: 'player';
  preparedSpells: any[]; // Use any to avoid importing full type definition
  source: 'dm' | 'player';
}

// Loot system types
interface LootCurrency {
  platinum: number;
  gold: number;
  electrum: number;
  silver: number;
  copper: number;
}

type LootItemType = 'weapon' | 'armor' | 'potion' | 'scroll' | 'wondrous' | 'currency' | 'misc';
type LootItemRarity = 'common' | 'uncommon' | 'rare' | 'very_rare' | 'legendary' | 'artifact';
type LootItemStatus = 'unclaimed' | 'contested' | 'assigned' | 'treasury' | 'sold';
type CurrencySplitMethod = 'equal' | 'manual';

interface LootClaim {
  id: string;
  itemId: string;
  characterId: string;
  characterName: string;
  priority: 1 | 2 | 3;
  note?: string;
  createdAt: Date;
  updatedAt: Date;
}

type ResistanceType = 'Acide' | 'Froid' | 'Feu' | 'Force' | 'Foudre' | 'Nécrotique' | 'Poison' | 'Psychique' | 'Radiant' | 'Tonnerre';

interface LootItem {
  id: string;
  sessionId: string;
  catalogNotionId?: string;
  name: string;
  description?: string;
  itemType: LootItemType;
  rarity: LootItemRarity;
  quantity: number;
  isIdentified: boolean;
  estimatedValueGp?: number;
  status: LootItemStatus;
  assignedTo?: string;
  assignedToName?: string;
  claims: LootClaim[];
  createdAt: Date;
  resolvedAt?: Date;
  // For scrolls - linked spell information
  linkedSpell?: {
    id: number;
    name: string;
    level: number;
  };
  // For resistance potions - selected damage type
  resistanceType?: ResistanceType;
}

interface LootSession {
  id: string;
  campaignId: number;
  status: 'draft' | 'claiming' | 'resolving' | 'completed' | 'cancelled';
  currency: LootCurrency;
  currencySplitMethod: CurrencySplitMethod;
  claimingDeadline?: Date;
  createdAt: Date;
  completedAt?: Date;
  items: LootItem[];
}

interface LootDistribution {
  id: string;
  sessionId: string;
  characterId: string;
  characterName: string;
  currency: LootCurrency;
  items: Array<{ itemId: string; name: string; quantity: number; rarity: LootItemRarity }>;
}

// In-memory loot session storage (per campaign)
// TODO: Move to Redis for persistence across server restarts
const activeLootSessions = new Map<number, LootSession>();

// Helper to generate UUIDs
function generateId(): string {
  return `${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;
}

// Helper to calculate item status based on claims
function calculateItemStatus(item: LootItem): LootItemStatus {
  if (item.assignedTo) return 'assigned';
  if (item.status === 'treasury') return 'treasury';
  if (item.status === 'sold') return 'sold';
  if (item.claims.length === 0) return 'unclaimed';
  if (item.claims.length === 1) return 'unclaimed'; // Single claim = auto-assigned on finalize
  return 'contested'; // Multiple claims = contested
}

interface AmbientEffectData {
  effect: 'none' | 'rain' | 'fog' | 'fire' | 'snow' | 'sandstorm' | 'crit-fail' | 'crit-success' | 'concentration-broken';
}

interface PlayerPositionData {
  odNumber: string | number;
  name: string;
  lng: number;
  lat: number;
}

interface PlayerPositionsData {
  positions: PlayerPositionData[];
}

// Extended socket with custom data
interface CampaignSocket extends Socket {
  data: {
    campaignId?: number;
    role?: 'dm' | 'player';
    odNumber?: number; // Character ID if player
    dmSessionToken?: string; // Token to validate DM session (prevents race conditions)
  };
}

app.prepare().then(() => {
  const server = createServer((req, res) => {
    const parsedUrl = parse(req.url!, true);
    handle(req, res, parsedUrl);
  });

  // Initialize Redis connection
  getRedis().then(() => {
    console.log('[Server] Redis initialized');
  }).catch((err) => {
    console.error('[Server] Failed to initialize Redis:', err);
  });

  const io = new SocketServer(server, {
    path: '/api/socketio',
    addTrailingSlash: false,
    // Faster heartbeat for quicker disconnect detection
    pingTimeout: 10000,   // Wait 10s for pong (default 20s)
    pingInterval: 5000,   // Send ping every 5s (default 25s)
    cors: {
      origin: dev ? ['http://localhost:3000', 'http://localhost:3001'] : [],
      methods: ['GET', 'POST'],
    },
  });

  io.on('connection', (socket: CampaignSocket) => {
    console.log(`[Socket.io] Client connected: ${socket.id}`);

    // Join a campaign room
    socket.on('join-campaign', async (data: JoinCampaignData) => {
      const { campaignId, role, password, characters } = data;
      const room = `campaign-${campaignId}`;

      // DM role validation
      if (role === 'dm') {
        // Check password (from DB or .env fallback)
        const effectivePassword = await getEffectivePassword(campaignId);
        if (password !== effectivePassword) {
          console.log(`[Socket.io] DM login failed for ${socket.id}: invalid password`);
          socket.emit('join-error', { error: 'invalid-password', message: 'Mot de passe incorrect' });
          return;
        }

        // Check if DM already connected (from Redis)
        const existingDM = await getDmSession(campaignId);

        if (existingDM && existingDM.socketId !== socket.id) {
          // Check if the existing DM socket is still actually connected
          const existingSocket = io.sockets.sockets.get(existingDM.socketId);
          const isStaleSession = !existingSocket || !existingSocket.connected;

          if (isStaleSession) {
            // Stale session (server restarted or socket died) - allow takeover
            console.log(`[Socket.io] Stale DM session detected for campaign ${campaignId}, allowing takeover`);
            await deleteDmSession(campaignId);
          } else {
            // Another active DM - reject
            console.log(`[Socket.io] DM login failed for ${socket.id}: DM already connected (${existingDM.socketId})`);
            socket.emit('join-error', { error: 'dm-already-connected', message: 'Un Maître du Jeu est déjà connecté' });
            return;
          }
        }

        // Generate and store session token
        const sessionToken = generateSessionToken(socket.id);
        socket.data.dmSessionToken = sessionToken;

        // Register this socket as DM in Redis
        await setDmSession(campaignId, {
          socketId: socket.id,
          sessionToken,
          connectedAt: Date.now(),
        });
        console.log(`[Socket.io] DM registered for campaign ${campaignId}: ${socket.id}`);

        // Notify players that DM is connected (covers reconnect, stale takeover, etc.)
        io.to(room).emit('dm-reconnected');
      }

      socket.join(room);
      socket.data.campaignId = campaignId;
      socket.data.role = role;

      console.log(`[Socket.io] ${socket.id} joined ${room} as ${role}`);

      // Handle player joining with characters
      if (role === 'player' && characters && characters.length > 0) {
        // Load inventories and persisted HP from database for each character
        const charactersWithInventories = await Promise.all(
          characters.map(async (char: {
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
            spellSlots?: Record<number, number>;
            maxSpellSlots?: Record<number, number>;
            isWarlock?: boolean;
          }) => {
            const characterId = String(char.odNumber);
            const [inventory, persistedStatus] = await Promise.all([
              getCharacterInventory(characterId),
              getCharacterStatus(characterId, campaignId),
            ]);

            // Use persisted values if available, otherwise use client values
            const currentHp = persistedStatus.currentHp !== null ? persistedStatus.currentHp : char.currentHp;
            const tempHp = persistedStatus.tempHp !== null ? persistedStatus.tempHp : undefined;
            const conditions = persistedStatus.conditions !== null ? persistedStatus.conditions : (char.conditions || []);
            const conditionDurations = persistedStatus.conditionDurations !== null ? persistedStatus.conditionDurations : {};
            const exhaustionLevel = persistedStatus.exhaustionLevel !== null ? persistedStatus.exhaustionLevel : (char.exhaustionLevel || 0);
            const buffs = persistedStatus.buffs !== null ? persistedStatus.buffs : [];

            // Get spell slots from persisted status or use client-provided values
            const spellSlots = persistedStatus.spellSlots !== null ? persistedStatus.spellSlots : (char.spellSlots || char.maxSpellSlots || {});

            console.log(`[Socket.io] Loaded for ${char.name} (${char.odNumber}): HP=${currentHp}, tempHp=${tempHp}, conditions=${JSON.stringify(conditions)}, conditionDurations=${JSON.stringify(conditionDurations)}, exhaustion=${exhaustionLevel}, buffs=${JSON.stringify(buffs)}, spellSlots=${JSON.stringify(spellSlots)}, maxSpellSlots=${JSON.stringify(char.maxSpellSlots)}, isWarlock=${char.isWarlock}`);
            return {
              ...char,
              inventory,
              currentHp,
              tempHp,
              conditions,
              conditionDurations,
              exhaustionLevel,
              buffs,
              spellSlots,
              maxSpellSlots: char.maxSpellSlots,
              isWarlock: char.isWarlock,
            };
          })
        );

        const playerData: RedisConnectedPlayer = {
          socketId: socket.id,
          characters: charactersWithInventories
        };

        // Check if any character is already connected by an ACTIVE socket
        const existingPlayers = await getConnectedPlayers(campaignId);
        const newCharacterIds = new Set(charactersWithInventories.map((c) => String(c.odNumber)));

        for (const existingPlayer of existingPlayers) {
          // Skip if it's the same socket reconnecting
          if (existingPlayer.socketId === socket.id) continue;

          // Check if any character matches
          const conflictingChar = existingPlayer.characters.find(
            (c: { odNumber: string; name: string }) => newCharacterIds.has(String(c.odNumber))
          );

          if (conflictingChar) {
            // Check if the existing socket is still connected
            const existingSocket = io.sockets.sockets.get(existingPlayer.socketId);
            if (existingSocket?.connected) {
              // Reject the join - character already in use by active player
              console.log(`[Socket.io] Rejecting join: character "${conflictingChar.name}" already in use by ${existingPlayer.socketId}`);
              socket.emit('join-error', {
                message: `Le personnage "${conflictingChar.name}" est déjà utilisé par un autre joueur.`
              });
              return;
            } else {
              // Socket is dead, remove stale entry
              console.log(`[Socket.io] Removing stale player entry ${existingPlayer.socketId} (socket disconnected)`);
              await removeConnectedPlayer(campaignId, existingPlayer.socketId);
            }
          }
        }

        // Store in Redis
        await addConnectedPlayer(campaignId, playerData);

        const characterNames = charactersWithInventories.map(c => c.name).join(', ');
        console.log(`[Socket.io] Player with characters [${characterNames}] connected to campaign ${campaignId}`);

        // Notify everyone in room about new player (including sender for confirmation)
        io.to(room).emit('player-connected', { player: playerData });
        console.log(`[Socket.io] Emitted player-connected to room ${room}`);

        // Send current connected players list to the new player (from Redis)
        const allPlayers = await getConnectedPlayers(campaignId);
        console.log(`[Socket.io] Sending connected-players to new player ${socket.id}: ${allPlayers.length} players`);
        socket.emit('connected-players', { players: allPlayers });
      }

      // Notify others in the room
      socket.to(room).emit('user-joined', { role });

      // If player joins, request state sync from DM and send DM status
      if (role === 'player') {
        socket.to(room).emit('request-state-sync');
      }

      // If DM joins, send them the connected players list and restore combat state
      if (role === 'dm') {
        const allPlayers = await getConnectedPlayers(campaignId);

        // Collect all character IDs for batch query (reduces N+1 to single query)
        const allCharacterIds = allPlayers.flatMap(p =>
          p.characters.map((c: { odNumber: string | number }) => String(c.odNumber))
        );

        // Single batch query for all character statuses
        const statusMap = await getBatchCharacterStatus(allCharacterIds, campaignId);

        // Map results back to players
        const playersWithFreshStatus = allPlayers.map((player) => ({
          ...player,
          characters: player.characters.map((char: {
            odNumber: string | number;
            name: string;
            currentHp: number;
            tempHp?: number;
            conditions?: string[];
            conditionDurations?: Record<string, number>;
            exhaustionLevel?: number;
            buffs?: unknown[];
          }) => {
            const status = statusMap.get(String(char.odNumber));
            return {
              ...char,
              currentHp: status?.currentHp ?? char.currentHp,
              tempHp: status?.tempHp ?? char.tempHp,
              conditions: status?.conditions ?? char.conditions ?? [],
              conditionDurations: status?.conditionDurations ?? char.conditionDurations ?? {},
              exhaustionLevel: status?.exhaustionLevel ?? char.exhaustionLevel ?? 0,
              buffs: status?.buffs ?? char.buffs ?? [],
            };
          }),
        }));

        console.log(`[Socket.io] Sending connected-players to DM: ${playersWithFreshStatus.length} players`, playersWithFreshStatus.map(p => p.characters.map((c: { name: string }) => c.name).join(', ')));
        socket.emit('connected-players', { players: playersWithFreshStatus });

        // Restore combat state from Redis if available
        const combatState = await getCombatState(campaignId);
        if (combatState && combatState.combatActive) {
          console.log(`[Socket.io] Restoring combat state for DM in campaign ${campaignId}`);
          socket.emit('combat-update', {
            type: 'state-sync',
            combatActive: combatState.combatActive,
            currentTurn: combatState.currentTurn,
            roundNumber: combatState.roundNumber,
            participants: combatState.participants,
          });
        }
      }
    });

    // Leave campaign room
    socket.on('leave-campaign', async () => {
      if (socket.data.campaignId) {
        const campaignId = socket.data.campaignId;
        const room = `campaign-${campaignId}`;

        // Remove DM from Redis (explicit leave, not disconnect)
        if (socket.data.role === 'dm') {
          const currentDM = await getDmSession(campaignId);
          if (currentDM && currentDM.sessionToken === socket.data.dmSessionToken) {
            await deleteDmSession(campaignId);
            // Clear any pending disconnect timer
            const pendingTimer = disconnectTimers.get(campaignId);
            if (pendingTimer) {
              clearTimeout(pendingTimer);
              disconnectTimers.delete(campaignId);
            }
            // Notify players immediately (no grace period for explicit leave)
            io.to(room).emit('dm-disconnected', { timestamp: Date.now() });
            console.log(`[Socket.io] DM explicitly left campaign ${campaignId}`);
          }
        }

        // Remove player from Redis
        if (socket.data.role === 'player') {
          const player = await removeConnectedPlayer(campaignId, socket.id);
          if (player) {
            io.to(room).emit('player-disconnected', {
              socketId: socket.id,
            });
            const characterNames = player.characters.map(c => c.name).join(', ');
            console.log(`[Socket.io] Player with characters [${characterNames}] left campaign ${campaignId}`);
          }
        }

        socket.leave(room);
        socket.to(room).emit('user-left', { role: socket.data.role });
        console.log(`[Socket.io] ${socket.id} left ${room}`);
      }
    });

    // Request connected players list
    socket.on('request-connected-players', async (data?: { campaignId?: number }) => {
      const campaignId = data?.campaignId || socket.data.campaignId;
      if (campaignId) {
        const allPlayers = await getConnectedPlayers(campaignId);

        // Refresh player status from database (especially important for DM)
        const playersWithFreshStatus = await Promise.all(
          allPlayers.map(async (player) => ({
            ...player,
            characters: await Promise.all(
              player.characters.map(async (char: {
                odNumber: string | number;
                name: string;
                currentHp: number;
                tempHp?: number;
                conditions?: string[];
                conditionDurations?: Record<string, number>;
                exhaustionLevel?: number;
                buffs?: unknown[];
              }) => {
                const status = await getCharacterStatus(String(char.odNumber), campaignId);
                return {
                  ...char,
                  currentHp: status.currentHp ?? char.currentHp,
                  tempHp: status.tempHp ?? char.tempHp,
                  conditions: status.conditions ?? char.conditions ?? [],
                  conditionDurations: status.conditionDurations ?? char.conditionDurations ?? {},
                  exhaustionLevel: status.exhaustionLevel ?? char.exhaustionLevel ?? 0,
                  buffs: status.buffs ?? char.buffs ?? [],
                };
              })
            ),
          }))
        );

        console.log(`[Socket.io] request-connected-players from ${socket.id} for campaign ${campaignId}: ${playersWithFreshStatus.length} players`);
        socket.emit('connected-players', { players: playersWithFreshStatus });
      }
    });

    // Combat state updates (start, stop, next turn)
    socket.on('combat-update', async (data: CombatUpdateData) => {
      if (socket.data.campaignId) {
        const room = `campaign-${socket.data.campaignId}`;
        const campaignId = socket.data.campaignId;

        // Broadcast to all clients in room including sender
        io.to(room).emit('combat-update', data);
        console.log(`[Socket.io] Combat update in ${room}:`, data.type);

        // Persist combat state to Redis
        if (data.type === 'stop') {
          // Clear combat state on stop
          await deleteCombatState(campaignId);
          console.log(`[Socket.io] Combat state cleared for campaign ${campaignId}`);
        } else if (data.type === 'next-turn' && data.combatActive) {
          // Update turn/round in existing combat state
          const existingState = await getCombatState(campaignId);
          if (existingState) {
            await setCombatState(campaignId, {
              ...existingState,
              currentTurn: data.currentTurn,
              roundNumber: data.roundNumber || existingState.roundNumber,
              lastUpdate: Date.now(),
            });
            console.log(`[Socket.io] Combat turn updated for campaign ${campaignId}: turn=${data.currentTurn}, round=${data.roundNumber}`);
          }
        } else if (data.combatActive && data.participants) {
          // Save full combat state (start, state-sync)
          await setCombatState(campaignId, {
            combatActive: data.combatActive,
            currentTurn: data.currentTurn,
            roundNumber: data.roundNumber || 1,
            participants: data.participants,
            lastUpdate: Date.now(),
          });
          console.log(`[Socket.io] Combat state saved for campaign ${campaignId}`);
        }
      }
    });

    // HP changes
    socket.on('hp-change', async (data: HpChangeData) => {
      if (socket.data.campaignId) {
        const room = `campaign-${socket.data.campaignId}`;
        const campaignId = socket.data.campaignId;

        // Persist player HP changes to Redis for session persistence
        if (data.participantType === 'player') {
          await updateCharacterHp(campaignId, data.participantId, data.newHp, data.tempHp);
          console.log(`[Socket.io] Persisted HP for character ${data.participantId}: ${data.newHp}, tempHp: ${data.tempHp}`);
        }

        // Also update combat state participants HP so it persists across refreshes
        const combatState = await getCombatState(campaignId);
        if (combatState && combatState.participants) {
          const updatedParticipants = combatState.participants.map(p =>
            p.id === data.participantId
              ? { ...p, currentHp: data.newHp, tempHp: data.tempHp }
              : p
          );
          await setCombatState(campaignId, {
            ...combatState,
            participants: updatedParticipants,
          });
          console.log(`[Socket.io] Updated combat state HP for ${data.participantId}: ${data.newHp}, tempHp: ${data.tempHp}`);
        }

        // Broadcast to all clients in room
        io.to(room).emit('hp-change', data);
        console.log(`[Socket.io] HP change in ${room}:`, data);
      }
    });

    // Initiative changes
    socket.on('initiative-change', (data: InitiativeChangeData) => {
      if (socket.data.campaignId) {
        const room = `campaign-${socket.data.campaignId}`;
        io.to(room).emit('initiative-change', data);
        console.log(`[Socket.io] Initiative change in ${room}:`, data);
      }
    });

    // Monster added
    socket.on('monster-add', (data: MonsterAddData) => {
      if (socket.data.campaignId) {
        const room = `campaign-${socket.data.campaignId}`;
        socket.to(room).emit('monster-add', data);
        console.log(`[Socket.io] Monster added in ${room}`);
      }
    });

    // Monster removed
    socket.on('monster-remove', (data: MonsterRemoveData) => {
      if (socket.data.campaignId) {
        const room = `campaign-${socket.data.campaignId}`;
        socket.to(room).emit('monster-remove', data);
        console.log(`[Socket.io] Monster removed in ${room}`);
      }
    });

    // Full state sync (sent by DM to sync players)
    socket.on('state-sync', (data: StateSyncData) => {
      if (socket.data.campaignId && socket.data.role === 'dm') {
        const room = `campaign-${socket.data.campaignId}`;
        socket.to(room).emit('state-sync', data);
        console.log(`[Socket.io] State sync sent to ${room}`);
      }
    });

    // Condition changes
    socket.on('condition-change', async (data: ConditionChangeData) => {
      if (socket.data.campaignId) {
        const room = `campaign-${socket.data.campaignId}`;
        const campaignId = socket.data.campaignId;

        io.to(room).emit('condition-change', data);
        console.log(`[Socket.io] Condition change in ${room}:`, data.participantId);

        // Persist to Redis combat state (if combat is active)
        const combatState = await getCombatState(campaignId);
        if (combatState && combatState.participants) {
          const updatedParticipants = (combatState.participants as Array<{ id: string; type: string; conditions?: string[]; conditionDurations?: Record<string, number> }>).map(p =>
            p.id === data.participantId && p.type === data.participantType
              ? { ...p, conditions: data.conditions, conditionDurations: data.conditionDurations }
              : p
          );
          await setCombatState(campaignId, {
            ...combatState,
            participants: updatedParticipants,
          });
          console.log(`[Socket.io] Persisted conditions to combat state for ${data.participantId}`);
        }

        // Also update connected player data in Redis (for out-of-combat state)
        if (data.participantType === 'player') {
          const players = await getConnectedPlayers(campaignId);
          for (const player of players) {
            let updated = false;
            for (const char of player.characters) {
              if (String(char.odNumber) === data.participantId) {
                char.conditions = data.conditions || [];
                char.conditionDurations = data.conditionDurations;
                updated = true;
                break;
              }
            }
            if (updated) {
              await addConnectedPlayer(campaignId, player);
              console.log(`[Socket.io] Persisted conditions to connected player for ${data.participantId}`);
              break;
            }
          }
        }
      }
    });

    // Exhaustion changes
    socket.on('exhaustion-change', async (data: ExhaustionChangeData) => {
      if (socket.data.campaignId) {
        const room = `campaign-${socket.data.campaignId}`;
        const campaignId = socket.data.campaignId;

        io.to(room).emit('exhaustion-change', data);
        console.log(`[Socket.io] Exhaustion change in ${room}:`, data.participantId);

        // Persist to Redis combat state (if combat is active)
        const combatState = await getCombatState(campaignId);
        if (combatState && combatState.participants) {
          const updatedParticipants = (combatState.participants as Array<{ id: string; type: string; exhaustionLevel?: number }>).map(p =>
            p.id === data.participantId && p.type === data.participantType
              ? { ...p, exhaustionLevel: data.exhaustionLevel }
              : p
          );
          await setCombatState(campaignId, {
            ...combatState,
            participants: updatedParticipants,
          });
          console.log(`[Socket.io] Persisted exhaustion to combat state for ${data.participantId}: ${data.exhaustionLevel}`);
        }

        // Also update connected player data in Redis (for out-of-combat state)
        if (data.participantType === 'player') {
          const players = await getConnectedPlayers(campaignId);
          for (const player of players) {
            let updated = false;
            for (const char of player.characters) {
              if (String(char.odNumber) === data.participantId) {
                char.exhaustionLevel = data.exhaustionLevel;
                updated = true;
                break;
              }
            }
            if (updated) {
              await addConnectedPlayer(campaignId, player);
              console.log(`[Socket.io] Persisted exhaustion to connected player for ${data.participantId}`);
              break;
            }
          }
        }
      }
    });

    // Buff changes
    socket.on('buff-change', async (data: BuffChangeData) => {
      if (socket.data.campaignId) {
        const room = `campaign-${socket.data.campaignId}`;
        const campaignId = socket.data.campaignId;

        io.to(room).emit('buff-change', data);
        console.log(`[Socket.io] Buff change in ${room}:`, data.participantId);

        // Persist to Redis combat state (if combat is active)
        const combatState = await getCombatState(campaignId);
        if (combatState && combatState.participants) {
          const updatedParticipants = (combatState.participants as Array<{ id: string; type: string; buffs?: import('@/lib/types').ActiveBuff[] }>).map(p =>
            p.id === data.participantId && p.type === data.participantType
              ? { ...p, buffs: data.buffs }
              : p
          );
          await setCombatState(campaignId, {
            ...combatState,
            participants: updatedParticipants,
          });
          console.log(`[Socket.io] Persisted buffs to combat state for ${data.participantId}`);
        }

        // Also update connected player data in Redis (for out-of-combat state)
        if (data.participantType === 'player') {
          const players = await getConnectedPlayers(campaignId);
          for (const player of players) {
            let updated = false;
            for (const char of player.characters) {
              if (String(char.odNumber) === data.participantId) {
                char.buffs = data.buffs;
                updated = true;
                break;
              }
            }
            if (updated) {
              await addConnectedPlayer(campaignId, player);
              console.log(`[Socket.io] Persisted buffs to connected player for ${data.participantId}`);
              break;
            }
          }
        }
      }
    });

    // Death saving throw changes
    socket.on('death-save-change', (data: DeathSaveChangeData) => {
      if (socket.data.campaignId) {
        const room = `campaign-${socket.data.campaignId}`;
        io.to(room).emit('death-save-change', data);
        console.log(`[Socket.io] Death save change in ${room}:`, data.participantId);
      }
    });

    // Inventory update
    socket.on('inventory-update', async (data: InventoryUpdateData) => {
      if (socket.data.campaignId) {
        const room = `campaign-${socket.data.campaignId}`;
        const campaignId = socket.data.campaignId;

        // Persist inventory to Redis so reconnecting players get updated data
        try {
          await updateCharacterInventory(campaignId, data.participantId, data.inventory);
          console.log(`[Socket.io] Persisted inventory to Redis for character ${data.participantId}`);
        } catch (error) {
          console.error(`[Socket.io] Failed to persist inventory to Redis:`, error);
        }

        // Broadcast to room (all clients in the campaign)
        io.to(room).emit('inventory-update', data);
        console.log(`[Socket.io] Inventory update in ${room}:`, data.participantId, 'by', data.source);
      }
    });

    // Spell slot changes
    socket.on('spell-slot-change', (data: SpellSlotChangeData) => {
      if (socket.data.campaignId) {
        const room = `campaign-${socket.data.campaignId}`;
        // Broadcast to all clients in room
        io.to(room).emit('spell-slot-change', data);
        console.log(`[Socket.io] Spell slot change in ${room}:`, data.participantId, 'by', data.source);
      }
    });

    // Prepared spells changes
    socket.on('prepared-spells-change', (data: PreparedSpellsChangeData) => {
      if (socket.data.campaignId) {
        const room = `campaign-${socket.data.campaignId}`;
        // Broadcast to all clients in room
        io.to(room).emit('prepared-spells-change', data);
        console.log(`[Socket.io] Prepared spells change in ${room}:`, data.participantId, 'by', data.source);
      }
    });

    // Concentration check request (player took damage while concentrating, notify DM)
    socket.on('concentration-check-request', (data: { participantId: string; participantName: string; participantType: 'player' | 'monster'; damage: number; dc: number }) => {
      if (socket.data.campaignId && socket.data.role === 'player') {
        const room = `campaign-${socket.data.campaignId}`;
        // Relay to DM (and other clients in the room)
        socket.to(room).emit('concentration-check-request', data);
        console.log(`[Socket.io] Concentration check request for ${data.participantName} (DD ${data.dc}) in ${room}`);
      }
    });

    // ============ LOOT DISTRIBUTION EVENTS ============

    // Create loot session (DM only)
    socket.on('loot-create-session', (data: {
      campaignId: number;
      currency?: LootCurrency;
      items?: Array<{
        name: string;
        description?: string;
        itemType: LootItemType;
        rarity?: LootItemRarity;
        quantity?: number;
        isIdentified?: boolean;
        estimatedValueGp?: number;
        catalogNotionId?: string;
      }>;
      claimingDeadlineMinutes?: number;
    }) => {
      console.log(`[Loot] Create session request from ${socket.id}, role: ${socket.data.role}`);
      if (socket.data.role !== 'dm') {
        console.log(`[Loot] Rejected: not a DM`);
        return;
      }
      const campaignId = data.campaignId;
      const room = `campaign-${campaignId}`;

      // Check for existing session
      if (activeLootSessions.has(campaignId)) {
        socket.emit('loot-error', {
          sessionId: '',
          error: 'Une session de butin est déjà active',
          code: 'SESSION_EXISTS'
        });
        return;
      }

      const sessionId = generateId();
      const now = new Date();

      // Create items from initial data
      const items: LootItem[] = (data.items || []).map(item => ({
        id: generateId(),
        sessionId,
        name: item.name,
        description: item.description,
        itemType: item.itemType,
        rarity: item.rarity || 'common',
        quantity: item.quantity || 1,
        isIdentified: item.isIdentified !== false,
        estimatedValueGp: item.estimatedValueGp,
        catalogNotionId: item.catalogNotionId,
        status: 'unclaimed' as LootItemStatus,
        claims: [],
        createdAt: now,
      }));

      const session: LootSession = {
        id: sessionId,
        campaignId,
        status: 'claiming',
        currency: data.currency || { platinum: 0, gold: 0, electrum: 0, silver: 0, copper: 0 },
        currencySplitMethod: 'equal',
        claimingDeadline: data.claimingDeadlineMinutes
          ? new Date(now.getTime() + data.claimingDeadlineMinutes * 60 * 1000)
          : undefined,
        createdAt: now,
        items,
      };

      activeLootSessions.set(campaignId, session);
      io.to(room).emit('loot-session-update', { session });
      console.log(`[Loot] Session created for campaign ${campaignId}: ${sessionId}`);
    });

    // Add item to loot session (DM only)
    socket.on('loot-add-item', (data: {
      sessionId: string;
      name: string;
      description?: string;
      itemType: LootItemType;
      rarity?: LootItemRarity;
      quantity?: number;
      isIdentified?: boolean;
      estimatedValueGp?: number;
      catalogNotionId?: string;
      linkedSpell?: { id: number; name: string; level: number };
      resistanceType?: string;
    }) => {
      if (socket.data.role !== 'dm' || !socket.data.campaignId) return;
      const campaignId = socket.data.campaignId;
      const room = `campaign-${campaignId}`;
      const session = activeLootSessions.get(campaignId);

      if (!session || session.id !== data.sessionId) {
        socket.emit('loot-error', { sessionId: data.sessionId, error: 'Session introuvable', code: 'SESSION_NOT_FOUND' });
        return;
      }

      const newItem: LootItem = {
        id: generateId(),
        sessionId: session.id,
        name: data.name,
        description: data.description,
        itemType: data.itemType,
        rarity: data.rarity || 'common',
        quantity: data.quantity || 1,
        isIdentified: data.isIdentified !== false,
        estimatedValueGp: data.estimatedValueGp,
        catalogNotionId: data.catalogNotionId,
        status: 'unclaimed',
        claims: [],
        createdAt: new Date(),
        linkedSpell: data.linkedSpell,
        resistanceType: data.resistanceType,
      };

      session.items.push(newItem);
      io.to(room).emit('loot-item-add', { sessionId: session.id, item: newItem });
      console.log(`[Loot] Item added: ${newItem.name}${data.linkedSpell ? ` (spell: ${data.linkedSpell.name})` : ''}${data.resistanceType ? ` (${data.resistanceType})` : ''}`);
    });

    // Claim item (player)
    socket.on('loot-claim-item', (data: {
      sessionId: string;
      itemId: string;
      characterId: string;
      characterName: string;
      priority: 1 | 2 | 3;
      note?: string;
    }) => {
      if (!socket.data.campaignId) return;
      const campaignId = socket.data.campaignId;
      const room = `campaign-${campaignId}`;
      const session = activeLootSessions.get(campaignId);

      if (!session || session.id !== data.sessionId || session.status !== 'claiming') {
        socket.emit('loot-error', { sessionId: data.sessionId, error: 'Session introuvable ou fermée', code: 'INVALID_SESSION' });
        return;
      }

      const item = session.items.find(i => i.id === data.itemId);
      if (!item) {
        socket.emit('loot-error', { sessionId: data.sessionId, error: 'Objet introuvable', code: 'ITEM_NOT_FOUND' });
        return;
      }

      // Check if character already claimed
      const existingClaimIndex = item.claims.findIndex(c => c.characterId === data.characterId);
      const now = new Date();

      if (existingClaimIndex >= 0) {
        // Update existing claim
        item.claims[existingClaimIndex].priority = data.priority;
        item.claims[existingClaimIndex].note = data.note;
        item.claims[existingClaimIndex].updatedAt = now;
      } else {
        // Add new claim
        const claim: LootClaim = {
          id: generateId(),
          itemId: item.id,
          characterId: data.characterId,
          characterName: data.characterName,
          priority: data.priority,
          note: data.note,
          createdAt: now,
          updatedAt: now,
        };
        item.claims.push(claim);
      }

      // Recalculate status
      item.status = calculateItemStatus(item);

      const claim = item.claims.find(c => c.characterId === data.characterId)!;
      io.to(room).emit('loot-claim', { sessionId: session.id, itemId: item.id, claim });
      console.log(`[Loot] Claim: ${data.characterName} -> ${item.name} (priority ${data.priority})`);
    });

    // Unclaim item (player)
    socket.on('loot-unclaim-item', (data: { sessionId: string; itemId: string; characterId: string }) => {
      if (!socket.data.campaignId) return;
      const campaignId = socket.data.campaignId;
      const room = `campaign-${campaignId}`;
      const session = activeLootSessions.get(campaignId);

      if (!session || session.id !== data.sessionId) return;

      const item = session.items.find(i => i.id === data.itemId);
      if (!item) return;

      item.claims = item.claims.filter(c => c.characterId !== data.characterId);
      item.status = calculateItemStatus(item);

      io.to(room).emit('loot-unclaim', { sessionId: session.id, itemId: item.id, characterId: data.characterId });
      console.log(`[Loot] Unclaim: ${data.characterId} from ${item.name}`);
    });

    // Assign item to character (DM only)
    socket.on('loot-assign-item', (data: {
      sessionId: string;
      itemId: string;
      characterId: string;
      characterName: string;
      quantity?: number;
    }) => {
      if (socket.data.role !== 'dm' || !socket.data.campaignId) return;
      const campaignId = socket.data.campaignId;
      const room = `campaign-${campaignId}`;
      const session = activeLootSessions.get(campaignId);

      if (!session || session.id !== data.sessionId) return;

      const item = session.items.find(i => i.id === data.itemId);
      if (!item) return;

      // Handle partial assignment (splitting stacks)
      const assignQty = data.quantity ?? item.quantity;
      if (assignQty < item.quantity) {
        // Create a new item with remaining quantity
        const remainingQty = item.quantity - assignQty;
        const remainingItem: LootItem = {
          id: generateId(),
          sessionId: session.id,
          name: item.name,
          description: item.description,
          itemType: item.itemType,
          rarity: item.rarity,
          quantity: remainingQty,
          isIdentified: item.isIdentified,
          estimatedValueGp: item.estimatedValueGp,
          catalogNotionId: item.catalogNotionId,
          status: 'unclaimed',
          claims: [],
          createdAt: new Date(),
          linkedSpell: item.linkedSpell,
          resistanceType: item.resistanceType,
        };
        session.items.push(remainingItem);
        io.to(room).emit('loot-item-add', { sessionId: session.id, item: remainingItem });
        console.log(`[Loot] Split: ${remainingQty}x ${item.name} remaining in pool`);

        // Update original item quantity
        item.quantity = assignQty;
      }

      // Check if this character already has the same item assigned (stack them)
      const existingAssigned = session.items.find(i =>
        i.id !== item.id &&
        i.assignedTo === data.characterId &&
        i.status === 'assigned' &&
        i.name === item.name &&
        i.catalogNotionId === item.catalogNotionId &&
        // For scrolls, must have same linked spell
        ((!i.linkedSpell && !item.linkedSpell) ||
          (i.linkedSpell?.id === item.linkedSpell?.id)) &&
        // For resistance potions, must have same resistance type
        i.resistanceType === item.resistanceType
      );

      if (existingAssigned) {
        // Stack: add quantity to existing assigned item
        existingAssigned.quantity += assignQty;
        io.to(room).emit('loot-item-update', { sessionId: session.id, item: existingAssigned });
        console.log(`[Loot] Stacked: +${assignQty}x ${item.name} -> ${data.characterName} (now ${existingAssigned.quantity}x)`);

        // Remove the current item from the session
        const itemIndex = session.items.findIndex(i => i.id === item.id);
        if (itemIndex !== -1) {
          session.items.splice(itemIndex, 1);
          io.to(room).emit('loot-item-remove', { sessionId: session.id, itemId: item.id });
        }
      } else {
        // No existing stack, assign normally
        item.assignedTo = data.characterId;
        item.assignedToName = data.characterName;
        item.status = 'assigned';
        item.resolvedAt = new Date();

        io.to(room).emit('loot-assign', {
          sessionId: session.id,
          itemId: item.id,
          characterId: data.characterId,
          characterName: data.characterName,
        });
        // Also emit item-update to reflect quantity change if split occurred
        io.to(room).emit('loot-item-update', { sessionId: session.id, item });
        console.log(`[Loot] Assigned: ${item.quantity}x ${item.name} -> ${data.characterName}`);
      }
    });

    // Send item to treasury (DM only)
    socket.on('loot-to-treasury-item', (data: { sessionId: string; itemId: string }) => {
      if (socket.data.role !== 'dm' || !socket.data.campaignId) return;
      const campaignId = socket.data.campaignId;
      const room = `campaign-${campaignId}`;
      const session = activeLootSessions.get(campaignId);

      if (!session || session.id !== data.sessionId) return;

      const item = session.items.find(i => i.id === data.itemId);
      if (!item) return;

      item.status = 'treasury';
      item.resolvedAt = new Date();

      io.to(room).emit('loot-to-treasury', { sessionId: session.id, itemId: item.id });
      console.log(`[Loot] To treasury: ${item.name}`);
    });

    // Unassign item (DM only) - revert an assigned item back to unclaimed
    socket.on('loot-unassign-item', (data: { sessionId: string; itemId: string }) => {
      if (socket.data.role !== 'dm' || !socket.data.campaignId) return;
      const campaignId = socket.data.campaignId;
      const room = `campaign-${campaignId}`;
      const session = activeLootSessions.get(campaignId);

      if (!session || session.id !== data.sessionId) return;

      const item = session.items.find(i => i.id === data.itemId);
      if (!item) return;

      // Only allow unassigning if item is currently assigned (not treasury/sold)
      if (item.status !== 'assigned') return;

      const previousOwner = item.assignedToName;

      // Check if there's an existing unclaimed item we can stack with
      const existingUnclaimed = session.items.find(i =>
        i.id !== item.id &&
        i.status === 'unclaimed' &&
        i.name === item.name &&
        i.catalogNotionId === item.catalogNotionId &&
        // For scrolls, must have same linked spell
        ((!i.linkedSpell && !item.linkedSpell) ||
          (i.linkedSpell?.id === item.linkedSpell?.id)) &&
        // For resistance potions, must have same resistance type
        i.resistanceType === item.resistanceType
      );

      if (existingUnclaimed) {
        // Stack: add quantity to existing unclaimed item
        existingUnclaimed.quantity += item.quantity;
        io.to(room).emit('loot-item-update', { sessionId: session.id, item: existingUnclaimed });
        console.log(`[Loot] Stacked unassigned: +${item.quantity}x ${item.name} (now ${existingUnclaimed.quantity}x unclaimed)`);

        // Remove the unassigned item from the session
        const itemIndex = session.items.findIndex(i => i.id === item.id);
        if (itemIndex !== -1) {
          session.items.splice(itemIndex, 1);
          io.to(room).emit('loot-item-remove', { sessionId: session.id, itemId: item.id });
        }
      } else {
        // No existing stack, just mark as unclaimed
        item.status = 'unclaimed';
        item.assignedTo = undefined;
        item.assignedToName = undefined;
        item.resolvedAt = undefined;
        // Keep claims in case DM wants to reassign to same claimants

        io.to(room).emit('loot-unassign', { sessionId: session.id, itemId: item.id });
        console.log(`[Loot] Unassigned: ${item.name} (was: ${previousOwner})`);
      }
    });

    // Trigger roll-off for contested item (DM only)
    socket.on('loot-trigger-rolloff', (data: { sessionId: string; itemId: string }) => {
      if (socket.data.role !== 'dm' || !socket.data.campaignId) return;
      const campaignId = socket.data.campaignId;
      const room = `campaign-${campaignId}`;
      const session = activeLootSessions.get(campaignId);

      if (!session || session.id !== data.sessionId) return;

      const item = session.items.find(i => i.id === data.itemId);
      if (!item || item.claims.length < 2) return;

      // Get highest priority claims
      const maxPriority = Math.max(...item.claims.map(c => c.priority));
      const topClaims = item.claims.filter(c => c.priority === maxPriority);

      // If only one at top priority, auto-assign
      if (topClaims.length === 1) {
        item.assignedTo = topClaims[0].characterId;
        item.assignedToName = topClaims[0].characterName;
        item.status = 'assigned';
        item.resolvedAt = new Date();
        io.to(room).emit('loot-assign', {
          sessionId: session.id,
          itemId: item.id,
          characterId: topClaims[0].characterId,
          characterName: topClaims[0].characterName,
        });
        return;
      }

      // Perform roll-off
      const rolls = topClaims.map(claim => ({
        characterId: claim.characterId,
        characterName: claim.characterName,
        roll: Math.floor(Math.random() * 20) + 1, // d20 roll
      }));

      // Find winner (highest roll, first in case of tie)
      rolls.sort((a, b) => b.roll - a.roll);
      const winner = rolls[0];

      // Assign to winner
      item.assignedTo = winner.characterId;
      item.assignedToName = winner.characterName;
      item.status = 'assigned';
      item.resolvedAt = new Date();

      // Notify room of roll-off start
      io.to(room).emit('loot-rolloff-start', {
        sessionId: session.id,
        itemId: item.id,
        itemName: item.name,
        participants: topClaims.map(c => ({ characterId: c.characterId, characterName: c.characterName })),
      });

      // After a short delay, send result
      setTimeout(() => {
        io.to(room).emit('loot-rolloff-result', {
          sessionId: session.id,
          result: {
            itemId: item.id,
            itemName: item.name,
            rolls,
            winnerId: winner.characterId,
            winnerName: winner.characterName,
          },
        });
        io.to(room).emit('loot-assign', {
          sessionId: session.id,
          itemId: item.id,
          characterId: winner.characterId,
          characterName: winner.characterName,
        });
        console.log(`[Loot] Roll-off: ${item.name} -> ${winner.characterName} (rolled ${winner.roll})`);
      }, 2000); // 2 second delay for animation
    });

    // Update currency (DM only)
    socket.on('loot-update-currency', (data: {
      sessionId: string;
      currency: LootCurrency;
      splitMethod?: CurrencySplitMethod;
    }) => {
      if (socket.data.role !== 'dm' || !socket.data.campaignId) return;
      const campaignId = socket.data.campaignId;
      const room = `campaign-${campaignId}`;
      const session = activeLootSessions.get(campaignId);

      if (!session || session.id !== data.sessionId) return;

      session.currency = data.currency;
      if (data.splitMethod) {
        session.currencySplitMethod = data.splitMethod;
      }

      io.to(room).emit('loot-currency-update', {
        sessionId: session.id,
        currency: session.currency,
        splitMethod: session.currencySplitMethod,
      });
      console.log(`[Loot] Currency updated: ${data.currency.gold}gp ${data.currency.silver}sp ${data.currency.copper}cp`);
    });

    // Finalize loot session (DM only)
    socket.on('loot-finalize', async (data: { sessionId: string }) => {
      if (socket.data.role !== 'dm' || !socket.data.campaignId) return;
      const campaignId = socket.data.campaignId;
      const room = `campaign-${campaignId}`;
      const session = activeLootSessions.get(campaignId);

      if (!session || session.id !== data.sessionId) return;

      // Auto-assign single claims
      session.items.forEach(item => {
        if (item.status === 'unclaimed' && item.claims.length === 1) {
          item.assignedTo = item.claims[0].characterId;
          item.assignedToName = item.claims[0].characterName;
          item.status = 'assigned';
          item.resolvedAt = new Date();
        }
      });

      // Build distribution map
      const distributionMap = new Map<string, LootDistribution>();

      // Get connected players to know who should receive currency
      const connectedPlayersForCurrency = await getConnectedPlayers(campaignId);
      const hasCurrency = (
        session.currency.platinum > 0 ||
        session.currency.gold > 0 ||
        session.currency.electrum > 0 ||
        session.currency.silver > 0 ||
        session.currency.copper > 0
      );

      // If there's currency to split and we're using equal split, pre-populate distribution map
      // with all connected characters so they receive their share
      if (session.currencySplitMethod === 'equal' && hasCurrency) {
        for (const player of connectedPlayersForCurrency) {
          for (const char of player.characters) {
            const charId = String(char.odNumber);
            if (!distributionMap.has(charId)) {
              distributionMap.set(charId, {
                id: generateId(),
                sessionId: session.id,
                characterId: charId,
                characterName: char.name,
                currency: { platinum: 0, gold: 0, electrum: 0, silver: 0, copper: 0 },
                items: [],
              });
            }
          }
        }
      }

      // Distribute items
      session.items.forEach(item => {
        if (item.status === 'assigned' && item.assignedTo && item.assignedToName) {
          if (!distributionMap.has(item.assignedTo)) {
            distributionMap.set(item.assignedTo, {
              id: generateId(),
              sessionId: session.id,
              characterId: item.assignedTo,
              characterName: item.assignedToName,
              currency: { platinum: 0, gold: 0, electrum: 0, silver: 0, copper: 0 },
              items: [],
            });
          }
          const dist = distributionMap.get(item.assignedTo)!;
          dist.items.push({
            itemId: item.id,
            name: item.name,
            quantity: item.quantity,
            rarity: item.rarity,
          });
        }
      });

      // Split currency (if equal split)
      // D&D 5e rates: 1pp = 1000cp, 1gp = 100cp, 1ep = 50cp, 1sp = 10cp
      if (session.currencySplitMethod === 'equal' && distributionMap.size > 0 && hasCurrency) {
        const totalCopper = (
          (session.currency.platinum * 1000) +
          (session.currency.gold * 100) +
          (session.currency.electrum * 50) +
          (session.currency.silver * 10) +
          session.currency.copper
        );
        const perPersonCopper = Math.floor(totalCopper / distributionMap.size);

        distributionMap.forEach(dist => {
          const pp = Math.floor(perPersonCopper / 1000);
          const remainingAfterPp = perPersonCopper % 1000;
          const gp = Math.floor(remainingAfterPp / 100);
          const remainingAfterGp = remainingAfterPp % 100;
          const sp = Math.floor(remainingAfterGp / 10);
          const cp = remainingAfterGp % 10;

          dist.currency = {
            platinum: pp,
            gold: gp,
            electrum: 0, // Skip electrum in auto-split
            silver: sp,
            copper: cp,
          };
        });
      }

      const distributions = Array.from(distributionMap.values());

      // === ADD ITEMS TO CHARACTER INVENTORIES ===
      try {
        const connectedPlayers = await getConnectedPlayers(campaignId);

        for (const distribution of distributions) {
          // Find the character in connected players
          let targetPlayer: RedisConnectedPlayer | undefined;
          let targetCharacter: RedisConnectedPlayer['characters'][0] | undefined;

          for (const player of connectedPlayers) {
            const char = player.characters.find(c => String(c.odNumber) === distribution.characterId);
            if (char) {
              targetPlayer = player;
              targetCharacter = char;
              break;
            }
          }

          if (!targetPlayer || !targetCharacter) {
            console.log(`[Loot] Character ${distribution.characterId} not found in connected players`);
            continue;
          }

          // Get current inventory or create default
          const currentInventory = targetCharacter.inventory || {
            equipment: [],
            consumables: [],
            currency: { platinum: 0, gold: 0, electrum: 0, silver: 0, copper: 0 },
            items: [],
          };

          // Add currency (all D&D 5e denominations)
          currentInventory.currency.platinum += distribution.currency.platinum;
          currentInventory.currency.gold += distribution.currency.gold;
          currentInventory.currency.electrum += distribution.currency.electrum;
          currentInventory.currency.silver += distribution.currency.silver;
          currentInventory.currency.copper += distribution.currency.copper;

          // Add items based on type
          for (const distItem of distribution.items) {
            const lootItem = session.items.find(i => i.id === distItem.itemId);
            if (!lootItem) continue;

            const newItemId = generateId();
            const itemData = {
              id: newItemId,
              name: distItem.name,
              description: lootItem.description,
              rarity: distItem.rarity,
              catalogNotionId: lootItem.catalogNotionId,
            };

            // Route to appropriate inventory category
            if (lootItem.itemType === 'weapon' || lootItem.itemType === 'armor' || lootItem.itemType === 'wondrous') {
              // Equipment items
              currentInventory.equipment.push({
                ...itemData,
                equipped: false,
                requiresAttunement: false,
              });
            } else if (lootItem.itemType === 'potion' || lootItem.itemType === 'scroll') {
              // Consumables - check if already exists and add quantity
              // For scrolls, also match by linkedSpell; for resistance potions, match by resistanceType
              const existing = currentInventory.consumables.find(c => {
                if (c.name !== distItem.name || c.catalogNotionId !== lootItem.catalogNotionId) return false;
                // Scrolls with different spells are different items
                if (lootItem.linkedSpell && c.linkedSpell) {
                  return c.linkedSpell.id === lootItem.linkedSpell.id;
                }
                // Resistance potions with different types are different items
                if (lootItem.resistanceType && c.resistanceType) {
                  return c.resistanceType === lootItem.resistanceType;
                }
                return true;
              });
              if (existing) {
                existing.quantity += distItem.quantity;
              } else {
                currentInventory.consumables.push({
                  ...itemData,
                  quantity: distItem.quantity,
                  linkedSpell: lootItem.linkedSpell,
                  resistanceType: lootItem.resistanceType,
                });
              }
            } else {
              // Misc items
              const existing = currentInventory.items.find(
                i => i.name === distItem.name && i.catalogNotionId === lootItem.catalogNotionId
              );
              if (existing) {
                existing.quantity += distItem.quantity;
              } else {
                currentInventory.items.push({
                  ...itemData,
                  quantity: distItem.quantity,
                });
              }
            }
          }

          // Update Redis (temporary cache)
          await updateCharacterInventory(campaignId, distribution.characterId, currentInventory);

          // Persist to PostgreSQL (permanent storage)
          await saveCharacterInventory(distribution.characterId, campaignId, currentInventory);

          // Broadcast inventory update
          io.to(room).emit('inventory-update', {
            participantId: distribution.characterId,
            inventory: currentInventory,
            source: 'loot-finalization',
          });

          console.log(`[Loot] Updated and persisted inventory for ${distribution.characterName}: +${distribution.currency.gold}gp, ${distribution.items.length} items`);
        }
      } catch (error) {
        console.error('[Loot] Error updating inventories:', error);
      }

      session.status = 'completed';
      session.completedAt = new Date();

      io.to(room).emit('loot-finalized', { sessionId: session.id, distributions });
      console.log(`[Loot] Session finalized: ${distributions.length} distributions`);

      // Clean up immediately - items are already distributed to inventories
      activeLootSessions.delete(campaignId);
      console.log(`[Loot] Session cleaned up for campaign ${campaignId}`);
    });

    // Cancel loot session (DM only)
    socket.on('loot-cancel', (data: { sessionId: string }) => {
      if (socket.data.role !== 'dm' || !socket.data.campaignId) return;
      const campaignId = socket.data.campaignId;
      const room = `campaign-${campaignId}`;
      const session = activeLootSessions.get(campaignId);

      if (!session || session.id !== data.sessionId) return;

      session.status = 'cancelled';
      activeLootSessions.delete(campaignId);

      io.to(room).emit('loot-cancelled');
      console.log(`[Loot] Session cancelled for campaign ${campaignId}`);
    });

    // Request current loot session
    socket.on('loot-request-session', (data: { campaignId: number }) => {
      console.log(`[Loot] Session requested by ${socket.id} for campaign ${data.campaignId}`);
      const session = activeLootSessions.get(data.campaignId);
      if (session) {
        socket.emit('loot-session-update', { session });
        console.log(`[Loot] Session sent to ${socket.id} (${session.items.length} items)`);
      } else {
        console.log(`[Loot] No active session for campaign ${data.campaignId}`);
      }
    });

    // Notification broadcast (sent to all other clients in the room)
    socket.on('notification', (data: NotificationData) => {
      if (socket.data.campaignId) {
        const room = `campaign-${socket.data.campaignId}`;
        socket.to(room).emit('notification', data);
        console.log(`[Socket.io] Notification sent to ${room}:`, data.message);
      }
    });

    // Ambient effect changes (DM only, broadcast to players)
    socket.on('ambient-effect', (data: AmbientEffectData) => {
      if (socket.data.campaignId && socket.data.role === 'dm') {
        const room = `campaign-${socket.data.campaignId}`;
        // Broadcast to all other clients in room (players)
        socket.to(room).emit('ambient-effect', data);
        console.log(`[Socket.io] Ambient effect changed in ${room}:`, data.effect);
      }
    });

    // Player positions update (DM only, broadcast to all including DM)
    socket.on('player-positions', (data: PlayerPositionsData) => {
      if (socket.data.campaignId && socket.data.role === 'dm') {
        const room = `campaign-${socket.data.campaignId}`;
        // Broadcast to all clients in room (including sender for confirmation)
        io.to(room).emit('player-positions', data);
        console.log(`[Socket.io] Player positions updated in ${room}:`, data.positions.length, 'players');
      }
    });

    // Request player positions (player joining map page)
    socket.on('request-player-positions', (data?: { campaignId?: number }) => {
      const campaignId = data?.campaignId || socket.data.campaignId;
      if (campaignId) {
        const room = `campaign-${campaignId}`;
        // Ask DM to send current positions
        socket.to(room).emit('request-player-positions');
        console.log(`[Socket.io] Player positions requested in ${room} by ${socket.id}`);
      }
    });

    // Disconnect handling
    socket.on('disconnect', async () => {
      if (socket.data.campaignId) {
        const campaignId = socket.data.campaignId;
        const room = `campaign-${campaignId}`;

        // Handle DM disconnect (immediate cleanup)
        if (socket.data.role === 'dm') {
          const currentDM = await getDmSession(campaignId);
          // Only process if this socket's token matches (prevents race condition)
          if (currentDM && currentDM.sessionToken === socket.data.dmSessionToken) {
            await deleteDmSession(campaignId);
            console.log(`[Socket.io] DM disconnected from campaign ${campaignId}`);
          }
        }

        // Handle player disconnect
        if (socket.data.role === 'player') {
          const player = await removeConnectedPlayer(campaignId, socket.id);
          if (player) {
            io.to(room).emit('player-disconnected', {
              socketId: socket.id,
            });
            const characterNames = player.characters.map(c => c.name).join(', ');
            console.log(`[Socket.io] Player with characters [${characterNames}] disconnected from campaign ${campaignId}`);
          }
        }

        socket.to(room).emit('user-left', { role: socket.data.role });
      }
      console.log(`[Socket.io] Client disconnected: ${socket.id}`);
    });
  });

  server.listen(port, () => {
    console.log(`> Ready on http://${hostname}:${port}`);
    console.log(`> Socket.io server running on /api/socketio`);
  });
});
