import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';

const appSource = await readFile(new URL('../src/App.jsx', import.meta.url), 'utf8');

test('export settings sit below the preview and expose filename, size, JPG, TIF, and framed JPG controls', () => {
  const stageIndex = appSource.indexOf('className="poster-stage-shell"');
  const exportIndex = appSource.indexOf('className="export-panel"');
  assert.ok(stageIndex >= 0 && exportIndex > stageIndex);
  assert.match(appSource, /导出文件名/);
  assert.match(appSource, /导出尺寸/);
  assert.match(appSource, /导出 JPG/);
  assert.match(appSource, /导出 TIF/);
  assert.match(appSource, /带框 JPG/);
});

test('PNG controls are removed and framed JPG requires a selected frame', () => {
  assert.doesNotMatch(appSource, /下载高清 PNG|downloadPoster\('png'\)/);
  assert.match(appSource, /disabled=\{!image \|\| previewFrame === 'none'/);
});

test('barcode size and retained tonearm options are connected to the editor', () => {
  assert.match(appSource, /id="barcode-scale"/);
  assert.match(appSource, /tonearmOptions\.map/);
  assert.doesNotMatch(appSource, /画廊经典 · 粗黑弧臂|Hi-Fi S 型 · 金属唱臂/);
});

test('fixed palette swatches render their continuous letter labels', () => {
  assert.match(appSource, /className="palette-code"/);
  assert.match(appSource, /\{item\.code\}/);
});

test('preview heading does not repeat the song title beside the frame controls', () => {
  const previewHeading = appSource.match(/<div className="preview-topline">([\s\S]*?)<div className="poster-stage-shell">/)?.[1] || '';
  assert.doesNotMatch(previewHeading, /<h2>/);
  assert.match(previewHeading, /实时预览/);
  assert.match(previewHeading, /预览相框/);
});

test('export yields one browser frame so the busy status paints before large file encoding', () => {
  assert.match(appSource, /setExportStatus\('正在生成导出文件…'\);[\s\S]*?await new Promise\(requestAnimationFrame\);/);
});

test('changing poster ratio clears the previous render before exports can be clicked', () => {
  const sizeHandler = appSource.match(/function handleSizeChange\(nextSizeId\)\s*\{([\s\S]*?)\n  \}/)?.[1] || '';
  assert.match(sizeHandler, /renderedCanvasRef\.current = null;/);
  assert.match(sizeHandler, /setImage\(''\);/);
});
