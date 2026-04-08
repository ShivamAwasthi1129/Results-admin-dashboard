'use client';

import React, { useEffect, useRef } from 'react';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';

interface LiveDisaster {
  id: string;
  title: string;
  type: string;
  severity: string;
  description?: string;
  category?: string;
  date?: string;
  magnitude?: number;
  magnitudeUnit?: string;
  source?: string;
  location: {
    coordinates?: { lat: number; lng: number };
    country?: string;
    state?: string;
  };
  /** GeoJSON Polygon or MultiPolygon for drawing on map */
  geometry?: { type: string; coordinates: number[] | number[][] | number[][][] | number[][][][] };
}

interface LiveDisasterMapProps {
  disasters: LiveDisaster[];
  selectedId?: string;
  highlightedId?: string | null;
  onSelectDisaster?: (id: string) => void;
  filterSeverity?: string;
  onSeverityClick?: (severity: string) => void;
  /** When set (e.g. volcanic, iceberg), map fits bounds to show only these disasters */
  activeFilterType?: string;
}

const severityColors: Record<string, string> = {
  low: '#10b981',
  medium: '#f59e0b',
  high: '#f97316',
  critical: '#ef4444',
};

const typeColors: Record<string, string> = {
  volcanic: '#dc2626',
  iceberg: '#06b6d4',
  wildfire: '#f59e0b',
  earthquake: '#eab308',
  cyclone: '#3b82f6',
  flood: '#0ea5e9',
  floods: '#0ea5e9',
  drought: '#f97316',
  landslide: '#78716c',
  snow_storm: '#06b6d4',
  tornado: '#8b5cf6',
  power_outage: '#64748b',
  other: '#94a3b8',
};

/** Normalize disaster type for marker/color lookup (e.g. floods -> flood) */
function normalizeMarkerType(type: string): string {
  const t = (type || '').toLowerCase().trim();
  if (t === 'floods') return 'flood';
  if (t === 'snow storm' || t === 'snowstorm') return 'snow_storm';
  if (t === 'volcanoes' || t === 'volcano') return 'volcanic';
  if (t === 'tornado' || t === 'tornados' || t.includes('severe_storm') || t.includes('severestorm')) return 'tornado';
  return t || 'other';
}

