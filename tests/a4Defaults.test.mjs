import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';
import { sizeLayoutPresets } from '../src/posterOptions.js';

const appSource = await readFile(new URL('../src/App.jsx', import.meta.url), 'utf8');

test('A4 starts with the calibrated 1200-character lyric layout', () => {
  assert.match(appSource, /useState\('balanced'\)/);
  assert.match(appSource, /useState\('a4'\)/);
  assert.deepEqual(sizeLayoutPresets.a4, {
    ringSize: 160,
    ringGap: 42,
    charSpacing: 1.3,
    wordSpacing: 1.3,
    lyricSize: 22,
  });
  assert.match(appSource, /fontFamily:\s*'Montserrat',\s*\.\.\.sizeLayoutPresets\.a4/);
});
