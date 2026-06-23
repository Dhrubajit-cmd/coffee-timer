import React, { useState, useEffect } from 'react';
import { 
  getAccessToken, 
  redirectToSpotifyAuth, 
  logoutSpotify,
  refreshAccessToken
} from '../utils/spotifyAuth';

const DEFAULT_PLAYLIST_URL = 'https://open.spotify.com/playlist/5m8hWoxPvKRFRW2Oer7RGA?si=5657dccf138549d4';

export function parsePlaylistId(url) {
  if (!url) return null;
  if (url.startsWith('spotify:playlist:')) {
    return url.split(':')[2];
  }
  const match = url.match(/playlist\/([a-zA-Z0-9]+)/);
  return match ? match[1] : null;
}

export default function SpotifyCard() {
  const [token, setToken] = useState(null);
  const [status, setStatus] = useState({
    trackName: '',
    artistName: '',
    albumName: '',
    artworkUrl: '',
    isPlaying: false,
  });
  const [playlistInput, setPlaylistInput] = useState(() => {
    return localStorage.getItem('spotify_playlist_url') || DEFAULT_PLAYLIST_URL;
  });
  const [isSaving, setIsSaving] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');

  // Check auth on mount
  useEffect(() => {
    async function checkAuth() {
      const accessToken = await getAccessToken();
      setToken(accessToken);
    }
    checkAuth();
  }, []);

  // Poll status when authenticated
  useEffect(() => {
    if (!token) return;

    fetchCurrentPlayback();
    const interval = setInterval(fetchCurrentPlayback, 4000);
    return () => clearInterval(interval);
  }, [token]);

  const fetchCurrentPlayback = async () => {
    const accessToken = await getAccessToken();
    if (!accessToken) {
      setToken(null);
      return;
    }

    try {
      const response = await fetch('https://api.spotify.com/v1/me/player/currently-playing', {
        headers: {
          'Authorization': `Bearer ${accessToken}`,
        },
      });

      if (response.status === 204) {
        // No active playback
        setStatus({
          trackName: '',
          artistName: '',
          albumName: '',
          artworkUrl: '',
          isPlaying: false,
        });
        return;
      }

      if (response.status === 401) {
        // Token might have expired, try to refresh
        const refreshedToken = await refreshAccessToken();
        if (refreshedToken) {
          setToken(refreshedToken);
        } else {
          setToken(null);
        }
        return;
      }

      if (response.ok) {
        const data = await response.json();
        if (data.item) {
          setStatus({
            trackName: data.item.name,
            artistName: data.item.artists.map(a => a.name).join(', '),
            albumName: data.item.album.name,
            artworkUrl: data.item.album.images[1]?.url || data.item.album.images[0]?.url || '',
            isPlaying: data.is_playing,
          });
          setErrorMessage('');
        }
      }
    } catch (err) {
      console.error('Failed to fetch currently playing track:', err);
    }
  };

  const triggerAction = async (action) => {
    const accessToken = await getAccessToken();
    if (!accessToken) {
      setToken(null);
      return;
    }

    setErrorMessage('');
    try {
      let url = 'https://api.spotify.com/v1/me/player/play';
      let method = 'PUT';
      let body = null;

      if (action === 'pause') {
        url = 'https://api.spotify.com/v1/me/player/pause';
      } else if (action === 'next') {
        url = 'https://api.spotify.com/v1/me/player/next';
        method = 'POST';
      } else if (action === 'play_playlist') {
        // Start playing the custom playlist
        const playlistId = parsePlaylistId(playlistInput);
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

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        if (response.status === 404) {
          setErrorMessage('No active Spotify player found. Open Spotify on your device and play any song first!');
        } else {
          setErrorMessage(errorData.error?.message || 'Failed to control playback');
        }
      } else {
        // Wait a brief moment for Spotify server to register the state change, then fetch
        setTimeout(fetchCurrentPlayback, 500);
      }
    } catch (err) {
      console.error('Failed to control Spotify:', err);
    }
  };

  const handleSavePlaylist = (e) => {
    e.preventDefault();
    setIsSaving(true);
    localStorage.setItem('spotify_playlist_url', playlistInput);
    setTimeout(() => {
      setIsSaving(false);
    }, 400);
  };

  const handleOpenSpotifyApp = () => {
    const playlistId = parsePlaylistId(playlistInput);
    if (playlistId) {
      window.location.href = `spotify:playlist:${playlistId}`;
    } else {
      window.location.href = 'spotify:';
    }
  };

  const handleConnect = () => {
    redirectToSpotifyAuth();
  };

  const handleDisconnect = () => {
    logoutSpotify();
    setToken(null);
    setStatus({
      trackName: '',
      artistName: '',
      albumName: '',
      artworkUrl: '',
      isPlaying: false,
    });
  };

  const isSpotifyActive = status.trackName !== '';

  return (
    <div className="spotify-card">
      <div className="spotify-card-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <span className="spotify-logo">🟢 Spotify Companion</span>
        {token && (
          <button 
            onClick={handleDisconnect} 
            style={{ background: 'none', border: 'none', color: '#ff5722', fontSize: '10px', cursor: 'pointer', padding: 0 }}
          >
            [Disconnect]
          </button>
        )}
      </div>

      {!token ? (
        <div className="spotify-inactive" style={{ padding: '30px 10px', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '16px' }}>
          <p>Connect your Spotify Premium account to control your lo-fi music.</p>
          <button 
            className="spotify-open-app-btn" 
            onClick={handleConnect}
            style={{ width: '100%', maxWidth: '200px', backgroundColor: '#1db954', fontWeight: 'bold' }}
          >
            Connect Spotify
          </button>
        </div>
      ) : (
        <div className="spotify-card-body">
          {/* Left Column: Playback info and player controls */}
          <div className="spotify-body-left">
            <div className="spotify-playback-area">
              {isSpotifyActive ? (
                <div className="spotify-track-info">
                  <div className="spotify-album-art-container">
                    {status.artworkUrl ? (
                      <img className="spotify-album-art" src={status.artworkUrl} alt={status.albumName} />
                    ) : (
                      <div className="spotify-album-art-placeholder">🎵</div>
                    )}
                  </div>
                  <div className="spotify-metadata">
                    <div className="spotify-track-name" title={status.trackName}>{status.trackName}</div>
                    <div className="spotify-artist-name" title={status.artistName}>{status.artistName}</div>
                    <div className="spotify-album-name" title={status.albumName}>{status.albumName}</div>
                  </div>
                </div>
              ) : (
                <div className="spotify-inactive">
                  <p style={{ margin: 0 }}>Spotify player is idle.</p>
                  <p className="subtext" style={{ margin: '4px 0 0' }}>Start playing music or resume the timer.</p>
                </div>
              )}

              {errorMessage && (
                <div style={{ color: '#ff5722', fontSize: '10px', margin: '4px 0', lineHeight: '1.2' }}>
                  {errorMessage}
                </div>
              )}

              <div className="spotify-controls">
                <button 
                  className="spotify-control-btn" 
                  onClick={() => triggerAction(status.isPlaying ? 'pause' : 'play_playlist')}
                  title={status.isPlaying ? 'Pause' : 'Play Lo-Fi Playlist'}
                >
                  {status.isPlaying ? '⏸' : '▶'}
                </button>
                <button 
                  className="spotify-control-btn" 
                  onClick={() => triggerAction('next')}
                  title="Next Track"
                >
                  ⏭
                </button>
              </div>
            </div>
          </div>

          {/* Right Column: Playlist link updates and launch button */}
          <div className="spotify-body-right">
            <form className="spotify-playlist-form" onSubmit={handleSavePlaylist}>
              <label htmlFor="spotify-playlist-input">LO-FI PLAYLIST LINK</label>
              <input 
                id="spotify-playlist-input"
                type="text" 
                placeholder="Paste Spotify playlist link" 
                value={playlistInput}
                onChange={(e) => setPlaylistInput(e.target.value)}
              />
              <button type="submit" className="spotify-save-btn" disabled={isSaving}>
                {isSaving ? 'Saving...' : 'Update Playlist'}
              </button>
            </form>

            <button className="spotify-open-app-btn" onClick={handleOpenSpotifyApp}>
              Open Spotify App
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
