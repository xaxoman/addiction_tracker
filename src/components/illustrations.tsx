import React from 'react';

// The quieter cards carry a leaf sprig and a soft hill. Both are inline SVG
// so they scale, take their colour from the theme and ship without another
// asset request. (The streak hero uses the real artwork instead: see
// HeroStreakCard.)

interface SceneProps {
  className?: string;
}

export const LeafSprig: React.FC<SceneProps> = ({ className = '' }) => (
  <svg
    className={className}
    viewBox="0 0 120 120"
    fill="none"
    aria-hidden="true"
    focusable="false"
  >
    <path
      d="M60 116 C60 80 62 54 74 32"
      stroke="currentColor"
      strokeOpacity="0.55"
      strokeWidth="3"
      strokeLinecap="round"
    />
    <path
      d="M68 62 C46 62 30 50 26 30 C50 26 66 38 68 62Z"
      fill="currentColor"
      fillOpacity="0.55"
    />
    <path
      d="M72 44 C74 22 90 8 112 6 C112 30 98 44 72 44Z"
      fill="currentColor"
      fillOpacity="0.8"
    />
    <path
      d="M64 92 C46 92 34 82 30 66 C50 64 62 74 64 92Z"
      fill="currentColor"
      fillOpacity="0.35"
    />
  </svg>
);
