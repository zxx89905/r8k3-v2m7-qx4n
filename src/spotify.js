let cachedToken = null;
let tokenExpiresAt = 0;

async function getToken() {
  if (cachedToken && Date.now() < tokenExpiresAt) return cachedToken;
  const clientId = import.meta.env.VITE_SPOTIFY_CLIENT_ID;
  const clientSecret = import.meta.env.VITE_SPOTIFY_CLIENT_SECRET;
  if (!clientId || !clientSecret) throw new Error('Spotify credentials are missing in .env');
  const response = await fetch('https://accounts.spotify.com/api/token', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
      Authorization: 'Basic ' + btoa(clientId + ':' + clientSecret),
    },
    body: 'grant_type=client_credentials',
  });
  if (!response.ok) throw new Error('Spotify authentication failed');
  const data = await response.json();
  cachedToken = data.access_token;
  tokenExpiresAt = Date.now() + (data.expires_in - 60) * 1000;
  return cachedToken;
}

async function spotifyRequest(path) {
  const token = await getToken();
  const response = await fetch('https://api.spotify.com/v1' + path, {
    headers: { Authorization: 'Bearer ' + token },
  });
  if (!response.ok) throw new Error('Spotify request failed: ' + response.status);
  return response.json();
}

export async function searchAlbums(query) {
  const data = await spotifyRequest('/search?q=' + encodeURIComponent(query) + '&type=album&limit=8');
  return data.albums?.items ?? [];
}

export async function getAlbum(id) {
  return spotifyRequest('/albums/' + id);
}

function normalize(value) {
  return (value || '').toLowerCase().replace(/[^\p{L}\p{N}]+/gu, ' ').trim();
}

export async function getLyrics(track, album) {
  if (!track) return { lyrics: '', syncedLyrics: '', source: '' };
  const params = new URLSearchParams({
    track_name: track.name,
    artist_name: album?.artists?.map((artist) => artist.name).join(', ') || '',
    album_name: album?.name || '',
    duration: String(Math.round((track.duration_ms || 0) / 1000)),
  });
  const response = await fetch('https://lrclib.net/api/search?' + params.toString());
  if (!response.ok) throw new Error('Lyrics service is unavailable');
  const results = await response.json();
  const exact = results
    .filter((item) => item.plainLyrics || item.syncedLyrics)
    .sort((a, b) => {
      const score = (item) => {
        const trackScore = normalize(item.trackName) === normalize(track.name) ? 3 : 0;
        const artistScore = normalize(item.artistName).includes(normalize(album?.artists?.[0]?.name)) ? 2 : 0;
        const albumScore = normalize(item.albumName) === normalize(album?.name) ? 1 : 0;
        return trackScore + artistScore + albumScore;
      };
      return score(b) - score(a);
    })[0];
  if (!exact) return { lyrics: '', syncedLyrics: '', source: '' };
  return {
    lyrics: exact.plainLyrics || exact.syncedLyrics?.replace(/\[\d{2}:\d{2}(?:\.\d{2,3})?\]/g, '').trim() || '',
    syncedLyrics: exact.syncedLyrics || '',
    source: 'LRCLIB',
  };
}
