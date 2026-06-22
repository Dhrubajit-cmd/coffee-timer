import React from 'react';

export default function VideoBackground({ videoId }) {
  // If the user set a custom YouTube ID, render the YouTube iframe.
  // Otherwise, default to playing the local background.mp4 video silently.
  const isYouTube = videoId && videoId !== 'local' && videoId.trim() !== '';

  return (
    <div className="video-background-container">
      {/* Semi-transparent dark overlay to ensure card content is high-contrast and readable */}
      <div className="video-background-overlay"></div>
      
      {isYouTube ? (
        <iframe
          className="video-background-iframe"
          src={`https://www.youtube.com/embed/${videoId}?autoplay=1&mute=1&loop=1&playlist=${videoId}&controls=0&showinfo=0&rel=0&iv_load_policy=3&disablekb=1&fs=0&modestbranding=1`}
          frameBorder="0"
          allow="autoplay; encrypted-media"
          allowFullScreen
          title="Cozy Background Loop"
        />
      ) : (
        <video
          className="video-background-html5"
          src="/background.mp4"
          autoPlay
          loop
          muted
          playsInline
        />
      )}
    </div>
  );
}
