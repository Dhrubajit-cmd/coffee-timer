import React, { useState, useEffect } from 'react';

const OUTLINE = [
  // Top lip rim
  { x: 3, y: 3, color: '#E2E2E2' },
  { x: 4, y: 3, color: '#E2E2E2' },
  { x: 5, y: 3, color: '#E2E2E2' },
  { x: 6, y: 3, color: '#E2E2E2' },
  { x: 7, y: 3, color: '#E2E2E2' },
  { x: 8, y: 3, color: '#E2E2E2' },
  { x: 9, y: 3, color: '#E2E2E2' },
  { x: 10, y: 3, color: '#E2E2E2' },
  { x: 11, y: 3, color: '#B5B5B5' },

  // Left wall
  { x: 3, y: 4, color: '#FFFFFF' },
  { x: 3, y: 5, color: '#FFFFFF' },
  { x: 3, y: 6, color: '#FFFFFF' },
  { x: 3, y: 7, color: '#FFFFFF' },
  { x: 3, y: 8, color: '#E2E2E2' },
  { x: 3, y: 9, color: '#E2E2E2' },
  { x: 3, y: 10, color: '#E2E2E2' },
  { x: 3, y: 11, color: '#E2E2E2' },

  // Right wall
  { x: 11, y: 4, color: '#B5B5B5' },
  { x: 11, y: 5, color: '#B5B5B5' },
  { x: 11, y: 6, color: '#B5B5B5' },
  { x: 11, y: 7, color: '#B5B5B5' },
  { x: 11, y: 8, color: '#B5B5B5' },
  { x: 11, y: 9, color: '#B5B5B5' },
  { x: 11, y: 10, color: '#B5B5B5' },
  { x: 11, y: 11, color: '#B5B5B5' },

  // Bottom slants
  { x: 4, y: 12, color: '#E2E2E2' },
  { x: 5, y: 13, color: '#B5B5B5' },
  { x: 10, y: 12, color: '#8A8A8A' },
  { x: 9, y: 13, color: '#8A8A8A' },

  // Bottom base
  { x: 6, y: 13, color: '#8A8A8A' },
  { x: 7, y: 13, color: '#8A8A8A' },
  { x: 8, y: 13, color: '#8A8A8A' },

  // Handle
  { x: 12, y: 4, color: '#B5B5B5' },
  { x: 13, y: 5, color: '#FFFFFF' },
  { x: 13, y: 6, color: '#FFFFFF' },
  { x: 13, y: 7, color: '#FFFFFF' },
  { x: 13, y: 8, color: '#B5B5B5' },
  { x: 13, y: 9, color: '#B5B5B5' },
  { x: 12, y: 10, color: '#8A8A8A' },
];

export default function CoffeeCup({ progress, isRunning }) {
  const [steamPhase, setSteamPhase] = useState(0);

  useEffect(() => {
    if (!isRunning) return;
    const interval = setInterval(() => {
      setSteamPhase((prev) => (prev + 1) % 3);
    }, 600);
    return () => clearInterval(interval);
  }, [isRunning]);

  // Determine steam pixels
  const getSteamPixels = () => {
    if (!isRunning || progress <= 0) return [];
    
    // Different coordinates based on phase
    if (steamPhase === 0) {
      return [
        { x: 5, y: 2 }, { x: 5, y: 1 },
        { x: 7, y: 2 }, { x: 8, y: 1 },
        { x: 9, y: 2 }, { x: 9, y: 1 }
      ];
    } else if (steamPhase === 1) {
      return [
        { x: 5, y: 2 }, { x: 6, y: 1 }, { x: 6, y: 0 },
        { x: 7, y: 2 }, { x: 7, y: 1 }, { x: 8, y: 0 },
        { x: 9, y: 2 }, { x: 10, y: 1 }, { x: 10, y: 0 }
      ];
    } else {
      return [
        { x: 6, y: 2 }, { x: 6, y: 1 }, { x: 5, y: 0 },
        { x: 8, y: 2 }, { x: 8, y: 1 }, { x: 7, y: 0 },
        { x: 10, y: 2 }, { x: 9, y: 1 }, { x: 9, y: 0 }
      ];
    }
  };

  const steamPixels = getSteamPixels();

  // Compute coffee interior levels
  const TOTAL_LEVELS = 9; // y = 4 to 12
  const filledLevels = Math.round(progress * TOTAL_LEVELS);

  const interiorPixels = [];
  
  for (let y = 4; y <= 12; y++) {
    // Check if this row is filled
    // row 12 is bottom-most.
    const levelFromBottom = 12 - y + 1; // row 12 is level 1, row 4 is level 9
    const isFilled = levelFromBottom <= filledLevels;
    const isCrema = levelFromBottom === filledLevels; // top-most filled row is crema

    if (isFilled) {
      const color = isCrema ? '#d7ccc8' : '#795548'; // crema = light beige, coffee = brown
      
      const startX = y === 12 ? 5 : 4;
      const endX = y === 12 ? 9 : 10;

      for (let x = startX; x <= endX; x++) {
        interiorPixels.push({ x, y, color });
      }
    }
  }

  return (
    <svg 
      viewBox="0 0 16 16" 
      width="100%" 
      height="100%" 
      style={{ imageRendering: 'pixelated', shapeRendering: 'crispEdges' }}
    >
      {/* Background */}
      <rect x="0" y="0" width="16" height="16" fill="black" />

      {/* Render Coffee Crema and Coffee Liquid */}
      {interiorPixels.map((p, idx) => (
        <rect 
          key={`coffee-${idx}`}
          x={p.x} 
          y={p.y} 
          width="1.05" 
          height="1.05" 
          fill={p.color} 
        />
      ))}

      {/* Render Steam */}
      {steamPixels.map((p, idx) => (
        <rect 
          key={`steam-${idx}`}
          x={p.x} 
          y={p.y} 
          width="1" 
          height="1" 
          fill="rgba(255, 255, 255, 0.25)" 
        />
      ))}

      {/* Render Cup Outline */}
      {OUTLINE.map((p, idx) => (
        <rect 
          key={`outline-${idx}`}
          x={p.x} 
          y={p.y} 
          width="1.05" 
          height="1.05" 
          fill={p.color} 
        />
      ))}
    </svg>
  );
}
