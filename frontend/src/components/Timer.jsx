import React, { useState, useEffect, useRef } from 'react';
import CoffeeCup from './CoffeeCup';

export default function Timer({ state, onStateChange }) {
  const [localRemaining, setLocalRemaining] = useState(state.timeRemaining);
  const timerRef = useRef(null);

  // Synchronize local timer with parent state
  useEffect(() => {
    setLocalRemaining(state.timeRemaining);
  }, [state.timeRemaining, state.duration]);

  // Handle local counting down
  useEffect(() => {
    if (state.isRunning && localRemaining > 0) {
      timerRef.current = setInterval(() => {
        setLocalRemaining((prev) => {
          if (prev <= 1) {
            clearInterval(timerRef.current);
            // Trigger server-sync when local timer finishes
            syncWithServer();
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
    } else {
      if (timerRef.current) clearInterval(timerRef.current);
    }

    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [state.isRunning, localRemaining]);

  // Periodic alignment check with server to prevent drift (e.g. every 8 seconds)
  useEffect(() => {
    if (!state.isRunning) return;
    const interval = setInterval(() => {
      syncWithServer();
    }, 8000);
    return () => clearInterval(interval);
  }, [state.isRunning]);

  const syncWithServer = async () => {
    try {
      const response = await fetch('http://localhost:8080/api/timer');
      if (response.ok) {
        const data = await response.json();
        onStateChange(data);
      }
    } catch (err) {
      console.error("Failed to sync timer with server:", err);
    }
  };

  const triggerAction = async (action) => {
    try {
      const response = await fetch('http://localhost:8080/api/timer/action', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action }),
      });
      if (response.ok) {
        const data = await response.json();
        onStateChange(data);
      }
    } catch (err) {
      console.error(`Failed to trigger action ${action}:`, err);
    }
  };

  const formatTime = (secs) => {
    const h = Math.floor(secs / 3600);
    const m = Math.floor((secs % 3600) / 60);
    const s = secs % 60;
    return `${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
  };

  const progress = state.duration > 0 ? localRemaining / state.duration : 0; // if duration is 0, progress is 0

  return (
    <div style={{ width: '100%', display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
      {/* Coffee Cup Container */}
      <div className="coffee-cup-container">
        <CoffeeCup progress={progress} isRunning={state.isRunning} />
      </div>

      {/* Clock Display */}
      <div className="digital-clock">
        {formatTime(localRemaining)}
      </div>

      {/* Progress Line */}
      <div className="progress-line-divider">
        <div 
          className="progress-line-fill"
          style={{ width: `${progress * 100}%` }}
        />
      </div>

      {/* Control Buttons */}
      <div className="controls-container">
        <button 
          className="btn btn-pause" 
          onClick={() => triggerAction('pause')} 
          disabled={!state.isRunning}
        >
          Pause
        </button>
        <button 
          className="btn btn-resume" 
          onClick={() => triggerAction('resume')} 
          disabled={state.isRunning || localRemaining <= 0}
        >
          Resume
        </button>
      </div>

      {/* Reset Control */}
      <div className="controls-container" style={{ marginTop: '12px' }}>
        <button className="btn btn-reset" onClick={() => triggerAction('reset')}>
          Reset
        </button>
      </div>
    </div>
  );
}
