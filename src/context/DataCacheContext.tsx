'use client';

import React, { createContext, useContext, useState, useEffect, useCallback, useRef } from 'react';

interface CacheEntry<T> {
  data: T;
  timestamp: number;
  isLoading: boolean;
}

interface DataCache {
  stats: CacheEntry<any> | null;
  disasters: CacheEntry<any[]> | null;
  users: CacheEntry<any[]> | null;
  devices: CacheEntry<any[]> | null;
  weather: CacheEntry<any[]> | null;
  products: CacheEntry<any[]> | null;
}

interface DataCacheContextType {
  cache: DataCache;
  updateCache: (key: keyof DataCache, data: any) => void;
  getCachedData: (key: keyof DataCache) => any;
  setLoading: (key: keyof DataCache, isLoading: boolean) => void;
  refreshData: (key: keyof DataCache, fetcher: () => Promise<any>) => Promise<void>;
  clearCache: () => void;
}

const DataCacheContext = createContext<DataCacheContextType | undefined>(undefined);

const CACHE_DURATION = 5 * 60 * 1000; // 5 minutes
const REFRESH_INTERVALS: Record<keyof DataCache, number> = {
  stats: 2 * 60 * 1000, // 2 minutes
  disasters: 1 * 60 * 1000, // 1 minute
  users: 3 * 60 * 1000, // 3 minutes
  devices: 3 * 60 * 1000, // 3 minutes
  weather: 5 * 60 * 1000, // 5 minutes
  products: 2 * 60 * 1000, // 2 minutes
};

export function DataCacheProvider({ children }: { children: React.ReactNode }) {
  const [cache, setCache] = useState<DataCache>({
    stats: null,
    disasters: null,
    users: null,
    devices: null,
    weather: null,
    products: null,
  });

  const refreshTimersRef = useRef<Map<keyof DataCache, NodeJS.Timeout>>(new Map());
  const fetchersRef = useRef<Map<keyof DataCache, () => Promise<any>>>(new Map());

  const updateCache = useCallback((key: keyof DataCache, data: any) => {
    setCache((prev) => ({
      ...prev,
      [key]: {
        data,
        timestamp: Date.now(),
        isLoading: false,
      },
    }));
  }, []);

  const setLoading = useCallback(<T extends keyof DataCache>(key: T, isLoading: boolean) => {
    setCache((prev) => {
      const entry = prev[key];
      if (!entry) return prev;
      return {
        ...prev,
        [key]: {
          ...entry,
          isLoading,
        },
      };
    });
  }, []);

  const getCachedData = useCallback((key: keyof DataCache): any => {
    const entry = cache[key];
    if (!entry) return null;
    
    const age = Date.now() - entry.timestamp;
    if (age > CACHE_DURATION) {
      return null;
    }
    
    return entry.data;
  }, [cache]);

  const refreshData = useCallback(async (
    key: keyof DataCache,
    fetcher: () => Promise<any>
  ) => {
    // Store fetcher for interval refresh
    fetchersRef.current.set(key, fetcher);
    
    // Check if already loading to prevent concurrent requests
    const entry = cache[key];
    if (entry?.isLoading) {
      return; // Already refreshing, skip
    }
    
    setLoading(key, true);
    try {
      const data = await fetcher();
      if (data !== null && data !== undefined) {
        updateCache(key, data);
      }
    } catch (error) {
      console.error(`Error refreshing ${key}:`, error);
    } finally {
      setLoading(key, false);
    }
  }, [updateCache, setLoading, cache]);

  const clearCache = useCallback(() => {
    setCache({
      stats: null,
      disasters: null,
      users: null,
      devices: null,
      weather: null,
      products: null,
    });
    // Clear all timers
    refreshTimersRef.current.forEach((timer) => clearInterval(timer));
    refreshTimersRef.current.clear();
    fetchersRef.current.clear();
  }, []);

  // Set up background refresh intervals
  useEffect(() => {
    const setupRefresh = (key: keyof DataCache) => {
      // Clear existing timer if any
      const existingTimer = refreshTimersRef.current.get(key);
      if (existingTimer) {
        clearInterval(existingTimer);
      }

      const interval = REFRESH_INTERVALS[key];
      const timer = setInterval(() => {
        const fetcher = fetchersRef.current.get(key);
        if (fetcher) {
          // Only refresh if cache is not currently loading
          const entry = cache[key];
          if (!entry || !entry.isLoading) {
            refreshData(key, fetcher).catch(console.error);
          }
        }
      }, interval);

      refreshTimersRef.current.set(key, timer);
    };

    // Set up refresh for all cache keys that have fetchers
    fetchersRef.current.forEach((_, key) => {
      setupRefresh(key);
    });

    return () => {
      // Cleanup on unmount
      refreshTimersRef.current.forEach((timer) => clearInterval(timer));
      refreshTimersRef.current.clear();
    };
  }, [cache]); // Only depend on cache to check loading state

  return (
    <DataCacheContext.Provider
      value={{
        cache,
        updateCache,
        getCachedData,
        setLoading,
        refreshData,
        clearCache,
      }}
    >
      {children}
    </DataCacheContext.Provider>
  );
}

export function useDataCache() {
  const context = useContext(DataCacheContext);
  if (!context) {
    throw new Error('useDataCache must be used within DataCacheProvider');
  }
  return context;
}
