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

function normalize(value) {
  return String(value || '').toLowerCase().replace(/[^\p{L}\p{N}]+/gu, ' ').trim();
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
    const title = String(one(req.query?.title) || '').trim();
    const artist = String(one(req.query?.artist) || '').trim();
    const durationMs = Number(one(req.query?.durationMs));
    let url;
    let isMatch = false;

    if (action === 'search' && query && query.length <= 100) {
      const params = new URLSearchParams({ q: query, type: 'album', limit: '8' });
      url = `https://api.spotify.com/v1/search?${params}`;
    } else if (action === 'album' && /^[A-Za-z0-9]{1,64}$/.test(albumId)) {
      url = `https://api.spotify.com/v1/albums/${albumId}`;
    } else if (
      action === 'match'
      && title && title.length <= 200
      && artist && artist.length <= 200
      && Number.isInteger(durationMs) && durationMs >= 1 && durationMs <= 3_600_000
    ) {
      const params = new URLSearchParams({
        q: `track:${title} artist:${artist}`,
        type: 'track',
        limit: '5',
      });
      url = `https://api.spotify.com/v1/search?${params}`;
      isMatch = true;
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
      const body = await response.json();
      if (!isMatch) return json(res, 200, body);

      const normalizedTitle = normalize(title);
      const normalizedArtist = normalize(artist);
      const match = body.tracks?.items?.find((track) => (
        normalize(track.name) === normalizedTitle
        && track.artists?.some((item) => normalize(item.name) === normalizedArtist)
        && Math.abs(Number(track.duration_ms) - durationMs) <= 5_000
      ));
      return json(res, 200, {
        uri: match?.uri || '',
        externalUrl: match?.external_urls?.spotify || '',
      });
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
