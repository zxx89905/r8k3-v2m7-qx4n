import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';
import { createSpotifyClient } from '../src/spotify.js';

test('searchAlbums calls the proxy and returns album items', async () => {
  let requestedUrl = '';
  const client = createSpotifyClient({
    baseUrl: 'https://proxy.example/api/spotify',
    fetchImpl: async (url) => {
      requestedUrl = String(url);
      return new Response(JSON.stringify({ albums: { items: [{ id: 'album-1' }] } }), { status: 200 });
    },
  });

  assert.deepEqual(await client.searchAlbums('Frank Ocean'), [{ id: 'album-1' }]);
  assert.equal(requestedUrl, 'https://proxy.example/api/spotify?action=search&q=Frank+Ocean');
});

test('getAlbum calls the proxy album action', async () => {
  let requestedUrl = '';
  const client = createSpotifyClient({
    baseUrl: 'https://proxy.example/api/spotify',
    fetchImpl: async (url) => {
      requestedUrl = String(url);
      return new Response(JSON.stringify({ id: 'album-1' }), { status: 200 });
    },
  });

  assert.deepEqual(await client.getAlbum('album-1'), { id: 'album-1' });
  assert.equal(requestedUrl, 'https://proxy.example/api/spotify?action=album&id=album-1');
});

test('matchTrack calls the strict proxy match action', async () => {
  let requestedUrl = '';
  const client = createSpotifyClient({
    baseUrl: 'https://proxy.example/api/spotify',
    fetchImpl: async (url) => {
      requestedUrl = String(url);
      return new Response(JSON.stringify({
        uri: 'spotify:track:track-1',
        externalUrl: 'https://open.spotify.com/track/track-1',
      }), { status: 200 });
    },
  });

  assert.deepEqual(await client.matchTrack({
    title: 'Nights',
    artist: 'Frank Ocean',
    durationMs: 307000,
  }), {
    uri: 'spotify:track:track-1',
    externalUrl: 'https://open.spotify.com/track/track-1',
  });
  assert.equal(
    requestedUrl,
    'https://proxy.example/api/spotify?action=match&title=Nights&artist=Frank+Ocean&durationMs=307000',
  );
});

test('client reports missing configuration and proxy failures', async () => {
  await assert.rejects(
    () => createSpotifyClient({ baseUrl: '' }).searchAlbums('album'),
    /not configured/,
  );
  await assert.rejects(
    () => createSpotifyClient({
      baseUrl: 'https://proxy.example/api/spotify',
      fetchImpl: async () => new Response('{}', { status: 502 }),
    }).searchAlbums('album'),
    /unavailable/,
  );
});

test('browser source does not contain Spotify client credentials or token exchange', async () => {
  const source = await readFile(new URL('../src/spotify.js', import.meta.url), 'utf8');
  assert.doesNotMatch(source, /VITE_SPOTIFY_CLIENT_ID|VITE_SPOTIFY_CLIENT_SECRET/);
  assert.doesNotMatch(source, /accounts\.spotify\.com\/api\/token/);
  assert.doesNotMatch(source, /Authorization:\s*['"]Basic|btoa\(/);
});
