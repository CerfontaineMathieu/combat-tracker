# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

D&D Combat Tracker - A real-time Dungeons & Dragons combat tracking application built with Next.js 16 and React 19. The UI is in French.

## Docker Environment (Required)

**Always use Docker for development and production.** Do not run the Node server directly on the host machine.

### Development Environment
```bash
docker-compose -f docker-compose.dev.yml up --build
```
- App: http://localhost:3001
- PostgreSQL: localhost:5433
- Hot-reload enabled via volume mounts
- **Claude should rebuild dev docker when needed for testing**

### Production Environment
```bash
docker-compose up --build
```
- App: http://localhost:3000
- PostgreSQL: localhost:5432
- **Do not rebuild production docker - user handles this manually**

Both environments can run in parallel thanks to different ports.

## Commands (inside container)

```bash
pnpm dev      # Start development server
pnpm build    # Production build
pnpm lint     # Run ESLint
pnpm start    # Start production server
pnpm migrate  # Run pending database migrations
pnpm migrate:create <name>  # Create new migration
```

## Database Migrations (IMPORTANT)

**CRITICAL: Always create a migration file when modifying the database schema.**

This project uses `node-pg-migrate` for database migrations. Migrations run automatically on container startup.

### When to create a migration

You MUST create a migration file when:
- Creating a new table
- Adding/removing/modifying columns
- Adding/removing indexes
- Adding/removing constraints
- Modifying existing table structure

### How to create a migration

```bash
# Inside container or with DATABASE_URL set
pnpm migrate:create add-player-notes
```

This creates `migrations/TIMESTAMP_add-player-notes.sql`. Edit it:

```sql
-- Create new table
CREATE TABLE IF NOT EXISTS player_notes (
    id SERIAL PRIMARY KEY,
    character_id INTEGER REFERENCES characters(id) ON DELETE CASCADE,
    content TEXT NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_player_notes_character ON player_notes(character_id);
```

### Rules for migrations

1. **Always use `IF NOT EXISTS`** for CREATE TABLE/INDEX statements
2. **Use DO $$ blocks** for ALTER TABLE to check if column exists first
3. **Never modify existing migrations** - create a new one instead
4. **Commit migration files** with your feature code

### Example: Adding a column safely

```sql
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name = 'characters' AND column_name = 'new_column'
    ) THEN
        ALTER TABLE characters ADD COLUMN new_column VARCHAR(100);
    END IF;
END $$;
```

### Migration files location

- `migrations/` - Active migrations (run automatically)
- `docker/init-db-archive/` - Old SQL files (reference only)

## Architecture

**Tech Stack:**
- Next.js 16 with App Router
- React 19
- TypeScript
- Tailwind CSS v4
- shadcn/ui (new-york style) with Radix UI primitives

**Directory Structure:**
- `app/` - Next.js App Router pages (single page app in `page.tsx`)
- `components/` - React components
  - `ui/` - shadcn/ui base components
  - Root level: feature-specific panels (combat, player, bestiary, etc.)
- `lib/` - Utilities (`utils.ts`) and type definitions (`types.ts`)
- `hooks/` - Custom React hooks

**Main Application Flow:**
The app is a single-page client component (`app/page.tsx`) that manages:
- Two modes: DM (`mj`) and Player (`joueur`)
- Character/player management with HP, AC, conditions, initiative
- Monster/bestiary management
- Combat tracking with initiative order
- Dice rolling with history
- Session notes

**Key Types (`lib/types.ts`):**
- `Character` - Player characters
- `Monster` - Enemies/NPCs
- `CombatParticipant` - Unified combat entity (player or monster)
- `Note` - Supporting features

**Path Aliases:**
- `@/` maps to project root (configured in `tsconfig.json`)