import { createServer } from 'http';
import { parse } from 'url';
import next from 'next';
import { Server as SocketServer, Socket } from 'socket.io';
import 'dotenv/config';

const dev = process.env.NODE_ENV !== 'production';
const hostname = process.env.HOSTNAME || 'localhost';
const port = parseInt(process.env.PORT || '3000', 10);
const DM_PASSWORD = process.env.DM_PASSWORD || 'defaultpassword';

const app = next({ dev, hostname, port });
const handle = app.getRequestHandler();

// Connected player info
interface ConnectedPlayer {
  socketId: string;
  playerName?: string;
  characters: Array<{
    odNumber: number;
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

// Store connected players per campaign
const connectedPlayers = new Map<number, Map<string, ConnectedPlayer>>();

// Store connected DM socket ID per campaign (only one allowed)
const connectedDMs = new Map<number, string>();

// Socket event types
interface JoinCampaignData {
  campaignId: number;
  role: 'dm' | 'player';
  password?: string; // Required for DM role
  characters?: Array<{
    odNumber: number;
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
  type: 'start' | 'stop' | 'next-turn' | 'state-sync';
  combatActive: boolean;
  currentTurn: number;
  roundNumber?: number;
  participants?: unknown[];
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

interface AmbientEffectData {
  effect: 'none' | 'rain' | 'fog' | 'fire' | 'snow' | 'sandstorm';
}

// Extended socket with custom data
interface CampaignSocket extends Socket {
  data: {
    campaignId?: number;
    role?: 'dm' | 'player';
    odNumber?: number; // Character ID if player
  };
}

app.prepare().then(() => {
  const server = createServer((req, res) => {
    const parsedUrl = parse(req.url!, true);
    handle(req, res, parsedUrl);
  });

  const io = new SocketServer(server, {
    path: '/api/socketio',
    addTrailingSlash: false,
    cors: {
      origin: dev ? ['http://localhost:3000'] : [],
      methods: ['GET', 'POST'],
    },
  });

  io.on('connection', (socket: CampaignSocket) => {
    console.log(`[Socket.io] Client connected: ${socket.id}`);

    // Join a campaign room
    socket.on('join-campaign', (data: JoinCampaignData) => {
      const { campaignId, role, password, characters } = data;
      const room = `campaign-${campaignId}`;

      // DM role validation
      if (role === 'dm') {
        // Check password
        if (password !== DM_PASSWORD) {
          console.log(`[Socket.io] DM login failed for ${socket.id}: invalid password`);
          socket.emit('join-error', { error: 'invalid-password', message: 'Mot de passe incorrect' });
          return;
        }

        // Check if DM already connected
        const existingDM = connectedDMs.get(campaignId);
        if (existingDM && existingDM !== socket.id) {
          console.log(`[Socket.io] DM login failed for ${socket.id}: DM already connected (${existingDM})`);
          socket.emit('join-error', { error: 'dm-already-connected', message: 'Un Maître du Jeu est déjà connecté' });
          return;
        }

        // Register this socket as DM
        connectedDMs.set(campaignId, socket.id);
        console.log(`[Socket.io] DM registered for campaign ${campaignId}: ${socket.id}`);
      }

      socket.join(room);
      socket.data.campaignId = campaignId;
      socket.data.role = role;

      console.log(`[Socket.io] ${socket.id} joined ${room} as ${role}`);

      // Handle player joining with characters
      if (role === 'player' && characters && characters.length > 0) {
        // Initialize campaign's player map if needed
        if (!connectedPlayers.has(campaignId)) {
          connectedPlayers.set(campaignId, new Map());
        }

        const campaignPlayers = connectedPlayers.get(campaignId)!;
        const playerData: ConnectedPlayer = {
          socketId: socket.id,
          characters: characters
        };

        campaignPlayers.set(socket.id, playerData);

        const characterNames = characters.map(c => c.name).join(', ');
        console.log(`[Socket.io] Player with characters [${characterNames}] connected to campaign ${campaignId}`);

        // Notify everyone in room about new player (including sender for confirmation)
        io.to(room).emit('player-connected', { player: playerData });
        console.log(`[Socket.io] Emitted player-connected to room ${room}`);

        // Send current connected players list to the new player
        const allPlayers = Array.from(campaignPlayers.values());
        console.log(`[Socket.io] Sending connected-players to new player ${socket.id}: ${allPlayers.length} players`);
        socket.emit('connected-players', { players: allPlayers });
      }

      // Notify others in the room
      socket.to(room).emit('user-joined', { role });

      // If player joins, request state sync from DM
      if (role === 'player') {
        socket.to(room).emit('request-state-sync');
      }

      // If DM joins, send them the connected players list
      if (role === 'dm') {
        const campaignPlayers = connectedPlayers.get(campaignId);
        const allPlayers = campaignPlayers ? Array.from(campaignPlayers.values()) : [];
        console.log(`[Socket.io] Sending connected-players to DM: ${allPlayers.length} players`, allPlayers.map(p => p.characters.map(c => c.name).join(', ')));
        socket.emit('connected-players', { players: allPlayers });
      }
    });

    // Leave campaign room
    socket.on('leave-campaign', () => {
      if (socket.data.campaignId) {
        const campaignId = socket.data.campaignId;
        const room = `campaign-${campaignId}`;

        // Remove DM from connected DMs
        if (socket.data.role === 'dm') {
          const currentDM = connectedDMs.get(campaignId);
          if (currentDM === socket.id) {
            connectedDMs.delete(campaignId);
            console.log(`[Socket.io] DM left campaign ${campaignId}`);
          }
        }

        // Remove player from connected players
        if (socket.data.role === 'player') {
          const campaignPlayers = connectedPlayers.get(campaignId);
          if (campaignPlayers) {
            const player = campaignPlayers.get(socket.id);
            if (player) {
              campaignPlayers.delete(socket.id);
              io.to(room).emit('player-disconnected', {
                socketId: socket.id,
              });
              const characterNames = player.characters.map(c => c.name).join(', ');
              console.log(`[Socket.io] Player with characters [${characterNames}] left campaign ${campaignId}`);
            }
          }
        }

        socket.leave(room);
        socket.to(room).emit('user-left', { role: socket.data.role });
        console.log(`[Socket.io] ${socket.id} left ${room}`);
      }
    });

    // Request connected players list
    socket.on('request-connected-players', () => {
      if (socket.data.campaignId) {
        const campaignPlayers = connectedPlayers.get(socket.data.campaignId);
        const allPlayers = campaignPlayers ? Array.from(campaignPlayers.values()) : [];
        console.log(`[Socket.io] request-connected-players from ${socket.id}: ${allPlayers.length} players`);
        socket.emit('connected-players', { players: allPlayers });
      }
    });

    // Combat state updates (start, stop, next turn)
    socket.on('combat-update', (data: CombatUpdateData) => {
      if (socket.data.campaignId) {
        const room = `campaign-${socket.data.campaignId}`;
        // Broadcast to all clients in room including sender
        io.to(room).emit('combat-update', data);
        console.log(`[Socket.io] Combat update in ${room}:`, data.type);
      }
    });

    // HP changes
    socket.on('hp-change', (data: HpChangeData) => {
      if (socket.data.campaignId) {
        const room = `campaign-${socket.data.campaignId}`;
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

    // Disconnect handling
    socket.on('disconnect', () => {
      if (socket.data.campaignId) {
        const campaignId = socket.data.campaignId;
        const room = `campaign-${campaignId}`;

        // Remove DM from connected DMs
        if (socket.data.role === 'dm') {
          const currentDM = connectedDMs.get(campaignId);
          if (currentDM === socket.id) {
            connectedDMs.delete(campaignId);
            console.log(`[Socket.io] DM disconnected from campaign ${campaignId}`);
          }
        }

        // Remove player from connected players
        if (socket.data.role === 'player') {
          const campaignPlayers = connectedPlayers.get(campaignId);
          if (campaignPlayers) {
            const player = campaignPlayers.get(socket.id);
            if (player) {
              campaignPlayers.delete(socket.id);
              io.to(room).emit('player-disconnected', {
                socketId: socket.id,
              });
              const characterNames = player.characters.map(c => c.name).join(', ');
              console.log(`[Socket.io] Player with characters [${characterNames}] disconnected from campaign ${campaignId}`);
            }
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
