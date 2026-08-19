# Combat Tracker MCP Server

A read-only MCP (Model Context Protocol) server that provides Claude Desktop access to the D&D Combat Tracker PostgreSQL database on the Synology NAS.

## Features

### Tools Available

| Tool | Description |
|------|-------------|
| `list_campaigns` | List all campaigns |
| `get_campaign` | Get campaign details by ID |
| `list_characters` | List all characters with HP, conditions, buffs, spell slots |
| `get_character_status` | Get detailed status for a specific character |
| `get_character_inventory` | Get full inventory (equipment, consumables, currency) |
| `get_prepared_spells` | Get prepared spells for a character |
| `search_monsters` | Search the monster bestiary |
| `get_monster` | Get full monster details |
| `search_items` | Search the item catalog |
| `search_spells` | Search the spell catalog |
| `get_spell` | Get full spell details |
| `list_saved_combats` | List all saved combat presets (fight templates) |
| `get_saved_combat` | Get full details of a saved combat with all monsters |
| `get_combat_history` | Get history of completed combats |

### Resources

- `combat-tracker://campaigns` - All campaigns
- `combat-tracker://monsters` - Monster bestiary
- `combat-tracker://items` - Item catalog
- `combat-tracker://spells` - Spell catalog
- `combat-tracker://saved-combats` - Saved combat presets with monster counts
- `combat-tracker://combat-history` - Recent completed combats

## Installation

```bash
cd mcp-server
npm install
npm run build
```

## Claude Desktop Configuration

Add this to your Claude Desktop config file:

**macOS**: `~/Library/Application Support/Claude/claude_desktop_config.json`

```json
{
  "mcpServers": {
    "combat-tracker": {
      "command": "node",
      "args": ["/Users/mathieucerfontaine/Documents/combat-tracker/mcp-server/dist/index.js"]
    }
  }
}
```

After adding, restart Claude Desktop.

## Database Connection

Connects to the Synology PostgreSQL at `192.168.1.2:5434`.

You can override with the `DATABASE_URL` environment variable:

```json
{
  "mcpServers": {
    "combat-tracker": {
      "command": "node",
      "args": ["/Users/mathieucerfontaine/Documents/combat-tracker/mcp-server/dist/index.js"],
      "env": {
        "DATABASE_URL": "postgresql://user:pass@host:port/db"
      }
    }
  }
}
```

## Usage Examples

Once configured, you can ask Claude Desktop:

- "List all characters and their current HP"
- "What's in Thalia's inventory?"
- "Search for fire-related spells"
- "Show me the stats for a Goblin"
- "What prepared spells does character 246300de-717f-8003-a7fd-eef6cd9cf48a have?"
- "Show me all saved combats"
- "What monsters are in the 'Embuscade Gobelins' saved combat?"
- "Show me the combat history"
