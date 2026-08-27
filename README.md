# Songform

Custom circular song lyric poster generator powered by Spotify album and track data.

## Run

Run npm install, then npm run dev.

Add VITE_SPOTIFY_CLIENT_ID and VITE_SPOTIFY_CLIENT_SECRET to .env.

Spotify supplies song metadata, artwork, and the scannable code. Available lyrics are fetched from LRCLIB and remain editable; manual lyrics are supported when no match is found.