/** SVG-based marker HTML per disaster type for a more realistic map */
function getMarkerSvg(type: string, color: string, size: number, isSelected: boolean, isHighlighted: boolean): string {
  const markerType = normalizeMarkerType(type);
  const stroke = isSelected ? 3 : 2;
  const animClass = markerType === 'volcanic' ? 'marker-anim-eruption' : markerType === 'wildfire' ? 'marker-anim-flame' : markerType === 'earthquake' ? 'marker-anim-ripple' : markerType === 'iceberg' ? 'marker-anim-frost' : markerType === 'cyclone' || markerType === 'tornado' ? 'marker-anim-spin' : '';
  const base = `<div class="disaster-marker-wrap ${animClass}" style="width:${size}px;height:${size}px;position:relative;display:flex;align-items:center;justify-content:center;cursor:pointer;">`;
  const ring = (isSelected || isHighlighted) ? `<div class="marker-ring" style="position:absolute;inset:-8px;border:2px solid ${color};border-radius:50%;opacity:0.6;animation:ripple-marker 1.5s infinite;"></div>` : '';
  let svg = '';
  switch (markerType) {
    case 'volcanic':
      svg = `<svg viewBox="0 0 32 32" width="${size - 8}" height="${size - 8}" style="filter:drop-shadow(0 0 6px ${color});"><path fill="${color}" d="M16 4L6 20h4l-2 8h16l-2-8h4L16 4z"/><ellipse fill="#fbbf24" opacity="0.9" cx="16" cy="8" rx="4" ry="3"/><path fill="#fff" opacity="0.5" d="M14 6l2 4 2-4z"/></svg>`;
      break;
    case 'iceberg':
      svg = `<svg viewBox="0 0 32 32" width="${size - 8}" height="${size - 8}" style="filter:drop-shadow(0 0 6px ${color});"><path fill="${color}" d="M16 2l-6 12h4l-2 8h8l-2-8h4L16 2z"/><path fill="#e0f2fe" d="M14 10h4v2h-4z"/></svg>`;
      break;
    case 'wildfire':
      svg = `<svg viewBox="0 0 32 32" width="${size - 8}" height="${size - 8}" style="filter:drop-shadow(0 0 8px ${color});"><path fill="${color}" d="M16 4c-2 4-6 8-6 14 0 4 2.5 7 6 7s6-3 6-7c0-6-4-10-6-14z"/><path fill="#fef3c7" d="M16 8c1 2 3 5 3 10 0 2-1 4-3 4s-3-2-3-4c0-5 2-8 3-10z"/></svg>`;
      break;
    case 'earthquake':
      svg = `<svg viewBox="0 0 32 32" width="${size - 8}" height="${size - 8}" style="filter:drop-shadow(0 0 6px ${color});"><circle cx="16" cy="16" r="10" fill="none" stroke="${color}" stroke-width="${stroke}"/><circle cx="16" cy="16" r="6" fill="none" stroke="${color}" stroke-width="${stroke}" opacity="0.7"/><circle cx="16" cy="16" r="2" fill="${color}"/></svg>`;
      break;
    case 'cyclone':
      svg = `<svg viewBox="0 0 32 32" width="${size - 8}" height="${size - 8}" style="filter:drop-shadow(0 0 6px ${color});"><path fill="none" stroke="${color}" stroke-width="${stroke}" d="M16 4 Q24 8 24 16 Q24 24 16 28 Q8 24 8 16 Q8 8 16 4"/><path fill="${color}" d="M16 12v8l6-4-6-4z"/></svg>`;
      break;
    case 'tornado':
      svg = `<svg viewBox="0 0 32 32" width="${size - 8}" height="${size - 8}" style="filter:drop-shadow(0 0 8px ${color});"><path fill="${color}" d="M8 6h16v2H8zm2 4h12v2H10zm2 4h8v2h-8zm2 4h4v10h-4z"/><path fill="${color}" opacity="0.6" d="M6 26h20v2H6z"/></svg>`;
      break;
    case 'flood':
      svg = `<svg viewBox="0 0 32 32" width="${size - 8}" height="${size - 8}" style="filter:drop-shadow(0 0 6px ${color});"><path fill="${color}" d="M4 20h24v4H4z"/><path fill="${color}" opacity="0.8" d="M8 14h16v4H8z"/><path fill="${color}" opacity="0.6" d="M12 8h8v4h-8z"/></svg>`;
      break;
    case 'snow_storm':
      svg = `<svg viewBox="0 0 32 32" width="${size - 8}" height="${size - 8}" style="filter:drop-shadow(0 0 6px ${color});"><circle cx="16" cy="16" r="8" fill="none" stroke="${color}" stroke-width="${stroke}"/><path fill="${color}" d="M16 6v4M16 22v4M10 10l2.8 2.8M19.2 19.2L22 22M10 22l2.8-2.8M19.2 10.8L22 8"/><path fill="#e0f2fe" opacity="0.9" d="M14 14h4v4l-2 4 2 2h-4l-2-2 2-4z"/></svg>`;
      break;
    case 'drought':
      svg = `<svg viewBox="0 0 32 32" width="${size - 8}" height="${size - 8}" style="filter:drop-shadow(0 0 6px ${color});"><circle cx="16" cy="14" r="8" fill="${color}"/><path fill="#fef3c7" d="M16 6l2 8h-4z"/></svg>`;
      break;
    case 'landslide':
      svg = `<svg viewBox="0 0 32 32" width="${size - 8}" height="${size - 8}" style="filter:drop-shadow(0 0 6px ${color});"><path fill="${color}" d="M4 28l8-16 8 8 8-12v20H4z"/></svg>`;
      break;
    default:
      svg = `<svg viewBox="0 0 32 32" width="${size - 8}" height="${size - 8}" style="filter:drop-shadow(0 0 4px ${color});"><circle cx="16" cy="16" r="10" fill="none" stroke="${color}" stroke-width="${stroke}"/><path fill="${color}" d="M16 10v8M14 14h4"/></svg>`;
  }
  return `${base}${ring}<div style="position:relative;z-index:1;background:rgba(0,0,0,0.4);border-radius:50%;padding:4px;border:2px solid rgba(255,255,255,0.5);box-shadow:0 4px 12px rgba(0,0,0,0.4);">${svg}</div></div>`;
}

