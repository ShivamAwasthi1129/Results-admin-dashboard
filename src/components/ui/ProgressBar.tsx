'use client';

import React, { useEffect, useState } from 'react';

interface ProgressBarProps {
  isLoading: boolean;
}

const ProgressBar: React.FC<ProgressBarProps> = ({ isLoading }) => {
  const [progress, setProgress] = useState(0);
  const [show, setShow] = useState(false);

  useEffect(() => {
    if (isLoading) {
      setShow(true);
      setProgress(0);
      
      // Simulate progress
      const interval = setInterval(() => {
        setProgress((prev) => {
          if (prev >= 90) {
            return prev; // Hold at 90% until loading completes
          }
          // Increment progress with decreasing speed
          const increment = Math.random() * 15 + 5;
          return Math.min(prev + increment, 90);
        });
      }, 200);

      return () => clearInterval(interval);
    } else {
      // Complete the progress bar
      setProgress(100);
      // Hide after animation completes
      setTimeout(() => {
        setShow(false);
        setProgress(0);
      }, 300);
    }
  }, [isLoading]);

  if (!show) return null;

  return (
    <div className="fixed top-0 left-0 right-0 z-[99999] h-0.5 bg-transparent pointer-events-none">
      <div
        className="h-full bg-gradient-to-r from-purple-500 via-pink-500 to-purple-500 transition-all duration-200 ease-out"
        style={{
          width: `${progress}%`,
          transition: isLoading ? 'width 0.15s ease-out' : 'width 0.3s ease-out',
          boxShadow: '0 0 10px rgba(168, 85, 247, 0.5), 0 0 20px rgba(236, 72, 153, 0.3)',
        }}
      />
    </div>
  );
};

export default ProgressBar;

