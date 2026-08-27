import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';

const html = await readFile(new URL('../index.html', import.meta.url), 'utf8');
const favicon = await readFile(new URL('../public/favicon.svg', import.meta.url), 'utf8').catch(() => '');

test('site declares a Songform favicon instead of the browser default icon', () => {
  assert.match(html, /<link rel="icon" type="image\/svg\+xml" href="\.\/favicon\.svg"\s*\/>/);
  assert.match(favicon, /<svg[^>]*viewBox="0 0 64 64"/);
  assert.match(favicon, /Songform favicon/);
});
