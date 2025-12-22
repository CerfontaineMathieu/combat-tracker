# Architecture Map - D&D Combat Tracker

> **Purpose**: Quick reference for Claude sessions to understand the codebase without re-exploring.
> **Last updated**: 2025-12-22

---

## Quick Reference

| Feature | Primary Files |
|---------|---------------|
| Main App Entry | `app/page.tsx` |
| Server (Socket.io) | `server.ts` |
| State Management | `lib/socket-context/` |
| All Types | `lib/types.ts` |
| Database Queries | `lib/db.ts` |
| Socket Events | `lib/socket-events.ts` |
| Notion Integration | `lib/notion.ts`, `lib/notion-items.ts`, `lib/notion-spells.ts` |

---

## Feature → File Mapping

### Core Panels (UI)
| Feature | File | Description |
|---------|------|-------------|
| Combat Tracker | `components/combat-panel.tsx` | Main DM combat interface |
| Combat Setup | `components/combat-setup-panel.tsx` | Initiative & encounter prep |
| Player View | `components/player-panel.tsx` | Player character during combat |
| Character Sheet | `components/my-characters-panel.tsx` | Individual character management |
| Inventory | `components/inventory-manager.tsx` | Equipment, consumables, currency |
| Spellbook | `components/spellbook-panel.tsx` | Spell slots & prepared spells |
| Bestiary | `components/bestiary-panel.tsx` | Monster database browser |
| Loot Distribution | `components/loot/` | Loot claiming & distribution |
| Session Notes | `components/notes-panel.tsx` | Campaign notes |
| Settings | `components/settings-panel.tsx` | Campaign settings & sync |

### Dialogs & Sub-components
| Feature | File |
|---------|------|
| Condition Manager | `components/condition-manager.tsx` |
| Buff Manager | `components/buff-manager.tsx` |
| Spell Picker | `components/spell-picker-dialog.tsx` |
| Item Picker | `components/item-picker-dialog.tsx` |
| Monster Picker | `components/monster-picker-panel.tsx` |
| Fight Presets | `components/fight-presets-panel.tsx` |
| Notion Sync | `components/notion-sync-dialog.tsx` |
| QR Code Join | `components/qr-code-dialog.tsx` |
| Spell Reference (DM) | `components/spell-reference-dialog.tsx` |
| Equipment Silhouette | `components/equipment-silhouette.tsx` |
| Slot Picker | `components/slot-picker-dialog.tsx` |

### Loot System
| Component | File |
|-----------|------|
| Main Panel | `components/loot/loot-panel.tsx` |
| Connected Wrapper | `components/loot/loot-panel-connected.tsx` |
| Item Cards | `components/loot/loot-item-card.tsx` |
| Currency Split | `components/loot/loot-currency.tsx` |
| Roll-off Dialog | `components/loot/roll-off-dialog.tsx` |
| Add Item Dialog | `components/loot/add-loot-item-dialog.tsx` |
| Split Item Dialog | `components/loot/split-item-dialog.tsx` |
| Distribution Summary | `components/loot/distribution-summary.tsx` |
| Utilities | `lib/loot-utils.ts` |

---

## State Management Pattern

```
lib/socket-context/
├── SocketProvider.tsx   # Context provider, socket setup, event listeners
├── reducer.ts           # All state mutations (HP, conditions, combat, loot)
├── types.ts             # SocketState, SocketAction types
├── useSocket.ts         # Hooks: useSocketContext, useMode, useCombatState...
└── index.ts             # Exports
```

**Key hooks:**
- `useSocketContext()` - Full state + actions
- `useSocketState()` - Read-only state
- `useCombatState()` - Combat participants, turn, round
- `useConnectedPlayers()` - Connected player list
- `useMode()` - 'mj' | 'joueur' | null

---

## Key Types (`lib/types.ts`)

### Entities
- `Character` - Player characters (HP, AC, inventory, spells, conditions)
- `Monster` - Enemies with stats and abilities
- `CombatParticipant` - Unified player/monster in combat

### Inventory
- `EquipmentItem` - Weapons, armor (with attunement, slot, slotTypes)
- `ConsumableItem` - Potions, scrolls (with linked spells)
- `MiscItem` - General items with quantity
- `CurrencyInventory` - PP, GP, EP, SP, CP
- `EquipmentSlot` - 7 slots: armor, shield, main-hand, off-hand, ring-1, ring-2, amulet
- `getSlotTypesFromCatalog()` - Auto-detect compatible slots from Notion catalog

### Combat
- `ActiveCondition` - Condition with duration tracking
- `ActiveBuff` - Buff with remaining turns
- `CONDITIONS` - 13 D&D 5e conditions (French)
- `BUFFS` - 26 predefined buffs/debuffs

### Loot
- `LootSession` - Loot pool with status (draft/claiming/resolving/completed)
- `LootItem` - Item with claims, rarity, linkedSpell (scrolls), resistanceType (potions)
- `LootClaim` - Character claim with priority (1-3)
- `LootDistribution` - Final distribution per character after finalization

