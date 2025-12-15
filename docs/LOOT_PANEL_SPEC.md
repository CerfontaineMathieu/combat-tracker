# 🏆 Loot Panel Feature - Technical Specification

## Overview

Implement an interactive loot distribution panel that allows players to claim items after combat and the DM to resolve contested items. The system must be real-time synchronized across all connected devices.

---

## Tech Stack Context

```
- Next.js 16 with App Router
- React 19
- TypeScript
- Tailwind CSS v4
- shadcn/ui (new-york style) with Radix UI primitives
- PostgreSQL (database)
- Redis (pub/sub + cache)
- WebSocket (real-time sync)
- LocalStorage (offline persistence)
```

---

## Feature Requirements

### User Stories

**As a DM, I want to:**
- Create a loot session after combat (manual entry or from templates)
- Add currency (gold, silver, copper) to the pool
- Add items (weapons, armor, potions, scrolls, misc) to the pool
- See in real-time which players are claiming which items
- Resolve contested items (assign manually OR trigger a roll-off)
- Split currency equally or manually between characters
- Mark items as "group treasury" if nobody claims them
- Finalize distribution (items go to character inventories)

**As a Player, I want to:**
- See the loot pool in real-time
- Claim items I want (with 1-3 priority levels via 👍)
- Add a note explaining why I want an item
- See who else is claiming the same items
- See the roll-off results for contested items
- See my final loot summary before it's added to my inventory

### Functional Requirements

1. **Real-time sync**: All actions must be visible to all connected clients within 200ms
2. **Optimistic UI**: Claims should appear instantly, with rollback on error
3. **Conflict resolution**: Support for manual assignment AND roll-off (d20)
4. **Currency splitting**: Auto-calculate equal split with remainder handling
5. **Mobile responsive**: Must work on mobile player view
6. **Persistence**: Session survives page refresh via Redis cache + localStorage

---

## Database Schema (PostgreSQL)

```sql
-- Sessions de loot (une par combat/événement)
CREATE TABLE loot_sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  combat_id UUID REFERENCES combats(id),
  campaign_id UUID REFERENCES campaigns(id) NOT NULL,
  
  status VARCHAR(20) NOT NULL DEFAULT 'claiming' 
    CHECK (status IN ('draft', 'claiming', 'resolving', 'completed', 'cancelled')),
  
  -- Currency pool
  gold INTEGER DEFAULT 0,
  silver INTEGER DEFAULT 0,
  copper INTEGER DEFAULT 0,
  currency_split_method VARCHAR(10) DEFAULT 'equal' 
    CHECK (currency_split_method IN ('equal', 'manual')),
  
  -- Optional timer
  claiming_deadline TIMESTAMPTZ,
  
  created_by UUID REFERENCES users(id) NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  completed_at TIMESTAMPTZ
);

-- Items in loot pool
CREATE TABLE loot_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id UUID REFERENCES loot_sessions(id) ON DELETE CASCADE,
  
  -- Optional reference to item template
  item_template_id UUID REFERENCES item_templates(id),
  
  -- Or custom item
  name VARCHAR(255) NOT NULL,
  description TEXT,
  item_type VARCHAR(50) NOT NULL 
    CHECK (item_type IN ('weapon', 'armor', 'potion', 'scroll', 'wondrous', 'currency', 'misc')),
  rarity VARCHAR(20) DEFAULT 'common'
    CHECK (rarity IN ('common', 'uncommon', 'rare', 'very_rare', 'legendary', 'artifact')),
  
  quantity INTEGER DEFAULT 1,
  is_identified BOOLEAN DEFAULT true,
  estimated_value_gp INTEGER,
  
  -- Resolution status
  status VARCHAR(20) DEFAULT 'unclaimed'
    CHECK (status IN ('unclaimed', 'contested', 'assigned', 'treasury', 'sold')),
  assigned_to UUID REFERENCES characters(id),
  
  created_at TIMESTAMPTZ DEFAULT NOW(),
  resolved_at TIMESTAMPTZ
);

-- Player claims
CREATE TABLE loot_claims (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  item_id UUID REFERENCES loot_items(id) ON DELETE CASCADE,
  character_id UUID REFERENCES characters(id) NOT NULL,
  player_id UUID REFERENCES users(id) NOT NULL,
  
  priority INTEGER DEFAULT 1 CHECK (priority BETWEEN 1 AND 3),
  note TEXT,
  
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  
  UNIQUE(item_id, character_id)
);

-- Final distribution (history + stats)
CREATE TABLE loot_distributions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id UUID REFERENCES loot_sessions(id) ON DELETE CASCADE,
  character_id UUID REFERENCES characters(id) NOT NULL,
  
  gold_received INTEGER DEFAULT 0,
  silver_received INTEGER DEFAULT 0,
  copper_received INTEGER DEFAULT 0,
  
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Items linked to distribution
CREATE TABLE loot_distribution_items (
  distribution_id UUID REFERENCES loot_distributions(id) ON DELETE CASCADE,
  item_id UUID REFERENCES loot_items(id) ON DELETE CASCADE,
  quantity INTEGER DEFAULT 1,
  PRIMARY KEY (distribution_id, item_id)
);

-- Indexes
CREATE INDEX idx_loot_sessions_campaign ON loot_sessions(campaign_id);
CREATE INDEX idx_loot_sessions_status ON loot_sessions(status);
CREATE INDEX idx_loot_items_session ON loot_items(session_id);
CREATE INDEX idx_loot_claims_item ON loot_claims(item_id);
CREATE INDEX idx_loot_claims_character ON loot_claims(character_id);
```

