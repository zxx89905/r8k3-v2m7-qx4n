import assert from 'node:assert/strict';
import test from 'node:test';
import { createPublicCatalogClient } from '../src/publicCatalog.js';

const albumResult = {
  wrapperType: 'collection',
  collectionType: 'Album',
  artistId: 442122051,
  collectionId: 1349524897,
  artistName: 'Frank Ocean',
  collectionName: 'Blonde',
  collectionViewUrl: 'https://music.apple.com/us/album/blonde/1349524897',
  artworkUrl60: 'https://is1-ssl.mzstatic.com/image/thumb/Music115/v4/cover/60x60bb.jpg',
  artworkUrl100: 'https://is1-ssl.mzstatic.com/image/thumb/Music115/v4/cover/100x100bb.jpg',
  trackCount: 17,
  copyright: '2016 Boys Don\'t Cry',
  country: 'USA',
  currency: 'USD',
  releaseDate: '2016-08-20T07:00:00Z',
  primaryGenreName: 'Pop',
};

const trackResult = {
  wrapperType: 'track',
  kind: 'song',
  artistId: 442122051,
  collectionId: 1349524897,
  trackId: 1349524912,
  artistName: 'Frank Ocean',
  collectionName: 'Blonde',
  trackName: 'Nights',
  collectionViewUrl: 'https://music.apple.com/us/album/blonde/1349524897',
  trackViewUrl: 'https://music.apple.com/us/album/nights/1349524897?i=1349524912',
  previewUrl: 'https://audio-ssl.itunes.apple.com/preview.m4a',
  artworkUrl100: 'https://is1-ssl.mzstatic.com/image/thumb/Music115/v4/cover/100x100bb.jpg',
  releaseDate: '2016-08-20T07:00:00Z',
  trackTimeMillis: 307151,
  trackNumber: 9,
  discNumber: 1,
  primaryGenreName: 'Pop',
};

test('searchPublicAlbums requests iTunes and converts albums for the editor', async () => {
  let requestedUrl = '';
  const client = createPublicCatalogClient({
    fetchImpl: async (url) => {
      requestedUrl = String(url);
      return new Response(JSON.stringify({ resultCount: 1, results: [albumResult] }), { status: 200 });
    },
  });

  const albums = await client.searchPublicAlbums('Frank Ocean');

  assert.equal(requestedUrl, 'https://itunes.apple.com/search?term=Frank+Ocean&entity=album&limit=8&country=US');
  assert.deepEqual(albums, [{
    id: 'itunes:collection:1349524897',
    name: 'Blonde',
    artists: [{ id: 'itunes:artist:442122051', name: 'Frank Ocean' }],
    images: [
      { url: 'https://is1-ssl.mzstatic.com/image/thumb/Music115/v4/cover/600x600bb.jpg' },
      { url: 'https://is1-ssl.mzstatic.com/image/thumb/Music115/v4/cover/300x300bb.jpg' },
      { url: 'https://is1-ssl.mzstatic.com/image/thumb/Music115/v4/cover/100x100bb.jpg' },
    ],
    release_date: '2016-08-20',
    total_tracks: 17,
    external_urls: { apple: 'https://music.apple.com/us/album/blonde/1349524897' },
    catalog: 'itunes',
  }]);
});

test('getPublicAlbum requests iTunes lookup and converts song rows', async () => {
  let requestedUrl = '';
  const client = createPublicCatalogClient({
    fetchImpl: async (url) => {
      requestedUrl = String(url);
      return new Response(JSON.stringify({ resultCount: 2, results: [albumResult, trackResult] }), { status: 200 });
    },
  });

  const album = await client.getPublicAlbum('itunes:collection:1349524897');

  assert.equal(requestedUrl, 'https://itunes.apple.com/lookup?id=1349524897&entity=song&country=US');
  assert.equal(album.id, 'itunes:collection:1349524897');
  assert.equal(album.name, 'Blonde');
  assert.equal(album.images[0].url, 'https://is1-ssl.mzstatic.com/image/thumb/Music115/v4/cover/600x600bb.jpg');
  assert.deepEqual(album.tracks.items, [{
    id: 'itunes:track:1349524912',
    name: 'Nights',
    artists: [{ id: 'itunes:artist:442122051', name: 'Frank Ocean' }],
    duration_ms: 307151,
    track_number: 9,
    disc_number: 1,
    uri: '',
    external_urls: {},
    catalog: 'itunes',
  }]);
});

test('public catalog handles empty searches, missing albums, and HTTP failures', async () => {
  const empty = createPublicCatalogClient({
    fetchImpl: async () => new Response(JSON.stringify({ resultCount: 0, results: [] }), { status: 200 }),
  });
  assert.deepEqual(await empty.searchPublicAlbums('missing'), []);
  await assert.rejects(() => empty.getPublicAlbum('itunes:collection:1'), /not found/);

  const failed = createPublicCatalogClient({
    fetchImpl: async () => new Response('{}', { status: 503 }),
  });
  await assert.rejects(() => failed.searchPublicAlbums('Frank Ocean'), /unavailable/);
});

test('public catalog normalizes malformed successful payloads', async () => {
  for (const payload of [null, {}, { results: {} }]) {
    const client = createPublicCatalogClient({
      fetchImpl: async () => new Response(JSON.stringify(payload), { status: 200 }),
    });
    assert.deepEqual(await client.searchPublicAlbums('Frank Ocean'), []);
    await assert.rejects(
      () => client.getPublicAlbum('itunes:collection:1349524897'),
      /not found/,
    );
  }
});
