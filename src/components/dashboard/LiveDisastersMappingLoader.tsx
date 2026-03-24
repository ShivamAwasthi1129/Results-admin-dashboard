'use client';

import React from 'react';

const ROTATING_EARTH_GIF = 'https://cdn.pixabay.com/animation/2025/04/15/08/27/08-27-29-373_512.gif';

export function LiveDisastersMappingLoader() {
  return (
    <div
      className="relative flex flex-col items-center justify-center min-h-[70vh] w-full overflow-hidden rounded-2xl"
      role="status"
      aria-live="polite"
      aria-label="Loading live disasters and mapping data"
    >
      {/* Soft gradient background */}
      <div className="absolute inset-0 bg-gradient-to-br from-indigo-500/5 via-transparent to-cyan-500/5 rounded-2xl" />
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_80%_50%_at_50%_40%,rgba(99,102,241,0.08),transparent)] rounded-2xl" />

      {/* Revolving Earth container */}
      <div className="relative z-10 flex flex-col items-center">
        {/* Orbiting ring - data flowing from around the world */}
        <div
          className="absolute w-[200px] h-[200px] sm:w-[260px] sm:h-[260px]"
          style={{ animation: 'spin 18s linear infinite' }}
        >
          <div className="absolute inset-0 rounded-full border border-indigo-400/20 border-dashed" />
          <div className="absolute top-0 left-1/2 -translate-x-1/2 -translate-y-1/2 w-2 h-2 rounded-full bg-indigo-400 shadow-[0_0_12px_4px_rgba(99,102,241,0.5)] animate-pulse" />
          <div className="absolute bottom-0 left-1/2 -translate-x-1/2 translate-y-1/2 w-1.5 h-1.5 rounded-full bg-cyan-400 shadow-[0_0_8px_2px_rgba(34,211,238,0.5)]" />
          <div className="absolute left-0 top-1/2 -translate-x-1/2 -translate-y-1/2 w-1.5 h-1.5 rounded-full bg-violet-400 shadow-[0_0_8px_2px_rgba(139,92,246,0.5)]" />
          <div className="absolute right-0 top-1/2 translate-x-1/2 -translate-y-1/2 w-1.5 h-1.5 rounded-full bg-blue-400 shadow-[0_0_8px_2px_rgba(59,130,246,0.5)]" />
          <div className="absolute top-[15%] right-[15%] w-1 h-1 rounded-full bg-indigo-300/80" />
          <div className="absolute top-[15%] left-[15%] w-1 h-1 rounded-full bg-cyan-300/80" />
          <div className="absolute bottom-[15%] left-[20%] w-1 h-1 rounded-full bg-violet-300/80" />
          <div className="absolute bottom-[15%] right-[20%] w-1 h-1 rounded-full bg-blue-300/80" />
        </div>

        {/* Rotating Earth - GIF */}
        <div className="relative w-[140px] h-[140px] sm:w-[180px] sm:h-[180px] flex items-center justify-center">
          <div
            className="absolute inset-0 rounded-full overflow-hidden border-2 border-sky-900/40 shadow-[inset_0_0_30px_rgba(0,0,0,0.3),0_0_40px_rgba(14,165,233,0.15)]"
            style={{ filter: 'drop-shadow(0 0 20px rgba(14,165,233,0.2))' }}
          >
            <img
              src={ROTATING_EARTH_GIF}
              alt=""
              className="w-full h-full object-cover"
              aria-hidden
            />
          </div>
        </div>

        {/* Skeleton pulse bars below globe */}
        <div className="mt-10 flex gap-2 justify-center">
          {[1, 2, 3, 4, 5].map((i) => (
            <div
              key={i}
              className="h-1.5 w-8 sm:w-12 rounded-full bg-indigo-500/30 animate-pulse"
              style={{ animationDelay: `${i * 0.15}s` }}
            />
          ))}
        </div>

        {/* Message */}
        <p className="mt-6 text-center text-[var(--text-secondary)] font-medium max-w-md px-4 text-base sm:text-lg">
          Please wait while we are mapping everything for you.
        </p>
        <p className="mt-2 text-sm text-[var(--text-muted)]">
          Merging NASA EONET & disaster alerts from around the world
        </p>
      </div>

      {/* Skeleton cards row - hint of upcoming content */}
      <div className="absolute bottom-8 left-0 right-0 flex justify-center gap-3 px-4">
        <div className="h-16 w-20 sm:w-24 rounded-xl bg-indigo-500/10 animate-pulse" style={{ animationDelay: '0.1s' }} />
        <div className="h-16 w-20 sm:w-24 rounded-xl bg-cyan-500/10 animate-pulse" style={{ animationDelay: '0.2s' }} />
        <div className="h-16 w-20 sm:w-24 rounded-xl bg-violet-500/10 animate-pulse" style={{ animationDelay: '0.3s' }} />
        <div className="h-16 w-20 sm:w-24 rounded-xl bg-blue-500/10 animate-pulse hidden sm:block" style={{ animationDelay: '0.4s' }} />
      </div>
    </div>
  );
}
