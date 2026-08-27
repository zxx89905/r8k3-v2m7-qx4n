function clientFor(mode, clients) {
  if (mode === 'spotify') return clients.spotify;
  if (mode === 'public') return clients.publicCatalog;
  throw new Error(`${mode} mode does not use a catalog`);
}

export function normalizeSpotifyTrackUri(value) {
  const clean = String(value || '').trim();
  const uriMatch = clean.match(/^spotify:track:([A-Za-z0-9]{22})$/);
  if (uriMatch) return `spotify:track:${uriMatch[1]}`;

  try {
    const url = new URL(clean);
    if (url.protocol !== 'https:' || url.hostname !== 'open.spotify.com') return '';
    const path = url.pathname.split('/').filter(Boolean);
    const trackIndex = path.lastIndexOf('track');
    if (trackIndex < 0) return '';
    const trackId = path[trackIndex + 1] || '';
    return /^[A-Za-z0-9]{22}$/.test(trackId) ? `spotify:track:${trackId}` : '';
  } catch {
    return '';
  }
}

export function resolveTrackUri({ mode, manualReference, publicReference, automaticUri }) {
  if (mode === 'manual') return normalizeSpotifyTrackUri(manualReference);
  if (mode === 'public') {
    return normalizeSpotifyTrackUri(publicReference) || automaticUri || '';
  }
  return automaticUri || '';
}

export function spotifyTrackUrlFromUri(uri) {
  const match = String(uri || '').match(/^spotify:track:([A-Za-z0-9]{22})$/);
  return match ? `https://open.spotify.com/track/${match[1]}` : '';
}

export function createCatalogRouter(clients) {
  return {
    async searchAlbums(mode, query) {
      return clientFor(mode, clients).searchAlbums(query);
    },
    async getAlbum(mode, id) {
      return clientFor(mode, clients).getAlbum(id);
    },
  };
}

export function createLatestRequestGuard() {
  let generation = 0;
  return {
    start() {
      const requestGeneration = ++generation;
      return { isCurrent: () => requestGeneration === generation };
    },
    invalidate() {
      generation += 1;
    },
  };
}

export function selectionForTrack(album, track) {
  return {
    track: track || null,
    title: track?.name || '',
    artist: track ? album?.artists?.map((item) => item.name).join(', ') || '' : '',
  };
}

export async function matchPublicTrack(track, matchTrack) {
  const result = await matchTrack({
    title: track?.name || '',
    artist: track?.artists?.[0]?.name || '',
    durationMs: Number(track?.duration_ms) || 0,
  });
  const externalUrls = { ...(track?.external_urls || {}) };
  delete externalUrls.spotify;
  if (result.externalUrl) externalUrls.spotify = result.externalUrl;
  return {
    ...track,
    uri: result.uri || '',
    external_urls: externalUrls,
  };
}
