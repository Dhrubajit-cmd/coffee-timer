import React, { useState, useEffect } from 'react';

export default function ConfigPanel({ duration, onSave }) {
  const [hours, setHours] = useState(Math.floor(duration / 3600));
  const [minutes, setMinutes] = useState(Math.floor((duration % 3600) / 60));
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    setHours(Math.floor(duration / 3600));
    setMinutes(Math.floor((duration % 3600) / 60));
  }, [duration]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    const totalSeconds = (hours * 3600) + (minutes * 60);
    if (totalSeconds < 0) return;
    
    setIsSaving(true);
    try {
      const response = await fetch('http://localhost:8080/api/config', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          duration: totalSeconds,
        }),
      });
      if (response.ok) {
        onSave();
      }
    } catch (err) {
      console.error("Failed to save config:", err);
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <form className="config-panel" onSubmit={handleSubmit}>
      <div className="config-row">
        <label htmlFor="hours-input">Hours</label>
        <div className="config-input-group">
          <input
            id="hours-input"
            type="number"
            min="0"
            max="24"
            value={hours}
            onChange={(e) => setHours(Math.max(0, parseInt(e.target.value) || 0))}
          />
          <span>hr</span>
        </div>
      </div>
      
      <div className="config-row">
        <label htmlFor="minutes-input">Minutes</label>
        <div className="config-input-group">
          <input
            id="minutes-input"
            type="number"
            min="0"
            max="59"
            value={minutes}
            onChange={(e) => setMinutes(Math.max(0, Math.min(59, parseInt(e.target.value) || 0)))}
          />
          <span>min</span>
        </div>
      </div>

      <button className="save-config-btn" type="submit" disabled={isSaving}>
        {isSaving ? 'Saving...' : 'Apply Timings'}
      </button>
    </form>
  );
}
