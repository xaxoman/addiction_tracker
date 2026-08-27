import React from 'react';

// The prototype leans on two pieces of artwork: a layered mountain horizon
// behind the streak figure and a leaf sprig on the quieter cards. Both are
// inline SVG so they scale, theme and ship without another asset request.

interface SceneProps {
  className?: string;
}

export const MountainScene: React.FC<SceneProps> = ({ className = '' }) => (
  <svg
    className={className}
    viewBox="0 0 400 200"
    preserveAspectRatio="xMidYMax slice"
    aria-hidden="true"
    focusable="false"
  >
    <defs>
      <linearGradient id="mountain-far" x1="0" y1="0" x2="0" y2="1">
        <stop offset="0%" stopColor="#ffffff" stopOpacity="0.22" />
        <stop offset="100%" stopColor="#ffffff" stopOpacity="0.06" />
      </linearGradient>
      <linearGradient id="mountain-mid" x1="0" y1="0" x2="0" y2="1">
        <stop offset="0%" stopColor="#ffffff" stopOpacity="0.34" />
        <stop offset="100%" stopColor="#ffffff" stopOpacity="0.1" />
      </linearGradient>
      <linearGradient id="mountain-near" x1="0" y1="0" x2="0" y2="1">
        <stop offset="0%" stopColor="#ffffff" stopOpacity="0.5" />
        <stop offset="100%" stopColor="#ffffff" stopOpacity="0.16" />
      </linearGradient>
    </defs>

    <circle cx="330" cy="52" r="26" fill="#ffffff" fillOpacity="0.35" />

    {/* Two birds, the small sign of life the prototype puts near the sun. */}
    <path
      d="M262 62c5-5 9-5 13 0m6 0c4-4 8-4 12 0"
      fill="none"
      stroke="#ffffff"
      strokeOpacity="0.45"
      strokeWidth="2"
      strokeLinecap="round"
    />

    <path d="M0 132 L70 72 L120 116 L168 78 L232 132 Z" fill="url(#mountain-far)" />
    <path d="M188 132 L250 74 L302 112 L344 84 L400 132 Z" fill="url(#mountain-far)" />
    <path d="M0 158 L58 104 L118 150 L162 118 L228 158 Z" fill="url(#mountain-mid)" />
    <path d="M172 158 L236 106 L288 146 L338 112 L400 158 Z" fill="url(#mountain-mid)" />
    <path d="M0 200 L44 142 L112 186 L166 148 L232 200 Z" fill="url(#mountain-near)" />
    <path d="M150 200 L224 140 L284 182 L342 146 L400 200 Z" fill="url(#mountain-near)" />
    <path d="M0 200 L400 200 L400 178 Q300 162 200 180 Q100 198 0 176 Z" fill="#ffffff" fillOpacity="0.14" />
  </svg>
);

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

// The soft hill the quote card sits on.
export const HillScene: React.FC<SceneProps> = ({ className = '' }) => (
  <svg
    className={className}
    viewBox="0 0 240 120"
    preserveAspectRatio="xMaxYMax slice"
    aria-hidden="true"
    focusable="false"
  >
    <path d="M0 120 Q70 62 150 82 Q206 96 240 74 L240 120Z" fill="currentColor" fillOpacity="0.5" />
    <path d="M60 120 Q130 84 240 104 L240 120Z" fill="currentColor" fillOpacity="0.75" />
  </svg>
);
