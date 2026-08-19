#!/usr/bin/env node

import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
  ListResourcesRequestSchema,
  ReadResourceRequestSchema,
} from "@modelcontextprotocol/sdk/types.js";
import pg from "pg";

const { Pool } = pg;

// Database connection - Synology Production PostgreSQL (port 5434)
const pool = new Pool({
  connectionString:
    process.env.DATABASE_URL ||
    "postgresql://dnd:dnd@192.168.1.2:5434/dnd_tracker",
  max: 5,
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 5000,
});

// Create server
const server = new Server(
  {
    name: "combat-tracker-mcp",
    version: "1.0.0",
  },
  {
    capabilities: {
      tools: {},
      resources: {},
    },
  }
);

// ============================================
// Tools Definition
// ============================================

server.setRequestHandler(ListToolsRequestSchema, async () => {
  return {
    tools: [
      {
        name: "list_campaigns",
        description: "List all campaigns in the combat tracker",
        inputSchema: {
          type: "object",
          properties: {},
          required: [],
        },
      },
      {
        name: "get_campaign",
        description: "Get details of a specific campaign by ID",
        inputSchema: {
          type: "object",
          properties: {
            campaign_id: {
              type: "number",
              description: "The campaign ID",
            },
          },
          required: ["campaign_id"],
        },
      },
      {
        name: "list_characters",
        description:
          "List all characters with their current status (HP, conditions, buffs, spell slots) for a campaign",
        inputSchema: {
          type: "object",
          properties: {
            campaign_id: {
              type: "number",
              description: "The campaign ID (default: 1)",
            },
          },
          required: [],
        },
      },
      {
        name: "get_character_status",
        description:
          "Get detailed status for a specific character including HP, temp HP, exhaustion, conditions, buffs, and spell slots",
        inputSchema: {
          type: "object",
          properties: {
            character_id: {
              type: "string",
              description: "The character ID (Notion odNumber)",
            },
            campaign_id: {
              type: "number",
              description: "The campaign ID (default: 1)",
            },
          },
          required: ["character_id"],
        },
      },
      {
        name: "get_character_inventory",
        description:
          "Get the full inventory for a character including equipment, consumables, misc items, and currency",
        inputSchema: {
          type: "object",
          properties: {
            character_id: {
              type: "string",
              description: "The character ID (Notion odNumber)",
            },
          },
          required: ["character_id"],
        },
      },
      {
        name: "get_prepared_spells",
        description: "Get all prepared spells for a character",
        inputSchema: {
          type: "object",
          properties: {
            character_id: {
              type: "string",
              description: "The character ID (Notion odNumber)",
            },
            campaign_id: {
              type: "number",
              description: "The campaign ID (default: 1)",
            },
          },
          required: ["character_id"],
        },
      },
      {
        name: "search_monsters",
        description: "Search monsters in the bestiary by name or type",
        inputSchema: {
          type: "object",
          properties: {
            query: {
              type: "string",
              description: "Search query (name or creature type)",
            },
            limit: {
              type: "number",
              description: "Maximum results to return (default: 20)",
            },
          },
          required: [],
        },
      },
      {
        name: "get_monster",
        description: "Get full details of a monster by ID or name",
        inputSchema: {
          type: "object",
          properties: {
            id: {
              type: "number",
              description: "Monster ID",
            },
            name: {
              type: "string",
              description: "Monster name (case insensitive)",
            },
          },
          required: [],
        },
      },
      {
        name: "search_items",
        description: "Search the item catalog by name, category, or rarity",
        inputSchema: {
          type: "object",
          properties: {
            query: {
              type: "string",
              description: "Search query",
            },
            category: {
              type: "string",
              enum: ["equipment", "consumable", "misc"],
              description: "Filter by category",
            },
            limit: {
              type: "number",
              description: "Maximum results (default: 50)",
            },
          },
          required: [],
        },
      },
      {
        name: "search_spells",
        description: "Search the spell catalog by name or level",
        inputSchema: {
          type: "object",
          properties: {
            query: {
              type: "string",
              description: "Search query",
            },
            level: {
              type: "number",
              description: "Filter by spell level (0 for cantrips)",
            },
            limit: {
              type: "number",
              description: "Maximum results (default: 50)",
            },
          },
          required: [],
        },
      },
      {
        name: "get_spell",
        description: "Get full details of a spell by ID or name",
        inputSchema: {
          type: "object",
          properties: {
            id: {
              type: "number",
              description: "Spell ID",
            },
            name: {
              type: "string",
              description: "Spell name (case insensitive)",
            },
          },
          required: [],
        },
      },
      {
        name: "list_saved_combats",
        description:
          "List all saved combat presets (fight templates) for a campaign. These are reusable combat setups with pre-configured monsters.",
        inputSchema: {
          type: "object",
          properties: {
            campaign_id: {
              type: "number",
              description: "The campaign ID (default: 1)",
            },
          },
          required: [],
        },
      },
      {
        name: "get_saved_combat",
        description:
          "Get full details of a saved combat preset including all configured monsters with their HP, AC, initiative, and quantity",
        inputSchema: {
          type: "object",
          properties: {
            preset_id: {
              type: "number",
              description: "The fight preset ID",
            },
          },
          required: ["preset_id"],
        },
      },
      {
        name: "get_combat_history",
        description:
          "Get history of completed combats for a campaign, including participants, rounds, outcome and notes",
        inputSchema: {
          type: "object",
          properties: {
            campaign_id: {
              type: "number",
              description: "The campaign ID (default: 1)",
            },
            limit: {
              type: "number",
              description: "Maximum results to return (default: 20)",
            },
          },
          required: [],
        },
      },
    ],
  };
});

