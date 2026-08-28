import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';

const cssSource = await readFile(new URL('../src/styles.css', import.meta.url), 'utf8');

test('desktop export controls flow below a reserved preview area instead of shrinking it', () => {
  assert.match(cssSource, /\.preview-panel\s*\{[^}]*position:\s*static;[^}]*height:\s*auto;/s);
  assert.match(cssSource, /\.poster-stage-shell\s*\{[^}]*height:\s*clamp\(460px,\s*calc\(100vh - 255px\),\s*720px\);[^}]*flex:\s*none;/s);
});

test('stacked layouts return the preview shell to natural document flow', () => {
  assert.match(cssSource, /@media \(max-width:\s*1000px\)[\s\S]*?\.poster-stage-shell\s*\{[^}]*height:\s*auto;[^}]*min-height:\s*0;/s);
});
