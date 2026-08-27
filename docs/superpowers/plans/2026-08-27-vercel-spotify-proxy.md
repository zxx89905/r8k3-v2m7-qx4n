# Vercel Spotify Proxy Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Restore Songform music search through a free Vercel Spotify proxy, add a keyless public catalog, and keep Spotify credentials out of Git, GitHub Pages, and browser bundles.

**Architecture:** A single Vercel `GET /api/spotify` function owns Spotify Client Credentials authentication, validates browser inputs, and returns Spotify album data or a strict same-track match. The Vite client calls that proxy through `VITE_SPOTIFY_PROXY_URL`; a separate browser client calls Apple's keyless iTunes APIs and converts results to the editor's existing album shape. The UI routes between Spotify automatic, public catalog, and manual modes; LRCLIB stays client-side.

**Tech Stack:** React 18, Vite 5, Node.js 22 ESM, Node test runner, Vercel Hobby Serverless Functions, GitHub Pages, GitHub Actions.

**Spec:** `docs/superpowers/specs/2026-08-27-vercel-spotify-proxy-design.md`

## Global Constraints

- Use Vercel Hobby only; stop if a paid plan or charge is required.
- Store credentials only as Vercel environment variables named `SPOTIFY_CLIENT_ID` and `SPOTIFY_CLIENT_SECRET`.
- Never place credential values in source, tests, fixtures, command output, GitHub variables, Actions logs, or browser bundles.
- Preserve the frontend exports `searchAlbums(query)`, `getAlbum(id)`, and `getLyrics(track, album)`.
- Allow production browser requests from `https://zxx89905.github.io` and local development origins on `http://localhost` or `http://127.0.0.1`.
- Treat CORS as browser containment, not authentication; validate all input before contacting Spotify.
- Keep GitHub Pages as the user-facing site and LRCLIB as the lyric source.
- Use Apple's public iTunes Search and Lookup APIs for keyless catalog search.
- Return a Spotify URI only when normalized title and artist match exactly and duration differs by at most 5 seconds.
- Hide the Spotify Code whenever the selected track has no validated Spotify URI.

---

### Task 1: Serverless Spotify Boundary

**Files:**
- Create: `api/spotify.js`
- Create: `tests/spotifyProxy.test.mjs`

**Interfaces:**
- Consumes: Vercel request fields `method`, `headers.origin`, and `query`; server environment variables `SPOTIFY_CLIENT_ID` and `SPOTIFY_CLIENT_SECRET`.
- Produces: `createSpotifyHandler({ fetchImpl, env, now }) -> async (req, res)`, plus the default Vercel handler.
- Produces API: `GET /api/spotify?action=search&q=<query>` and `GET /api/spotify?action=album&id=<id>`.

- [ ] **Step 1: Write the failing server-route tests**

Create `tests/spotifyProxy.test.mjs` with a response recorder and controlled external fetch boundary:

```js
import assert from 'node:assert/strict';
import test from 'node:test';
import { createSpotifyHandler } from '../api/spotify.js';

function responseRecorder() {
  return {
    headers: {}, statusCode: 200, body: undefined,
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
  const handler = createSpotifyHandler({ fetchImpl, env: { SPOTIFY_CLIENT_ID: 'id', SPOTIFY_CLIENT_SECRET: 'secret' } });
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
    const handler = createSpotifyHandler({ fetchImpl: async () => { called = true; }, env: { SPOTIFY_CLIENT_ID: 'id', SPOTIFY_CLIENT_SECRET: 'secret' } });
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
  await createSpotifyHandler({ fetchImpl: fetch, env: {} })(request({ action: 'search', q: 'album' }), missing);
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
```

- [ ] **Step 2: Run the focused test and verify RED**

Run: `node --test tests/spotifyProxy.test.mjs`

Expected: FAIL because `api/spotify.js` does not exist.

- [ ] **Step 3: Implement the minimal Vercel handler**

Create `api/spotify.js` with these concrete boundaries:

