'use client';

import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import ProgressBar from '@/components/ui/ProgressBar';

interface LoadingContextType {
  isLoading: boolean;
  setLoading: (loading: boolean) => void;
}

const LoadingContext = createContext<LoadingContextType | undefined>(undefined);

export function LoadingProvider({ children }: { children: ReactNode }) {
  const [isLoading, setIsLoading] = useState(false);
  const [activeRequests, setActiveRequests] = useState(0);

  // Intercept fetch calls globally
  useEffect(() => {
    const originalFetch = window.fetch;

    const isApiCall = (url: string): boolean => {
      // Skip static assets and Next.js internal requests
      if (
        url.startsWith('/_next/') ||
        url.startsWith('/static/') ||
        url.startsWith('data:') ||
        url.includes('.svg') ||
        url.includes('.png') ||
        url.includes('.jpg') ||
        url.includes('.jpeg') ||
        url.includes('.gif') ||
        url.includes('.webp') ||
        url.includes('.ico') ||
        url.includes('.woff') ||
        url.includes('.woff2') ||
        url.includes('.ttf') ||
        url.includes('.eot') ||
        url.includes('.css') ||
        url.includes('.js') ||
        url.includes('vercel.app/api') && !url.includes('/api/') // External API calls
      ) {
        return false;
      }

      // Include API routes and external API calls
      return url.startsWith('/api/') || 
             (url.includes('api') && (url.startsWith('http://') || url.startsWith('https://')));
    };

    window.fetch = async (...args: Parameters<typeof fetch>): Promise<Response> => {
      const url = typeof args[0] === 'string' ? args[0] : args[0]?.toString() || '';
      
      if (isApiCall(url)) {
        setActiveRequests((prev) => {
          const newCount = prev + 1;
          if (newCount === 1) {
            setIsLoading(true);
          }
          return newCount;
        });

        try {
          const response = await originalFetch(...args);
          return response;
        } catch (error) {
          throw error;
        } finally {
          setActiveRequests((prev) => {
            const newCount = Math.max(0, prev - 1);
            if (newCount === 0) {
              // Small delay to ensure smooth completion animation
              setTimeout(() => {
                setIsLoading(false);
              }, 150);
            }
            return newCount;
          });
        }
      } else {
        return originalFetch(...args);
      }
    };

    return () => {
      window.fetch = originalFetch;
    };
  }, []);

  const setLoading = (loading: boolean) => {
    if (loading) {
      setActiveRequests((prev) => {
        const newCount = prev + 1;
        if (newCount === 1) {
          setIsLoading(true);
        }
        return newCount;
      });
    } else {
      setActiveRequests((prev) => {
        const newCount = Math.max(0, prev - 1);
        if (newCount === 0) {
          setTimeout(() => {
            setIsLoading(false);
          }, 100);
        }
        return newCount;
      });
    }
  };

  return (
    <LoadingContext.Provider value={{ isLoading, setLoading }}>
      <ProgressBar isLoading={isLoading} />
      {children}
    </LoadingContext.Provider>
  );
}

export function useLoading() {
  const context = useContext(LoadingContext);
  if (context === undefined) {
    throw new Error('useLoading must be used within a LoadingProvider');
  }
  return context;
}