---

## Redis Keys Structure

```typescript
// Live session state (cache + pub/sub)
`loot:session:{sessionId}` → JSON LootSession (TTL: 24h)

// Pub/sub channel for real-time updates
`loot:channel:{sessionId}` → WebSocket events

// Optimistic lock for race condition prevention
`loot:lock:{itemId}` → visibilityId (TTL: 30s)

// Claims cache for fast display
`loot:claims:{sessionId}` → Hash { visibilityId: JSON[] }
```

---

## TypeScript Types

```typescript
// ============ DOMAIN TYPES ============

type LootSessionStatus = 'draft' | 'claiming' | 'resolving' | 'completed' | 'cancelled';
type LootItemType = 'weapon' | 'armor' | 'potion' | 'scroll' | 'wondrous' | 'currency' | 'misc';
type LootItemRarity = 'common' | 'uncommon' | 'rare' | 'very_rare' | 'legendary' | 'artifact';
type LootItemStatus = 'unclaimed' | 'contested' | 'assigned' | 'treasury' | 'sold';
type CurrencySplitMethod = 'equal' | 'manual';

interface Currency {
  gold: number;
  silver: number;
  copper: number;
}

interface LootSession {
  id: string;
  visibilityId: string;
  combatId?: string;
  campaignId: string;
  status: LootSessionStatus;
  currency: Currency;
  currencySplitMethod: CurrencySplitMethod;
  claimingDeadline?: Date;
  createdBy: string;
  createdAt: Date;
  completedAt?: Date;
  items: LootItem[];
}

interface LootItem {
  id: string;
  sessionId: string;
  itemTemplateId?: string;
  name: string;
  description?: string;
  itemType: LootItemType;
  rarity: LootItemRarity;
  quantity: number;
  isIdentified: boolean;
  estimatedValueGp?: number;
  status: LootItemStatus;
  assignedTo?: string;
  claims: LootClaim[];
  createdAt: Date;
  resolvedAt?: Date;
}

interface LootClaim {
  id: string;
  itemId: string;
  characterId: string;
  playerId: string;
  characterName: string; // Denormalized for display
  characterAvatar?: string; // Denormalized for display
  priority: 1 | 2 | 3;
  note?: string;
  createdAt: Date;
  updatedAt: Date;
}

interface LootDistribution {
  id: string;
  sessionId: string;
  characterId: string;
  characterName: string;
  currency: Currency;
  items: Array<{
    itemId: string;
    name: string;
    quantity: number;
  }>;
}

interface RollOffResult {
  itemId: string;
  rolls: Array<{
    characterId: string;
    characterName: string;
    roll: number; // 1-20
  }>;
  winnerId: string;
  winnerName: string;
}

// ============ WEBSOCKET EVENTS ============

// Client → Server
type WS_ClientEvent =
  | { type: 'loot:claim'; payload: { sessionId: string; itemId: string; priority: 1 | 2 | 3; note?: string } }
  | { type: 'loot:unclaim'; payload: { sessionId: string; itemId: string } }
  | { type: 'loot:assign'; payload: { sessionId: string; itemId: string; characterId: string; quantity?: number } }
  | { type: 'loot:to-treasury'; payload: { sessionId: string; itemId: string } }
  | { type: 'loot:rolloff'; payload: { sessionId: string; itemId: string; participantIds: string[] } }
  | { type: 'loot:update-currency'; payload: { sessionId: string; currency: Partial<Currency>; splitMethod?: CurrencySplitMethod } }
  | { type: 'loot:finalize'; payload: { sessionId: string } }
  | { type: 'loot:cancel'; payload: { sessionId: string } };

// Server → Client
type WS_ServerEvent =
  | { type: 'loot:session:update'; payload: { sessionId: string; changes: Partial<LootSession> } }
  | { type: 'loot:item:update'; payload: { sessionId: string; item: LootItem } }
  | { type: 'loot:claim:update'; payload: { sessionId: string; itemId: string; claims: LootClaim[] } }
  | { type: 'loot:item:assigned'; payload: { sessionId: string; itemId: string; assignedTo: { characterId: string; characterName: string } } }
  | { type: 'loot:rolloff:result'; payload: { sessionId: string; result: RollOffResult } }
  | { type: 'loot:completed'; payload: { sessionId: string; distributions: LootDistribution[] } }
  | { type: 'loot:error'; payload: { sessionId: string; error: string; code: string } };

// ============ API TYPES ============

interface CreateLootSessionRequest {
  campaignId: string;
  combatId?: string;
  currency?: Currency;
  items?: Array<{
    name: string;
    description?: string;
    itemType: LootItemType;
    rarity?: LootItemRarity;
    quantity?: number;
    isIdentified?: boolean;
    estimatedValueGp?: number;
  }>;
  claimingDeadlineMinutes?: number;
}

interface AddLootItemRequest {
  sessionId: string;
  itemTemplateId?: string;
  name: string;
  description?: string;
  itemType: LootItemType;
  rarity?: LootItemRarity;
  quantity?: number;
  isIdentified?: boolean;
  estimatedValueGp?: number;
}
```

