import React from 'react';

interface ProgressCircleProps {
  percentage: number;
}

const ProgressCircle: React.FC<ProgressCircleProps> = ({ percentage }) => {
  // Ensure percentage is a valid number between 0 and 100
  const validPercentage = typeof percentage === 'number' && !isNaN(percentage) 
    ? Math.max(0, Math.min(100, percentage)) 
    : 0;
    
  const radius = 30;
  const circumference = radius * 2 * Math.PI;
  const strokeDashoffset = circumference - (validPercentage / 100) * circumference;

  return (
    <div className="relative w-full h-full flex items-center justify-center">
      <svg className="transform -rotate-90 w-full h-full">
        <circle
          className="text-gray-200 dark:text-gray-700"
          strokeWidth="5"
          stroke="currentColor"
          fill="transparent"
          r={radius}
          cx="32"
          cy="32"
        />
        <circle
          className="text-blue-500 dark:text-blue-400"
          strokeWidth="5"
          strokeLinecap="round"
          stroke="currentColor"
          fill="transparent"
          r={radius}
          cx="32"
          cy="32"
          style={{
            strokeDasharray: circumference,
            strokeDashoffset: strokeDashoffset,
            transition: 'stroke-dashoffset 0.5s ease'
          }}
        />
      </svg>
      <div className="absolute text-xs font-medium text-gray-700 dark:text-gray-300">
        {Math.round(validPercentage)}%
      </div>
    </div>
  );
};

export default ProgressCircle;