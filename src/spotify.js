const PUBLIC_PROXY_URL = 'https://r8k3-v2m7-qx4n.vercel.app/api/spotify';
const configuredProxyUrl = import.meta.env?.VITE_SPOTIFY_PROXY_URL || PUBLIC_PROXY_URL;

export function createSpotifyClient({ fetchImpl = fetch, baseUrl = configuredProxyUrl } = {}) {
  async function request(params) {
    if (!baseUrl) throw new Error('Spotify proxy is not configured');
    const url = new URL(baseUrl);
    for (const [key, value] of Object.entries(params)) {
      url.searchParams.set(key, value);
    }
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
    matchTrack({ title, artist, durationMs }) {
      return request({ action: 'match', title, artist, durationMs: String(durationMs) });
    },
  };
}

const spotifyClient = createSpotifyClient();
export const searchAlbums = spotifyClient.searchAlbums;
export const getAlbum = spotifyClient.getAlbum;
export const matchTrack = spotifyClient.matchTrack;

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