---

## File Structure

```
src/
├── features/
│   └── loot/
│       ├── api/
│       │   ├── loot.api.ts           # REST API calls
│       │   └── loot.ws.ts            # WebSocket event handlers
│       │
│       ├── hooks/
│       │   ├── use-loot-session.ts   # Main hook - fetches & subscribes to session
│       │   ├── use-loot-claims.ts    # Manage claims for current player
│       │   ├── use-loot-realtime.ts  # WebSocket subscription logic
│       │   └── use-loot-actions.ts   # Actions: claim, assign, rolloff, finalize
│       │
│       ├── stores/
│       │   └── loot.store.ts         # Zustand store for local state
│       │
│       ├── components/
│       │   ├── loot-panel/
│       │   │   ├── loot-panel.tsx              # Main container
│       │   │   ├── loot-panel-header.tsx       # Timer + status badge
│       │   │   ├── loot-panel-skeleton.tsx     # Loading state
│       │   │   └── index.ts
│       │   │
│       │   ├── loot-currency/
│       │   │   ├── currency-pool.tsx           # Display gold/silver/copper
│       │   │   ├── currency-split-preview.tsx  # Show split per character
│       │   │   ├── currency-input.tsx          # DM edit input
│       │   │   └── index.ts
│       │   │
│       │   ├── loot-item/
│       │   │   ├── loot-item-card.tsx          # Single item card
│       │   │   ├── loot-item-claims.tsx        # Avatars of claimants
│       │   │   ├── loot-item-actions.tsx       # Claim/Assign buttons
│       │   │   ├── loot-item-status-badge.tsx  # Status indicator
│       │   │   ├── loot-item-list.tsx          # List of all items
│       │   │   └── index.ts
│       │   │
│       │   ├── loot-claim/
│       │   │   ├── claim-button.tsx            # 👍 button with priority
│       │   │   ├── claim-priority-select.tsx   # 1-3 thumbs selector
│       │   │   ├── claim-note-input.tsx        # Optional note
│       │   │   ├── claim-avatars.tsx           # Show who claimed
│       │   │   └── index.ts
│       │   │
│       │   ├── loot-resolution/
│       │   │   ├── assign-dropdown.tsx         # DM dropdown to assign
│       │   │   ├── rolloff-dialog.tsx          # Roll-off modal
│       │   │   ├── roll-animation.tsx          # Dice roll animation
│       │   │   └── index.ts
│       │   │
│       │   ├── loot-summary/
│       │   │   ├── distribution-summary.tsx    # Final summary view
│       │   │   ├── character-loot-card.tsx     # Per-character breakdown
│       │   │   ├── treasury-section.tsx        # Group treasury items
│       │   │   └── index.ts
│       │   │
│       │   └── loot-dm/
│       │       ├── loot-dm-panel.tsx           # Full DM control panel
│       │       ├── add-item-dialog.tsx         # Add item modal
│       │       ├── loot-controls.tsx           # Pause/Resume/Finalize
│       │       └── index.ts
│       │
│       ├── types/
│       │   └── loot.types.ts                   # All TypeScript types
│       │
│       └── utils/
│           ├── currency.utils.ts               # splitCurrency, formatCurrency, etc.
│           └── loot.utils.ts                   # getItemStatus, sortByPriority, etc.
│
├── app/
│   └── api/
│       └── loot/
│           ├── route.ts                        # POST create session
│           ├── [sessionId]/
│           │   ├── route.ts                    # GET session, PATCH update, DELETE cancel
│           │   ├── items/
│           │   │   ├── route.ts                # POST add item
│           │   │   └── [itemId]/
│           │   │       └── route.ts            # PATCH update item, DELETE remove
│           │   ├── claims/
│           │   │   └── route.ts                # POST claim, DELETE unclaim
│           │   ├── assign/
│           │   │   └── route.ts                # POST assign item
│           │   ├── rolloff/
│           │   │   └── route.ts                # POST trigger rolloff
│           │   └── finalize/
│           │       └── route.ts                # POST finalize distribution
```

