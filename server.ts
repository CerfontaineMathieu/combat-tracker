import { createServer } from 'http';
import { parse } from 'url';
import next from 'next';
import { Server as SocketServer, Socket } from 'socket.io';
import 'dotenv/config';
import { getDmPassword, getCharacterInventory } from './lib/db';
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

// Grace period before notifying players of DM disconnect (ms)
// 30 seconds to handle page refreshes (especially in dev mode with recompilation)
const DM_DISCONNECT_GRACE_PERIOD = 30000; // 30 seconds

// Store disconnect timers locally (not in Redis - they're ephemeral)
const disconnectTimers = new Map<number, NodeJS.Timeout>();

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

interface AmbientEffectData {
  effect: 'none' | 'rain' | 'fog' | 'fire' | 'snow' | 'sandstorm';
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

        // Check if there's a pending disconnect timer (DM is reconnecting)
        const pendingTimer = disconnectTimers.get(campaignId);

        if (existingDM && existingDM.socketId !== socket.id) {
          // Check if the existing DM socket is still actually connected
          const existingSocket = io.sockets.sockets.get(existingDM.socketId);
          const isStaleSession = !existingSocket || !existingSocket.connected;

          if (pendingTimer) {
            // DM is reconnecting within grace period - clear timer
            clearTimeout(pendingTimer);
            disconnectTimers.delete(campaignId);
            console.log(`[Socket.io] DM reconnecting within grace period for campaign ${campaignId}`);

            // Notify players that DM is back
            io.to(room).emit('dm-reconnected');
          } else if (isStaleSession) {
            // Stale session (server restarted or socket died) - allow takeover
            console.log(`[Socket.io] Stale DM session detected for campaign ${campaignId}, allowing takeover`);
            await deleteDmSession(campaignId);
            // Also clear stale player data since they're likely disconnected too
            // (optional: could keep players if we want to preserve state)
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
        // Load inventories from database for each character
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
          }) => {
            const inventory = await getCharacterInventory(String(char.odNumber));
            console.log(`[Socket.io] Loaded inventory for character ${char.name} (${char.odNumber}):`, inventory);
            return {
              ...char,
              inventory,
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

        // Check if DM is connected and notify the player
        const dmSession = await getDmSession(campaignId);
        if (dmSession) {
          const dmSocket = io.sockets.sockets.get(dmSession.socketId);
          if (dmSocket?.connected) {
            // DM is connected, clear any disconnect overlay on the player
            socket.emit('dm-reconnected');
          }
        }
      }

      // If DM joins, send them the connected players list and restore combat state
      if (role === 'dm') {
        const allPlayers = await getConnectedPlayers(campaignId);
        console.log(`[Socket.io] Sending connected-players to DM: ${allPlayers.length} players`, allPlayers.map(p => p.characters.map(c => c.name).join(', ')));
        socket.emit('connected-players', { players: allPlayers });

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
        console.log(`[Socket.io] request-connected-players from ${socket.id} for campaign ${campaignId}: ${allPlayers.length} players`);
        socket.emit('connected-players', { players: allPlayers });
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
        } else if (data.combatActive && data.participants) {
          // Save combat state
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
          await updateCharacterHp(campaignId, data.participantId, data.newHp);
          console.log(`[Socket.io] Persisted HP for character ${data.participantId}: ${data.newHp}`);
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
    socket.on('condition-change', (data: ConditionChangeData) => {
      if (socket.data.campaignId) {
        const room = `campaign-${socket.data.campaignId}`;
        io.to(room).emit('condition-change', data);
        console.log(`[Socket.io] Condition change in ${room}:`, data.participantId);
      }
    });

    // Exhaustion changes
    socket.on('exhaustion-change', (data: ExhaustionChangeData) => {
      if (socket.data.campaignId) {
        const room = `campaign-${socket.data.campaignId}`;
        io.to(room).emit('exhaustion-change', data);
        console.log(`[Socket.io] Exhaustion change in ${room}:`, data.participantId);
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

    // Disconnect handling with grace period for DM
    socket.on('disconnect', async () => {
      if (socket.data.campaignId) {
        const campaignId = socket.data.campaignId;
        const room = `campaign-${campaignId}`;

        // Handle DM disconnect with grace period
        if (socket.data.role === 'dm') {
          const currentDM = await getDmSession(campaignId);

          // Only process if this socket's token matches (prevents race condition)
          if (currentDM && currentDM.sessionToken === socket.data.dmSessionToken) {
            console.log(`[Socket.io] DM disconnected, starting ${DM_DISCONNECT_GRACE_PERIOD}ms grace period for campaign ${campaignId}`);

            // Start grace period timer
            const disconnectTimer = setTimeout(async () => {
              // Double-check token still matches after timeout
              const dm = await getDmSession(campaignId);
              if (dm && dm.sessionToken === socket.data.dmSessionToken) {
                // Grace period expired, DM didn't reconnect
                await deleteDmSession(campaignId);
                disconnectTimers.delete(campaignId);

                // Notify players that DM is truly gone
                io.to(room).emit('dm-disconnected', { timestamp: Date.now() });
                console.log(`[Socket.io] DM grace period expired for campaign ${campaignId}, notifying players`);
              }
            }, DM_DISCONNECT_GRACE_PERIOD);

            // Store timer for potential cancellation
            disconnectTimers.set(campaignId, disconnectTimer);
          } else {
            console.log(`[Socket.io] DM disconnect ignored (stale socket) for campaign ${campaignId}`);
          }
        }

        // Handle player disconnect (immediate, no grace period)
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