/** Convert GeoJSON ring [[lng,lat],...] to Leaflet LatLng[] */
function ringToLatLngs(ring: number[][]): L.LatLngExpression[] {
  return ring.map(([lng, lat]) => [lat, lng] as L.LatLngExpression);
}

/** Build tooltip HTML for a disaster (shared by marker and polygon) */
function getTooltipContent(disaster: LiveDisaster, color: string, lat: number, lng: number): string {
  return `
    <div style="padding: 16px; min-width: 280px; max-width: 320px; font-family: 'Plus Jakarta Sans', sans-serif; background: #1a1a2e; border-radius: 12px; box-shadow: 0 8px 24px rgba(0,0,0,0.4);">
      <div style="display: flex; align-items: center; gap: 8px; margin-bottom: 12px; flex-wrap: wrap;">
        <span style="padding: 5px 10px; background: ${color}30; color: ${color}; border-radius: 20px; font-size: 12px; font-weight: 600; text-transform: capitalize;">${disaster.severity}</span>
        <span style="padding: 5px 10px; background: rgba(139, 92, 246, 0.2); color: #a78bfa; border-radius: 20px; font-size: 12px; text-transform: capitalize;">${disaster.type}</span>
        ${disaster.source === 'database' ? '<span style="padding: 5px 10px; background: rgba(34, 197, 94, 0.2); color: #22c55e; border-radius: 20px; font-size: 11px; font-weight: 600;">Custom disaster</span>' : ''}
      </div>
      <h3 style="font-size: 16px; font-weight: 600; color: #f8fafc; margin-bottom: 10px; line-height: 1.4;">${disaster.title}</h3>
      ${disaster.description ? `<p style="font-size: 13px; color: #cbd5e1; margin-bottom: 10px; line-height: 1.5; display: -webkit-box; -webkit-line-clamp: 2; -webkit-box-orient: vertical; overflow: hidden;">${disaster.description}</p>` : ''}
      <div style="display: flex; flex-direction: column; gap: 6px; margin-top: 10px; padding-top: 10px; border-top: 1px solid rgba(255,255,255,0.1);">
        ${disaster.location?.country || disaster.location?.state ? `<div style="display: flex; align-items: center; gap: 6px;"><span style="font-size: 12px; color: #94a3b8;">📍</span><span style="font-size: 12px; color: #cbd5e1;">${[disaster.location?.state, disaster.location?.country].filter(Boolean).join(', ') || 'Unknown Location'}</span></div>` : ''}
        ${disaster.date ? `<div style="display: flex; align-items: center; gap: 6px;"><span style="font-size: 12px; color: #94a3b8;">🕐</span><span style="font-size: 12px; color: #cbd5e1;">${new Date(disaster.date).toLocaleDateString()}</span></div>` : ''}
        ${disaster.magnitude ? `<div style="display: flex; align-items: center; gap: 6px;"><span style="font-size: 12px; color: #94a3b8;">📊</span><span style="font-size: 12px; color: #cbd5e1;">Magnitude: ${disaster.magnitude} ${disaster.magnitudeUnit || ''}</span></div>` : ''}
        <div style="display: flex; align-items: center; gap: 6px; margin-top: 4px;"><span style="font-size: 11px; color: #64748b;">📍</span><span style="font-size: 11px; color: #64748b;">Lat: ${lat.toFixed(4)}, Lng: ${lng.toFixed(4)}</span></div>
      </div>
    </div>
  `;
}