---

## UI Wireframes

### Player View (Mobile)

```
┌─────────────────────────────┐
│ ←  🏆 Loot Distribution     │
│                    ⏱️ 1:34  │
├─────────────────────────────┤
│                             │
│ 💰 CURRENCY                 │
│ ┌─────────────────────────┐ │
│ │ Your share: 37 GP       │ │
│ │ (equal split of 150 GP) │ │
│ └─────────────────────────┘ │
│                             │
│ 📦 ITEMS                    │
│                             │
│ ┌─────────────────────────┐ │
│ │ 🧪 Potion of Healing    │ │
│ │ Superior (x2)           │ │
│ │ ───────────────────     │ │
│ │ Claims:                 │ │
│ │ [👤Draz 👍] [👤Val 👍👍]│ │
│ │         "I have none!"  │ │
│ │                         │ │
│ │ ┌─────────────────────┐ │ │
│ │ │ 👍  Want (1)        │ │ │
│ │ │ 👍👍 Want (2)       │ │ │
│ │ │ 👍👍👍 NEED (3)     │ │ │
│ │ └─────────────────────┘ │ │
│ │ [Add note...]           │ │
│ └─────────────────────────┘ │
│                             │
│ ┌─────────────────────────┐ │
│ │ 📜 Scroll of Fireball   │ │
│ │ ✅ Assigned to Elario   │ │
│ └─────────────────────────┘ │
│                             │
│ ┌─────────────────────────┐ │
│ │ ⚔️ Longsword +1         │ │
│ │ 😴 No claims            │ │
│ │ → Group Treasury        │ │
│ └─────────────────────────┘ │
│                             │
├─────────────────────────────┤
│ 🎒 YOUR LOOT THIS SESSION:  │
│ • 37 GP                     │
│ • (pending...)              │
└─────────────────────────────┘
```

### DM View (Desktop)

