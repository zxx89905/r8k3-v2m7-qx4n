# Songform

Custom circular song lyric poster generator powered by Spotify album and track data.

## Run

Run `npm install`, then set `VITE_SPOTIFY_PROXY_URL` to a deployed Songform Spotify proxy endpoint and run `npm run dev`.

Spotify credentials are server-only. Store `SPOTIFY_CLIENT_ID` and `SPOTIFY_CLIENT_SECRET` as Vercel environment variables; never expose them through a `VITE_` variable or browser code.

Spotify supplies song metadata, artwork, and the scannable code. Available lyrics are fetched from LRCLIB and remain editable; manual lyrics are supported when no match is found.

The `公开目录` mode uses Apple's public iTunes catalog directly and needs no account or API key. Songform requests a strict same-track match from the Spotify proxy only to add a Spotify link and scannable code; if no reliable match is found, the poster remains editable and the code stays hidden.
