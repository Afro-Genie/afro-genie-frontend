const admin = require('firebase-admin');
const { onRequest } = require('firebase-functions/v2/https');
const { onDocumentUpdated } = require('firebase-functions/v2/firestore');
const { defineSecret } = require('firebase-functions/params');

admin.initializeApp();

const SPOTIFY_CLIENT_ID = defineSecret('SPOTIFY_CLIENT_ID');
const SPOTIFY_CLIENT_SECRET = defineSecret('SPOTIFY_CLIENT_SECRET');

const BASE_URL = 'https://api.spotify.com/v1';

let cachedToken = null;
let tokenExpiresAt = 0;

const recentRequests = new Map();

const enforceRateLimit = (req) => {
  const ip = req.headers['x-forwarded-for'] || req.ip || 'unknown';
  const now = Date.now();
  const key = `${ip}`;
  const windowMs = 60 * 1000;
  const maxInWindow = 60;
  const record = recentRequests.get(key) || { count: 0, start: now };

  if (now - record.start > windowMs) {
    recentRequests.set(key, { count: 1, start: now });
    return true;
  }

  if (record.count >= maxInWindow) {
    return false;
  }

  record.count += 1;
  recentRequests.set(key, record);
  return true;
};

const ensureToken = async () => {
  if (cachedToken && Date.now() < tokenExpiresAt) {
    return cachedToken;
  }

  const clientId = SPOTIFY_CLIENT_ID.value();
  const clientSecret = SPOTIFY_CLIENT_SECRET.value();
  if (!clientId || !clientSecret) {
    throw new Error('Spotify secrets are not configured');
  }

  const auth = Buffer.from(`${clientId}:${clientSecret}`).toString('base64');
  const response = await fetch('https://accounts.spotify.com/api/token', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
      Authorization: `Basic ${auth}`,
    },
    body: 'grant_type=client_credentials',
  });

  if (!response.ok) {
    const text = await response.text();
    throw new Error(`Spotify token error: ${text}`);
  }

  const data = await response.json();
  cachedToken = data.access_token;
  tokenExpiresAt = Date.now() + (Math.max(data.expires_in - 120, 60) * 1000);
  return cachedToken;
};

const spotifyRequest = async (endpoint, params = {}) => {
  const token = await ensureToken();
  const url = new URL(`${BASE_URL}${endpoint}`);
  Object.entries(params).forEach(([k, v]) => {
    if (v !== undefined && v !== null && `${v}`.length > 0) {
      url.searchParams.set(k, `${v}`);
    }
  });

  const response = await fetch(url.toString(), {
    headers: { Authorization: `Bearer ${token}` },
  });

  if (!response.ok) {
    const text = await response.text();
    throw new Error(`Spotify API error (${response.status}): ${text}`);
  }

  return response.json();
};

/**
 * Gen2 HTTP functions sit behind Cloud Run. Without invoker: 'public', unauthenticated
 * browser requests get 403 with no CORS headers — Chrome reports that as a CORS error.
 * cors: true adds Access-Control-Allow-* on success and error responses from our code.
 */
const withHttpGuard = (handler) =>
  onRequest({
    cors: true,
    region: 'us-central1',
    invoker: 'public',
    secrets: [SPOTIFY_CLIENT_ID, SPOTIFY_CLIENT_SECRET],
  }, async (req, res) => {
    if (req.method === 'OPTIONS') {
      res.status(204).send('');
      return;
    }
    if (req.method !== 'GET' && req.method !== 'POST') {
      res.status(405).json({ error: 'Method not allowed' });
      return;
    }
    if (!enforceRateLimit(req)) {
      res.status(429).json({ error: 'Too many requests' });
      return;
    }

    try {
      await handler(req, res);
    } catch (error) {
      console.error(error);
      res.status(500).json({ error: error.message || 'Internal error' });
    }
  });