```
┌────────────────────────────────────────────────────────────────────────────┐
│ 🏆 Loot Distribution                              ⏱️ 1:34   [⏸️] [Cancel] │
├────────────────────────────────────────────────────────────────────────────┤
│                                                                            │
│ ┌─── LOOT POOL ─────────────────────┐  ┌─── CLAIMS & RESOLUTION ────────┐ │
│ │                                   │  │                                │ │
│ │ 💰 Currency                       │  │ 🧪 Potion of Healing Sup. (x2) │ │
│ │ ┌─────────────────────────────┐   │  │ STATUS: 🔥 Contested           │ │
│ │ │ 150 GP  │ 230 SP  │ 50 CP   │   │  │                                │ │
│ │ └─────────────────────────────┘   │  │ Claims:                        │ │
│ │ [x] Equal split  [ ] Manual       │  │ ├─ Drazhar: 👍 (want)          │ │
│ │                                   │  │ └─ Val: 👍👍 "I have none!"   │ │
│ │ Preview:                          │  │                                │ │
│ │ Ajax: 37 GP | Draz: 38 GP         │  │ [Assign to Val ▼]              │ │
│ │ Val: 37 GP | Elario: 38 GP        │  │ [🎲 Roll-off]                  │ │
│ │                                   │  │                                │ │
│ │ ────────────────────────────────  │  │ ────────────────────────────── │ │
│ │                                   │  │                                │ │
│ │ 📦 Items              [+ Add]     │  │ ⚔️ Longsword +1                │ │
│ │ ┌─────────────────────┬────────┐  │  │ STATUS: 😴 Unclaimed           │ │
│ │ │ 🧪 Potion Heal x2   │ 🔥     │  │  │                                │ │
│ │ │ 📜 Scroll Fireball  │ ✅     │  │  │ No one wants this item.        │ │
│ │ │ ⚔️ Longsword +1     │ 😴     │  │  │                                │ │
│ │ │ 🔮 Amulet ???       │ 🔒     │  │  │ [→ Group Treasury]             │ │
│ │ └─────────────────────┴────────┘  │  │ [→ Force Assign]               │ │
│ │                                   │  │ [→ Sell (75 GP)]               │ │
│ │ Legend:                           │  │                                │ │
│ │ 🔥 Contested  ✅ Assigned         │  └────────────────────────────────┘ │
│ │ 😴 Unclaimed  🔒 Unidentified     │                                     │
│ └───────────────────────────────────┘                                     │
│                                                                            │
├────────────────────────────────────────────────────────────────────────────┤
│ 📊 DISTRIBUTION PREVIEW                                                    │
│ ┌───────────┬───────────┬───────────┬───────────┬─────────────┐           │
│ │   Ajax    │  Drazhar  │ Valethana │  Elario   │  Treasury   │           │
│ ├───────────┼───────────┼───────────┼───────────┼─────────────┤           │
│ │  37 GP    │  38 GP    │  37 GP    │  38 GP    │             │           │
│ │           │           │ Potion x2 │ Scroll    │ Sword +1    │           │
│ │           │           │           │           │ Amulet      │           │
│ └───────────┴───────────┴───────────┴───────────┴─────────────┘           │
│                                                                            │
│                            [✅ Finalize Distribution]                      │
└────────────────────────────────────────────────────────────────────────────┘
```

---

## shadcn/ui Components to Use

| Component | Usage |
|-----------|-------|
| `Card`, `CardHeader`, `CardContent` | Item cards |
| `Badge` | Status indicators (contested, assigned, etc.) |
| `Avatar`, `AvatarGroup` | Player claim avatars |
| `Button` | Actions (claim, assign, finalize) |
| `Dialog`, `DialogContent` | Roll-off modal, add item modal |
| `DropdownMenu` | DM assign dropdown |
| `Input` | Currency input, note input |
| `Tooltip` | Player notes on hover |
| `Progress` | Timer countdown |
| `Tabs`, `TabsList`, `TabsTrigger` | Currency / Items / Summary tabs |
| `Toast` / `Sonner` | Real-time notifications |
| `Skeleton` | Loading states |
| `RadioGroup` | Priority selection (1-3) |
| `Separator` | Visual dividers |

---

## Implementation Order

### Phase 1: Foundation
1. [x] Create TypeScript types (`lib/types.ts`)
2. [x] Create database migrations (`migrations/1765570500000_add-loot-system.sql`)
3. [x] Socket context integration (using `SocketProvider` instead of Zustand)
4. [x] Create utility functions (`lib/loot-utils.ts`)

### Phase 2: API Layer
5. [x] WebSocket event handlers (`server.ts` - in-memory loot session management)
6. [x] Socket events defined (`lib/socket-events.ts`)
7. [x] Socket context actions (`lib/socket-context/SocketProvider.tsx`)
8. [x] Socket context types (`lib/socket-context/types.ts`)

### Phase 3: Hooks
9. [x] Using `useSocketContext()` for session state
10. [x] Real-time via socket event listeners in SocketProvider
11. [x] Claims handled via socket context
12. [x] Actions via socket context (createLootSession, claimLootItem, etc.)

