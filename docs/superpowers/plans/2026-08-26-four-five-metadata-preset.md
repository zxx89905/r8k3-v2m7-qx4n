# 4:5 Metadata Layout Preset Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Apply the screenshot-calibrated metadata layout whenever the user selects the 4:5 poster size.

**Architecture:** Extend the existing `sizeLayoutPresets` data map with a `four-five` entry. The existing `handleSizeChange` merge behavior limits changes to the seven keys present in that entry, preserving text content and lyric layout settings.

**Tech Stack:** React 18, Vite 5, Node.js built-in test runner

---

### Task 1: Add the 4:5 metadata preset

**Files:**
- Modify: `tests/sizeLayoutPresets.test.mjs`
- Modify: `src/App.jsx`

- [x] **Step 1: Write the failing test**

Add this assertion to `tests/sizeLayoutPresets.test.mjs`:

```js
assert.match(
  appSource,
  /'four-five':\s*\{\s*titleSize:\s*60,\s*titleY:\s*81,\s*artistSize:\s*40,\s*artistY:\s*87\.5,\s*releaseDateSize:\s*26,\s*releaseDateY:\s*91,\s*barcodeY:\s*93\s*\}/,
);
```

- [x] **Step 2: Run the focused test and verify RED**

Run: `node --test tests/sizeLayoutPresets.test.mjs`

Expected: FAIL because `sizeLayoutPresets` has no `four-five` entry.

- [x] **Step 3: Add the minimal preset**

Add this entry to `sizeLayoutPresets` in `src/App.jsx`:

```js
'four-five': { titleSize: 60, titleY: 81, artistSize: 40, artistY: 87.5, releaseDateSize: 26, releaseDateY: 91, barcodeY: 93 },
```

- [x] **Step 4: Verify GREEN and regressions**

Run: `node --test`

Expected: all tests pass.

Run: `npm run build`

Expected: Vite production build completes successfully.

- [x] **Step 5: Commit**

No commit is possible because `C:\SongLyricsPoster` is not a Git repository. Preserve the verified working-tree files in place.