```js
const PROD_ORIGIN = 'https://zxx89905.github.io';
const LOCAL_ORIGIN = /^http:\/\/(?:localhost|127\.0\.0\.1)(?::\d+)?$/;

function allowedOrigin(origin) {
  return !origin || origin === PROD_ORIGIN || LOCAL_ORIGIN.test(origin);
}

function one(value) {
  return Array.isArray(value) ? value[0] : value;
}

function json(res, status, body) {
  return res.status(status).json(body);
}

export function createSpotifyHandler({ fetchImpl = fetch, env = process.env, now = Date.now } = {}) {
  let token = '';
  let tokenExpiresAt = 0;

  async function getToken() {
    if (token && now() < tokenExpiresAt) return token;
    if (!env.SPOTIFY_CLIENT_ID || !env.SPOTIFY_CLIENT_SECRET) {
      throw Object.assign(new Error('not configured'), { statusCode: 503 });
    }
    const authorization = Buffer.from(`${env.SPOTIFY_CLIENT_ID}:${env.SPOTIFY_CLIENT_SECRET}`).toString('base64');
    const response = await fetchImpl('https://accounts.spotify.com/api/token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded', Authorization: `Basic ${authorization}` },
      body: 'grant_type=client_credentials',
    });
    if (!response.ok) throw Object.assign(new Error('authentication failed'), { statusCode: 502 });
    const data = await response.json();
    token = data.access_token;
    tokenExpiresAt = now() + Math.max(0, (data.expires_in - 60) * 1000);
    return token;
  }

  return async function spotifyHandler(req, res) {
    const origin = req.headers?.origin || '';
    if (!allowedOrigin(origin)) return json(res, 403, { error: 'Origin is not allowed' });
    if (origin) {
      res.setHeader('Access-Control-Allow-Origin', origin);
      res.setHeader('Vary', 'Origin');
    }
    res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
    if (req.method === 'OPTIONS') return res.status(204).end();
    if (req.method !== 'GET') return json(res, 405, { error: 'Method is not allowed' });

    const action = one(req.query?.action);
    const query = String(one(req.query?.q) || '').trim();
    const albumId = String(one(req.query?.id) || '').trim();
    let url;
    if (action === 'search' && query && query.length <= 100) {
      const params = new URLSearchParams({ q: query, type: 'album', limit: '8' });
      url = `https://api.spotify.com/v1/search?${params}`;
    } else if (action === 'album' && /^[A-Za-z0-9]{1,64}$/.test(albumId)) {
      url = `https://api.spotify.com/v1/albums/${albumId}`;
    } else {
      return json(res, 400, { error: 'Invalid Spotify request' });
    }

    try {
      const accessToken = await getToken();
      const response = await fetchImpl(url, { headers: { Authorization: `Bearer ${accessToken}` } });
      if (!response.ok) throw Object.assign(new Error('upstream failed'), { statusCode: 502 });
      return json(res, 200, await response.json());
    } catch (error) {
      const status = error.statusCode === 503 ? 503 : 502;
      return json(res, status, { error: status === 503 ? 'Spotify service is not configured' : 'Spotify service is unavailable' });
    }
  };
}

export default createSpotifyHandler();
```

- [ ] **Step 4: Run the focused tests and verify GREEN**

Run: `node --test tests/spotifyProxy.test.mjs`

Expected: 5 tests pass, 0 fail, and no credential or token value is printed.

- [ ] **Step 5: Commit the server boundary**

```powershell
git add api/spotify.js tests/spotifyProxy.test.mjs
git commit -m "feat: add Spotify serverless proxy"
```

---

### Task 2: Browser Client Transport and Deployment Configuration

**Files:**
- Create: `tests/spotifyClient.test.mjs`
- Modify: `src/spotify.js`
- Modify: `src/App.jsx`
- Modify: `.github/workflows/deploy-pages.yml`
- Modify: `README.md`

**Interfaces:**
- Consumes: `VITE_SPOTIFY_PROXY_URL`, a public URL ending in `/api/spotify`.
- Produces: `createSpotifyClient({ fetchImpl, baseUrl })`, while preserving `searchAlbums`, `getAlbum`, and `getLyrics` exports.
- Produces deployment input: GitHub Actions repository variable `VITE_SPOTIFY_PROXY_URL` passed only to `npm run build`.

- [ ] **Step 1: Write failing client and credential-boundary tests**

Create `tests/spotifyClient.test.mjs`:

```js
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

