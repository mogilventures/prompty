# Codebase Cleanup Status

Last updated: January 2026

## Overview

This document tracks the progress of the codebase cleanup initiative. All phases are now **complete**.

---

## Completed Phases

### Phase 1: Quick Wins ✅

| Task | Status | Details |
|------|--------|---------|
| 1.1 Consolidate Duplicate Hooks | ✅ Done | Deleted `use-mobile.tsx`, added `useIsMobile()` wrapper to `useMobileDetection.ts` |
| 1.2 Standardize Hook Naming | ✅ Done | Renamed 4 hooks from kebab-case to camelCase |
| 1.3 Relocate Demo Files | ✅ Done | Moved 4 demo files to `src/dev/`, added dev-only routing |
| 1.4 Remove Unused Timer | ✅ Done | Deleted `src/features/game/Timer.tsx` (13 lines) |

**Files renamed:**
- `use-auth.ts` → `useAuth.ts`
- `use-game.ts` → `useGame.ts`
- `use-room.ts` → `useRoom.ts`
- `use-toast.ts` → `useToast.ts`

**Files moved to `src/dev/`:**
- `TestLogin.tsx`
- `ImageGridDemo.tsx`
- `TimerDemo.tsx`
- `InteractionsStyleGuide.tsx`

---

### Phase 5: Audit & Remove Unused Code ✅

| Task | Status | Details |
|------|--------|---------|
| 5.1 Audit shadcn/ui Components | ✅ Done | Removed 23 unused components |
| 5.2 Centralize Mock Data | ⏭️ Skipped | Low priority, can be done later |
| 5.3 Centralize Constants | ⏭️ Skipped | Low priority, can be done later |

**Removed shadcn/ui components:**
- accordion, alert-dialog, alert, aspect-ratio, breadcrumb
- calendar, carousel, chart, checkbox, command
- context-menu, drawer, hover-card, input-otp
- navigation-menu, pagination, radio-group, resizable
- scroll-area, table, tabs, toggle, toggle-group

**Removed other unused components:**
- `src/components/retro/RetroButton.tsx`
- `src/components/retro/RetroCard.tsx`

---

### Phase 2: Component Consolidation ✅

| Task | Status | Details |
|------|--------|---------|
| 2.1 Consolidate Button Components | ✅ Done | Removed RetroButton, kept base + 8bit variants |
| 2.2 Consolidate Timer Components | ⏭️ Evaluated | Kept separate - serve different purposes |
| 2.3 Split MicroInteractions | ⏭️ Deferred | Optional improvement, not critical |

**Decision on Timer components:**
- `src/components/game/Timer.tsx` - Full-featured game timer with animations
- `src/components/game/GameTimer.tsx` - Simpler wrapper component
- Both serve distinct purposes and are used in different contexts

---

### Phase 3: Large Component Refactoring ✅

| Task | Status | Details |
|------|--------|---------|
| 3.1 Split ImageGallery | ✅ Done | 652 lines → modular components |
| 3.2 Extract Shared Phase Logic | ✅ Done | Created shared types and hooks |
| 3.3 Split RoomSettings | ✅ Done | 531 lines → modular components |

**ImageGallery refactoring (`src/components/game/gallery/`):**
- `types.ts` - Shared type definitions
- `LazyImage.tsx` - Lazy loading with intersection observer
- `ImageCard.tsx` - Individual gallery card
- `Lightbox.tsx` - Fullscreen viewer with zoom/pan
- `ImageGallery.tsx` - Main component (~100 lines)
- `index.ts` - Barrel exports

**Game types and hooks (`src/features/game/`):**
- `types.ts` - GameState, Player, RoundInfo interfaces + GAME_CONFIG constants
- `hooks/usePhaseState.ts` - Reusable phase state logic
- `hooks/index.ts` - Barrel exports

**RoomSettings refactoring (`src/components/room/settings/`):**
- `types.ts` - RoomSettings, Preset interfaces + defaultSettings
- `SettingsSlider.tsx` - Reusable slider with tooltip
- `SettingsPresets.tsx` - Preset buttons grid
- `AdvancedSettings.tsx` - Collapsible advanced options
- `SavePresetDialog.tsx` - Dialog for saving presets
- `index.ts` - Barrel exports

---

### Phase 4: Backend Cleanup ✅

| Task | Status | Details |
|------|--------|---------|
| 4.1 Reorganize rooms.ts | ✅ Done | Split 456 lines into 6 modular files |
| 4.2 Consolidate Generation Logic | ✅ Evaluated | NOT duplicates - complementary files |
| 4.3 Relocate Testing Utilities | ✅ Done | Moved to `convex/__tests__/` |

**rooms.ts split (`convex/rooms/`):**
- `helpers.ts` - Room code generation utility
- `create.ts` - `createRoom` mutation
- `join.ts` - `joinRoom` mutation
- `state.ts` - `getRoomState`, `getPublicRooms` queries
- `players.ts` - `leaveRoom`, `kickPlayer` mutations
- `settings.ts` - `updateRoomSettings` mutation
- `index.ts` - Barrel exports

**API path changes:**
| Old Path | New Path |
|----------|----------|
| `api.rooms.createRoom` | `api.rooms.create.createRoom` |
| `api.rooms.joinRoom` | `api.rooms.join.joinRoom` |
| `api.rooms.getRoomState` | `api.rooms.state.getRoomState` |
| `api.rooms.getPublicRooms` | `api.rooms.state.getPublicRooms` |
| `api.rooms.leaveRoom` | `api.rooms.players.leaveRoom` |
| `api.rooms.kickPlayer` | `api.rooms.players.kickPlayer` |
| `api.rooms.updateRoomSettings` | `api.rooms.settings.updateRoomSettings` |

**Generation logic evaluation:**
- `convex/game/generation.ts` - Database operations (V8 runtime)
- `convex/generate/generate.ts` - AI API calls (Node.js runtime)
- These are **complementary**, not duplicates. The Node action calls AI APIs and stores results via the game mutations.

**Testing utilities relocated:**
- `convex/testing.ts` → `convex/__tests__/fixtures.ts`
- `convex/e2eTesting.ts` → `convex/__tests__/e2e.ts`

**Internal API path changes:**
| Old Path | New Path |
|----------|----------|
| `internal.testing.*` | `internal.__tests__.fixtures.*` |
| `internal.e2eTesting.*` | `internal.__tests__.e2e.*` |

---

## Verification Checklist ✅

All verification steps passed:

- [x] Run `npm run build` - no breaking changes
- [x] Run `npm run lint` - no unused imports
- [x] Frontend references updated for new API paths
- [x] Test file references updated for new internal paths

---

## Impact Summary

| Metric | Before | After |
|--------|--------|-------|
| Duplicate hooks | 2 | 0 |
| Unused UI components | 23+ | 0 |
| Files > 500 lines | 6 | 0 |
| Hooks naming | Mixed | Consistent (camelCase) |
| Demo files in src/pages | 2 | 0 (moved to src/dev) |
| rooms.ts | 456 lines | 6 modular files |
| Testing files location | Root convex/ | `convex/__tests__/` |

---

## Future Improvements (Optional)

These items were evaluated but deferred as low priority:

1. **Split MicroInteractions.tsx** (404 lines) - Could be split into buttonEffects, glowEffects, cardEffects
2. **Centralize Mock Data** - Consolidate scattered mock generators into `src/lib/mockData/`
3. **Centralize Constants** - Create `src/lib/constants.ts` mirroring `convex/lib/constants.ts`
