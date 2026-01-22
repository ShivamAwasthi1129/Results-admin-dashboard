'use client';

import React from 'react';
import dynamic from 'next/dynamic';

interface Model3DViewerProps {
  modelUrl: string;
  format?: 'glb' | 'gltf' | 'obj' | 'fbx' | 'dae';
  className?: string;
  height?: string;
}

// Dynamically import the 3D viewer to avoid SSR issues
const Model3DViewerContent = dynamic(
  () => import('./Model3DViewerContent'),
  { 
    ssr: false,
    loading: () => (
      <div className="flex items-center justify-center bg-[var(--bg-input)] rounded-lg" style={{ height: '400px' }}>
        <p className="text-[var(--text-muted)]">Loading 3D model...</p>
      </div>
    ),
  }
);

export default function Model3DViewer({ 
  modelUrl, 
  format = 'glb',
  className = '',
  height = '400px'
}: Model3DViewerProps) {
  if (!modelUrl) {
    return (
      <div className={`flex items-center justify-center bg-[var(--bg-input)] rounded-lg ${className}`} style={{ height }}>
        <p className="text-[var(--text-muted)]">No 3D model available</p>
      </div>
    );
  }

  // Only support GLB/GLTF for now (most common format)
  if (format !== 'glb' && format !== 'gltf') {
    return (
      <div className={`flex items-center justify-center bg-[var(--bg-input)] rounded-lg ${className}`} style={{ height }}>
        <p className="text-[var(--text-muted)]">3D format {format} not yet supported. Please use GLB or GLTF format.</p>
      </div>
    );
  }

  return (
    <div className={`bg-[var(--bg-input)] rounded-lg overflow-hidden ${className}`} style={{ height }}>
      <Model3DViewerContent modelUrl={modelUrl} format={format} />
    </div>
  );
}
