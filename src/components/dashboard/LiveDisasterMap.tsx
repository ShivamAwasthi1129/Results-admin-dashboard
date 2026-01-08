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
}

interface LiveDisasterMapProps {
  disasters: LiveDisaster[];
  selectedId?: string;
  highlightedId?: string | null;
  onSelectDisaster?: (id: string) => void;
}

const severityColors: Record<string, string> = {
  low: '#10b981',
  medium: '#f59e0b',
  high: '#f97316',
  critical: '#ef4444',
};

const typeEmoji: Record<string, string> = {
  wildfire: '🔥',
  cyclone: '🌀',
  flood: '🌊',
  earthquake: '🌋',
  volcanic: '🌋',
  drought: '☀️',
  landslide: '⛰️',
  other: '⚠️',
};

export default function LiveDisasterMap({
  disasters,
  selectedId,
  highlightedId,
  onSelectDisaster,
}: LiveDisasterMapProps) {
  const mapRef = useRef<L.Map | null>(null);
  const markersRef = useRef<L.LayerGroup | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!containerRef.current || mapRef.current) return;

    // Initialize map centered on USA
    mapRef.current = L.map(containerRef.current, {
      center: [39.8283, -98.5795], // USA center coordinates
      zoom: 4, // Zoom level to show USA
      minZoom: 2,
      maxZoom: 18,
      zoomControl: true,
      attributionControl: false,
    });

    // Use OpenStreetMap tiles (better visibility) with dark styling through CSS
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      maxZoom: 18,
    }).addTo(mapRef.current);

    // Create marker layer group
    markersRef.current = L.layerGroup().addTo(mapRef.current);

    return () => {
      if (mapRef.current) {
        mapRef.current.remove();
        mapRef.current = null;
      }
    };
  }, []);

  useEffect(() => {
    if (!mapRef.current || !markersRef.current) return;

    // Clear existing markers
    markersRef.current.clearLayers();

    // Add markers for each disaster
    disasters.forEach((disaster) => {
      if (!disaster.location?.coordinates) return;

      const { lat, lng } = disaster.location.coordinates;
      const color = severityColors[disaster.severity] || severityColors.medium;
      const emoji = typeEmoji[disaster.type] || typeEmoji.other;
      const isSelected = selectedId === disaster.id;
      const isHighlighted = highlightedId === disaster.id;

      // Create custom icon with enhanced interactivity
      const markerSize = isSelected ? 56 : isHighlighted ? 48 : 40;
      const icon = L.divIcon({
        className: 'custom-disaster-marker',
        html: `
          <div style="
            position: relative;
            width: ${markerSize}px;
            height: ${markerSize}px;
            display: flex;
            align-items: center;
            justify-content: center;
            background: ${color};
            border-radius: 50%;
            border: ${isSelected ? '5px' : '4px'} solid white;
            box-shadow: 0 ${isSelected ? '6px' : '4px'} ${isSelected ? '20px' : '16px'} rgba(0,0,0,0.${isSelected ? '5' : '4'});
            font-size: ${isSelected ? '24px' : isHighlighted ? '20px' : '18px'};
            cursor: pointer;
            transition: all 0.3s ease;
            z-index: ${isSelected ? '1000' : isHighlighted ? '999' : '1'};
            ${disaster.severity === 'critical' ? 'animation: pulse-marker 1.5s infinite;' : ''}
            ${isHighlighted ? 'animation: highlight-marker 0.6s ease-in-out;' : ''}
          ">
            ${emoji}
          </div>
          ${(isSelected || isHighlighted) ? `
            <div style="
              position: absolute;
              top: 50%;
              left: 50%;
              transform: translate(-50%, -50%);
              width: ${isSelected ? '80px' : '70px'};
              height: ${isSelected ? '80px' : '70px'};
              border: 3px solid ${color};
              border-radius: 50%;
              opacity: 0.5;
              animation: ripple-marker 1.5s infinite;
            "></div>
          ` : ''}
          <style>
            @keyframes pulse-marker {
              0%, 100% { transform: scale(1); }
              50% { transform: scale(1.15); }
            }
            @keyframes highlight-marker {
              0%, 100% { transform: scale(1); }
              50% { transform: scale(1.2); }
            }
            @keyframes ripple-marker {
              0% { transform: translate(-50%, -50%) scale(1); opacity: 0.5; }
              100% { transform: translate(-50%, -50%) scale(1.8); opacity: 0; }
            }
          </style>
        `,
        iconSize: [markerSize, markerSize],
        iconAnchor: [markerSize / 2, markerSize / 2],
      });

      const marker = L.marker([lat, lng], { icon })
        .addTo(markersRef.current!);

      // Create hover tooltip (not popup)
      let hoverTooltip: L.Popup | null = null;

      marker.on('mouseover', () => {
        marker.setZIndexOffset(1000);
        
        // Create detailed hover card
        const tooltipContent = `
          <div style="
            padding: 16px;
            min-width: 280px;
            max-width: 320px;
            font-family: 'Plus Jakarta Sans', sans-serif;
            background: #1a1a2e;
            border-radius: 12px;
            box-shadow: 0 8px 24px rgba(0,0,0,0.4);
          ">
            <div style="
              display: flex;
              align-items: center;
              gap: 8px;
              margin-bottom: 12px;
            ">
              <span style="
                padding: 5px 10px;
                background: ${color}30;
                color: ${color};
                border-radius: 20px;
                font-size: 12px;
                font-weight: 600;
                text-transform: capitalize;
              ">${disaster.severity}</span>
              <span style="
                padding: 5px 10px;
                background: rgba(139, 92, 246, 0.2);
                color: #a78bfa;
                border-radius: 20px;
                font-size: 12px;
                text-transform: capitalize;
              ">${disaster.type}</span>
            </div>
            <h3 style="
              font-size: 16px;
              font-weight: 600;
              color: #f8fafc;
              margin-bottom: 10px;
              line-height: 1.4;
            ">${disaster.title}</h3>
            ${disaster.description ? `
              <p style="
                font-size: 13px;
                color: #cbd5e1;
                margin-bottom: 10px;
                line-height: 1.5;
                display: -webkit-box;
                -webkit-line-clamp: 2;
                -webkit-box-orient: vertical;
                overflow: hidden;
              ">${disaster.description}</p>
            ` : ''}
            <div style="
              display: flex;
              flex-direction: column;
              gap: 6px;
              margin-top: 10px;
              padding-top: 10px;
              border-top: 1px solid rgba(255,255,255,0.1);
            ">
              ${disaster.location?.country || disaster.location?.state ? `
                <div style="display: flex; align-items: center; gap: 6px;">
                  <span style="font-size: 12px; color: #94a3b8;">📍</span>
                  <span style="font-size: 12px; color: #cbd5e1;">
                    ${[disaster.location?.state, disaster.location?.country].filter(Boolean).join(', ') || 'Unknown Location'}
                  </span>
                </div>
              ` : ''}
              ${disaster.date ? `
                <div style="display: flex; align-items: center; gap: 6px;">
                  <span style="font-size: 12px; color: #94a3b8;">🕐</span>
                  <span style="font-size: 12px; color: #cbd5e1;">
                    ${new Date(disaster.date).toLocaleDateString()}
                  </span>
                </div>
              ` : ''}
              ${disaster.magnitude ? `
                <div style="display: flex; align-items: center; gap: 6px;">
                  <span style="font-size: 12px; color: #94a3b8;">📊</span>
                  <span style="font-size: 12px; color: #cbd5e1;">
                    Magnitude: ${disaster.magnitude} ${disaster.magnitudeUnit || ''}
                  </span>
                </div>
              ` : ''}
              <div style="display: flex; align-items: center; gap: 6px; margin-top: 4px;">
                <span style="font-size: 11px; color: #64748b;">📍</span>
                <span style="font-size: 11px; color: #64748b;">
                  Lat: ${lat.toFixed(4)}, Lng: ${lng.toFixed(4)}
                </span>
              </div>
            </div>
          </div>
        `;
        
        hoverTooltip = L.popup({
          closeButton: false,
          autoClose: false,
          closeOnEscapeKey: false,
          closeOnClick: false,
          className: 'disaster-hover-tooltip',
          offset: [0, -markerSize / 2 - 10],
        })
        .setLatLng([lat, lng])
        .setContent(tooltipContent)
        .openOn(mapRef.current!);
      });

      marker.on('mouseout', () => {
        if (selectedId !== disaster.id) {
          marker.setZIndexOffset(0);
        }
        if (hoverTooltip) {
          mapRef.current?.closePopup(hoverTooltip);
          hoverTooltip = null;
        }
      });

      marker.on('click', () => {
        if (onSelectDisaster) {
          onSelectDisaster(disaster.id);
        }
      });
    });

    // Fit bounds to show all markers, but only if there are disasters
    // Otherwise keep the USA view
    if (disasters.length > 0) {
      const validDisasters = disasters.filter(d => d.location?.coordinates);
      if (validDisasters.length > 0) {
        // Filter to USA disasters only for initial bounds
        const usaDisasters = validDisasters.filter(d => {
          const coords = d.location.coordinates!;
          return coords.lat >= 24 && coords.lat <= 49 &&
                 coords.lng >= -125 && coords.lng <= -66;
        });
        
        if (usaDisasters.length > 0) {
          // Fit bounds to USA disasters
          const bounds = L.latLngBounds(
            usaDisasters.map(d => [d.location.coordinates!.lat, d.location.coordinates!.lng])
          );
          mapRef.current.fitBounds(bounds, { padding: [50, 50], maxZoom: 6 });
        } else {
          // If no USA disasters, keep USA view but allow user to zoom/pan
          mapRef.current.setView([39.8283, -98.5795], 4);
        }
      }
    } else {
      // No disasters, keep USA view
      mapRef.current.setView([39.8283, -98.5795], 4);
    }
  }, [disasters, selectedId, highlightedId, onSelectDisaster]);

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
      {/* Map Legend Overlay */}
      {disasters.length > 0 && (
        <div 
          className="absolute top-4 right-4 z-[1000] rounded-lg p-3 shadow-xl"
          style={{
            backgroundColor: 'rgba(26, 26, 46, 0.95)',
            border: '1px solid rgba(255, 255, 255, 0.1)',
            backdropFilter: 'blur(8px)'
          }}
        >
          <div className="text-xs font-semibold mb-2" style={{ color: '#f8fafc' }}>Severity Levels</div>
          <div className="space-y-1.5">
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 rounded-full bg-red-500 border border-white"></div>
              <span className="text-xs" style={{ color: '#cbd5e1' }}>Critical</span>
              <span className="text-xs ml-auto" style={{ color: '#64748b' }}>
                ({disasters.filter(d => d.severity === 'critical').length})
              </span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 rounded-full bg-orange-500 border border-white"></div>
              <span className="text-xs" style={{ color: '#cbd5e1' }}>High</span>
              <span className="text-xs ml-auto" style={{ color: '#64748b' }}>
                ({disasters.filter(d => d.severity === 'high').length})
              </span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 rounded-full bg-amber-500 border border-white"></div>
              <span className="text-xs" style={{ color: '#cbd5e1' }}>Medium</span>
              <span className="text-xs ml-auto" style={{ color: '#64748b' }}>
                ({disasters.filter(d => d.severity === 'medium').length})
              </span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 rounded-full bg-emerald-500 border border-white"></div>
              <span className="text-xs" style={{ color: '#cbd5e1' }}>Low</span>
              <span className="text-xs ml-auto" style={{ color: '#64748b' }}>
                ({disasters.filter(d => d.severity === 'low').length})
              </span>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
