import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';

const appSource = await readFile(new URL('../src/App.jsx', import.meta.url), 'utf8');

test('A4 starts with the calibrated 1200-character lyric layout', () => {
  assert.match(appSource, /useState\('balanced'\)/);
  assert.match(appSource, /useState\('a4'\)/);
  assert.match(
    appSource,
    /a4:\s*\{\s*ringSize:\s*160,\s*ringGap:\s*42,\s*charSpacing:\s*1\.3,\s*wordSpacing:\s*1\.3,\s*lyricSize:\s*22\s*\}/,
  );
  assert.match(appSource, /fontFamily:\s*'Montserrat',\s*\.\.\.sizeLayoutPresets\.a4/);
});
