# 4:5 Lyric Layout Preset Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add the screenshot-calibrated circle-lyric settings to the existing 4:5 poster preset.

**Architecture:** Keep one `four-five` entry in `sizeLayoutPresets` and extend it with five lyric layout keys. The existing `handleSizeChange` function already merges the selected entry into settings, so no new control flow is required.

**Tech Stack:** React 18, Vite 5, Node.js built-in test runner

---

### Task 1: Extend the 4:5 preset

**Files:**
- Modify: `tests/sizeLayoutPresets.test.mjs`
- Modify: `src/App.jsx`

- [x] **Step 1: Write the failing test**

Require this complete preset in `tests/sizeLayoutPresets.test.mjs`:

```js
assert.match(
  appSource,
  /'four-five':\s*\{\s*ringSize:\s*160,\s*ringGap:\s*39,\s*charSpacing:\s*1\.2,\s*wordSpacing:\s*1\.25,\s*lyricSize:\s*20,\s*titleSize:\s*60,\s*titleY:\s*81,\s*artistSize:\s*40,\s*artistY:\s*87\.5,\s*releaseDateSize:\s*26,\s*releaseDateY:\s*91,\s*barcodeY:\s*93\s*\}/,
);
```

- [x] **Step 2: Verify RED**

Run: `node --test tests/sizeLayoutPresets.test.mjs`

Expected: FAIL because `four-five` does not contain the five lyric settings.

- [x] **Step 3: Add the minimal implementation**

Use this `four-five` entry in `src/App.jsx`:

```js
'four-five': { ringSize: 160, ringGap: 39, charSpacing: 1.2, wordSpacing: 1.25, lyricSize: 20, titleSize: 60, titleY: 81, artistSize: 40, artistY: 87.5, releaseDateSize: 26, releaseDateY: 91, barcodeY: 93 },
```

- [x] **Step 4: Verify GREEN and regressions**

Run: `node --test`

Expected: all tests pass.

Run: `npm run build`

Expected: Vite production build completes successfully.

- [x] **Step 5: Commit**

No commit is possible because `C:\SongLyricsPoster` is not a Git repository. Preserve the verified files in place.
