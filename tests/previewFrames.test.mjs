import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';

const appSource = await readFile(new URL('../src/App.jsx', import.meta.url), 'utf8');
const cssSource = await readFile(new URL('../src/styles.css', import.meta.url), 'utf8');

const expectedFrames = [
  ['silver', '拉丝银框'],
  ['espresso', '深咖啡窄框'],
  ['museum', '博物馆卡纸框'],
  ['acrylic', '透明亚克力框'],
];

test('frame picker exposes the additional preview-only frame styles', () => {
  for (const [id, name] of expectedFrames) {
    assert.match(appSource, new RegExp(`id: '${id}', name: '${name}'`));
    assert.match(cssSource, new RegExp(`\\.preview-frame-${id}\\b`));
  }
});

test('all framed previews use a shared inset to calculate the available image height', () => {
  assert.match(cssSource, /\.preview-frame\s*\{[^}]*--frame-inset:\s*0px;[^}]*--frame-image-offset:\s*0px;[^}]*max-height:\s*none;/s);
  assert.match(cssSource, /\.preview-frame:not\(\.preview-frame-none\) \.poster-image\s*\{[^}]*calc\(100vh - 330px - var\(--frame-image-offset\)\)/s);
});

test('white frame gives the poster distinct inner depth', () => {
  assert.match(cssSource, /\.preview-frame-white \.poster-image\s*\{[^}]*box-shadow:/s);
});

test('gallery floating frame is no longer offered or styled', () => {
  assert.doesNotMatch(appSource, /id: 'gallery'/);
  assert.doesNotMatch(cssSource, /\.preview-frame-gallery\b/);
});
