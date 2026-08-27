import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';
import { createPosterDownload } from '../src/posterDownload.js';

test('PNG download preserves the rendered lossless data URL', () => {
  const result = createPosterDownload({
    format: 'png',
    pngUrl: 'data:image/png;base64,png-data',
    canvas: { toDataURL() { throw new Error('PNG should not be recompressed'); } },
    title: 'Nights',
  });

  assert.deepEqual(result, {
    href: 'data:image/png;base64,png-data',
    filename: 'Nights - lyric circle.png',
  });
});

test('JPG download flattens the rendered canvas at high quality', () => {
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
    pngUrl: 'data:image/png;base64,png-data',
    canvas,
    title: 'I Forgot / That You Existed',
  });

  assert.deepEqual(calls, [{
    mimeType: 'image/jpeg',
    quality: 0.95,
    width: 2480,
    height: 3508,
  }]);
  assert.deepEqual(result, {
    href: 'data:image/jpeg;base64,jpg-data',
    filename: 'I Forgot _ That You Existed - lyric circle.jpg',
  });
});

test('editor offers separate high-resolution PNG and JPG downloads', async () => {
  const source = await readFile(new URL('../src/App.jsx', import.meta.url), 'utf8');
  assert.match(source, /下载高清 PNG/);
  assert.match(source, /下载高清 JPG/);
  assert.match(source, /downloadPoster\('jpeg'\)/);
});
