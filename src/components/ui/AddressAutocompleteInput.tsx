'use client';

import React, { useLayoutEffect, useRef, useState } from 'react';
import { cn } from '@/lib/utils';

export type ResolvedPlace = {
  addressLine1: string;
  city: string;
  state: string;
  zipCode: string;
  country: string;
  lat: number;
  lng: number;
};

type Props = {
  label?: string;
  placeholder?: string;
  value: string;
  onChange: (value: string) => void;
  onPlaceResolved?: (place: ResolvedPlace) => void;
  error?: string;
  required?: boolean;
  className?: string;
  inputClassName?: string;
};

let mapsScriptPromise: Promise<void> | null = null;

type GoogleWindow = {
  google?: {
    maps?: {
      event?: { clearInstanceListeners: (inst: unknown) => void };
      places?: {
        Autocomplete?: new (
          el: HTMLInputElement,
          opts: object
        ) => { addListener: (ev: string, fn: () => void) => void; getPlace: () => unknown };
      };
    };
  };
};

function getGoogleMaps(): GoogleWindow['google'] {
  return typeof window !== 'undefined' ? (window as unknown as GoogleWindow).google : undefined;
}

function loadGoogleMapsScript(apiKey: string): Promise<void> {
  if (typeof window === 'undefined') return Promise.resolve();
  if (getGoogleMaps()?.maps?.places) return Promise.resolve();
  if (!mapsScriptPromise) {
    mapsScriptPromise = new Promise((resolve, reject) => {
      const id = 'google-maps-places-script';
      const finish = () => {
        if (getGoogleMaps()?.maps?.places) resolve();
        else setTimeout(finish, 50);
      };
      if (document.getElementById(id)) {
        finish();
      } else {
        const s = document.createElement('script');
        s.id = id;
        s.async = true;
        s.src = `https://maps.googleapis.com/maps/api/js?key=${encodeURIComponent(apiKey)}&libraries=places`;
        s.onload = () => finish();
        s.onerror = () => reject(new Error('Google Maps failed to load'));
        document.head.appendChild(s);
      }
    });
  }
  return mapsScriptPromise;
}

function parsePlace(place: {
  geometry?: { location?: { lat: () => number; lng: () => number } };
  address_components?: Array<{ long_name: string; short_name: string; types: string[] }>;
  formatted_address?: string;
}): ResolvedPlace | null {
  const loc = place.geometry?.location;
  const lat = loc && typeof loc.lat === 'function' ? loc.lat() : NaN;
  const lng = loc && typeof loc.lng === 'function' ? loc.lng() : NaN;
  if (!Number.isFinite(lat) || !Number.isFinite(lng)) return null;

  let streetNum = '';
  let route = '';
  let city = '';
  let state = '';
  let zip = '';
  let country = '';

  for (const c of place.address_components || []) {
    const t = c.types;
    if (t.includes('street_number')) streetNum = c.long_name;
    if (t.includes('route')) route = c.long_name;
    if (t.includes('locality')) city = c.long_name;
    if (t.includes('administrative_area_level_1')) state = c.short_name;
    if (t.includes('postal_code')) zip = c.long_name;
    if (t.includes('country')) country = c.long_name;
  }

  const addressLine1 = [streetNum, route].filter(Boolean).join(' ').trim() || place.formatted_address?.split(',')[0]?.trim() || '';

  return {
    addressLine1,
    city,
    state,
    zipCode: zip,
    country: country || 'United States',
    lat,
    lng,
  };
}

/**
 * Address line with Google Places suggestions. Uses NEXT_PUBLIC_GOOGLE_MAPS_API_KEY from env.
 */
export default function AddressAutocompleteInput({
  label,
  placeholder,
  value,
  onChange,
  onPlaceResolved,
  error,
  required,
  className,
  inputClassName,
}: Props) {
  const inputRef = useRef<HTMLInputElement>(null);
  const autocompleteRef = useRef<{ addListener: (ev: string, fn: () => void) => void; getPlace: () => unknown } | null>(null);
  const onPlaceResolvedRef = useRef(onPlaceResolved);
  const onChangeRef = useRef(onChange);
  onPlaceResolvedRef.current = onPlaceResolved;
  onChangeRef.current = onChange;
  const [ready, setReady] = useState(false);

  useLayoutEffect(() => {
    const key = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY;
    if (!key) return;

    let cancelled = false;

    const init = () => {
      if (cancelled || !inputRef.current) return;
      const Autocomplete = getGoogleMaps()?.maps?.places?.Autocomplete;
      const g = typeof window !== 'undefined' ? (window as unknown as GoogleWindow).google : undefined;
      if (!Autocomplete || !inputRef.current) return;
      if (autocompleteRef.current && g?.maps?.event) {
        g.maps.event.clearInstanceListeners(autocompleteRef.current);
        autocompleteRef.current = null;
      }
      const ac = new Autocomplete(inputRef.current, {
        types: ['address'],
      });
      autocompleteRef.current = ac;
      ac.addListener('place_changed', () => {
        const place = ac.getPlace() as Parameters<typeof parsePlace>[0];
        if (!place?.address_components?.length && !(place as { formatted_address?: string }).formatted_address) return;
        const parsed = parsePlace(place);
        if (parsed) {
          onChangeRef.current(parsed.addressLine1);
          onPlaceResolvedRef.current?.(parsed);
        }
      });
      setReady(true);
    };

    loadGoogleMapsScript(key)
      .then(() => {
        if (cancelled) return;
        requestAnimationFrame(() => init());
      })
      .catch(() => {
        /* key missing or network */
      });

    return () => {
      cancelled = true;
      const g = typeof window !== 'undefined' ? (window as unknown as GoogleWindow).google : undefined;
      if (g?.maps?.event && autocompleteRef.current) {
        g.maps.event.clearInstanceListeners(autocompleteRef.current);
        autocompleteRef.current = null;
      }
    };
  }, []);

  const apiKey = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY;

  return (
    <div className={cn('w-full', className)}>
      {label && (
        <label className="block text-sm font-medium text-[var(--text-secondary)] mb-2">
          {label} {required && <span className="text-red-500">*</span>}
        </label>
      )}
      <input
        ref={inputRef}
        type="text"
        autoComplete="off"
        placeholder={placeholder}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className={cn(
          'input-field w-full',
          error && 'border-[var(--danger)] focus:border-[var(--danger)] focus:ring-[var(--danger)]/20',
          inputClassName
        )}
      />
      {!apiKey && (
        <p className="mt-1 text-xs text-amber-600 dark:text-amber-400">
          Set NEXT_PUBLIC_GOOGLE_MAPS_API_KEY for address suggestions.
        </p>
      )}
      {apiKey && !ready && (
        <p className="mt-1 text-xs text-[var(--text-muted)]">Loading address suggestions…</p>
      )}
      {error && <p className="mt-2 text-sm text-[var(--danger)]">{error}</p>}
    </div>
  );
}
