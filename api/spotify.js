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

    const authorization = Buffer
      .from(`${env.SPOTIFY_CLIENT_ID}:${env.SPOTIFY_CLIENT_SECRET}`)
      .toString('base64');
    const response = await fetchImpl('https://accounts.spotify.com/api/token', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        Authorization: `Basic ${authorization}`,
      },
      body: 'grant_type=client_credentials',
    });
    if (!response.ok) {
      throw Object.assign(new Error('authentication failed'), { statusCode: 502 });
    }

    const data = await response.json();
    token = data.access_token;
    tokenExpiresAt = now() + Math.max(0, (data.expires_in - 60) * 1000);
    return token;
  }

  return async function spotifyHandler(req, res) {
    const origin = req.headers?.origin || '';
    if (!allowedOrigin(origin)) {
      return json(res, 403, { error: 'Origin is not allowed' });
    }
    if (origin) {
      res.setHeader('Access-Control-Allow-Origin', origin);
      res.setHeader('Vary', 'Origin');
    }
    res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

    if (req.method === 'OPTIONS') return res.status(204).end();
    if (req.method !== 'GET') {
      return json(res, 405, { error: 'Method is not allowed' });
    }

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
      const response = await fetchImpl(url, {
        headers: { Authorization: `Bearer ${accessToken}` },
      });
      if (!response.ok) {
        throw Object.assign(new Error('upstream failed'), { statusCode: 502 });
      }
      return json(res, 200, await response.json());
    } catch (error) {
      const status = error.statusCode === 503 ? 503 : 502;
      const message = status === 503
        ? 'Spotify service is not configured'
        : 'Spotify service is unavailable';
      return json(res, status, { error: message });
    }
  };
}

export default createSpotifyHandler();
