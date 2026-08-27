const DEFAULT_BASE_URL = 'https://itunes.apple.com';

function artworkAt(url, size) {
  return String(url || '').replace(/\d+x\d+(bb)?\.(jpg|png)$/i, `${size}x${size}$1.$2`);
}

function artistsFor(item) {
  return [{
    id: `itunes:artist:${item.artistId || item.artistName || 'unknown'}`,
    name: item.artistName || 'Unknown artist',
  }];
}

function imagesFor(item) {
  const source = item.artworkUrl100 || item.artworkUrl60 || '';
  return source
    ? [600, 300, 100].map((size) => ({ url: artworkAt(source, size) }))
    : [];
}

function dateOnly(value) {
  return String(value || '').slice(0, 10);
}

function convertAlbum(item) {
  return {
    id: `itunes:collection:${item.collectionId}`,
    name: item.collectionName || 'Untitled album',
    artists: artistsFor(item),
    images: imagesFor(item),
    release_date: dateOnly(item.releaseDate),
    total_tracks: Number(item.trackCount) || 0,
    external_urls: { apple: item.collectionViewUrl || '' },
    catalog: 'itunes',
  };
}

function convertTrack(item) {
  return {
    id: `itunes:track:${item.trackId}`,
    name: item.trackName || 'Untitled track',
    artists: artistsFor(item),
    duration_ms: Number(item.trackTimeMillis) || 0,
    track_number: Number(item.trackNumber) || 0,
    disc_number: Number(item.discNumber) || 1,
    uri: '',
    external_urls: {},
    catalog: 'itunes',
  };
}

function collectionIdFrom(value) {
  const match = String(value || '').match(/^(?:itunes:collection:)?(\d+)$/);
  return match?.[1] || '';
}

function resultsFrom(data) {
  return Array.isArray(data?.results) ? data.results : [];
}

export function createPublicCatalogClient({ fetchImpl = fetch, baseUrl = DEFAULT_BASE_URL } = {}) {
  async function request(path, params) {
    const url = new URL(path, baseUrl);
    for (const [key, value] of Object.entries(params)) url.searchParams.set(key, value);
    const response = await fetchImpl(url);
    if (!response.ok) throw new Error('Public catalog is unavailable');
    return response.json();
  }

  return {
    async searchPublicAlbums(query) {
      const data = await request('/search', {
        term: String(query || '').trim(),
        entity: 'album',
        limit: '8',
        country: 'US',
      });
      return resultsFrom(data)
        .filter((item) => item.wrapperType === 'collection' && item.collectionId)
        .map(convertAlbum);
    },

    async getPublicAlbum(id) {
      const collectionId = collectionIdFrom(id);
      if (!collectionId) throw new Error('Public album not found');
      const data = await request('/lookup', {
        id: collectionId,
        entity: 'song',
        country: 'US',
      });
      const results = resultsFrom(data);
      const albumRow = results.find((item) => item.wrapperType === 'collection');
      if (!albumRow) throw new Error('Public album not found');
      return {
        ...convertAlbum(albumRow),
        tracks: {
          items: results
            .filter((item) => item.wrapperType === 'track' && item.kind === 'song' && item.trackId)
            .map(convertTrack),
        },
      };
    },
  };
}

const publicCatalogClient = createPublicCatalogClient();
export const searchPublicAlbums = publicCatalogClient.searchPublicAlbums;
export const getPublicAlbum = publicCatalogClient.getPublicAlbum;
