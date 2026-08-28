import assert from 'node:assert/strict';
import test from 'node:test';

import {
  getSizeTransitionPreset,
  palettes,
  sizeLayoutPresets,
  tonearmOptions,
} from '../src/posterOptions.js';
import { getBarcodeGeometry } from '../src/posterGeometry.js';

test('the twelve fixed palettes are labelled continuously from A through L', () => {
  assert.deepEqual(palettes.map((item) => item.code), [...'ABCDEFGHIJKL']);
});

test('square posters use the current tuned browser settings and hide the barcode by default', () => {
  assert.deepEqual(sizeLayoutPresets.square, {
    ringSize: 160,
    ringGap: 31,
    charSpacing: 1.2,
    wordSpacing: 1.1,
    lyricSize: 15,
    titleSize: 47,
    titleY: 81,
    artistSize: 35,
    artistY: 89,
    releaseDateSize: 22,
    releaseDateY: 94,
    barcodeY: 90.5,
    barcodeScale: 1,
    centerStyle: 'cover',
    coverEffect: 'none',
    playerStyle: 'minimal',
    playerScale: 1,
    showBarcode: false,
  });
});

test('only the retained tonearm choices are offered', () => {
  assert.deepEqual(tonearmOptions, [
    { value: 'minimal', label: '极简直臂 · 粗线转轴' },
    { value: 'retro', label: '复古木座 · 黄铜唱臂' },
    { value: 'none', label: '不显示唱臂' },
  ]);
});

test('barcode geometry scales around its center without changing the configured position', () => {
  assert.deepEqual(getBarcodeGeometry(0.5), {
    width: 142,
    height: 39.5,
    fallbackWidth: 120,
    fallbackHeight: 29.5,
    fallbackOffsetY: 5,
  });
  assert.deepEqual(getBarcodeGeometry(1.5), {
    width: 426,
    height: 118.5,
    fallbackWidth: 360,
    fallbackHeight: 88.5,
    fallbackOffsetY: 15,
  });
});

test('leaving square restores portrait-only defaults instead of leaking square settings', () => {
  assert.deepEqual(getSizeTransitionPreset('square', 'a4'), {
    centerStyle: 'label',
    coverEffect: 'none',
    playerStyle: 'retro',
    playerScale: 1,
    showBarcode: true,
    barcodeScale: 1,
    ringSize: 160,
    ringGap: 42,
    charSpacing: 1.3,
    wordSpacing: 1.3,
    lyricSize: 22,
  });
  assert.deepEqual(getSizeTransitionPreset('a4', 'three-four'), sizeLayoutPresets['three-four']);
});
