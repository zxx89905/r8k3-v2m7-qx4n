import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';

const viteSource = await readFile(new URL('../vite.config.js', import.meta.url), 'utf8');
const indexSource = await readFile(new URL('../index.html', import.meta.url), 'utf8');
const appSource = await readFile(new URL('../src/App.jsx', import.meta.url), 'utf8');
const workflowSource = await readFile(new URL('../.github/workflows/deploy-pages.yml', import.meta.url), 'utf8');

test('site assets and build are compatible with a GitHub Pages project path', () => {
  assert.match(viteSource, /base:\s*['"]\.\/['"]/);
  assert.match(indexSource, /href="\.\/favicon\.svg"/);
  assert.match(appSource, /src="\.\/access-gate\.svg"/);
  assert.match(workflowSource, /actions\/deploy-pages/);
  assert.match(workflowSource, /enablement:\s*true/);
  assert.match(workflowSource, /VITE_SPOTIFY_PROXY_URL:\s*\$\{\{\s*vars\.VITE_SPOTIFY_PROXY_URL\s*\}\}/);
});
