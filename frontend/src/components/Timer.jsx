import React, { useState, useEffect, useRef } from 'react';
import CoffeeCup from './CoffeeCup';

export default function Timer({ state, onAction, onTimeTick }) {
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
          const nextVal = prev > 0 ? prev - 1 : 0;
          onTimeTick(nextVal);
          if (nextVal === 0) {
            clearInterval(timerRef.current);
            onAction('pause'); // Pause on finish
          }
          return nextVal;
        });
      }, 1000);
    } else {
      if (timerRef.current) clearInterval(timerRef.current);
    }

    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [state.isRunning, localRemaining]);

  const triggerAction = (action) => {
    onAction(action);
  };

  const formatTime = (secs) => {
    const h = Math.floor(secs / 3600);
    const m = Math.floor((secs % 3600) / 60);
    const s = secs % 60;
    return `${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
  };

  const progress = state.duration > 0 ? localRemaining / state.duration : 0;

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

