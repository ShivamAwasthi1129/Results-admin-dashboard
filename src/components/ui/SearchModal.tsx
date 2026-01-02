'use client';

import React, { useEffect, useRef, useState, useCallback } from 'react';
import { createPortal } from 'react-dom';
import { XMarkIcon, MagnifyingGlassIcon } from '@heroicons/react/24/outline';
import { useSearch } from '@/context/SearchContext';
import { cn } from '@/lib/utils';
import Loader from './Loader';
import { useRouter } from 'next/navigation';

const SearchModal: React.FC = () => {
  const { isSearchOpen, closeSearch, searchQuery, setSearchQuery, searchResults, isSearching, performSearch } = useSearch();
  const router = useRouter();
  const inputRef = useRef<HTMLInputElement>(null);
  const [mounted, setMounted] = useState(false);
  const debounceRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (isSearchOpen && inputRef.current) {
      setTimeout(() => inputRef.current?.focus(), 100);
    }
  }, [isSearchOpen]);

  // Debounced search
  const debouncedSearch = useCallback((query: string) => {
    if (debounceRef.current) {
      clearTimeout(debounceRef.current);
    }
    debounceRef.current = setTimeout(() => {
      performSearch(query);
    }, 300);
  }, [performSearch]);

  // Handle input change
  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    setSearchQuery(value);
    debouncedSearch(value);
  };

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isSearchOpen) {
        e.preventDefault();
        closeSearch();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isSearchOpen, closeSearch]);

  // Cleanup debounce on unmount
  useEffect(() => {
    return () => {
      if (debounceRef.current) {
        clearTimeout(debounceRef.current);
      }
    };
  }, []);

  if (!isSearchOpen || !mounted) return null;

  const handleResultClick = (link: string) => {
    router.push(link);
    closeSearch();
  };

  const getTypeIcon = (type: string) => {
    const icons: Record<string, string> = {
      user: '👤',
      disaster: '🌋',
      emergency: '🚨',
      volunteer: '🤝',
      serviceProvider: '🏢',
    };
    return icons[type] || '📄';
  };

  const getTypeColor = (type: string) => {
    const colors: Record<string, string> = {
      user: 'bg-blue-500/20 text-blue-400',
      disaster: 'bg-red-500/20 text-red-400',
      emergency: 'bg-orange-500/20 text-orange-400',
      volunteer: 'bg-green-500/20 text-green-400',
      serviceProvider: 'bg-purple-500/20 text-purple-400',
    };
    return colors[type] || 'bg-gray-500/20 text-gray-400';
  };

  return createPortal(
    <div className="fixed inset-0 z-[200] flex items-start justify-center pt-[10vh]">
      {/* Overlay - click to close */}
      <div 
        className="fixed inset-0 bg-black/40 backdrop-blur-sm" 
        onClick={closeSearch} 
        style={{ zIndex: 1 }}
      />

      {/* Search Content - above overlay */}
      <div 
        className="relative w-full max-w-2xl mx-4 animate-fade-in overflow-hidden bg-[var(--bg-card)] rounded-2xl border border-[var(--border-color)] shadow-2xl"
        style={{ zIndex: 2 }}
      >
        {/* Search Input */}
        <div className="flex items-center gap-4 p-5 border-b border-[var(--border-color)]">
          <MagnifyingGlassIcon className="w-6 h-6 text-[var(--text-muted)]" />
          <input
            ref={inputRef}
            type="text"
            placeholder="Search anything... (Ctrl+K)"
            value={searchQuery}
            onChange={handleInputChange}
            className="flex-1 bg-transparent text-lg text-[var(--text-primary)] placeholder-[var(--text-placeholder)] outline-none"
          />
          {searchQuery && (
            <button
              onClick={() => {
                setSearchQuery('');
                performSearch('');
              }}
              className="p-1 rounded-lg hover:bg-[var(--bg-input)] transition-colors"
            >
              <XMarkIcon className="w-5 h-5 text-[var(--text-muted)]" />
            </button>
          )}
          <div className="text-xs text-[var(--text-muted)] border border-[var(--border-color)] px-2 py-1 rounded">
            ESC
          </div>
        </div>

        {/* Search Results */}
        <div className="max-h-[60vh] overflow-y-auto p-4">
          {isSearching && (
            <div className="flex justify-center items-center py-12">
              <Loader size="lg" />
            </div>
          )}

          {!isSearching && searchQuery.trim() !== '' && searchResults.length === 0 && (
            <div className="text-center py-12">
              <div className="text-5xl mb-4">🔍</div>
              <p className="text-[var(--text-muted)] text-lg">No results found for &quot;{searchQuery}&quot;</p>
              <p className="text-[var(--text-muted)] text-sm mt-2">Try a different search term</p>
            </div>
          )}

          {!isSearching && searchQuery.trim() === '' && (
            <div className="text-center py-12">
              <div className="text-5xl mb-4">⚡</div>
              <p className="text-[var(--text-muted)] text-lg">Start typing to search</p>
              <p className="text-[var(--text-secondary)] text-sm mt-2">
                Search across users, disasters, emergencies, volunteers, and service providers
              </p>
            </div>
          )}

          {!isSearching && searchResults.length > 0 && (
            <div className="space-y-2">
              {searchResults.map((result) => (
                <button
                  key={result._id}
                  onClick={() => handleResultClick(result.link)}
                  className="w-full text-left p-4 rounded-xl hover:bg-[var(--bg-card-hover)] transition-all duration-200 group flex items-center gap-4"
                >
                  <div className={cn(
                    'w-10 h-10 rounded-lg flex items-center justify-center text-lg',
                    getTypeColor(result.type)
                  )}>
                    {getTypeIcon(result.type)}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-[var(--text-primary)] font-medium group-hover:text-[var(--primary-500)] transition-colors">
                      {result.title}
                    </p>
                    {result.description && (
                      <p className="text-sm text-[var(--text-muted)] truncate">{result.description}</p>
                    )}
                  </div>
                  <span className={cn(
                    'text-xs px-2 py-1 rounded-full font-medium uppercase',
                    getTypeColor(result.type)
                  )}>
                    {result.type.replace(/([A-Z])/g, ' $1').trim()}
                  </span>
                </button>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>,
    document.body
  );
};

export default SearchModal;
