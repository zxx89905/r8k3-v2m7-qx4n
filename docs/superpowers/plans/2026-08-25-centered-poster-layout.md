# Centered Poster Layout Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Remove the split layout and rebalance the centered poster so the record sits slightly higher, cover art is larger, date text is clearer, and the Spotify code is larger while remaining centered.

**Architecture:** Keep the existing React editor and canvas renderer. Remove the split-layout UI and renderer branch, then adjust the single centered render path through explicit scale/position constants and existing numeric settings.

**Tech Stack:** React 18, Vite, Canvas 2D, lucide-react.

---

### Task 1: Remove split layout

**Files:**
- Modify: `src/App.jsx`
- Modify: `src/CanvasPoster.jsx`

- [x] Remove `infoLayout` from settings and poster settings.
- [x] Remove the layout selector from the editor.
- [x] Keep only centered title/artist/metadata rendering in `renderPoster`.

### Task 2: Rebalance poster geometry

**Files:**
- Modify: `src/CanvasPoster.jsx`

- [x] Move `artworkY` upward by approximately 3% of logical poster height.
- [x] Increase circular cover radius by approximately 5% while keeping the single `ringSize` control.
- [x] Move title and artist positions upward slightly in the centered render path.
- [x] Increase the centered date/meta text size and darken its color.

### Task 3: Enlarge centered Spotify code

**Files:**
- Modify: `src/CanvasPoster.jsx`

- [x] Increase centered Spotify code bounds by 8–10%.
- [x] Keep code center at `artworkX` and preserve aspect ratio/fallback behavior.

### Task 4: Verify

**Files:**
- Test: `npm run build`

- [x] Confirm Vite production build succeeds.
- [x] Search source for removed `infoLayout`/split rendering references.
- [x] Open the local preview and verify the editor no longer exposes a split-layout control.