### Phase 4: Core UI Components
13. [x] `loot-panel.tsx` + `loot-panel-connected.tsx`
14. [x] `loot-item-card.tsx` + status badge
15. [x] Claim button with priority select (in loot-item-card)
16. [x] Claim avatars (in loot-item-card)
17. [x] `loot-currency.tsx` (currency pool + split preview)

### Phase 5: DM Components
18. [x] DM panel integrated in `loot-panel.tsx`
19. [x] `add-loot-item-dialog.tsx`
20. [x] Assign dropdown (in loot-item-card)
21. [x] Loot controls (create/cancel/finalize in loot-panel)

### Phase 6: Resolution
22. [x] `roll-off-dialog.tsx`
23. [x] Roll animation (in roll-off-dialog)
24. [x] Roll-off via WebSocket (server.ts)

### Phase 7: Summary & Finalization
25. [x] `distribution-summary.tsx`
26. [x] `character-loot-card.tsx`
27. [x] `treasury-section.tsx`
28. [x] Finalization API + inventory integration (`server.ts` loot-finalize handler)

### Phase 8: Polish
29. [x] Loading states and skeletons (`loot-panel-skeleton.tsx`)
30. [x] Error handling and toasts (loot-error in SocketProvider + toasts in loot-panel-connected)
31. [x] Mobile responsive tweaks (touch-target, hidden labels on mobile)
32. [x] Accessibility (aria-labels, role="article" on cards)

### Phase 9: Integration (NEW)
33. [x] Integrate loot panel in `app/page.tsx`
34. [x] Add loot tab to mobile navigation
35. [x] Add loot panel to desktop layout (fixed sidebar when loot session active)

---

## Key Implementation Notes

### Currency Splitting Algorithm

```typescript
function splitCurrencyEqually(currency: Currency, characterCount: number): Map<string, Currency> {
  // Convert everything to copper for accurate splitting
  const totalCopper = (currency.gold * 100) + (currency.silver * 10) + currency.copper;
  const perCharacterCopper = Math.floor(totalCopper / characterCount);
  const remainder = totalCopper % characterCount;
  
  // Convert back to GP/SP/CP
  const perCharacter: Currency = {
    gold: Math.floor(perCharacterCopper / 100),
    silver: Math.floor((perCharacterCopper % 100) / 10),
    copper: perCharacterCopper % 10,
  };
  
  // Distribute remainder to first N characters (1 copper each)
  // ... implementation
}
```

### Optimistic Updates Pattern

```typescript
// In claim handler
async function handleClaim(itemId: string, priority: 1 | 2 | 3) {
  // 1. Optimistic update
  store.addClaimOptimistic(itemId, { priority, characterId: currentCharacterId });
  
  try {
    // 2. Send to server
    await api.claim(sessionId, itemId, priority);
    // 3. Server will broadcast via WebSocket, no need to update locally
  } catch (error) {
    // 4. Rollback on error
    store.removeClaimOptimistic(itemId, currentCharacterId);
    toast.error('Failed to claim item');
  }
}
```

### WebSocket Reconnection

```typescript
// Handle reconnection and state sync
function useLootRealtime(sessionId: string) {
  useEffect(() => {
    const ws = connectToLootChannel(sessionId);
    
    ws.on('connect', async () => {
      // Refetch full state on reconnect to ensure sync
      const session = await api.getSession(sessionId);
      store.setSession(session);
    });
    
    ws.on('loot:*', (event) => {
      store.applyEvent(event);
    });
    
    return () => ws.disconnect();
  }, [sessionId]);
}
```

---

## Testing Checklist

- [ ] Player can claim an item
- [ ] Player can change claim priority
- [ ] Player can add/edit note on claim
- [ ] Player can unclaim an item
- [ ] Multiple players claiming shows all avatars
- [ ] DM can add currency
- [ ] DM can add items manually
- [ ] DM can assign item to player
- [ ] DM can send item to treasury
- [ ] DM can trigger roll-off
- [ ] Roll-off shows animated results
- [ ] Roll-off assigns to winner
- [ ] Currency splits equally (verify math)
- [ ] Finalize moves items to inventory
- [ ] State syncs across multiple devices
- [ ] Reconnection restores full state
- [ ] Mobile layout works correctly
- [ ] Timer countdown works
- [ ] All loading states show skeletons