test('client reports missing configuration and proxy failures', async () => {
  await assert.rejects(() => createSpotifyClient({ baseUrl: '' }).searchAlbums('album'), /not configured/);
  await assert.rejects(
    () => createSpotifyClient({ baseUrl: 'https://proxy.example/api/spotify', fetchImpl: async () => new Response('{}', { status: 502 }) }).searchAlbums('album'),
    /unavailable/,
  );
});

test('browser source does not contain Spotify client credentials or token exchange', async () => {
  const source = await readFile(new URL('../src/spotify.js', import.meta.url), 'utf8');
  assert.doesNotMatch(source, /VITE_SPOTIFY_CLIENT_ID|VITE_SPOTIFY_CLIENT_SECRET/);
  assert.doesNotMatch(source, /accounts\.spotify\.com\/api\/token/);
  assert.doesNotMatch(source, /Authorization:\s*['"]Basic|btoa\(/);
});
```

Extend `tests/githubPages.test.mjs` with:

```js
assert.match(workflowSource, /VITE_SPOTIFY_PROXY_URL:\s*\$\{\{\s*vars\.VITE_SPOTIFY_PROXY_URL\s*\}\}/);
```

- [ ] **Step 2: Run client tests and verify RED**

Run: `node --test tests/spotifyClient.test.mjs tests/githubPages.test.mjs`

Expected: FAIL because `createSpotifyClient` is not exported, browser source still contains credential exchange code, and the workflow does not inject the proxy URL.

- [ ] **Step 3: Replace browser credential exchange with the proxy client**

At the top of `src/spotify.js`, replace token state and `spotifyRequest` with:

```js
const configuredProxyUrl = import.meta.env?.VITE_SPOTIFY_PROXY_URL || '';

export function createSpotifyClient({ fetchImpl = fetch, baseUrl = configuredProxyUrl } = {}) {
  async function request(params) {
    if (!baseUrl) throw new Error('Spotify proxy is not configured');
    const url = new URL(baseUrl);
    for (const [key, value] of Object.entries(params)) url.searchParams.set(key, value);
    const response = await fetchImpl(url);
    if (!response.ok) throw new Error('Spotify proxy is unavailable');
    return response.json();
  }

  return {
    async searchAlbums(query) {
      const data = await request({ action: 'search', q: query });
      return data.albums?.items ?? [];
    },
    getAlbum(id) {
      return request({ action: 'album', id });
    },
  };
}

const spotifyClient = createSpotifyClient();
export const searchAlbums = spotifyClient.searchAlbums;
export const getAlbum = spotifyClient.getAlbum;
```

Keep `normalize` and `getLyrics` unchanged. In `src/App.jsx`, replace the failed-search message with `搜索服务暂时不可用，请稍后重试。`, replace `Spotify 自动` with `自动搜索`, and change the loading copy to `正在搜索音乐...`.

- [ ] **Step 4: Inject the public proxy URL during Pages builds**

Change the build step in `.github/workflows/deploy-pages.yml` to:

```yaml
      - run: npm run build
        env:
          VITE_SPOTIFY_PROXY_URL: ${{ vars.VITE_SPOTIFY_PROXY_URL }}
```

Update `README.md` so local setup uses `VITE_SPOTIFY_PROXY_URL` and explicitly states that Spotify credentials belong only in Vercel environment variables.

- [ ] **Step 5: Run focused and full verification**

Run:

```powershell
node --test tests/spotifyClient.test.mjs tests/githubPages.test.mjs
node --test
$env:VITE_SPOTIFY_PROXY_URL='https://proxy.example/api/spotify'; npm run build
rg -n "VITE_SPOTIFY_CLIENT_ID|VITE_SPOTIFY_CLIENT_SECRET|accounts\.spotify\.com/api/token" src dist README.md
```

Expected: focused and full tests pass; the build exits 0; `rg` returns no matches.

- [ ] **Step 6: Commit the client transport**

```powershell
git add src/spotify.js src/App.jsx .github/workflows/deploy-pages.yml README.md tests/spotifyClient.test.mjs tests/githubPages.test.mjs
git commit -m "feat: route Spotify search through proxy"
```

---

### Task 2A: Strict Spotify Track Matching

**Files:**
- Modify: `tests/spotifyProxy.test.mjs`
- Modify: `tests/spotifyClient.test.mjs`
- Modify: `api/spotify.js`
- Modify: `src/spotify.js`

**Interfaces:**
- Consumes API: `GET /api/spotify?action=match&title=<title>&artist=<artist>&durationMs=<milliseconds>`.
- Produces API: `{ uri, externalUrl }`, with both strings empty when no candidate satisfies the strict match rules.
- Produces client: `matchTrack({ title, artist, durationMs }) -> Promise<{ uri, externalUrl }>`.

- [ ] **Step 1: Write failing match tests**

Add server cases proving exact normalized title/artist plus a duration difference of at most 5000 ms returns the candidate URI, while a remaster-title mismatch, artist mismatch, or larger duration difference returns empty strings. Add client coverage for the exact match query URL.

- [ ] **Step 2: Run match tests and verify RED**

Run: `node --test tests/spotifyProxy.test.mjs tests/spotifyClient.test.mjs`

Expected: FAIL because the proxy rejects `action=match` and the browser client has no `matchTrack` method.

- [ ] **Step 3: Implement minimal strict matching**

Add normalization that lowercases and removes non-letter/non-number separators. Validate non-empty title and artist up to 200 characters and an integer `durationMs` from 1 through 3,600,000. Search Spotify with `type=track`, `limit=5`, and `q=track:<title> artist:<artist>`. Accept only an exact normalized title, an exact normalized candidate artist, and `Math.abs(candidate.duration_ms - durationMs) <= 5000`.

- [ ] **Step 4: Run focused tests and verify GREEN**

Run: `node --test tests/spotifyProxy.test.mjs tests/spotifyClient.test.mjs`

Expected: all focused tests pass with no credential or token printed.

---

### Task 2B: Keyless Public Catalog Adapter

**Files:**
- Create: `tests/publicCatalog.test.mjs`
- Create: `src/publicCatalog.js`

**Interfaces:**
- Produces: `createPublicCatalogClient({ fetchImpl, baseUrl })`.
- Produces: `searchPublicAlbums(query)` and `getPublicAlbum(collectionId)`.
- Returns the editor's album shape with `id`, `name`, `artists`, `images`, `release_date`, and `tracks.items`.

- [ ] **Step 1: Write failing adapter tests**

Use complete iTunes album and song fixtures. Assert the Search URL contains `entity=album`, `limit=8`, and the encoded query; assert Lookup contains `entity=song`; assert album metadata and song rows are converted to Spotify-compatible fields; assert empty lookup results and failed HTTP responses produce clear behavior.

- [ ] **Step 2: Run adapter tests and verify RED**

Run: `node --test tests/publicCatalog.test.mjs`

Expected: FAIL because `src/publicCatalog.js` does not exist.

- [ ] **Step 3: Implement the iTunes adapter**

Call `https://itunes.apple.com/search` and `/lookup` with `country=US`. Convert collection IDs and track IDs to prefixed string IDs, artist names to one-element arrays, release dates to `YYYY-MM-DD`, artwork thumbnails to 600x600 URLs, and songs to `{ id, name, artists, duration_ms, track_number, uri: '', external_urls: {} }`.

- [ ] **Step 4: Run adapter tests and verify GREEN**

Run: `node --test tests/publicCatalog.test.mjs`

Expected: all public-catalog tests pass.

---

### Task 2C: Three Creation Modes and Match Degradation

**Files:**
- Create: `tests/catalogModes.test.mjs`
- Create: `src/catalogModes.js`
- Modify: `src/App.jsx`
- Modify: `src/styles.css`
- Modify: `README.md`

**Interfaces:**
- Produces: `catalogForMode(mode, clients)` returning the Spotify or public search/detail functions.
- Consumes: `matchTrack({ title, artist, durationMs })` after public-catalog track selection.
- UI modes: `spotify`, `public`, and `manual`.

- [ ] **Step 1: Write failing mode-routing tests**

Assert `spotify` routes to Spotify search/detail, `public` routes to iTunes search/detail, and `manual` performs no catalog request. Add a source-level UI contract check for the three visible labels and for conditional Spotify Code availability text.

- [ ] **Step 2: Run mode tests and verify RED**

Run: `node --test tests/catalogModes.test.mjs`

Expected: FAIL because `src/catalogModes.js` and the public mode do not exist.

- [ ] **Step 3: Implement mode routing and UI flow**

Add the third segmented-control button and use the selected mode's client in search and album selection. On public track selection, clear any prior URI, request a strict Spotify match, then merge `uri` and `external_urls.spotify` only when returned. Show matching/no-match status without blocking lyrics or poster editing. Render the barcode toggle disabled when no valid URI exists and keep the poster's `showBarcode` false in that state.

- [ ] **Step 4: Run focused tests and verify GREEN**

Run: `node --test tests/catalogModes.test.mjs tests/publicCatalog.test.mjs tests/spotifyProxy.test.mjs tests/spotifyClient.test.mjs`

Expected: all focused tests pass.

---

### Task 2D: Flattened JPEG Download

**Files:**
- Create: `tests/posterDownloads.test.mjs`
- Create: `src/posterDownload.js`
- Modify: `src/CanvasPoster.jsx`
- Modify: `src/App.jsx`
- Modify: `src/styles.css`

**Interfaces:**
- Produces: `createPosterDownload({ format, pngUrl, canvas, title }) -> { href, filename } | null`.
- JPEG contract: `canvas.toDataURL('image/jpeg', 0.95)` at the existing full canvas dimensions.

- [ ] **Step 1: Write failing download tests**

Assert PNG reuses its lossless data URL, JPEG requests `image/jpeg` with quality `0.95`, invalid filename characters are replaced, and both visible download commands exist.

- [ ] **Step 2: Run focused test and verify RED**

Run: `node --test tests/posterDownloads.test.mjs`

Expected: FAIL because `src/posterDownload.js` and the JPG command do not exist.

- [ ] **Step 3: Implement the download descriptor and retain the rendered canvas**

Pass the rendered canvas through `CanvasPoster.onRendered`, retain it in an `App` ref, and create the PNG or JPEG link only when the user clicks its command. Keep output dimensions unchanged and do not render the preview frame into either output.

- [ ] **Step 4: Run focused test and verify GREEN**

Run: `node --test tests/posterDownloads.test.mjs`

Expected: 3 tests pass and the JPEG data URL uses the requested MIME type.

---

### Task 3: Free Vercel Deployment and Secret Configuration

**Files:**
- No source file changes.
- External state: Vercel Hobby project linked to `zxx89905/r8k3-v2m7-qx4n`.
- External state: Vercel environment variables `SPOTIFY_CLIENT_ID` and `SPOTIFY_CLIENT_SECRET`.

**Interfaces:**
- Consumes: committed `api/spotify.js` and the existing ignored local `.env` credential values.
- Produces: an assigned HTTPS endpoint ending in `/api/spotify`.

- [ ] **Step 1: Push implementation commits**

Run:

```powershell
git push origin main
git status --short
```

Expected: push succeeds and worktree output is empty.

- [ ] **Step 2: Create or sign in to Vercel with GitHub**

Open `https://vercel.com/new`, choose GitHub authentication, and select the Hobby/free plan. Immediately before the final account-creation action, request user confirmation if Vercel is creating a new account. Stop if the page presents a paid plan, payment method, or charge.

- [ ] **Step 3: Import the existing repository**

Import `zxx89905/r8k3-v2m7-qx4n`, keep the repository root as the project root, and let Vercel detect Vite. Do not enter Spotify credentials in build settings or commit them to files.

- [ ] **Step 4: Configure server-only credentials**

Read the two values from the ignored local `.env` without printing them. Immediately before typing or submitting them to Vercel, ask for action-time confirmation identifying the two values and Vercel as the destination. Store them under the exact names `SPOTIFY_CLIENT_ID` and `SPOTIFY_CLIENT_SECRET` for Production, Preview, and Development.

- [ ] **Step 5: Deploy and verify the assigned API endpoint**

Deploy on Hobby and capture the authoritative project domain shown by Vercel. Verify a no-origin request through PowerShell using a real query:

```powershell
$proxyUrl = "https://" + $vercelDomain + "/api/spotify"
$result = Invoke-RestMethod -Uri ($proxyUrl + '?action=search&q=Frank%20Ocean') -Method Get -TimeoutSec 30
if (-not $result.albums.items.Count) { throw 'Spotify proxy returned no albums.' }
"proxy_search_results=$($result.albums.items.Count)"
```

Expected: at least one album result; output contains counts only, never credentials or tokens.

---

### Task 4: Production Pages Configuration and End-to-End Verification

**Files:**
- No source change unless a test reveals a concrete integration defect.
- External state: GitHub Actions variable `VITE_SPOTIFY_PROXY_URL`.

**Interfaces:**
- Consumes: the verified Vercel API endpoint from Task 3.
- Produces: a GitHub Pages bundle that calls that endpoint.

- [ ] **Step 1: Set the public GitHub Actions variable**

Use the authenticated GitHub API or repository Settings to create/update Actions variable `VITE_SPOTIFY_PROXY_URL` with the verified full endpoint URL. This value is intentionally public and must not contain credentials, query parameters, or tokens.

- [ ] **Step 2: Trigger and wait for Pages deployment**

Dispatch `Deploy Songform to GitHub Pages` on `main`, then query the authenticated workflow-run endpoint until `status=completed`. Expected conclusion: `success`.

- [ ] **Step 3: Verify browser searches and album selection**

Open `https://zxx89905.github.io/r8k3-v2m7-qx4n/`, activate the existing visual entrance, search for `Frank Ocean`, and verify:

- at least one album result renders;
- selecting an album renders a non-empty track selector;
- the poster preview receives title, artist, artwork, and album metadata;
- browser console contains no credential, CORS, authentication, or unhandled request errors.
- public catalog search returns albums without a key;
- selecting a public album loads tracks and lyrics;
- a high-confidence public track match shows a Spotify Code and Spotify link;
- an unmatched public track keeps the poster usable and hides the Spotify Code.

- [ ] **Step 4: Run fresh repository and secret-leak verification**

Run:

```powershell
node --test
$env:VITE_SPOTIFY_PROXY_URL=$proxyUrl; npm run build
git fetch origin main
if ((git rev-parse HEAD) -ne (git rev-parse origin/main)) { throw 'Local and remote commits differ.' }
if (git status --short) { throw 'Worktree is not clean.' }
$trackedText = git grep -n -E 'VITE_SPOTIFY_CLIENT_ID|VITE_SPOTIFY_CLIENT_SECRET|accounts\.spotify\.com/api/token' -- ':!docs/superpowers/specs/*' ':!docs/superpowers/plans/*'
if ($LASTEXITCODE -eq 0) { throw "Forbidden browser credential pattern remains: $trackedText" }
```

Read the ignored `.env` values into memory and scan tracked files and `dist` using exact string comparison while outputting booleans only. Expected: both `tracked_secret_found=False` and `dist_secret_found=False`.

- [ ] **Step 5: Record the completion evidence**

Report the production Pages URL, public Vercel endpoint domain, final commit, workflow run conclusion, full test count, build exit result, and the two secret-scan booleans. Explicitly state that a real album search and album-detail selection succeeded while credential values did not appear in Git or the browser bundle.

