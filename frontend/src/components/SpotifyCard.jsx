import React, { useState, useEffect } from 'react';

export default function SpotifyCard() {
  const [status, setStatus] = useState({
    trackName: '',
    artistName: '',
    albumName: '',
    artworkUrl: '',
    isPlaying: false,
    playlistUrl: '',
  });
  const [playlistInput, setPlaylistInput] = useState('');
  const [isSaving, setIsSaving] = useState(false);

  const fetchStatus = async () => {
    try {
      const response = await fetch('http://localhost:8080/api/spotify/status');
      if (response.ok) {
        const data = await response.json();
        setStatus(data);
        if (data.playlistUrl && !playlistInput) {
          setPlaylistInput(data.playlistUrl);
        }
      }
    } catch (err) {
      console.error("Failed to fetch Spotify status:", err);
    }
  };

  useEffect(() => {
    fetchStatus();
    // Poll every 3 seconds to keep track details synced
    const interval = setInterval(fetchStatus, 3000);
    return () => clearInterval(interval);
  }, [playlistInput]);

  const triggerAction = async (action) => {
    try {
      const response = await fetch('http://localhost:8080/api/spotify/action', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action }),
      });
      if (response.ok) {
        fetchStatus();
      }
    } catch (err) {
      console.error(`Failed to trigger Spotify action ${action}:`, err);
    }
  };

  const handleSavePlaylist = async (e) => {
    e.preventDefault();
    if (!playlistInput) return;
    setIsSaving(true);
    try {
      const response = await fetch('http://localhost:8080/api/spotify/playlist', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ playlistUrl: playlistInput }),
      });
      if (response.ok) {
        fetchStatus();
      }
    } catch (err) {
      console.error("Failed to save Spotify playlist:", err);
    } finally {
      setIsSaving(false);
    }
  };

  const isSpotifyActive = status.trackName !== '';

  return (
    <div className="spotify-card">
      <div className="spotify-card-header">
        <span className="spotify-logo">🟢 Spotify Companion</span>
      </div>

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
                <p>Spotify process is inactive or paused.</p>
                <p className="subtext">Start the timer or open Spotify to stream music.</p>
              </div>
            )}

            <div className="spotify-controls">
              <button 
                className="spotify-control-btn" 
                onClick={() => triggerAction(status.isPlaying ? 'pause' : 'resume')}
                title={status.isPlaying ? 'Pause' : 'Play'}
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

          <button className="spotify-open-app-btn" onClick={() => triggerAction('open')}>
            Open Spotify App
          </button>
        </div>
      </div>
    </div>
  );
}
