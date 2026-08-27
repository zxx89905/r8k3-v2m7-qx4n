import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';
import { extractPosterPalette, extractPosterPaletteVariants } from '../src/colorUtils.js';

const appSource = await readFile(new URL('../src/App.jsx', import.meta.url), 'utf8');

test('extractPosterPalette derives four poster colors from cover pixels', () => {
  const pixels = [
    { r: 190, g: 55, b: 45 }, { r: 190, g: 55, b: 45 }, { r: 190, g: 55, b: 45 },
    { r: 177, g: 48, b: 42 }, { r: 177, g: 48, b: 42 },
    { r: 240, g: 220, b: 190 }, { r: 240, g: 220, b: 190 },
  ];

  const palette = extractPosterPalette(pixels);

  assert.deepEqual(Object.keys(palette), ['name', 'paper', 'disc', 'ink', 'accent']);
  assert.match(palette.paper, /^#[0-9a-f]{6}$/);
  assert.match(palette.disc, /^#[0-9a-f]{6}$/);
  assert.match(palette.ink, /^#[0-9a-f]{6}$/);
  assert.match(palette.accent, /^#[0-9a-f]{6}$/);
  assert.equal(palette.accent, '#b9342c');
  assert.notEqual(palette.paper, '#ffffff');
});

test('extractPosterPalette rejects an empty cover sample', () => {
  assert.throws(() => extractPosterPalette([]), /无法从封面提取颜色/);
});

test('extractPosterPaletteVariants offers original, bright, and dark recommendations', () => {
  const variants = extractPosterPaletteVariants([
    { r: 190, g: 55, b: 45 }, { r: 190, g: 55, b: 45 }, { r: 240, g: 220, b: 190 },
  ]);
  assert.deepEqual(variants.map((item) => item.name), ['原色氛围', '明亮编辑', '深色收藏']);
  for (const item of variants) {
    assert.match(item.paper, /^#[0-9a-f]{6}$/);
    assert.match(item.disc, /^#[0-9a-f]{6}$/);
    assert.match(item.ink, /^#[0-9a-f]{6}$/);
    assert.match(item.accent, /^#[0-9a-f]{6}$/);
  }
});

test('editor exposes automatic cover palette action', () => {
  assert.match(appSource, /extractPosterPalette/);
  assert.match(appSource, /sampleImagePixels/);
  assert.match(appSource, /一键识别封面配色/);
  assert.match(appSource, /extractPosterPaletteVariants/);
  assert.match(appSource, /palette-recommendations/);
});

test('uploaded cover object URLs are released when the cover changes or editor unmounts', () => {
  assert.match(appSource, /URL\.revokeObjectURL\(customCover\)/);
});
