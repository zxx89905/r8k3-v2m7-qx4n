import assert from 'node:assert/strict';
import test from 'node:test';

import {
  buildExportFilename,
  getExportSizesForPoster,
  resolveExportSize,
} from '../src/exportSizes.js';
import { encodeRgbTiff } from '../src/tiffExport.js';

test('each poster ratio offers default output and only its compatible print sizes', () => {
  assert.deepEqual(
    getExportSizesForPoster('two-three').map((item) => item.label),
    ['默认输出', '8X12', '10X15', '11X17', '12X18', '16X24', '20X30', '24X36', '27X40'],
  );
  assert.deepEqual(
    getExportSizesForPoster('four-five').map((item) => item.label),
    ['默认输出', '8X10', '9X11', '11X14', '16X20'],
  );
  assert.deepEqual(
    getExportSizesForPoster('three-four').map((item) => item.label),
    ['默认输出', '12X16', '18X24', '24X32'],
  );
  assert.deepEqual(
    getExportSizesForPoster('a4').map((item) => item.label),
    ['默认输出', 'A1', 'A2', 'A3', 'A4', '20X28'],
  );
  assert.deepEqual(getExportSizesForPoster('square').map((item) => item.label), ['默认输出']);
});

test('default output preserves the active canvas while print sizes use their configured pixels', () => {
  assert.deepEqual(resolveExportSize('default', { width: 2400, height: 3600 }), {
    id: 'default', label: '默认输出', width: 2400, height: 3600, dpi: 0,
  });
  assert.deepEqual(resolveExportSize('20x30', { width: 2400, height: 3600 }), {
    id: '20x30', label: '20X30', width: 2000, height: 3000, dpi: 100,
  });
});

test('export filenames use the custom prefix, uppercase size label, and no suffix for default output', () => {
  assert.equal(buildExportFilename({ prefix: '我的海报', fallbackTitle: 'Song', sizeLabel: '8x12', format: 'tiff' }), '我的海报 8X12.tif');
  assert.equal(buildExportFilename({ prefix: '', fallbackTitle: 'Track / Name', sizeLabel: '默认输出', format: 'jpeg' }), 'Track _ Name.jpg');
  assert.equal(buildExportFilename({ prefix: '', fallbackTitle: '', sizeLabel: '20x30', format: 'jpeg', framed: true }), 'SONGFORM 20X30 带框.jpg');
});

function readIfd(bytes) {
  const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
  assert.equal(String.fromCharCode(bytes[0], bytes[1]), 'II');
  assert.equal(view.getUint16(2, true), 42);
  const ifdOffset = view.getUint32(4, true);
  const entryCount = view.getUint16(ifdOffset, true);
  const entries = new Map();
  for (let index = 0; index < entryCount; index += 1) {
    const offset = ifdOffset + 2 + index * 12;
    entries.set(view.getUint16(offset, true), {
      type: view.getUint16(offset + 2, true),
      count: view.getUint32(offset + 4, true),
      value: view.getUint32(offset + 8, true),
    });
  }
  return { view, entries };
}

test('TIFF output stores RGB pixels plus the selected width, height, and print DPI', () => {
  const bytes = encodeRgbTiff({
    width: 2,
    height: 1,
    dpi: 180,
    rgba: new Uint8ClampedArray([255, 0, 0, 255, 0, 128, 255, 64]),
  });
  const { view, entries } = readIfd(bytes);
  assert.equal(entries.get(256).value, 2);
  assert.equal(entries.get(257).value, 1);
  assert.equal(entries.get(277).value, 3);
  assert.equal(entries.get(279).value, 6);
  assert.equal(entries.get(296).value, 2);
  const resolutionOffset = entries.get(282).value;
  assert.equal(view.getUint32(resolutionOffset, true) / view.getUint32(resolutionOffset + 4, true), 180);
  const stripOffset = entries.get(273).value;
  assert.deepEqual([...bytes.slice(stripOffset, stripOffset + 6)], [255, 0, 0, 0, 128, 255]);
});