exports.spotifySearch = withHttpGuard(async (req, res) => {
  const input = req.method === 'GET' ? req.query : req.body || {};
  const q = (input.q || '').toString().trim();
  const type = (input.type || 'artist,track').toString();
  const limit = Number(input.limit || 20);

  if (!q) {
    res.status(400).json({ error: 'Missing query q' });
    return;
  }

  const data = await spotifyRequest('/search', { q, type, limit: Math.min(Math.max(limit, 1), 50) });
  res.status(200).json(data);
});

exports.spotifyArtistDetails = withHttpGuard(async (req, res) => {
  const input = req.method === 'GET' ? req.query : req.body || {};
  const artistId = (input.artistId || '').toString();
  if (!artistId) {
    res.status(400).json({ error: 'Missing artistId' });
    return;
  }
  const data = await spotifyRequest(`/artists/${artistId}`);
  res.status(200).json(data);
});

exports.spotifyTrackDetails = withHttpGuard(async (req, res) => {
  const input = req.method === 'GET' ? req.query : req.body || {};
  const trackId = (input.trackId || '').toString();
  if (!trackId) {
    res.status(400).json({ error: 'Missing trackId' });
    return;
  }
  const data = await spotifyRequest(`/tracks/${trackId}`);
  res.status(200).json(data);
});

exports.spotifyArtistAlbums = withHttpGuard(async (req, res) => {
  const input = req.method === 'GET' ? req.query : req.body || {};
  const artistId = (input.artistId || '').toString();
  const limit = Number(input.limit || 50);
  if (!artistId) {
    res.status(400).json({ error: 'Missing artistId' });
    return;
  }
  const data = await spotifyRequest(`/artists/${artistId}/albums`, {
    include_groups: 'album,single,compilation',
    limit: Math.min(Math.max(limit, 1), 50),
  });
  res.status(200).json(data);
});

exports.spotifyAlbumTracks = withHttpGuard(async (req, res) => {
  const input = req.method === 'GET' ? req.query : req.body || {};
  const albumId = (input.albumId || '').toString();
  const limit = Number(input.limit || 50);
  if (!albumId) {
    res.status(400).json({ error: 'Missing albumId' });
    return;
  }
  const data = await spotifyRequest(`/albums/${albumId}/tracks`, {
    limit: Math.min(Math.max(limit, 1), 50),
  });
  res.status(200).json(data);
});

const createCompletionNotification = async (collectionName, after) => {
  if (!after?.status || after.status !== 'completed') return;
  const userId = after.userId;
  if (!userId) return;

  const title =
    collectionName === 'songRequests'
      ? 'Song request completed'
      : 'Translation request completed';
  const message =
    collectionName === 'songRequests'
      ? `"${after.songTitle}" by ${after.artist} is now available.`
      : `Translation for "${after.songTitle}" by ${after.artist} has been completed.`;

  await admin.firestore().collection('notifications').add({
    userId,
    title,
    message,
    type: 'request-completed',
    sourceCollection: collectionName,
    sourceId: after.id || null,
    read: false,
    createdAt: admin.firestore.FieldValue.serverTimestamp(),
  });
};

exports.onSongRequestUpdated = onDocumentUpdated(
  { document: 'songRequests/{requestId}', region: 'us-central1' },
  async (event) => {
    const before = event.data?.before?.data();
    const after = event.data?.after?.data();
    if (!before || !after) return;
    if (before.status === after.status) return;
    await createCompletionNotification('songRequests', { ...after, id: event.params.requestId });
  }
);

exports.onTranslationRequestUpdated = onDocumentUpdated(
  { document: 'translationRequests/{requestId}', region: 'us-central1' },
  async (event) => {
    const before = event.data?.before?.data();
    const after = event.data?.after?.data();
    if (!before || !after) return;
    if (before.status === after.status) return;
    await createCompletionNotification('translationRequests', { ...after, id: event.params.requestId });
  }
);
