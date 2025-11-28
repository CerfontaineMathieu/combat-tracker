# D&D Combat Tracker

A real-time Dungeons & Dragons combat tracking application built with Next.js 16 and React 19. The application supports multiplayer sessions where a Dungeon Master (DM) and players can collaborate in real-time.

> **Note:** The UI is in French.

## Tech Stack

- **Framework:** Next.js 16 with App Router
- **Frontend:** React 19, TypeScript
- **Styling:** Tailwind CSS v4, shadcn/ui (new-york style)
- **Database:** PostgreSQL
- **Real-time:** Socket.IO
- **Drag & Drop:** dnd-kit

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
- **Player Mode (Joueur):** Limited view with character management and dice rolling

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

- **Monster Database:** Browse and search monsters with detailed stat blocks
- **Quick Add:** Drag-and-drop monsters from the database into combat
- **Custom Monsters:** Create monsters on-the-fly
- **Monster Details:** View armor class, hit points, abilities, actions, legendary actions, traits, and more
- **AI-generated Images:** Monsters include generated artwork

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

### Dice Roller

- Support for D4, D6, D8, D10, D12, D20
- Roll history with timestamps
- Critical hit (nat 20) and fumble (nat 1) detection
- Special animations and notifications

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

### Real-time Multiplayer

- WebSocket-based synchronization via Socket.IO
- Campaign room system for session management
- Live player roster with join/disconnect notifications
- Synchronized state for:
  - HP changes
  - Condition updates
  - Combat state
  - Initiative changes
  - Ambient effects

### Responsive Design

- **Mobile:** Tab-based navigation (Players, Combat, Bestiary)
- **Desktop:** 3-column grid layout
- Dark theme with D&D-inspired color palette (gold, crimson, emerald)

## Project Structure

```
├── app/                    # Next.js App Router
│   ├── api/               # API routes
│   └── page.tsx           # Main single-page application
├── components/            # React components
│   ├── ui/               # shadcn/ui base components
│   └── *.tsx             # Feature components
├── hooks/                 # Custom React hooks
├── lib/                   # Utilities and types
│   ├── types.ts          # TypeScript definitions
│   └── utils.ts          # Helper functions
└── server/               # Socket.IO server
```

## API Endpoints

| Endpoint | Description |
|----------|-------------|
| `GET/POST /api/campaigns` | Campaign management |
| `GET/PATCH /api/campaigns/[id]` | Campaign details |
| `GET/PATCH/DELETE /api/campaigns/[id]/characters` | Character CRUD |
| `GET/POST/PATCH/DELETE /api/campaigns/[id]/combat-monsters` | Combat monsters |
| `GET/POST /api/campaigns/[id]/fight-presets` | Fight presets |
| `GET /api/campaigns/[id]/room-code` | Room code generation |
| `GET /api/monsters` | Monster database |
| `GET /api/monsters/[id]` | Monster details |

## License

MIT
