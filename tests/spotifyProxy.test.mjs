import assert from 'node:assert/strict';
import test from 'node:test';
import { createSpotifyHandler } from '../api/spotify.js';

function responseRecorder() {
  return {
    headers: {},
    statusCode: 200,
    body: undefined,
    setHeader(name, value) { this.headers[name] = value; },
    status(code) { this.statusCode = code; return this; },
    json(value) { this.body = value; return this; },
    end() { return this; },
  };
}

function request(query, overrides = {}) {
  return {
    method: 'GET',
    headers: { origin: 'https://zxx89905.github.io' },
    query,
    ...overrides,
  };
}

test('search authenticates on the server and forwards the album query', async () => {
  const calls = [];
  const fetchImpl = async (url, options = {}) => {
    calls.push({ url: String(url), options });
    if (String(url).includes('/api/token')) {
      return new Response(JSON.stringify({ access_token: 'test-access-token', expires_in: 3600 }), { status: 200 });
    }
    return new Response(JSON.stringify({ albums: { items: [{ id: 'album-1' }] } }), { status: 200 });
  };
  const handler = createSpotifyHandler({
    fetchImpl,
    env: { SPOTIFY_CLIENT_ID: 'test-client', SPOTIFY_CLIENT_SECRET: 'test-secret' },
    now: () => 1_000,
  });
  const res = responseRecorder();

  await handler(request({ action: 'search', q: 'Frank Ocean' }), res);

  assert.equal(res.statusCode, 200);
  assert.deepEqual(res.body.albums.items, [{ id: 'album-1' }]);
  assert.match(calls[1].url, /\/v1\/search\?/);
  assert.match(calls[1].url, /type=album/);
  assert.match(calls[1].url, /limit=8/);
  assert.equal(calls[1].options.headers.Authorization, 'Bearer test-access-token');
});

test('album action forwards a validated Spotify album id', async () => {
  const urls = [];
  const fetchImpl = async (url) => {
    urls.push(String(url));
    return String(url).includes('/api/token')
      ? new Response(JSON.stringify({ access_token: 'token', expires_in: 3600 }), { status: 200 })
      : new Response(JSON.stringify({ id: '4aawyAB9vmqN3uQ7FjRGTy', tracks: { items: [] } }), { status: 200 });
  };
  const handler = createSpotifyHandler({
    fetchImpl,
    env: { SPOTIFY_CLIENT_ID: 'id', SPOTIFY_CLIENT_SECRET: 'secret' },
  });
  const res = responseRecorder();

  await handler(request({ action: 'album', id: '4aawyAB9vmqN3uQ7FjRGTy' }), res);

  assert.equal(res.statusCode, 200);
  assert.equal(urls[1], 'https://api.spotify.com/v1/albums/4aawyAB9vmqN3uQ7FjRGTy');
});

test('match returns only an exact title and artist within five seconds', async () => {
  const calls = [];
  const fetchImpl = async (url) => {
    calls.push(String(url));
    if (String(url).includes('/api/token')) {
      return new Response(JSON.stringify({ access_token: 'token', expires_in: 3600 }), { status: 200 });
    }
    return new Response(JSON.stringify({
      tracks: {
        items: [
          { id: 'remaster', name: 'Nights - 2025 Remaster', duration_ms: 307000, artists: [{ name: 'Frank Ocean' }], uri: 'spotify:track:remaster', external_urls: { spotify: 'https://open.spotify.com/track/remaster' } },
          { id: 'wrong-artist', name: 'Nights', duration_ms: 307000, artists: [{ name: 'Cover Artist' }], uri: 'spotify:track:wrong-artist', external_urls: { spotify: 'https://open.spotify.com/track/wrong-artist' } },
          { id: 'too-long', name: 'Nights', duration_ms: 313001, artists: [{ name: 'Frank Ocean' }], uri: 'spotify:track:too-long', external_urls: { spotify: 'https://open.spotify.com/track/too-long' } },
          { id: 'exact', name: 'Nights', duration_ms: 311500, artists: [{ name: 'Frank Ocean' }], uri: 'spotify:track:exact', external_urls: { spotify: 'https://open.spotify.com/track/exact' } },
        ],
      },
    }), { status: 200 });
  };
  const handler = createSpotifyHandler({
    fetchImpl,
    env: { SPOTIFY_CLIENT_ID: 'id', SPOTIFY_CLIENT_SECRET: 'secret' },
  });
  const res = responseRecorder();

  await handler(request({ action: 'match', title: ' Nights ', artist: 'FRANK OCEAN', durationMs: '307000' }), res);

  assert.equal(res.statusCode, 200);
  assert.deepEqual(res.body, {
    uri: 'spotify:track:exact',
    externalUrl: 'https://open.spotify.com/track/exact',
  });
  assert.match(calls[1], /type=track/);
  assert.match(calls[1], /limit=5/);
  assert.match(calls[1], /track%3ANights/);
  assert.match(calls[1], /artist%3AFRANK\+OCEAN/);
});

