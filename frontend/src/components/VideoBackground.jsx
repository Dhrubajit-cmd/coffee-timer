import React from 'react';

export default function VideoBackground() {
  return (
    <div className="video-background-container">
      {/* Semi-transparent dark overlay to ensure card content is high-contrast and readable */}
      <div className="video-background-overlay"></div>
      
      <video
        className="video-background-html5"
        src="/background.mp4"
        autoPlay
        loop
        muted
        playsInline
      />
    </div>
  );
}