---

## API Routes (`app/api/`)

### Campaign
- `campaigns/` - List/create campaigns
- `campaigns/[id]/characters/` - Campaign characters
- `campaigns/[id]/combat-session/` - Combat state
- `campaigns/[id]/combat-monsters/` - Monsters in combat
- `campaigns/[id]/fight-presets/` - Preset encounters

### Character
- `characters/[id]/hp/` - HP updates
- `characters/[id]/status/` - Conditions/buffs
- `characters/[id]/inventory/` - Inventory management
- `characters/[id]/prepared-spells/` - Spell preparation

### Notion Sync
- `notion/sync/` - Monster sync
- `notion/items/sync/` - Item catalog sync
- `notion/spells/sync/` - Spell catalog sync

---

## Database

### Migrations
Location: `migrations/` (node-pg-migrate, auto-run on startup)

**Key tables:** characters, monsters, items, spells, campaigns, combat_sessions, inventories, spell_slots, buffs, conditions

### Patterns
- Always use `IF NOT EXISTS` for CREATE
- Always use `ADD COLUMN IF NOT EXISTS` for ALTER
- Never use PL/pgSQL `DO $$` blocks

---

## Socket Events (`lib/socket-events.ts`)

### Server → Client
- `combat-update`, `hp-change`, `initiative-change`
- `condition-add/remove`, `buff-add/remove`, `exhaustion-change`
- `death-save-update`, `temp-hp-change`
- `loot-session-update`, `loot-claim`, `loot-rolloff-*`
- `ambient-effect`, `dm-disconnect/reconnect`

### Client → Server
- Same events (bidirectional updates)
- `join-campaign`, `leave-campaign`

---

## External Integrations

### Notion (Content Management)
- `lib/notion.ts` - Monster database sync
- `lib/notion-items.ts` - Item catalog sync
- `lib/notion-spells.ts` - Spell catalog sync
- Comparison files: `*-comparison.ts` - Detect changes for sync

### Redis (Session State)
- `lib/redis.ts` - DM sessions, combat state, player connections

---

## Directory Structure

```
app/
├── page.tsx              # Main SPA entry (116KB)
├── layout.tsx            # Root layout
├── api/                  # REST endpoints
├── join/                 # Join session route
└── monsters/             # Monster database route

components/
├── ui/                   # shadcn/ui base components (59 files)
├── loot/                 # Loot system components
└── *.tsx                 # Feature panels & dialogs

lib/
├── socket-context/       # State management
├── types.ts              # All TypeScript types
├── db.ts                 # PostgreSQL queries
├── socket-events.ts      # Socket.io events
├── loot-utils.ts         # Loot utilities
└── notion*.ts            # Notion integration

migrations/               # Database migrations (24 files)
public/                   # Static assets (monsters/, sounds/)
hooks/                    # Custom React hooks
```

---

## Development Notes

- **Language**: UI is in French
- **Docker required**: `docker-compose.dev.yml` for dev
- **Hot reload**: Enabled via volume mounts
- **Ports**: Dev 3001, Prod 3000

---

## Recent Work

- **2025-12-22**: Visual inventory with equipment silhouette (`feature/visual-inventory` branch)
  - Character silhouette showing 7 equipment slots (armor, shield, main-hand, off-hand, 2 rings, amulet)
  - Click on slot to equip/unequip items via dialog
  - Auto-detect equipment slot type from Notion database Type field
  - "Équiper" button for one-click auto-equipping to first available slot
  - Files: `components/equipment-silhouette.tsx`, `components/slot-picker-dialog.tsx`, `components/inventory-manager.tsx`, `lib/types.ts`, `lib/notion-items.ts`

- **2025-12-15**: DM Spell Reference dialog (`feat/mj-spellbook` branch)
  - Added BookOpen icon in DM header to open spell catalog
  - Read-only spell browsing with search and level filters
  - Files: `components/spell-reference-dialog.tsx`, `components/header.tsx`

- **2025-12-15**: Loot item unassign feature (`feat/loot` branch)
  - DM can unassign items back to unclaimed pool via "Retirer" button
  - Unassigned items stack back with identical unclaimed items (no duplicates)
  - Files: `components/loot/loot-item-card.tsx`, `server.ts`, `lib/socket-context/`, `lib/socket-events.ts`

- **2025-12-13**: Loot system enhancements (`feat/loot` branch)
  - Item splitting for multi-quantity items (e.g., 4 potions → split between players)
  - Scroll linkedSpell and resistance potion type now persist through loot distribution
  - Files: `components/loot/split-item-dialog.tsx`, `server.ts`, `lib/socket-events.ts`

- **2025-12-12**: Loot system feature (`feat/loot` branch)
  - Files: `components/loot/`, `lib/loot-utils.ts`, `lib/types.ts`, `lib/socket-events.ts`
