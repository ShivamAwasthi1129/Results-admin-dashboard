'use client';

import React, { createContext, useContext, useState, ReactNode } from 'react';
import { useAuth } from '@/context/AuthContext';

export interface SearchResult {
  _id: string;
  id: string;
  type: 'user' | 'disaster' | 'emergency' | 'volunteer' | 'service' | 'serviceProvider';
  title: string;
  subtitle?: string;
  description?: string;
  link: string;
  icon?: string;
}

interface SearchContextType {
  isSearchOpen: boolean;
  searchQuery: string;
  searchResults: SearchResult[];
  isSearching: boolean;
  openSearch: () => void;
  closeSearch: () => void;
  setSearchQuery: (query: string) => void;
  performSearch: (query: string) => Promise<void>;
  clearSearch: () => void;
}

const SearchContext = createContext<SearchContextType | undefined>(undefined);

export function SearchProvider({ children }: { children: ReactNode }) {
  const { token } = useAuth();
  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<SearchResult[]>([]);
  const [isSearching, setIsSearching] = useState(false);

  const openSearch = () => setIsSearchOpen(true);
  const closeSearch = () => {
    setIsSearchOpen(false);
    setSearchQuery('');
    setSearchResults([]);
  };

  const performSearch = async (query: string) => {
    if (!query.trim()) {
      setSearchResults([]);
      return;
    }

    setIsSearching(true);
    setSearchResults([]);

    try {
      const headers: HeadersInit = {
        'Content-Type': 'application/json',
      };
      if (token) {
        headers['Authorization'] = `Bearer ${token}`;
      }
      const response = await fetch(`/api/search?q=${encodeURIComponent(query.trim())}`, {
        headers,
        credentials: 'include',
      });
      const data = await response.json();

      if (!response.ok) {
        console.warn('Search API error:', data?.message || data?.error || response.status);
        setSearchResults([]);
        return;
      }

      const raw = data?.data?.results ?? data?.results ?? data?.data ?? [];
      const list = Array.isArray(raw) ? raw : [];
      const normalized: SearchResult[] = list.map((r: any) => ({
        _id: r._id ?? r.id ?? '',
        id: r.id ?? r._id ?? '',
        type: r.type ?? 'user',
        title: r.title ?? r.name ?? r.fullName ?? r.email ?? r.phoneNumber ?? 'Untitled',
        subtitle: r.subtitle,
        description: r.description,
        link: r.link ?? r.url ?? '#',
        icon: r.icon,
      })).filter((r: SearchResult) => r.link && r.link !== '#');
      setSearchResults(normalized);
    } catch (error) {
      console.error('Search error:', error);
      setSearchResults([]);
    } finally {
      setIsSearching(false);
    }
  };

  const clearSearch = () => {
    setSearchQuery('');
    setSearchResults([]);
  };

  return (
    <SearchContext.Provider
      value={{
        isSearchOpen,
        searchQuery,
        searchResults,
        isSearching,
        openSearch,
        closeSearch,
        setSearchQuery,
        performSearch,
        clearSearch
      }}
    >
      {children}
    </SearchContext.Provider>
  );
}

export function useSearch() {
  const context = useContext(SearchContext);
  if (context === undefined) {
    throw new Error('useSearch must be used within a SearchProvider');
  }
  return context;
}

