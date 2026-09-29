import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';

const appSource = await readFile(new URL('../src/App.jsx', import.meta.url), 'utf8');

test('release date content is editable in automatic and manual creation modes', () => {
  assert.match(appSource, /const \[posterReleaseDate, setPosterReleaseDate\] = useState\(''\)/);
  assert.match(appSource, /id="poster-release-date"/);
  assert.match(appSource, /releaseDate: creationMode === 'manual' \? manualData\.releaseDate : posterReleaseDate/);
  assert.match(appSource, /setPosterReleaseDate\(album\.release_date \|\| ''\)/);
});

test('a custom cover can be cleared and the file input can select the same image again', () => {
  const clearHandler = appSource.match(/const handleClearCover = \(\) => \{[\s\S]+?\n  \};/)?.[0] || '';
  assert.match(appSource, /ref=\{coverInputRef\}/);
  assert.match(clearHandler, /setCustomCover\(''\)/);
  assert.match(clearHandler, /coverInputRef\.current\.value = ''/);
  assert.match(clearHandler, /setPaletteRecommendations\(\[\]\)/);
  assert.match(appSource, /清空封面/);
});
