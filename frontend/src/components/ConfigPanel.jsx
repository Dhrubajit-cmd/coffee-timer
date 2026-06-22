import React, { useState, useEffect } from 'react';

export default function ConfigPanel({ duration, onSave }) {
  const [focusMin, setFocusMin] = useState(Math.round(duration / 60));
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    setFocusMin(Math.round(duration / 60));
  }, [duration]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (focusMin <= 0) return;
    
    setIsSaving(true);
    try {
      const response = await fetch('http://localhost:8080/api/config', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          duration: focusMin * 60,
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
        <label htmlFor="focus-time-input">Focus Time</label>
        <div className="config-input-group">
          <input
            id="focus-time-input"
            type="number"
            min="1"
            max="180"
            value={focusMin}
            onChange={(e) => setFocusMin(parseInt(e.target.value) || '')}
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
