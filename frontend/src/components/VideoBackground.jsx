import React, { useRef, useEffect } from 'react';

export default function VideoBackground() {
  const videoRef = useRef(null);

  useEffect(() => {
    if (videoRef.current) {
      videoRef.current.defaultMuted = true;
      videoRef.current.muted = true;
      videoRef.current.play().catch(err => {
        console.error("Autoplay failed:", err);
      });
    }
  }, []);

  return (
    <div className="video-background-container">
      {/* Semi-transparent dark overlay to ensure card content is high-contrast and readable */}
      <div className="video-background-overlay"></div>
      
      <video
        ref={videoRef}
        className="video-background-html5"
        src="/background.mp4"
        loop
        muted
        playsInline
      />
    </div>
  );
}


