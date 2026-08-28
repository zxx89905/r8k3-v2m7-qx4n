import assert from 'node:assert/strict';
import test from 'node:test';
import { createPosterDownload } from '../src/posterDownload.js';

test('JPG download flattens the supplied canvas at high quality and preserves the requested filename', () => {
  const calls = [];
  const canvas = {
    width: 2480,
    height: 3508,
    toDataURL(mimeType, quality) {
      calls.push({ mimeType, quality, width: this.width, height: this.height });
      return 'data:image/jpeg;base64,jpg-data';
    },
  };

  const result = createPosterDownload({
    format: 'jpeg',
    canvas,
    filename: 'My Poster 8X12.jpg',
  });

  assert.deepEqual(calls, [{
    mimeType: 'image/jpeg',
    quality: 0.95,
    width: 2480,
    height: 3508,
  }]);
  assert.deepEqual(result, {
    href: 'data:image/jpeg;base64,jpg-data',
    filename: 'My Poster 8X12.jpg',
    revoke: false,
  });
});

test('TIF download encodes the canvas pixels and exposes a revocable object URL', async () => {
  const pixels = new Uint8ClampedArray([255, 0, 0, 255, 0, 128, 255, 255]);
  const canvas = {
    width: 2,
    height: 1,
    getContext() {
      return { getImageData: () => ({ data: pixels }) };
    },
  };
  let capturedBlob;
  const result = createPosterDownload({
    format: 'tiff',
    canvas,
    filename: 'My Poster 8X12.tif',
    dpi: 180,
    createObjectURL(blob) {
      capturedBlob = blob;
      return 'blob:tiff-download';
    },
  });

  assert.equal(result.href, 'blob:tiff-download');
  assert.equal(result.filename, 'My Poster 8X12.tif');
  assert.equal(result.revoke, true);
  assert.equal(capturedBlob.type, 'image/tiff');
  assert.ok((await capturedBlob.arrayBuffer()).byteLength > pixels.length);
});

test('PNG is no longer an export format', () => {
  assert.equal(createPosterDownload({ format: 'png', canvas: {}, filename: 'poster.png' }), null);
});