test('match returns an empty result when Spotify has no strict candidate', async () => {
  const fetchImpl = async (url) => String(url).includes('/api/token')
    ? new Response(JSON.stringify({ access_token: 'token', expires_in: 3600 }), { status: 200 })
    : new Response(JSON.stringify({
      tracks: {
        items: [{ id: 'live', name: 'Nights - Live', duration_ms: 307000, artists: [{ name: 'Frank Ocean' }] }],
      },
    }), { status: 200 });
  const res = responseRecorder();

  await createSpotifyHandler({
    fetchImpl,
    env: { SPOTIFY_CLIENT_ID: 'id', SPOTIFY_CLIENT_SECRET: 'secret' },
  })(request({ action: 'match', title: 'Nights', artist: 'Frank Ocean', durationMs: '307000' }), res);

  assert.equal(res.statusCode, 200);
  assert.deepEqual(res.body, { uri: '', externalUrl: '' });
});

test('invalid requests are rejected before Spotify is called', async () => {
  const cases = [
    [request({ action: 'search', q: '' }), 400],
    [request({ action: 'search', q: 'x'.repeat(101) }), 400],
    [request({ action: 'album', id: '../token' }), 400],
    [request({ action: 'match', title: '', artist: 'Artist', durationMs: '200000' }), 400],
    [request({ action: 'match', title: 'Song', artist: '', durationMs: '200000' }), 400],
    [request({ action: 'match', title: 'Song', artist: 'Artist', durationMs: '0' }), 400],
    [request({ action: 'match', title: 'Song', artist: 'Artist', durationMs: 'not-a-number' }), 400],
    [request({ action: 'unknown' }), 400],
    [request({ action: 'search', q: 'album' }, { method: 'POST' }), 405],
    [request({ action: 'search', q: 'album' }, { headers: { origin: 'https://example.com' } }), 403],
  ];

  for (const [req, expectedStatus] of cases) {
    let called = false;
    const handler = createSpotifyHandler({
      fetchImpl: async () => { called = true; },
      env: { SPOTIFY_CLIENT_ID: 'id', SPOTIFY_CLIENT_SECRET: 'secret' },
    });
    const res = responseRecorder();
    await handler(req, res);
    assert.equal(res.statusCode, expectedStatus);
    assert.equal(called, false);
  }
});

test('preflight returns CORS headers without contacting Spotify', async () => {
  let called = false;
  const handler = createSpotifyHandler({ fetchImpl: async () => { called = true; }, env: {} });
  const res = responseRecorder();

  await handler(request({}, { method: 'OPTIONS' }), res);

  assert.equal(res.statusCode, 204);
  assert.equal(res.headers['Access-Control-Allow-Origin'], 'https://zxx89905.github.io');
  assert.equal(called, false);
});

test('missing credentials and upstream failures return generic errors', async () => {
  const missing = responseRecorder();
  await createSpotifyHandler({ fetchImpl: fetch, env: {} })(
    request({ action: 'search', q: 'album' }),
    missing,
  );
  assert.equal(missing.statusCode, 503);
  assert.deepEqual(missing.body, { error: 'Spotify service is not configured' });

  const failed = responseRecorder();
  await createSpotifyHandler({
    fetchImpl: async () => new Response('{}', { status: 401 }),
    env: { SPOTIFY_CLIENT_ID: 'id', SPOTIFY_CLIENT_SECRET: 'secret' },
  })(request({ action: 'search', q: 'album' }), failed);
  assert.equal(failed.statusCode, 502);
  assert.deepEqual(failed.body, { error: 'Spotify service is unavailable' });
});