// ============================================
// Tool Handlers
// ============================================

server.setRequestHandler(CallToolRequestSchema, async (request) => {
  const { name, arguments: args } = request.params;

  try {
    switch (name) {
      case "list_campaigns": {
        const result = await pool.query(
          "SELECT id, name, description, room_code, created_at, updated_at FROM campaigns ORDER BY updated_at DESC"
        );
        return {
          content: [
            {
              type: "text",
              text: JSON.stringify(result.rows, null, 2),
            },
          ],
        };
      }

      case "get_campaign": {
        const campaignId = (args as { campaign_id: number }).campaign_id;
        const result = await pool.query(
          "SELECT id, name, description, room_code, created_at, updated_at FROM campaigns WHERE id = $1",
          [campaignId]
        );
        if (result.rows.length === 0) {
          return {
            content: [{ type: "text", text: "Campaign not found" }],
            isError: true,
          };
        }
        return {
          content: [
            {
              type: "text",
              text: JSON.stringify(result.rows[0], null, 2),
            },
          ],
        };
      }

      case "list_characters": {
        const campaignId =
          (args as { campaign_id?: number }).campaign_id || 1;
        const result = await pool.query(
          `SELECT
            character_id,
            current_hp,
            temp_hp,
            exhaustion_level,
            conditions,
            condition_durations,
            buffs,
            spell_slots,
            updated_at
          FROM character_hp
          WHERE campaign_id = $1
          ORDER BY character_id`,
          [campaignId]
        );
        return {
          content: [
            {
              type: "text",
              text: JSON.stringify(result.rows, null, 2),
            },
          ],
        };
      }

      case "get_character_status": {
        const { character_id, campaign_id = 1 } = args as {
          character_id: string;
          campaign_id?: number;
        };
        const result = await pool.query(
          `SELECT
            character_id,
            current_hp,
            temp_hp,
            exhaustion_level,
            conditions,
            condition_durations,
            buffs,
            spell_slots,
            updated_at
          FROM character_hp
          WHERE character_id = $1 AND campaign_id = $2`,
          [character_id, campaign_id]
        );
        if (result.rows.length === 0) {
          return {
            content: [
              {
                type: "text",
                text: "No persisted status found for this character",
              },
            ],
          };
        }
        return {
          content: [
            {
              type: "text",
              text: JSON.stringify(result.rows[0], null, 2),
            },
          ],
        };
      }

      case "get_character_inventory": {
        const characterId = (args as { character_id: string }).character_id;
        const result = await pool.query(
          `SELECT character_id, campaign_id, inventory, updated_at
          FROM character_inventories
          WHERE character_id = $1`,
          [characterId]
        );
        if (result.rows.length === 0) {
          return {
            content: [
              {
                type: "text",
                text: JSON.stringify(
                  {
                    equipment: [],
                    consumables: [],
                    currency: {
                      platinum: 0,
                      gold: 0,
                      electrum: 0,
                      silver: 0,
                      copper: 0,
                    },
                    items: [],
                  },
                  null,
                  2
                ),
              },
            ],
          };
        }
        return {
          content: [
            {
              type: "text",
              text: JSON.stringify(result.rows[0], null, 2),
            },
          ],
        };
      }

      case "get_prepared_spells": {
        const { character_id, campaign_id = 1 } = args as {
          character_id: string;
          campaign_id?: number;
        };
        const result = await pool.query(
          `SELECT
            ps.id,
            ps.character_id,
            ps.spell_id,
            ps.is_always_prepared,
            sc.name as spell_name,
            sc.level as spell_level,
            sc.school,
            sc.casting_time,
            sc.range,
            sc.duration,
            sc.components,
            sc.concentration,
            sc.description
          FROM character_prepared_spells ps
          JOIN spell_catalog sc ON ps.spell_id = sc.id
          WHERE ps.character_id = $1 AND ps.campaign_id = $2
          ORDER BY sc.level, sc.name`,
          [character_id, campaign_id]
        );
        return {
          content: [
            {
              type: "text",
              text: JSON.stringify(result.rows, null, 2),
            },
          ],
        };
      }

      case "search_monsters": {
        const { query = "", limit = 20 } = args as {
          query?: string;
          limit?: number;
        };
        let sql =
          "SELECT id, name, creature_type, size, hit_points, armor_class, challenge_rating_xp FROM monsters";
        const params: (string | number)[] = [];

        if (query) {
          sql +=
            " WHERE name ILIKE $1 OR creature_type ILIKE $1";
          params.push(`%${query}%`);
        }

        sql += ` ORDER BY name LIMIT ${Math.min(limit, 100)}`;

        const result = await pool.query(sql, params);
        return {
          content: [
            {
              type: "text",
              text: JSON.stringify(result.rows, null, 2),
            },
          ],
        };
      }

      case "get_monster": {
        const { id, name } = args as { id?: number; name?: string };
        let result;

        if (id) {
          result = await pool.query("SELECT * FROM monsters WHERE id = $1", [
            id,
          ]);
        } else if (name) {
          result = await pool.query(
            "SELECT * FROM monsters WHERE name ILIKE $1",
            [name]
          );
        } else {
          return {
            content: [
              { type: "text", text: "Please provide either id or name" },
            ],
            isError: true,
          };
        }

        if (result.rows.length === 0) {
          return {
            content: [{ type: "text", text: "Monster not found" }],
            isError: true,
          };
        }
        return {
          content: [
            {
              type: "text",
              text: JSON.stringify(result.rows[0], null, 2),
            },
          ],
        };
      }

      case "search_items": {
        const { query = "", category, limit = 50 } = args as {
          query?: string;
          category?: string;
          limit?: number;
        };

        let sql =
          "SELECT id, name, category, subcategory, rarity, description FROM item_catalog WHERE 1=1";
        const params: (string | number)[] = [];
        let paramIndex = 1;

        if (query) {
          sql += ` AND (name ILIKE $${paramIndex} OR description ILIKE $${paramIndex})`;
          params.push(`%${query}%`);
          paramIndex++;
        }

        if (category) {
          sql += ` AND category = $${paramIndex}`;
          params.push(category);
          paramIndex++;
        }

        sql += ` ORDER BY name LIMIT ${Math.min(limit, 100)}`;

        const result = await pool.query(sql, params);
        return {
          content: [
            {
              type: "text",
              text: JSON.stringify(result.rows, null, 2),
            },
          ],
        };
      }

      case "search_spells": {
        const { query = "", level, limit = 50 } = args as {
          query?: string;
          level?: number;
          limit?: number;
        };

        let sql =
          "SELECT id, name, level, school, classes, casting_time, range, duration, concentration FROM spell_catalog WHERE 1=1";
        const params: (string | number)[] = [];
        let paramIndex = 1;

        if (query) {
          sql += ` AND (name ILIKE $${paramIndex} OR description ILIKE $${paramIndex})`;
          params.push(`%${query}%`);
          paramIndex++;
        }

        if (level !== undefined && level >= 0) {
          sql += ` AND level = $${paramIndex}`;
          params.push(level);
          paramIndex++;
        }

        sql += ` ORDER BY level, name LIMIT ${Math.min(limit, 200)}`;

        const result = await pool.query(sql, params);
        return {
          content: [
            {
              type: "text",
              text: JSON.stringify(result.rows, null, 2),
            },
          ],
        };
      }

      case "get_spell": {
        const { id, name } = args as { id?: number; name?: string };
        let result;

        if (id) {
          result = await pool.query(
            "SELECT * FROM spell_catalog WHERE id = $1",
            [id]
          );
        } else if (name) {
          result = await pool.query(
            "SELECT * FROM spell_catalog WHERE name ILIKE $1",
            [name]
          );
        } else {
          return {
            content: [
              { type: "text", text: "Please provide either id or name" },
            ],
            isError: true,
          };
        }

        if (result.rows.length === 0) {
          return {
            content: [{ type: "text", text: "Spell not found" }],
            isError: true,
          };
        }
        return {
          content: [
            {
              type: "text",
              text: JSON.stringify(result.rows[0], null, 2),
            },
          ],
        };
      }

      case "list_saved_combats": {
        const campaignId =
          (args as { campaign_id?: number }).campaign_id || 1;
        const result = await pool.query(
          `SELECT
            fp.id,
            fp.name,
            fp.description,
            fp.created_at,
            fp.updated_at,
            COUNT(fpm.id) as monster_count,
            SUM(fpm.quantity) as total_creatures,
            SUM(COALESCE(fpm.xp, 0) * fpm.quantity) as total_xp
          FROM fight_presets fp
          LEFT JOIN fight_preset_monsters fpm ON fp.id = fpm.preset_id
          WHERE fp.campaign_id = $1
          GROUP BY fp.id
          ORDER BY fp.updated_at DESC`,
          [campaignId]
        );
        return {
          content: [
            {
              type: "text",
              text: JSON.stringify(result.rows, null, 2),
            },
          ],
        };
      }

      case "get_saved_combat": {
        const presetId = (args as { preset_id: number }).preset_id;

        // Get preset details
        const presetResult = await pool.query(
          "SELECT * FROM fight_presets WHERE id = $1",
          [presetId]
        );

        if (presetResult.rows.length === 0) {
          return {
            content: [{ type: "text", text: "Saved combat not found" }],
            isError: true,
          };
        }

        // Get monsters in this preset
        const monstersResult = await pool.query(
          `SELECT
            fpm.id,
            fpm.monster_id,
            fpm.name,
            fpm.hp,
            fpm.max_hp,
            fpm.ac,
            fpm.initiative,
            fpm.notes,
            fpm.quantity,
            fpm.participant_type,
            fpm.reference_id,
            fpm.xp,
            m.creature_type,
            m.challenge_rating_xp as cr
          FROM fight_preset_monsters fpm
          LEFT JOIN monsters m ON fpm.monster_id = m.id
          WHERE fpm.preset_id = $1
          ORDER BY fpm.name`,
          [presetId]
        );

        const preset = {
          ...presetResult.rows[0],
          monsters: monstersResult.rows,
          total_xp: monstersResult.rows.reduce(
            (sum: number, m: { xp?: number; quantity: number }) =>
              sum + (m.xp || 0) * m.quantity,
            0
          ),
        };

        return {
          content: [
            {
              type: "text",
              text: JSON.stringify(preset, null, 2),
            },
          ],
        };
      }

      case "get_combat_history": {
        const { campaign_id = 1, limit = 20 } = args as {
          campaign_id?: number;
          limit?: number;
        };
        const result = await pool.query(
          `SELECT
            id,
            campaign_id,
            started_at,
            ended_at,
            participants,
            total_rounds,
            outcome,
            notes
          FROM combat_history
          WHERE campaign_id = $1
          ORDER BY started_at DESC
          LIMIT $2`,
          [campaign_id, Math.min(limit, 100)]
        );
        return {
          content: [
            {
              type: "text",
              text: JSON.stringify(result.rows, null, 2),
            },
          ],
        };
      }

      default:
        return {
          content: [{ type: "text", text: `Unknown tool: ${name}` }],
          isError: true,
        };
    }
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    return {
      content: [{ type: "text", text: `Database error: ${message}` }],
      isError: true,
    };
  }
});

