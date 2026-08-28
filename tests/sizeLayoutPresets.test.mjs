import assert from 'node:assert/strict';
import test from 'node:test';
import { sizeLayoutPresets } from '../src/posterOptions.js';

test('A4 and 3:4 have independent calibrated lyric layout presets', () => {
  assert.deepEqual(sizeLayoutPresets.a4, { ringSize: 160, ringGap: 42, charSpacing: 1.3, wordSpacing: 1.3, lyricSize: 22 });
  assert.deepEqual(sizeLayoutPresets['three-four'], { ringSize: 160, ringGap: 38, charSpacing: 1.3, wordSpacing: 1.2, lyricSize: 21 });
});

test('4:5 applies the calibrated lyric and metadata layout without text content', () => {
  assert.deepEqual(sizeLayoutPresets['four-five'], {
    ringSize: 160, ringGap: 39, charSpacing: 1.2, wordSpacing: 1.25, lyricSize: 20,
    titleSize: 60, titleY: 81, artistSize: 40, artistY: 87.5,
    releaseDateSize: 26, releaseDateY: 91, barcodeY: 93,
  });
});
