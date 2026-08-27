import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';

const appSource = await readFile(new URL('../src/App.jsx', import.meta.url), 'utf8');

test('A4 and 3:4 have independent calibrated lyric layout presets', () => {
  assert.match(
    appSource,
    /a4:\s*\{\s*ringSize:\s*160,\s*ringGap:\s*42,\s*charSpacing:\s*1\.3,\s*wordSpacing:\s*1\.3,\s*lyricSize:\s*22\s*\}/,
  );
  assert.match(
    appSource,
    /'three-four':\s*\{\s*ringSize:\s*160,\s*ringGap:\s*38,\s*charSpacing:\s*1\.3,\s*wordSpacing:\s*1\.2,\s*lyricSize:\s*21\s*\}/,
  );
  assert.match(appSource, /function handleSizeChange\(nextSizeId\)/);
  assert.match(appSource, /onChange=\{\(event\) => handleSizeChange\(event\.target\.value\)\}/);
});

test('4:5 applies the calibrated lyric and metadata layout without text content', () => {
  assert.match(
    appSource,
    /'four-five':\s*\{\s*ringSize:\s*160,\s*ringGap:\s*39,\s*charSpacing:\s*1\.2,\s*wordSpacing:\s*1\.25,\s*lyricSize:\s*20,\s*titleSize:\s*60,\s*titleY:\s*81,\s*artistSize:\s*40,\s*artistY:\s*87\.5,\s*releaseDateSize:\s*26,\s*releaseDateY:\s*91,\s*barcodeY:\s*93\s*\}/,
  );
});

test('square uses the current website layout values as its independent default preset', () => {
  assert.match(
    appSource,
    /square:\s*\{\s*ringSize:\s*160,\s*ringGap:\s*42,\s*charSpacing:\s*1\.3,\s*wordSpacing:\s*1\.3,\s*lyricSize:\s*22,\s*titleSize:\s*62,\s*titleY:\s*79,\s*artistSize:\s*40,\s*artistY:\s*85,\s*releaseDateSize:\s*24,\s*releaseDateY:\s*87\.5,\s*barcodeY:\s*90\.5\s*\}/,
  );
});