// ============================================
// Resources (for browsing)
// ============================================

server.setRequestHandler(ListResourcesRequestSchema, async () => {
  return {
    resources: [
      {
        uri: "combat-tracker://campaigns",
        name: "Campaigns",
        description: "List of all campaigns",
        mimeType: "application/json",
      },
      {
        uri: "combat-tracker://monsters",
        name: "Monster Bestiary",
        description: "Complete monster catalog (first 100)",
        mimeType: "application/json",
      },
      {
        uri: "combat-tracker://items",
        name: "Item Catalog",
        description: "Complete item catalog (first 100)",
        mimeType: "application/json",
      },
      {
        uri: "combat-tracker://spells",
        name: "Spell Catalog",
        description: "Complete spell catalog",
        mimeType: "application/json",
      },
      {
        uri: "combat-tracker://saved-combats",
        name: "Saved Combats",
        description: "All saved combat presets (fight templates) with monster counts",
        mimeType: "application/json",
      },
      {
        uri: "combat-tracker://combat-history",
        name: "Combat History",
        description: "Recent completed combats with participants and outcomes",
        mimeType: "application/json",
      },
    ],
  };
});

server.setRequestHandler(ReadResourceRequestSchema, async (request) => {
  const { uri } = request.params;

  try {
    switch (uri) {
      case "combat-tracker://campaigns": {
        const result = await pool.query(
          "SELECT id, name, description, room_code, created_at FROM campaigns ORDER BY updated_at DESC"
        );
        return {
          contents: [
            {
              uri,
              mimeType: "application/json",
              text: JSON.stringify(result.rows, null, 2),
            },
          ],
        };
      }

      case "combat-tracker://monsters": {
        const result = await pool.query(
          "SELECT id, name, creature_type, size, hit_points, armor_class, challenge_rating_xp FROM monsters ORDER BY name LIMIT 100"
        );
        return {
          contents: [
            {
              uri,
              mimeType: "application/json",
              text: JSON.stringify(result.rows, null, 2),
            },
          ],
        };
      }

      case "combat-tracker://items": {
        const result = await pool.query(
          "SELECT id, name, category, subcategory, rarity, description FROM item_catalog ORDER BY name LIMIT 100"
        );
        return {
          contents: [
            {
              uri,
              mimeType: "application/json",
              text: JSON.stringify(result.rows, null, 2),
            },
          ],
        };
      }

      case "combat-tracker://spells": {
        const result = await pool.query(
          "SELECT id, name, level, school, classes, casting_time, concentration FROM spell_catalog ORDER BY level, name"
        );
        return {
          contents: [
            {
              uri,
              mimeType: "application/json",
              text: JSON.stringify(result.rows, null, 2),
            },
          ],
        };
      }

      case "combat-tracker://saved-combats": {
        const result = await pool.query(
          `SELECT
            fp.id,
            fp.campaign_id,
            fp.name,
            fp.description,
            fp.created_at,
            fp.updated_at,
            COUNT(fpm.id) as monster_count,
            SUM(fpm.quantity) as total_creatures,
            SUM(COALESCE(fpm.xp, 0) * fpm.quantity) as total_xp
          FROM fight_presets fp
          LEFT JOIN fight_preset_monsters fpm ON fp.id = fpm.preset_id
          GROUP BY fp.id
          ORDER BY fp.updated_at DESC`
        );
        return {
          contents: [
            {
              uri,
              mimeType: "application/json",
              text: JSON.stringify(result.rows, null, 2),
            },
          ],
        };
      }

      case "combat-tracker://combat-history": {
        const result = await pool.query(
          `SELECT
            id,
            campaign_id,
            started_at,
            ended_at,
            participants,
            total_rounds,
            outcome,
            notes
          FROM combat_history
          ORDER BY started_at DESC
          LIMIT 50`
        );
        return {
          contents: [
            {
              uri,
              mimeType: "application/json",
              text: JSON.stringify(result.rows, null, 2),
            },
          ],
        };
      }

      default:
        throw new Error(`Unknown resource: ${uri}`);
    }
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    throw new Error(`Failed to read resource: ${message}`);
  }
});

// ============================================
// Start Server
// ============================================

async function main() {
  const transport = new StdioServerTransport();
  await server.connect(transport);
  console.error("Combat Tracker MCP Server running on stdio");
}

main().catch((error) => {
  console.error("Fatal error:", error);
  process.exit(1);
});
