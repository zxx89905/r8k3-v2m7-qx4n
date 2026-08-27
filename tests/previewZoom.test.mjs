import assert from 'node:assert/strict';
import test from 'node:test';

import {
  PREVIEW_ZOOM_MAX,
  PREVIEW_ZOOM_MIN,
  PREVIEW_ZOOM_STEP,
  clampPreviewZoom,
  scalePreviewSize,
  stepPreviewZoom,
} from '../src/previewZoom.js';

test('preview zoom stays within the supported detail range', () => {
  assert.equal(clampPreviewZoom(25), PREVIEW_ZOOM_MIN);
  assert.equal(clampPreviewZoom(125), 125);
  assert.equal(clampPreviewZoom(250), PREVIEW_ZOOM_MAX);
});

test('preview zoom buttons move one step and stop at each boundary', () => {
  assert.equal(stepPreviewZoom(100, 1), 100 + PREVIEW_ZOOM_STEP);
  assert.equal(stepPreviewZoom(100, -1), 100 - PREVIEW_ZOOM_STEP);
  assert.equal(stepPreviewZoom(PREVIEW_ZOOM_MAX, 1), PREVIEW_ZOOM_MAX);
  assert.equal(stepPreviewZoom(PREVIEW_ZOOM_MIN, -1), PREVIEW_ZOOM_MIN);
});

test('invalid zoom input falls back to the fit-to-window value', () => {
  assert.equal(clampPreviewZoom(Number.NaN), 100);
});

test('preview scroll surface grows from its measured fit-to-window size', () => {
  assert.deepEqual(scalePreviewSize({ width: 280, height: 400 }, 200), {
    width: 560,
    height: 800,
  });
});
