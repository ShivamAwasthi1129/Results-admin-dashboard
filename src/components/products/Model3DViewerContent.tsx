'use client';

import React, { Suspense, useRef, useState, useEffect } from 'react';
import { Canvas, useFrame } from '@react-three/fiber';
import { OrbitControls, PerspectiveCamera, useGLTF, Environment } from '@react-three/drei';
import { CubeTransparentIcon } from '@heroicons/react/24/outline';
import * as THREE from 'three';

interface Model3DViewerContentProps {
  modelUrl: string;
  format?: 'glb' | 'gltf' | 'obj' | 'fbx' | 'dae';
}

// Model loader component with error handling
function Model({ url }: { url: string }) {
  const [error, setError] = useState(false);
  
  try {
    const { scene } = useGLTF(url, true);
    const meshRef = useRef<THREE.Group>(null);

    // Auto-rotate animation
    useFrame((state, delta) => {
      if (meshRef.current) {
        meshRef.current.rotation.y += delta * 0.5;
      }
    });

    if (error) {
      return (
        <mesh>
          <boxGeometry args={[1, 1, 1]} />
          <meshStandardMaterial color="red" />
        </mesh>
      );
    }

    return (
      <primitive 
        ref={meshRef}
        object={scene} 
        scale={1} 
        position={[0, 0, 0]}
      />
    );
  } catch (err) {
    console.error('Error loading 3D model:', err);
    return (
      <mesh>
        <boxGeometry args={[1, 1, 1]} />
        <meshStandardMaterial color="red" />
      </mesh>
    );
  }
}

// Loading fallback
function LoadingFallback() {
  return (
    <mesh>
      <boxGeometry args={[1, 1, 1]} />
      <meshStandardMaterial color="orange" />
    </mesh>
  );
}

// Error display component
function ErrorDisplay({ error, modelUrl }: { error: string; modelUrl: string }) {
  return (
    <div className="flex flex-col items-center justify-center h-full p-8">
      <CubeTransparentIcon className="w-16 h-16 text-red-500 mb-4" />
      <p className="text-red-500 font-medium mb-2">3D Model Error</p>
      <p className="text-sm text-[var(--text-muted)] text-center mb-2">{error}</p>
      <p className="text-xs text-[var(--text-muted)] break-all text-center">URL: {modelUrl}</p>
    </div>
  );
}

export default function Model3DViewerContent({ modelUrl, format }: Model3DViewerContentProps) {
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    // Pre-check if URL is accessible
    if (modelUrl) {
      setIsLoading(true);
      setError(null);
      
      fetch(modelUrl, { method: 'HEAD', mode: 'no-cors' })
        .then(() => {
          setIsLoading(false);
        })
        .catch(err => {
          console.error('Error checking 3D model URL:', err);
          // Don't set error on CORS failure, let the model loader handle it
          setIsLoading(false);
        });
    }
  }, [modelUrl]);

  if (error) {
    return <ErrorDisplay error={error} modelUrl={modelUrl} />;
  }

  return (
    <div className="w-full h-full relative">
      <Canvas>
        <Suspense fallback={<LoadingFallback />}>
          <PerspectiveCamera makeDefault position={[0, 0, 5]} />
          <ambientLight intensity={0.5} />
          <directionalLight position={[10, 10, 5]} intensity={1} />
          <pointLight position={[-10, -10, -5]} intensity={0.5} />
          <Model url={modelUrl} />
          <OrbitControls 
            enablePan={true}
            enableZoom={true}
            enableRotate={true}
            minDistance={2}
            maxDistance={10}
          />
          <Environment preset="city" />
        </Suspense>
      </Canvas>
      {isLoading && (
        <div className="absolute inset-0 flex items-center justify-center bg-black/20">
          <div className="w-8 h-8 border-3 border-purple-500/30 border-t-purple-500 rounded-full animate-spin" />
        </div>
      )}
    </div>
  );
}
