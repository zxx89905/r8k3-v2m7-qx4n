import assert from 'node:assert/strict';
import test from 'node:test';

import { getFramedExportLayout } from '../src/framedExport.js';

test('standard frames add an even border without stretching the poster', () => {
  assert.deepEqual(getFramedExportLayout('black', 1440, 2160), {
    width: 1540,
    height: 2260,
    posterX: 50,
    posterY: 50,
    posterWidth: 1440,
    posterHeight: 2160,
    frameWidth: 50,
    matWidth: 0,
  });
});

test('museum frame adds both a dark outer frame and a wide paper mat', () => {
  assert.deepEqual(getFramedExportLayout('museum', 2000, 3000), {
    width: 2400,
    height: 3400,
    posterX: 200,
    posterY: 200,
    posterWidth: 2000,
    posterHeight: 3000,
    frameWidth: 40,
    matWidth: 160,
  });
});

test('no-frame selection cannot create a framed export', () => {
  assert.equal(getFramedExportLayout('none', 1440, 2160), null);
});
