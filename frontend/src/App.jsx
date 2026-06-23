import React, { useState, useEffect } from 'react';
import './App.css';
import Timer from './components/Timer';
import ConfigPanel from './components/ConfigPanel';
import SpotifyCard from './components/SpotifyCard';
import VideoBackground from './components/VideoBackground';
import { handleAuthCallback, controlSpotifyPlayback } from './utils/spotifyAuth';

const DEFAULT_DURATION = 3600; // 1 hour default
const DEFAULT_PLAYLIST_URL = 'https://open.spotify.com/playlist/5m8hWoxPvKRFRW2Oer7RGA?si=5657dccf138549d4';

export default function App() {
  const [timerState, setTimerState] = useState({
    duration: DEFAULT_DURATION,
    timeRemaining: DEFAULT_DURATION,
    isRunning: false,
  });

  const [isLoading, setIsLoading] = useState(true);

  // Load state and check auth code on mount
  useEffect(() => {
    async function initApp() {
      // 1. Check for Spotify OAuth callback code in URL
      const urlParams = new URLSearchParams(window.location.search);
      const code = urlParams.get('code');
      if (code) {
        try {
          await handleAuthCallback(code);
          // Clean the code from URL so refreshing doesn't fail
          window.history.replaceState({}, document.title, window.location.pathname);
        } catch (err) {
          console.error('Failed to authenticate with Spotify:', err);
        }
      }

      // 2. Load timer configuration from localStorage
      const savedDuration = localStorage.getItem('timer_duration');
      const savedState = localStorage.getItem('timer_state');
      
      const duration = savedDuration ? parseInt(savedDuration) : DEFAULT_DURATION;
      let timeRemaining = duration;
      
      if (savedState) {
        try {
          const parsed = JSON.parse(savedState);
          timeRemaining = typeof parsed.timeRemaining === 'number' ? parsed.timeRemaining : duration;
        } catch (e) {
          // Ignore parse errors
        }
      }

      setTimerState({
        duration,
        timeRemaining,
        isRunning: false, // Default to paused on mount
      });
      setIsLoading(false);
    }
    
    initApp();
  }, []);

  // Save state to localStorage whenever it changes
  useEffect(() => {
    if (isLoading) return;
    localStorage.setItem('timer_state', JSON.stringify({
      timeRemaining: timerState.timeRemaining,
    }));
  }, [timerState.timeRemaining, isLoading]);

  const handleTimeTick = (newTimeRemaining) => {
    setTimerState(prev => ({
      ...prev,
      timeRemaining: newTimeRemaining
    }));
  };

  const handleAction = async (action) => {
    let nextRunning = timerState.isRunning;
    let nextRemaining = timerState.timeRemaining;

    const playlistUrl = localStorage.getItem('spotify_playlist_url') || DEFAULT_PLAYLIST_URL;

    if (action === 'resume') {
      nextRunning = true;
      setTimerState(prev => ({ ...prev, isRunning: true }));
      // Start lo-fi music in background
      await controlSpotifyPlayback('play_playlist', playlistUrl);
    } else if (action === 'pause') {
      nextRunning = false;
      setTimerState(prev => ({ ...prev, isRunning: false }));
      // Pause music
      await controlSpotifyPlayback('pause');
    } else if (action === 'reset') {
      nextRunning = false;
      nextRemaining = timerState.duration;
      setTimerState(prev => ({
        ...prev,
        isRunning: false,
        timeRemaining: prev.duration,
      }));
      // Pause music
      await controlSpotifyPlayback('pause');
    }
  };

  const handleConfigSaved = (newDuration) => {
    localStorage.setItem('timer_duration', newDuration.toString());
    setTimerState({
      duration: newDuration,
      timeRemaining: newDuration,
      isRunning: false,
    });
  };

  if (isLoading) {
    return (
      <div style={{ color: '#888', fontFamily: 'monospace', padding: '40px', textAlign: 'center' }}>
        Loading configuration...
      </div>
    );
  }

  return (
    <div className="layout-wrapper">
      {/* Looping video background behind the layout elements */}
      <VideoBackground />

      <div className="timer-wrapper">
        {/* Spotify Card */}
        <SpotifyCard />

        {/* Center-aligned Coffee Timer card */}
        <div className="app-container">
          {/* Header */}
          <div className="app-header">
            <span>minimalfocus_timer</span>
          </div>

          {/* Status Banner - Styled in Green theme */}
          <div className="status-banner focus-mode" style={{ backgroundColor: 'rgba(76, 175, 80, 0.15)', borderColor: 'rgba(76, 175, 80, 0.25)' }}>
            <span className="banner-title" style={{ color: 'var(--accent-green)' }}>
              Focus Time
            </span>
            <span className="banner-desc">
              Stay focused and write some code!
            </span>
          </div>

          {/* Spacing & Timings adjustments */}
          <ConfigPanel 
            duration={timerState.duration} 
            onSave={handleConfigSaved}
          />

          {/* Main Timer Display */}
          <Timer 
            state={timerState} 
            onAction={handleAction} 
            onTimeTick={handleTimeTick} 
          />
        </div>
      </div>
    </div>
  );
}
