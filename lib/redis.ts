import { createClient, RedisClientType } from 'redis';

// Redis client singleton
let redis: RedisClientType | null = null;

// Get or create Redis client
export async function getRedis(): Promise<RedisClientType> {
  if (!redis) {
    redis = createClient({
      url: process.env.REDIS_URL || 'redis://localhost:6379',
    });

    redis.on('error', (err) => console.error('[Redis] Error:', err));
    redis.on('connect', () => console.log('[Redis] Connected'));
    redis.on('reconnecting', () => console.log('[Redis] Reconnecting...'));

    await redis.connect();
  }

  return redis;
}

// Close Redis connection (for cleanup)
export async function closeRedis(): Promise<void> {
  if (redis) {
    await redis.quit();
    redis = null;
  }
}

// ============================================
// Type Definitions
// ============================================

export interface DmSession {
  socketId: string;
  sessionToken: string;
  connectedAt: number;
}

export interface ConnectedPlayer {
  socketId: string;
  playerName?: string;
  characters: Array<{
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
  }>;
}

export interface CombatState {
  combatActive: boolean;
  currentTurn: number;
  roundNumber: number;
  participants: unknown[];
  ambientEffect?: string;
  lastUpdate: number;
}

// ============================================
// Key Helpers
// ============================================

const KEYS = {
  dmSession: (campaignId: number) => `dm:session:${campaignId}`,
  players: (campaignId: number) => `players:${campaignId}`,
  combatState: (campaignId: number) => `combat:state:${campaignId}`,
};

// TTL values (in seconds)
const TTL = {
  dmSession: 60 * 60 * 24, // 24 hours
  players: 60 * 60 * 24, // 24 hours
  combatState: 60 * 60 * 24, // 24 hours
};

// ============================================
// DM Session Operations
// ============================================

export async function getDmSession(campaignId: number): Promise<DmSession | null> {
  const client = await getRedis();
  const data = await client.get(KEYS.dmSession(campaignId));
  return data ? JSON.parse(data) : null;
}

export async function setDmSession(campaignId: number, session: DmSession): Promise<void> {
  const client = await getRedis();
  await client.setEx(KEYS.dmSession(campaignId), TTL.dmSession, JSON.stringify(session));
}

export async function deleteDmSession(campaignId: number): Promise<void> {
  const client = await getRedis();
  await client.del(KEYS.dmSession(campaignId));
}

// ============================================
// Connected Players Operations
// ============================================

export async function getConnectedPlayers(campaignId: number): Promise<ConnectedPlayer[]> {
  const client = await getRedis();
  const data = await client.hGetAll(KEYS.players(campaignId));

  const players: ConnectedPlayer[] = [];
  for (const socketId in data) {
    try {
      players.push(JSON.parse(data[socketId]));
    } catch {
      console.error(`[Redis] Failed to parse player data for socket ${socketId}`);
    }
  }

  return players;
}

export async function getConnectedPlayer(campaignId: number, socketId: string): Promise<ConnectedPlayer | null> {
  const client = await getRedis();
  const data = await client.hGet(KEYS.players(campaignId), socketId);
  return data ? JSON.parse(data) : null;
}

export async function addConnectedPlayer(campaignId: number, player: ConnectedPlayer): Promise<void> {
  const client = await getRedis();
  await client.hSet(KEYS.players(campaignId), player.socketId, JSON.stringify(player));
  // Refresh TTL on the hash
  await client.expire(KEYS.players(campaignId), TTL.players);
}

export async function removeConnectedPlayer(campaignId: number, socketId: string): Promise<ConnectedPlayer | null> {
  const client = await getRedis();
  // Get the player data before removing
  const data = await client.hGet(KEYS.players(campaignId), socketId);
  if (data) {
    await client.hDel(KEYS.players(campaignId), socketId);
    return JSON.parse(data);
  }
  return null;
}

export async function clearConnectedPlayers(campaignId: number): Promise<void> {
  const client = await getRedis();
  await client.del(KEYS.players(campaignId));
}

// Update a specific character's HP across all connected players
export async function updateCharacterHp(campaignId: number, characterId: string, newHp: number): Promise<void> {
  const client = await getRedis();
  const players = await getConnectedPlayers(campaignId);

  for (const player of players) {
    let updated = false;
    for (const char of player.characters) {
      if (String(char.odNumber) === characterId) {
        char.currentHp = newHp;
        updated = true;
        break;
      }
    }
    if (updated) {
      await client.hSet(KEYS.players(campaignId), player.socketId, JSON.stringify(player));
      break;
    }
  }
}

// ============================================
// Combat State Operations
// ============================================

export async function getCombatState(campaignId: number): Promise<CombatState | null> {
  const client = await getRedis();
  const data = await client.get(KEYS.combatState(campaignId));
  return data ? JSON.parse(data) : null;
}

export async function setCombatState(campaignId: number, state: CombatState): Promise<void> {
  const client = await getRedis();
  state.lastUpdate = Date.now();
  await client.setEx(KEYS.combatState(campaignId), TTL.combatState, JSON.stringify(state));
}

export async function deleteCombatState(campaignId: number): Promise<void> {
  const client = await getRedis();
  await client.del(KEYS.combatState(campaignId));
}

// ============================================
// Utility Functions
// ============================================

// Check if Redis is connected and healthy
export async function isRedisHealthy(): Promise<boolean> {
  try {
    const client = await getRedis();
    const pong = await client.ping();
    return pong === 'PONG';
  } catch {
    return false;
  }
}

// Get all campaign data (for debugging/admin)
export async function getCampaignData(campaignId: number): Promise<{
  dmSession: DmSession | null;
  players: ConnectedPlayer[];
  combatState: CombatState | null;
}> {
  return {
    dmSession: await getDmSession(campaignId),
    players: await getConnectedPlayers(campaignId),
    combatState: await getCombatState(campaignId),
  };
}

// Clear all campaign data
export async function clearCampaignData(campaignId: number): Promise<void> {
  const client = await getRedis();
  await client.del(
    KEYS.dmSession(campaignId),
    KEYS.players(campaignId),
    KEYS.combatState(campaignId)
  );
}
