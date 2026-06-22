import React, { useState, useEffect } from 'react';
import './App.css';
import Timer from './components/Timer';
import ConfigPanel from './components/ConfigPanel';

export default function App() {
  const [timerState, setTimerState] = useState(null);
  const [config, setConfig] = useState(null);

  // Fetch initial configuration
  const fetchConfig = async () => {
    try {
      const response = await fetch('http://localhost:8080/api/config');
      if (response.ok) {
        const data = await response.json();
        setConfig(data);
      }
    } catch (err) {
      console.error("Failed to fetch config:", err);
    }
  };

  // Fetch timer state
  const fetchTimerState = async () => {
    try {
      const response = await fetch('http://localhost:8080/api/timer');
      if (response.ok) {
        const data = await response.json();
        setTimerState(data);
      }
    } catch (err) {
      console.error("Failed to fetch timer state:", err);
    }
  };

  useEffect(() => {
    fetchConfig();
    fetchTimerState();
  }, []);

  const handleStateChange = (newState) => {
    setTimerState(newState);
  };

  const handleConfigSaved = () => {
    fetchConfig();
    fetchTimerState();
  };

  if (!timerState || !config) {
    return (
      <div style={{ color: '#888', fontFamily: 'monospace', padding: '40px', textAlign: 'center' }}>
        Connecting to Go backend server...
      </div>
    );
  }

  return (
    <div className="app-container">
      {/* Header and sign-out */}
      <div className="app-header">
        <span>minimalfocus_timer</span>
        <div className="profile-info">
          <span>Dhrubajit</span>
          <span className="sign-out">[→ Sign Out]</span>
        </div>
      </div>

      {/* Status Banner */}
      <div className="status-banner focus-mode" style={{ backgroundColor: 'rgba(255, 87, 34, 0.1)', borderColor: 'rgba(255, 87, 34, 0.2)' }}>
        <span className="banner-title" style={{ color: 'var(--accent-orange)' }}>
          Focus Time
        </span>
        <span className="banner-desc">
          Stay focused and write some code!
        </span>
      </div>

      {/* Spacing & Timings adjustments */}
      <ConfigPanel 
        duration={config.duration} 
        onSave={handleConfigSaved}
      />

      {/* Main Timer Display */}
      <Timer state={timerState} onStateChange={handleStateChange} />
    </div>
  );
}
