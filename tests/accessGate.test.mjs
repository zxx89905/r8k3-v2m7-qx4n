import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';

const appSource = await readFile(new URL('../src/App.jsx', import.meta.url), 'utf8');
const stylesSource = await readFile(new URL('../src/styles.css', import.meta.url), 'utf8');
const artworkSource = await readFile(new URL('../public/access-gate.svg', import.meta.url), 'utf8');

test('editor is protected by a hidden visual hotspot', () => {
  assert.doesNotMatch(appSource, /2662918216/);
  assert.match(appSource, /access-hotspot/);
  assert.match(appSource, /sessionStorage/);
  assert.match(appSource, /access-gate-art/);
  assert.doesNotMatch(appSource, /请输入访问密码|访问网站/);
  assert.match(stylesSource, /\.access-gate\s*\{/);
  assert.match(stylesSource, /\.access-hotspot\s*\{/);
  assert.doesNotMatch(appSource, /access-gate-card/);
  assert.match(stylesSource, /\.access-gate-art\s*\{[^}]*inset:\s*0/);
  assert.match(stylesSource, /object-fit:\s*cover/);
  assert.match(artworkSource, /id="piano-keys"/);
  assert.match(artworkSource, /id="tonearm"/);
});
