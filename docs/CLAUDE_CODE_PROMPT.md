# Claude Code - Loot Panel Implementation

## Context

You are implementing a real-time loot distribution panel for a D&D combat application. Read the full specification in `LOOT_PANEL_SPEC.md` before starting.

## Key Constraints

1. **Stack**: Next.js 16 (App Router), React 19, TypeScript, Tailwind v4, shadcn/ui (new-york)
2. **Real-time**: WebSocket + Redis pub/sub - all actions must sync across devices
3. **Mobile-first**: Player view must work perfectly on mobile
4. **Existing patterns**: Follow existing codebase patterns for API routes, hooks, and components

## Your Task

Implement the Loot Panel feature following the phased approach in the spec:

### Phase 1: Foundation (Start Here)
```bash
# Create the feature folder structure first
mkdir -p src/features/loot/{api,hooks,stores,components,types,utils}
```

Then:
1. Create `src/features/loot/types/loot.types.ts` with all TypeScript types
2. Create `src/features/loot/utils/currency.utils.ts` with currency helpers
3. Create `src/features/loot/utils/loot.utils.ts` with loot helpers
4. Create `src/features/loot/stores/loot.store.ts` (Zustand)

### Before Writing Code

1. **Explore existing patterns**: Look at how other features handle:
   - API routes (check `src/app/api/`)
   - WebSocket events (search for existing WS handlers)
   - Zustand stores (find existing `.store.ts` files)
   - shadcn/ui usage (check existing components)

2. **Check existing types**: 
   - Character type (for `assignedTo`, `characterId`)
   - Campaign type (for `campaignId`)
   - User type (for `playerId`)
   - Inventory integration points

3. **Database**: Check existing migration patterns before creating new tables

## Component Guidelines

### shadcn/ui Components
```tsx
// Always import from @/components/ui
import { Card, CardContent, CardHeader } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
// etc.
```

### Naming Conventions
- Components: `PascalCase` (e.g., `LootItemCard`)
- Files: `kebab-case` (e.g., `loot-item-card.tsx`)
- Hooks: `use-` prefix (e.g., `use-loot-session.ts`)
- Types: `PascalCase` with descriptive names

### File Structure
Each component folder should have:
```
loot-item/
├── loot-item-card.tsx
├── loot-item-card.test.tsx (optional)
└── index.ts (barrel export)
```

## API Routes Pattern

```tsx
// src/app/api/loot/route.ts
import { NextRequest, NextResponse } from 'next/server'

export async function POST(request: NextRequest) {
  // Validate auth
  // Validate body with zod
  // Create in database
  // Publish to Redis
  // Return response
}
```

## Questions to Ask Yourself

Before implementing each component:
1. Does this component need real-time updates? → Use WebSocket subscription
2. Is this DM-only or player-accessible? → Check permissions
3. Does it need optimistic updates? → Implement with rollback
4. Is it mobile-critical? → Test responsive design first

## Output Format

When implementing, explain:
1. What file you're creating/modifying
2. Why you're making that choice
3. Any assumptions about existing code

## Start Command

```
Read LOOT_PANEL_SPEC.md, explore the existing codebase patterns, then start with Phase 1: Foundation.
```
