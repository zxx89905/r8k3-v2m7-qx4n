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

test('invalid requests are rejected before Spotify is called', async () => {
  const cases = [
    [request({ action: 'search', q: '' }), 400],
    [request({ action: 'search', q: 'x'.repeat(101) }), 400],
    [request({ action: 'album', id: '../token' }), 400],
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
