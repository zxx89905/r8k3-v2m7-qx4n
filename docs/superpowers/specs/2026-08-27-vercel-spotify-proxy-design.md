# Vercel Spotify Proxy Design

## Goal

Restore music search for the public Songform site without placing the Spotify Client ID or Client Secret in the repository, browser bundle, GitHub Actions configuration, or GitHub Pages output. Songform provides three creation modes: Spotify automatic search through a server-only proxy, a free public catalog that needs no account or key, and fully manual creation. The solution must remain usable on free hosting.

## Hosting Architecture

GitHub Pages continues to host the existing Vite frontend at `https://zxx89905.github.io/r8k3-v2m7-qx4n/`. A Vercel Hobby project connected to the same GitHub repository hosts one serverless API route. Vercel stores `SPOTIFY_CLIENT_ID` and `SPOTIFY_CLIENT_SECRET` as encrypted environment variables.

The frontend contains only the public Vercel API URL. It never requests a Spotify access token and never receives either Spotify credential. LRCLIB lyric requests remain direct browser requests because LRCLIB does not require a secret.

Apple's public iTunes Search and Lookup APIs provide the keyless catalog. These requests run directly in the browser because the endpoints require no secret and allow cross-origin access. Public-catalog results are converted to the same album and track shape already consumed by the editor.

## API Contract

The repository adds `api/spotify.js` with a single `GET /api/spotify` route:

- `action=search&q=<query>` searches Spotify albums with a result limit of 8.
- `action=album&id=<spotify-album-id>` returns one album and its tracks.
- `action=match&title=<title>&artist=<artist>&durationMs=<milliseconds>` searches Spotify tracks and returns a Spotify URI only for a high-confidence same-song match.
- `OPTIONS` returns the CORS preflight response without contacting Spotify.
- Any other method returns `405`.
- Missing, empty, or oversized parameters return `400`.
- Unsupported actions return `400`.
- Missing server credentials return `503` without identifying which value is absent.
- Spotify authentication or request failures return `502` with a generic error body.

Successful responses preserve Spotify's JSON structures used by the current frontend: `albums.items` for searches and the album object for details. The proxy never logs credentials, access tokens, authorization headers, or full upstream error bodies.

The match action searches up to five tracks using the supplied title and artist. A candidate is accepted only when normalized titles are equal, at least one normalized primary artist is equal, and the duration differs by no more than five seconds. An accepted response is `{ "uri": "spotify:track:<id>", "externalUrl": "https://open.spotify.com/track/<id>" }`; no acceptable candidate returns `{ "uri": "", "externalUrl": "" }`. Missing or invalid title, artist, or duration input returns `400`.

## Credential and Request Boundary

The server reads only `process.env.SPOTIFY_CLIENT_ID` and `process.env.SPOTIFY_CLIENT_SECRET`. No `VITE_` credential variable remains in committed source or documentation. The Spotify Client Credentials token is cached in module memory until shortly before expiry; a cold serverless instance obtains a new token.

Browser CORS responses allow the production origin `https://zxx89905.github.io` and local development origins on `http://localhost` or `http://127.0.0.1`. Requests carrying any other `Origin` receive `403`. This limits ordinary cross-site browser use but is not treated as authentication; the endpoint remains an Internet-facing proxy and validates every parameter before making an upstream request.

## Frontend Changes

`src/spotify.js` retains the existing exported interface and adds matching:

- `searchAlbums(query)`
- `getAlbum(id)`
- `matchTrack({ title, artist, durationMs })`
- `getLyrics(track, album)`

Only the Spotify transport changes. `searchAlbums` and `getAlbum` call the public Vercel proxy, verify the HTTP result, and return the same values currently consumed by `App.jsx`. `getLyrics` continues calling LRCLIB. The UI copy changes from "Spotify configuration" to a generic temporary-service error because visitors cannot configure server credentials.

The public proxy base URL is isolated in one exported constant so the temporary Vercel deployment URL can be added after the backend is deployed without touching request logic.

`src/publicCatalog.js` owns the iTunes boundary:

- `searchPublicAlbums(query)` calls iTunes Search with `entity=album` and `limit=8`.
- `getPublicAlbum(collectionId)` calls iTunes Lookup with `entity=song`.
- Both functions convert iTunes fields into the existing album shape (`images`, `artists`, `release_date`, and `tracks.items`). Artwork URLs are upgraded from thumbnail size to a larger documented iTunes artwork size.

`App.jsx` exposes a three-option segmented control: `Spotify 自动`, `公开目录`, and `手动制作`. Spotify mode uses the proxy for album data. Public mode uses the keyless iTunes client for album data, then calls `matchTrack` whenever the selected track changes. A match adds Spotify `uri` and `external_urls.spotify` to the selected public track. While matching, the UI reports progress; when no match exists or the proxy is unavailable, the poster remains usable and the Spotify Code is hidden. Manual mode retains the optional Spotify link/URI input.

The poster renderer only attempts to draw a Spotify Code when a validated Spotify track URI is present. It never creates a fake or unrelated barcode for a public-catalog track that was not matched.

The download toolbar keeps the lossless PNG export and adds a flattened JPEG export for Photoshop workflows. JPEG uses the already rendered full-resolution canvas, `image/jpeg`, and quality `0.95`; it does not reduce poster dimensions or include preview-frame decoration. Photoshop may display the JPEG as one locked background layer, but it contains no editable or separate image layers.

## Testing

Node tests cover the serverless route with a controlled fetch substitute at the external Spotify boundary:

- search input maps to the expected Spotify search URL and returns album JSON;
- album input maps to the expected Spotify album URL;
- credentials are read from server environment variables only;
- invalid methods, actions, inputs, and origins are rejected before upstream calls;
- upstream authentication and API failures return generic errors;
- CORS preflight does not contact Spotify.

Client tests verify that no `VITE_SPOTIFY_CLIENT_ID`, `VITE_SPOTIFY_CLIENT_SECRET`, Spotify Accounts token request, or Basic authorization construction remains in `src/`, and that both client operations call the proxy contract. Existing tests and `npm run build` must remain green.

Additional tests cover strict Spotify track matching, iTunes request URLs and data conversion, empty/malformed public responses, all three mode labels, mode-specific search routing, selected-track matching, and barcode suppression when no Spotify URI exists.

Download tests verify that PNG remains unchanged, JPEG uses quality `0.95` at the rendered canvas dimensions, filenames use `.jpg`, and both download actions remain available in the editor.

## Deployment Sequence

1. Implement and verify the server route, strict track matching, browser proxy client, and keyless public-catalog client locally with a placeholder public proxy URL.
2. Commit and push the implementation to GitHub.
3. Create a Vercel Hobby project from `zxx89905/r8k3-v2m7-qx4n`.
4. At action time, obtain explicit confirmation before transmitting the existing local Spotify Client ID and Client Secret to Vercel environment variables.
5. Deploy the Vercel project and verify the server endpoint without exposing credential values in output.
6. Set the frontend proxy constant to the assigned Vercel URL, run all tests and the production build, then commit and push.
7. Wait for GitHub Pages deployment and verify Spotify search, public-catalog search, album selection, track selection, and Spotify Code matching from the production page.
8. Inspect repository history, current tracked files, and production bundles for credential values and forbidden client-side credential patterns.

## Operational Limits

The design uses Vercel's free Hobby tier and Spotify's existing API application. Availability is subject to both providers' free-tier limits and policies. There is no paid resource creation or upgrade in this workflow. If Vercel requires a paid plan or rejects Hobby deployment, stop rather than accepting a charge.

