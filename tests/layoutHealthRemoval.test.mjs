import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';

const appSource = await readFile(new URL('../src/App.jsx', import.meta.url), 'utf8');
const stylesSource = await readFile(new URL('../src/styles.css', import.meta.url), 'utf8');

test('layout health UI is removed from the editor', () => {
  assert.doesNotMatch(appSource, /layout-health|analyzePosterLayout|导出前排版体检/);
  assert.doesNotMatch(stylesSource, /layout-health/);
});
