import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';

const appSource = await readFile(new URL('../src/App.jsx', import.meta.url), 'utf8');
const cssSource = await readFile(new URL('../src/styles.css', import.meta.url), 'utf8');

test('homepage presents a premium studio message and clear creation actions', () => {
  assert.match(appSource, /把一首歌，<em>做成一张值得被收藏的海报。<\/em>/);
  assert.match(appSource, /开始制作海报/);
  assert.match(appSource, /浏览创作能力/);
  assert.match(appSource, /SONGFORM STUDIO/);
  assert.match(appSource, /id="editor"/);
});

test('homepage keeps the theme system while adding an editorial hero treatment', () => {
  assert.match(cssSource, /\.hero-actions\s*\{/);
  assert.match(cssSource, /\.hero-record\s*\{/);
  assert.match(cssSource, /\.capability-rail\s*\{/);
  assert.match(cssSource, /\.app-shell \.intro-band\s*\{[^}]*background:/s);
});
