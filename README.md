# D&D Combat Tracker

A real-time Dungeons & Dragons combat tracking application built with Next.js 16 and React 19. The application supports multiplayer sessions where a Dungeon Master (DM) and players can collaborate in real-time.

> **Note:** The UI is in French.

## Tech Stack

- **Framework:** Next.js 16 with App Router
- **Frontend:** React 19, TypeScript
- **Styling:** Tailwind CSS v4, shadcn/ui (new-york style)
- **Database:** PostgreSQL 18
- **Cache & Sessions:** Redis 7
- **Real-time:** Socket.IO 4.8
- **Drag & Drop:** dnd-kit
- **External Sync:** Notion API (monsters, items, session notes)

## Getting Started

### Development

```bash
docker-compose -f docker-compose.dev.yml up --build
```

- App: http://localhost:3001
- PostgreSQL: localhost:5433
- Hot-reload enabled

### Production

```bash
docker-compose up --build
```

- App: http://localhost:3000
- PostgreSQL: localhost:5432

Both environments can run in parallel.

## Features

### User Modes

- **DM Mode (Maitre du Jeu):** Full control over combat, monsters, and ambient effects
- **Player Mode (Joueur):** Limited view with character management

### Combat Management

- **Initiative Tracking:** Automatic turn order based on initiative rolls
- **Round Counter:** Track combat rounds with turn cycling
- **Combat Setup:** Pre-configure battles with drag-and-drop participant arrangement
- **Fight Presets:** Save and load pre-configured monster groups for quick encounter setup
- **Real-time Sync:** All combat actions synchronized across connected clients

### Character Management

- Create and manage player characters with full D&D stats (HP, AC, Initiative, Class, Level)
- Multi-character support per player
- HP tracking with color-coded health status
- Persistent storage in PostgreSQL

### Monster & Bestiary

- **Monster Database:** 60+ D&D 5e monsters with full stat blocks
- **Quick Add:** Drag-and-drop monsters from the database into combat
- **Custom Monsters:** Create monsters on-the-fly
- **Monster Details:** View armor class, hit points, abilities, actions, bonus actions, reactions, legendary actions, traits, and more
- **AI-generated Images:** Monsters include generated artwork
- **Notion Sync:** Sync monsters from a Notion database with preview/apply workflow

### Conditions & Status Effects

**15 D&D 5e Conditions:**
- A terre (Prone)
- Agrippe (Grappled)
- Assourdi (Deafened)
- Aveugle (Blinded)
- Charme (Charmed)
- Effraye (Frightened)
- Empoisonne (Poisoned)
- Entrave (Restrained)
- Etourdi (Stunned)
- Incapable d'agir (Incapacitated)
- Inconscient (Unconscious)
- Invisible (Invisible)
- Paralyse (Paralyzed)
- Petrifie (Petrified)
- Concentre (Concentrating)

**Condition Features:**
- Duration tracking with turn-based countdown
- Automatic expiration
- Visual icons and color coding

**Exhaustion System:**
- 6-level exhaustion tracking (D&D 5e standard)
- Color-coded severity indicators

**Buffs & Debuffs:**
- 21 pre-defined buffs (Bénédiction, Hâte, Héroïsme, etc.)
- 10 pre-defined debuffs (Fléau, Lenteur, Malédiction, etc.)
- Custom buffs supported
- Duration tracking with concentration mechanic
- Real-time sync across all clients

### Combat History

- Complete action log with timestamps
- Tracks damage, healing, conditions, deaths, turn changes
- Color-coded entries by action type
- Auto-scrolling to latest entries

### Ambient Effects (DM Only)

Visual atmosphere effects for immersion:
- Rain (with lightning flashes)
- Fog
- Fire (with rising embers)
- Snow (with frost effects)
- Sandstorm

Effects are broadcasted in real-time to all players.

### Inventory System

- **Equipment:** Weapons, armor, and equipped items
- **Consumables:** Potions, scrolls, ammunition tracking
- **Currency:** Gold, silver, copper management
- **Misc Items:** General inventory with quantity tracking
- **Item Catalog:** Notion-synced item database with search

### Spell Management

- **Spell Slots:** Track and manage spell slot usage per level
- **Spellbook:** Character spell lists
- **Concentration Tracking:** Auto-prompt for concentration checks on damage

### Session Notes

- **Daily Notes:** Per-session note-taking for DMs
- **Redis Storage:** Notes persist for 7 days
- **Notion Journal Sync:** Export session notes to Notion database

### Pets & Familiars

- **Pet Management:** Add pets/familiars linked to player characters
- **Combat Integration:** Pets appear in initiative order near their owner
- **Orphan Handling:** Reassign pets when characters are removed

### Real-time Multiplayer

- WebSocket-based synchronization via Socket.IO
- Campaign room system for session management
- Live player roster with join/disconnect notifications
- Synchronized state for:
  - HP changes (including temp HP)
  - Condition updates
  - Buff/debuff changes
  - Combat state
  - Initiative changes
  - Ambient effects
  - Inventory updates
  - Spell slot usage
