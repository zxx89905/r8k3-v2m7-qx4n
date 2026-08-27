# Vercel Spotify Proxy Design

## Goal

Restore Spotify album and artist search for the public Songform site without placing the Spotify Client ID or Client Secret in the repository, browser bundle, GitHub Actions configuration, or GitHub Pages output. The solution must remain usable on free hosting.

## Hosting Architecture

GitHub Pages continues to host the existing Vite frontend at `https://zxx89905.github.io/r8k3-v2m7-qx4n/`. A Vercel Hobby project connected to the same GitHub repository hosts one serverless API route. Vercel stores `SPOTIFY_CLIENT_ID` and `SPOTIFY_CLIENT_SECRET` as encrypted environment variables.

The frontend contains only the public Vercel API URL. It never requests a Spotify access token and never receives either Spotify credential. LRCLIB lyric requests remain direct browser requests because LRCLIB does not require a secret.

## API Contract

The repository adds `api/spotify.js` with a single `GET /api/spotify` route:

- `action=search&q=<query>` searches Spotify albums with a result limit of 8.
- `action=album&id=<spotify-album-id>` returns one album and its tracks.
- `OPTIONS` returns the CORS preflight response without contacting Spotify.
- Any other method returns `405`.
- Missing, empty, or oversized parameters return `400`.
- Unsupported actions return `400`.
- Missing server credentials return `503` without identifying which value is absent.
- Spotify authentication or request failures return `502` with a generic error body.

Successful responses preserve Spotify's JSON structures used by the current frontend: `albums.items` for searches and the album object for details. The proxy never logs credentials, access tokens, authorization headers, or full upstream error bodies.

## Credential and Request Boundary

The server reads only `process.env.SPOTIFY_CLIENT_ID` and `process.env.SPOTIFY_CLIENT_SECRET`. No `VITE_` credential variable remains in committed source or documentation. The Spotify Client Credentials token is cached in module memory until shortly before expiry; a cold serverless instance obtains a new token.

Browser CORS responses allow the production origin `https://zxx89905.github.io` and local development origins on `http://localhost` or `http://127.0.0.1`. Requests carrying any other `Origin` receive `403`. This limits ordinary cross-site browser use but is not treated as authentication; the endpoint remains an Internet-facing proxy and validates every parameter before making an upstream request.

## Frontend Changes

`src/spotify.js` retains the existing exported interface:

- `searchAlbums(query)`
- `getAlbum(id)`
- `getLyrics(track, album)`

Only the Spotify transport changes. `searchAlbums` and `getAlbum` call the public Vercel proxy, verify the HTTP result, and return the same values currently consumed by `App.jsx`. `getLyrics` continues calling LRCLIB. The UI copy changes from "Spotify configuration" to a generic temporary-service error because visitors cannot configure server credentials.

The public proxy base URL is isolated in one exported constant so the temporary Vercel deployment URL can be added after the backend is deployed without touching request logic.

## Testing

Node tests cover the serverless route with a controlled fetch substitute at the external Spotify boundary:

- search input maps to the expected Spotify search URL and returns album JSON;
- album input maps to the expected Spotify album URL;
- credentials are read from server environment variables only;
- invalid methods, actions, inputs, and origins are rejected before upstream calls;
- upstream authentication and API failures return generic errors;
- CORS preflight does not contact Spotify.

Client tests verify that no `VITE_SPOTIFY_CLIENT_ID`, `VITE_SPOTIFY_CLIENT_SECRET`, Spotify Accounts token request, or Basic authorization construction remains in `src/`, and that both client operations call the proxy contract. Existing tests and `npm run build` must remain green.

## Deployment Sequence

1. Implement and verify the server route and client transport locally with a placeholder public proxy URL.
2. Commit and push the implementation to GitHub.
3. Create a Vercel Hobby project from `zxx89905/r8k3-v2m7-qx4n`.
4. At action time, obtain explicit confirmation before transmitting the existing local Spotify Client ID and Client Secret to Vercel environment variables.
5. Deploy the Vercel project and verify the server endpoint without exposing credential values in output.
6. Set the frontend proxy constant to the assigned Vercel URL, run all tests and the production build, then commit and push.
7. Wait for GitHub Pages deployment and verify a real album search and album detail request from the production page.
8. Inspect repository history, current tracked files, and production bundles for credential values and forbidden client-side credential patterns.

## Operational Limits

The design uses Vercel's free Hobby tier and Spotify's existing API application. Availability is subject to both providers' free-tier limits and policies. There is no paid resource creation or upgrade in this workflow. If Vercel requires a paid plan or rejects Hobby deployment, stop rather than accepting a charge.

