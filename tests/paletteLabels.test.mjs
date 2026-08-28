import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';

const cssSource = await readFile(new URL('../src/styles.css', import.meta.url), 'utf8');

test('palette letters stay in the original text style with only the dark palette using white text', () => {
  assert.match(cssSource, /\.palette-code\s*\{[^}]*color:\s*#243b31;[^}]*text-shadow:/s);
  assert.match(cssSource, /\.palette-swatch:nth-child\(2\) \.palette-code\s*\{[^}]*color:\s*#fff;/s);
  assert.doesNotMatch(cssSource, /\.palette-swatch:nth-child\([^2][^)]*\) \.palette-code/);
});