- DM disconnect grace period (30s) for page refreshes
- QR code generation for easy player joining

### Responsive Design

- **Mobile:** Tab-based navigation (Setup, Combat, Bestiary, Players, Notes)
- **Desktop:** 3-column grid layout with resizable panels
- Dark theme with D&D-inspired color palette (gold, crimson, emerald)

## Project Structure

```
├── app/                    # Next.js App Router
│   ├── api/               # API routes
│   │   ├── campaigns/     # Campaign & character management
│   │   ├── monsters/      # Monster database queries
│   │   ├── items/         # Item catalog search
│   │   ├── notion/        # Notion sync (monsters, items, journal)
│   │   ├── join/          # Campaign join by code
│   │   └── settings/      # DM password management
│   ├── join/              # Join campaign landing page
│   ├── monsters/          # Monster database page
│   └── page.tsx           # Main single-page application
├── components/            # React components (70+)
│   ├── ui/               # shadcn/ui base components (59+)
│   ├── combat-panel.tsx  # Main combat display & controls
│   ├── player-panel.tsx  # Player character display
│   ├── bestiary-panel.tsx # Monster database browser
│   ├── inventory-manager.tsx # Character inventory UI
│   ├── condition-manager.tsx # Condition management
│   ├── buff-manager.tsx  # Buff/debuff management
│   └── ...               # Feature components
├── hooks/                 # Custom React hooks
│   ├── use-mobile.ts     # Mobile detection
│   ├── useNotionSync.ts  # Notion monster sync
│   └── useItemSync.ts    # Notion item sync
├── lib/                   # Core business logic
│   ├── types.ts          # TypeScript definitions
│   ├── db.ts             # PostgreSQL database layer
│   ├── redis.ts          # Redis session & state layer
│   ├── socket-context/   # Socket.IO React context & reducer
│   ├── socket-events.ts  # Socket event type definitions
│   ├── notion.ts         # Notion API integration
│   ├── notion-items.ts   # Item catalog sync
│   ├── notion-journal.ts # Session notes sync
│   └── utils.ts          # Helper functions
├── migrations/            # PostgreSQL migrations (18 files)
├── server.ts             # Custom Next.js server with Socket.IO
├── Dockerfile            # Production Docker image
├── Dockerfile.dev        # Development Docker image
├── docker-compose.yml    # Production setup (port 3000)
├── docker-compose.dev.yml # Development setup (port 3001)
└── docker-compose.synology.yml # Synology NAS deployment
```

## API Endpoints

### Campaigns & Characters

| Endpoint | Description |
|----------|-------------|
| `GET/POST /api/campaigns` | Campaign management |
| `GET/PATCH /api/campaigns/[id]` | Campaign details |
| `GET/POST/PATCH/DELETE /api/campaigns/[id]/characters` | Character CRUD |
| `GET/POST /api/campaigns/[id]/combat-monsters` | Combat monsters |
| `GET/POST/PATCH/DELETE /api/campaigns/[id]/fight-presets` | Fight presets |
| `GET /api/campaigns/[id]/room-code` | Room code generation |
| `GET/POST /api/campaigns/[id]/session-notes` | Session notes (Redis) |

### Characters

| Endpoint | Description |
|----------|-------------|
| `PATCH /api/characters/[id]/hp` | Update character HP |
| `PATCH /api/characters/[id]/status` | Update conditions/buffs |
| `GET/PATCH /api/characters/[id]/inventory` | Character inventory |

### Monsters & Items

| Endpoint | Description |
|----------|-------------|
| `GET /api/monsters` | Monster database |
| `GET /api/monsters/[id]` | Monster details |
| `GET /api/items/search` | Item catalog search |

### Notion Integration

| Endpoint | Description |
|----------|-------------|
| `GET /api/notion/sync/preview` | Preview monster sync changes |
| `POST /api/notion/sync/apply` | Apply monster sync |
| `GET /api/notion/items/sync/preview` | Preview item sync changes |
| `POST /api/notion/items/sync/apply` | Apply item sync |
| `POST /api/notion/journal/sync` | Sync session notes to Notion |

### Other

| Endpoint | Description |
|----------|-------------|
| `GET /api/join/[code]` | Get campaign by join code |
| `POST /api/settings/dm-password` | Verify DM password |

## Environment Variables

```env
DATABASE_URL=postgresql://user:pass@localhost:5432/combat_tracker
REDIS_URL=redis://localhost:6379
NOTION_API_KEY=secret_xxx
NOTION_DATABASE_ID=xxx           # Monsters database
NOTION_ITEMS_DATABASE_ID=xxx     # Items database
NOTION_JOURNAL_DATABASE_ID=xxx   # Session notes database
DM_PASSWORD=your_dm_password
```

## Database Migrations

Migrations run automatically on container startup. To create a new migration:

```bash
pnpm migrate:create <migration-name>
```

See `CLAUDE.md` for detailed migration guidelines.

## License

MIT
