import http from 'node:http';
import { createSpotifyHandler } from '../api/spotify.js';

const handler = createSpotifyHandler({
  env: {
    SPOTIFY_CLIENT_ID: process.env.SPOTIFY_CLIENT_ID || process.env.VITE_SPOTIFY_CLIENT_ID,
    SPOTIFY_CLIENT_SECRET: process.env.SPOTIFY_CLIENT_SECRET || process.env.VITE_SPOTIFY_CLIENT_SECRET,
  },
});

http.createServer((req, res) => {
  const url = new URL(req.url, 'http://127.0.0.1');
  if (url.pathname !== '/api/spotify') {
    res.writeHead(404).end();
    return;
  }
  req.query = Object.fromEntries(url.searchParams);
  res.status = (code) => { res.statusCode = code; return res; };
  res.json = (body) => {
    res.setHeader('Content-Type', 'application/json');
    res.end(JSON.stringify(body));
    return res;
  };
  Promise.resolve(handler(req, res)).catch(() => {
    if (!res.headersSent) res.writeHead(500);
    res.end();
  });
}).listen(4178, '127.0.0.1', () => {
  process.stdout.write('Local Spotify proxy: http://127.0.0.1:4178/api/spotify\n');
});