export default function LiveDisasterMap({
  disasters,
  selectedId,
  highlightedId,
  onSelectDisaster,
  filterSeverity,
  onSeverityClick,
  activeFilterType,
}: LiveDisasterMapProps) {
  const mapRef = useRef<L.Map | null>(null);
  const markersRef = useRef<L.LayerGroup | null>(null);
  const polygonsRef = useRef<L.LayerGroup | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const fitBoundsDoneRef = useRef(false);
  /** Only one tooltip (popup) open at a time; close on map click */
  const openPopupRef = useRef<L.Popup | null>(null);

  const closeCurrentTooltip = () => {
    if (openPopupRef.current && mapRef.current) {
      mapRef.current.closePopup(openPopupRef.current);
      openPopupRef.current = null;
    }
  };

  useEffect(() => {
    if (!containerRef.current || mapRef.current) return;

    // Initialize map centered on USA
    mapRef.current = L.map(containerRef.current, {
      center: [39.8283, -98.5795], // USA center coordinates
      zoom: 4, // Zoom level to show USA
      minZoom: 2,
      maxZoom: 18,
      scrollWheelZoom: true,
      zoomControl: true,
      attributionControl: false,
    });

    // Use OpenStreetMap tiles (better visibility) with dark styling through CSS
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      maxZoom: 18,
    }).addTo(mapRef.current);

    // Polygon layer first (below), then markers (on top)
    polygonsRef.current = L.layerGroup().addTo(mapRef.current);
    markersRef.current = L.layerGroup().addTo(mapRef.current);

    // Close tooltip when clicking on the map (outside markers/polygons)
    mapRef.current.on('click', () => {
      if (openPopupRef.current && mapRef.current) {
        mapRef.current.closePopup(openPopupRef.current);
        openPopupRef.current = null;
      }
    });

    return () => {
      if (mapRef.current) {
        mapRef.current.remove();
        mapRef.current = null;
      }
    };
  }, []);

  useEffect(() => {
    if (!mapRef.current || !markersRef.current) return;

    closeCurrentTooltip();
    if (polygonsRef.current) polygonsRef.current.clearLayers();
    markersRef.current.clearLayers();

    disasters.forEach((disaster) => {
      const raw = disaster.location?.coordinates;
      let lat: number | undefined;
      let lng: number | undefined;
      if (raw && Array.isArray(raw) && raw.length >= 2) {
        lng = Number(raw[0]);
        lat = Number(raw[1]);
      } else if (raw && typeof raw === 'object' && 'lat' in raw && 'lng' in raw) {
        lat = Number((raw as { lat: number; lng: number }).lat);
        lng = Number((raw as { lat: number; lng: number }).lng);
      }
      const coords = lat != null && lng != null ? { lat, lng } : undefined;
      const markerType = normalizeMarkerType(disaster.type);
      const color = typeColors[markerType] || typeColors[disaster.type] || severityColors[disaster.severity] || severityColors.medium;
      const tooltipContent = (lat != null && lng != null) ? getTooltipContent(disaster, color, lat, lng) : '';

      // Draw Polygon or MultiPolygon when geometry is present
      const geom = disaster.geometry;
      const firstRing = geom?.type === 'Polygon' && Array.isArray(geom.coordinates) ? geom.coordinates[0] : undefined;
      if (Array.isArray(firstRing) && firstRing.length > 0) {
        const ring = firstRing as number[][];
        const poly = L.polygon(ringToLatLngs(ring), { color, fillColor: color, fillOpacity: 0.2, weight: 2 });
        poly.addTo(polygonsRef.current!);
        poly.on('mouseover', () => {
          if (openPopupRef.current && mapRef.current) { mapRef.current.closePopup(openPopupRef.current); openPopupRef.current = null; }
          if (lat != null && lng != null && tooltipContent) {
            const popup = L.popup({ closeButton: false, autoClose: false, closeOnClick: false, className: 'disaster-hover-tooltip' })
              .setLatLng([lat, lng]).setContent(tooltipContent).openOn(mapRef.current!);
            openPopupRef.current = popup;
          }
        });
        poly.on('mouseout', () => {
          if (openPopupRef.current && mapRef.current) { mapRef.current.closePopup(openPopupRef.current); openPopupRef.current = null; }
        });
        poly.on('click', () => { closeCurrentTooltip(); onSelectDisaster?.(disaster.id); });
      } else if (geom?.type === 'MultiPolygon' && Array.isArray(geom.coordinates)) {
        (geom.coordinates as number[][][][]).forEach((polyRings) => {
          const outer = polyRings?.[0];
          if (outer?.length) {
            const poly = L.polygon(ringToLatLngs(outer), { color, fillColor: color, fillOpacity: 0.2, weight: 2 });
            poly.addTo(polygonsRef.current!);
            poly.on('mouseover', () => {
              if (openPopupRef.current && mapRef.current) { mapRef.current.closePopup(openPopupRef.current); openPopupRef.current = null; }
              if (lat != null && lng != null && tooltipContent) {
                const popup = L.popup({ closeButton: false, autoClose: false, closeOnClick: false, className: 'disaster-hover-tooltip' })
                  .setLatLng([lat, lng]).setContent(tooltipContent).openOn(mapRef.current!);
                openPopupRef.current = popup;
              }
            });
            poly.on('mouseout', () => {
              if (openPopupRef.current && mapRef.current) { mapRef.current.closePopup(openPopupRef.current); openPopupRef.current = null; }
            });
            poly.on('click', () => { closeCurrentTooltip(); onSelectDisaster?.(disaster.id); });
          }
        });
      }

      if (!coords) return;

      const isSelected = selectedId === disaster.id;
      const isHighlighted = highlightedId === disaster.id;
      const markerSize = isSelected ? 56 : isHighlighted ? 48 : 40;
      const icon = L.divIcon({
        className: 'custom-disaster-marker',
        html: getMarkerSvg(markerType, color, markerSize, isSelected, isHighlighted),
        iconSize: [markerSize + 16, markerSize + 16],
        iconAnchor: [(markerSize + 16) / 2, (markerSize + 16) / 2],
      });

      const marker = L.marker([lat!, lng!], { icon }).addTo(markersRef.current!);
      let hoverTooltip: L.Popup | null = null;

      marker.on('mouseover', () => {
        marker.setZIndexOffset(1000);
        if (openPopupRef.current && mapRef.current) { mapRef.current.closePopup(openPopupRef.current); openPopupRef.current = null; }
        hoverTooltip = L.popup({
          closeButton: false,
          autoClose: false,
          closeOnEscapeKey: false,
          closeOnClick: false,
          className: 'disaster-hover-tooltip',
          offset: [0, -markerSize / 2 - 10],
        }).setLatLng([lat!, lng!]).setContent(tooltipContent).openOn(mapRef.current!);
        openPopupRef.current = hoverTooltip;
      });

      marker.on('mouseout', () => {
        if (selectedId !== disaster.id) marker.setZIndexOffset(0);
        if (hoverTooltip && openPopupRef.current === hoverTooltip) {
          mapRef.current?.closePopup(hoverTooltip);
          openPopupRef.current = null;
        }
        hoverTooltip = null;
      });

      marker.on('click', () => {
        closeCurrentTooltip();
        onSelectDisaster?.(disaster.id);
      });
    });

  }, [disasters, selectedId, highlightedId, onSelectDisaster]);

  // When a top-button filter is active (e.g. Volcanic, Iceberg), fit map to show only those markers
  useEffect(() => {
    if (!mapRef.current || !activeFilterType || activeFilterType === 'all') {
      fitBoundsDoneRef.current = false;
      return;
    }
    const withCoords = disasters.filter(d => d.location?.coordinates);
    if (withCoords.length === 0) return;
    const bounds = L.latLngBounds(
      withCoords.map(d => [d.location!.coordinates!.lat, d.location!.coordinates!.lng] as [number, number])
    );
    mapRef.current.fitBounds(bounds, { padding: [50, 50], maxZoom: 12, animate: true });
    fitBoundsDoneRef.current = true;
  }, [disasters, activeFilterType]);

  // Pan to selected disaster
  useEffect(() => {
    if (!mapRef.current || !selectedId) return;

    const disaster = disasters.find(d => d.id === selectedId);
    if (disaster?.location?.coordinates) {
      mapRef.current.setView(
        [disaster.location.coordinates.lat, disaster.location.coordinates.lng],
        6,
        { animate: true }
      );
    }
  }, [selectedId, disasters]);

  return (
    <div 
      ref={containerRef} 
      className="w-full h-full relative" 
      style={{ 
        background: 'linear-gradient(135deg, #1a1a2e 0%, #0a0a12 100%)',
        minHeight: '500px'
      }}
    >
      <style>{`
        @keyframes ripple-marker {
          0% { transform: scale(1); opacity: 0.6; }
          100% { transform: scale(1.8); opacity: 0; }
        }
        .marker-anim-eruption { animation: eruption-pulse 2s ease-in-out infinite; }
        .marker-anim-flame { animation: flame-flicker 1.2s ease-in-out infinite; }
        .marker-anim-ripple { animation: ripple-pulse 1.5s ease-out infinite; }
        .marker-anim-frost { animation: frost-glow 2.5s ease-in-out infinite; }
        .marker-anim-spin { animation: spin-slow 4s linear infinite; }
        @keyframes eruption-pulse { 0%, 100% { filter: drop-shadow(0 0 6px rgba(220,38,38,0.8)); transform: scale(1); } 50% { filter: drop-shadow(0 0 14px rgba(220,38,38,0.9)); transform: scale(1.08); } }
        @keyframes flame-flicker { 0%, 100% { filter: drop-shadow(0 0 8px rgba(245,158,11,0.9)); } 50% { filter: drop-shadow(0 0 14px rgba(251,191,36,0.95)); } }
        @keyframes ripple-pulse { 0%, 100% { transform: scale(1); opacity: 1; } 50% { transform: scale(1.05); opacity: 0.9; } }
        @keyframes frost-glow { 0%, 100% { filter: drop-shadow(0 0 6px rgba(6,182,212,0.6)); } 50% { filter: drop-shadow(0 0 12px rgba(34,211,238,0.8)); } }
        @keyframes spin-slow { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }
      `}</style>
      {/* Map Legend Overlay - clickable severity filter */}
      {disasters.length > 0 && (
        <div 
          className="absolute top-4 right-4 z-[20] rounded-lg p-3 shadow-xl w-[20%]"
          style={{
            backgroundColor: 'rgba(26, 26, 46, 0.95)',
            border: '1px solid rgba(255, 255, 255, 0.1)',
            backdropFilter: 'blur(8px)'
          }}
        >
          <div className="text-xs font-semibold mb-2" style={{ color: '#f8fafc' }}>Severity Levels</div>
          <div className="space-y-1.5">
            {(['critical', 'high', 'medium', 'low'] as const).map((severity) => {
              const count = disasters.filter(d => d.severity === severity).length;
              const isActive = filterSeverity === severity;
              const colorClass = severity === 'critical' ? 'bg-red-500' : severity === 'high' ? 'bg-orange-500' : severity === 'medium' ? 'bg-amber-500' : 'bg-emerald-500';
              const label = severity.charAt(0).toUpperCase() + severity.slice(1);
              const content = (
                <div className="flex items-center gap-2 w-full">
                  <div className={`w-3 h-3 rounded-full border border-white shrink-0 ${colorClass}`} />
                  <span className="text-xs flex-1" style={{ color: '#cbd5e1' }}>{label}</span>
                  <span className="text-xs" style={{ color: '#64748b' }}>({count})</span>
                </div>
              );
              return onSeverityClick ? (
                <button
                  key={severity}
                  type="button"
                  onClick={() => onSeverityClick(severity)}
                  className={`w-full text-left rounded px-2 py-1 -mx-2 -my-0.5 transition-colors ${isActive ? 'bg-white/15 ring-1 ring-white/30' : 'hover:bg-white/10'}`}
                  title={isActive ? `Click to show all severities` : `Filter by ${label}`}
                >
                  {content}
                </button>
              ) : (
                <div key={severity} className="flex items-center gap-2">
                  {content}
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
