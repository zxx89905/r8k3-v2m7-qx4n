import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';
import {
  createCatalogRouter,
  createLatestRequestGuard,
  matchPublicTrack,
  normalizeSpotifyTrackUri,
  resolveTrackUri,
  selectionForTrack,
  spotifyTrackUrlFromUri,
} from '../src/catalogModes.js';

test('catalog router uses the selected automatic catalog', async () => {
  const router = createCatalogRouter({
    spotify: {
      searchAlbums: async (query) => [{ id: `spotify-search:${query}` }],
      getAlbum: async (id) => ({ id: `spotify-album:${id}` }),
    },
    publicCatalog: {
      searchAlbums: async (query) => [{ id: `public-search:${query}` }],
      getAlbum: async (id) => ({ id: `public-album:${id}` }),
    },
  });

  assert.deepEqual(await router.searchAlbums('spotify', 'Blonde'), [{ id: 'spotify-search:Blonde' }]);
  assert.deepEqual(await router.searchAlbums('public', 'Blonde'), [{ id: 'public-search:Blonde' }]);
  assert.deepEqual(await router.getAlbum('spotify', '1'), { id: 'spotify-album:1' });
  assert.deepEqual(await router.getAlbum('public', '1'), { id: 'public-album:1' });
  await assert.rejects(() => router.searchAlbums('manual', 'Blonde'), /does not use a catalog/);
});

test('public track matching adds only the validated Spotify destination', async () => {
  const track = {
    id: 'itunes:track:1',
    name: 'Nights',
    artists: [{ name: 'Frank Ocean' }],
    duration_ms: 307151,
    uri: '',
    external_urls: {},
  };

  const matched = await matchPublicTrack(track, async (input) => {
    if (
      input.title === 'Nights'
      && input.artist === 'Frank Ocean'
      && input.durationMs === 307151
    ) {
      return {
        uri: 'spotify:track:matched',
        externalUrl: 'https://open.spotify.com/track/matched',
      };
    }
    return { uri: '', externalUrl: '' };
  });

  assert.deepEqual(matched, {
    ...track,
    uri: 'spotify:track:matched',
    external_urls: { spotify: 'https://open.spotify.com/track/matched' },
  });
});

test('an unmatched public track has no stale Spotify URI or link', async () => {
  const track = {
    id: 'itunes:track:2',
    name: 'Unmatched Song',
    artists: [{ name: 'Artist' }],
    duration_ms: 180000,
    uri: 'spotify:track:stale',
    external_urls: {
      spotify: 'https://open.spotify.com/track/stale',
      apple: 'https://music.apple.com/song/2',
    },
  };

  const unmatched = await matchPublicTrack(
    track,
    async () => ({ uri: '', externalUrl: '' }),
  );

  assert.equal(unmatched.uri, '');
  assert.deepEqual(unmatched.external_urls, { apple: 'https://music.apple.com/song/2' });
});

test('latest request guard rejects results after a newer request or mode change', () => {
  const guard = createLatestRequestGuard();
  const first = guard.start();
  assert.equal(first.isCurrent(), true);

  const second = guard.start();
  assert.equal(first.isCurrent(), false);
  assert.equal(second.isCurrent(), true);

  guard.invalidate();
  assert.equal(second.isCurrent(), false);
});

test('empty albums clear all previous track-derived poster fields', () => {
  const album = { artists: [{ name: 'New Artist' }] };
  assert.deepEqual(selectionForTrack(album, null), {
    track: null,
    title: '',
    artist: '',
  });
  assert.deepEqual(selectionForTrack(album, {
    id: 'track-1',
    name: 'New Song',
    uri: 'spotify:track:new',
  }), {
    track: {
      id: 'track-1',
      name: 'New Song',
      uri: 'spotify:track:new',
    },
    title: 'New Song',
    artist: 'New Artist',
  });
});

test('editor exposes all three creation modes and disables unavailable Spotify Codes', async () => {
  const source = await readFile(new URL('../src/App.jsx', import.meta.url), 'utf8');
  assert.match(source, /> Spotify 自动</);
  assert.match(source, /> 公开目录</);
  assert.match(source, /> 手动制作</);
  assert.match(source, /disabled=\{!activeTrackUri\}/);
  assert.match(source, /未匹配到 Spotify，扫码条已隐藏/);
});

test('replacement album requests clear stale lyric and match loading states', async () => {
  const source = await readFile(new URL('../src/App.jsx', import.meta.url), 'utf8');
  const chooseAlbum = source.match(/const chooseAlbum = async[\s\S]+?setIsLoadingAlbum\(true\);/)?.[0] || '';
  assert.match(chooseAlbum, /setIsLoadingLyrics\(false\);/);
  assert.match(chooseAlbum, /setIsMatchingSpotify\(false\);/);
  assert.match(chooseAlbum, /setPublicSpotifyReference\(''\);/);
  assert.match(chooseAlbum, /setImage\(''\);/);
});

test('mode changes clear the rendered poster so stale downloads stay disabled', async () => {
  const source = await readFile(new URL('../src/App.jsx', import.meta.url), 'utf8');
  const handleModeChange = source.match(/const handleModeChange = \(nextMode\) => \{[\s\S]+?\n  \};/)?.[0] || '';
  assert.match(handleModeChange, /setImage\(''\);/);
});

test('Spotify song links and URIs normalize to a scannable track URI', () => {
  assert.equal(
    normalizeSpotifyTrackUri('https://open.spotify.com/track/43rA71bccXFGD4C8GOpIlN?si=share-token'),
    'spotify:track:43rA71bccXFGD4C8GOpIlN',
  );
  assert.equal(
    normalizeSpotifyTrackUri('https://open.spotify.com/intl-zh/track/43rA71bccXFGD4C8GOpIlN'),
    'spotify:track:43rA71bccXFGD4C8GOpIlN',
  );
  assert.equal(
    normalizeSpotifyTrackUri('spotify:track:43rA71bccXFGD4C8GOpIlN'),
    'spotify:track:43rA71bccXFGD4C8GOpIlN',
  );
  assert.equal(normalizeSpotifyTrackUri('https://open.spotify.com/album/lover'), '');
  assert.equal(normalizeSpotifyTrackUri('https://open.spotify.com/43rA71bccXFGD4C8GOpIlN'), '');
  assert.equal(normalizeSpotifyTrackUri('https://example.com/track/43rA71bccXFGD4C8GOpIlN'), '');
});

test('a public-catalog link overrides failed automatic matching', () => {
  assert.equal(resolveTrackUri({
    mode: 'public',
    publicReference: 'https://open.spotify.com/track/43rA71bccXFGD4C8GOpIlN',
    automaticUri: '',
  }), 'spotify:track:43rA71bccXFGD4C8GOpIlN');

  assert.equal(resolveTrackUri({
    mode: 'public',
    publicReference: '',
    automaticUri: 'spotify:track:0Jlcvv8IykzHaSmj49uNW8',
  }), 'spotify:track:0Jlcvv8IykzHaSmj49uNW8');

  assert.equal(resolveTrackUri({
    mode: 'manual',
    manualReference: 'spotify:track:43rA71bccXFGD4C8GOpIlN',
    automaticUri: '',
  }), 'spotify:track:43rA71bccXFGD4C8GOpIlN');
});

test('a Spotify track URI produces the matching public song URL', () => {
  assert.equal(
    spotifyTrackUrlFromUri('spotify:track:43rA71bccXFGD4C8GOpIlN'),
    'https://open.spotify.com/track/43rA71bccXFGD4C8GOpIlN',
  );
  assert.equal(spotifyTrackUrlFromUri(''), '');
});
