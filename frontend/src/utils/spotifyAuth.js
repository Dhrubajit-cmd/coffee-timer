export const SPOTIFY_CLIENT_ID = '8e2f9962fc4a46158c09737bbfd95709';

export function getRedirectUri() {
  const origin = window.location.origin;
  if (origin.includes('localhost') || origin.includes('127.0.0.1')) {
    return 'http://127.0.0.1:5174/';
  }
  return 'https://coffeetimer.dhrubajit.dev';
}

function generateRandomString(length) {
  const possible = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789-._~';
  const values = crypto.getRandomValues(new Uint8Array(length));
  return values.reduce((acc, x) => acc + possible[x % possible.length], '');
}

async function sha256(plain) {
  const encoder = new TextEncoder();
  const data = encoder.encode(plain);
  return window.crypto.subtle.digest('SHA-256', data);
}

function base64urlencode(a) {
  return btoa(String.fromCharCode.apply(null, new Uint8Array(a)))
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=+$/, '');
}

async function generateCodeChallenge(verifier) {
  const hashed = await sha256(verifier);
  return base64urlencode(hashed);
}

export async function redirectToSpotifyAuth() {
  const verifier = generateRandomString(64);
  localStorage.setItem('spotify_code_verifier', verifier);

  const challenge = await generateCodeChallenge(verifier);
  const redirectUri = getRedirectUri();
  
  const scopes = [
    'user-modify-playback-state',
    'user-read-playback-state',
    'user-read-currently-playing'
  ].join(' ');

  const params = new URLSearchParams({
    client_id: SPOTIFY_CLIENT_ID,
    response_type: 'code',
    redirect_uri: redirectUri,
    scope: scopes,
    code_challenge_method: 'S256',
    code_challenge: challenge,
  });

  window.location.href = `https://accounts.spotify.com/authorize?${params.toString()}`;
}

export async function handleAuthCallback(code) {
  const verifier = localStorage.getItem('spotify_code_verifier');
  const redirectUri = getRedirectUri();

  const response = await fetch('https://accounts.spotify.com/api/token', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body: new URLSearchParams({
      client_id: SPOTIFY_CLIENT_ID,
      grant_type: 'authorization_code',
      code: code,
      redirect_uri: redirectUri,
      code_verifier: verifier,
    }),
  });

  if (!response.ok) {
    const errorData = await response.json();
    throw new Error(errorData.error_description || 'Failed to exchange token');
  }

  const data = await response.json();
  saveTokens(data);
}

export async function refreshAccessToken() {
  const refreshToken = localStorage.getItem('spotify_refresh_token');
  if (!refreshToken) return null;

  const response = await fetch('https://accounts.spotify.com/api/token', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body: new URLSearchParams({
      client_id: SPOTIFY_CLIENT_ID,
      grant_type: 'refresh_token',
      refresh_token: refreshToken,
    }),
  });

  if (!response.ok) {
    // If refresh fails, clear tokens so user can reconnect
    logoutSpotify();
    return null;
  }

  const data = await response.json();
  saveTokens(data);
  return data.access_token;
}

export async function getAccessToken() {
  const token = localStorage.getItem('spotify_access_token');
  const expiresAt = localStorage.getItem('spotify_expires_at');

  if (!token || !expiresAt) return null;

  // Refresh token if it expires in less than 60 seconds
  if (Date.now() > parseInt(expiresAt) - 60000) {
    return await refreshAccessToken();
  }

  return token;
}

export function logoutSpotify() {
  localStorage.removeItem('spotify_access_token');
  localStorage.removeItem('spotify_refresh_token');
  localStorage.removeItem('spotify_expires_at');
  localStorage.removeItem('spotify_code_verifier');
}

function saveTokens(data) {
  localStorage.setItem('spotify_access_token', data.access_token);
  if (data.refresh_token) {
    localStorage.setItem('spotify_refresh_token', data.refresh_token);
  }
  const expiresAt = Date.now() + data.expires_in * 1000;
  localStorage.setItem('spotify_expires_at', expiresAt.toString());
}

export async function controlSpotifyPlayback(action, playlistUrl = null) {
  const accessToken = await getAccessToken();
  if (!accessToken) return false;

  try {
    let url = 'https://api.spotify.com/v1/me/player/play';
    let method = 'PUT';
    let body = null;

    if (action === 'pause') {
      url = 'https://api.spotify.com/v1/me/player/pause';
    } else if (action === 'next') {
      url = 'https://api.spotify.com/v1/me/player/next';
      method = 'POST';
    } else if (action === 'play_playlist' && playlistUrl) {
      const match = playlistUrl.match(/playlist\/([a-zA-Z0-9]+)/);
      const playlistId = match ? match[1] : null;
      if (playlistId) {
        body = JSON.stringify({
          context_uri: `spotify:playlist:${playlistId}`,
        });
      }
    }

    const response = await fetch(url, {
      method,
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
      },
      body,
    });

    return response.ok;
  } catch (err) {
    console.error('Failed to control Spotify playback:', err);
    return false;
  }
}

