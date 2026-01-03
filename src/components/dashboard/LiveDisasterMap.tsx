'use client';

import React, { useEffect, useRef } from 'react';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';

interface LiveDisaster {
  id: string;
  title: string;
  type: string;
  severity: string;
  location: {
    coordinates?: { lat: number; lng: number };
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

    // Initialize map
    mapRef.current = L.map(containerRef.current, {
      center: [20, 0],
      zoom: 2,
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
        .addTo(markersRef.current!)
        .bindPopup(`
          <div style="
            padding: 16px;
            min-width: 220px;
            font-family: 'Plus Jakarta Sans', sans-serif;
            background: #1a1a2e;
            margin: -14px -20px -14px -20px;
            border-radius: 12px;
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
              font-size: 15px;
              font-weight: 600;
              color: #f8fafc;
              margin-bottom: 8px;
              line-height: 1.4;
            ">${disaster.title}</h3>
            <p style="
              font-size: 12px;
              color: #94a3b8;
            ">📍 Lat: ${lat.toFixed(4)}, Lng: ${lng.toFixed(4)}</p>
          </div>
        `, {
          closeButton: true,
          className: 'disaster-popup',
        });

      marker.on('click', () => {
        if (onSelectDisaster) {
          onSelectDisaster(disaster.id);
        }
        // Open popup on click
        marker.openPopup();
      });

      // Add hover effect
      marker.on('mouseover', () => {
        marker.setZIndexOffset(1000);
      });

      marker.on('mouseout', () => {
        if (selectedId !== disaster.id) {
          marker.setZIndexOffset(0);
        }
      });
    });

    // Fit bounds to show all markers
    if (disasters.length > 0) {
      const validDisasters = disasters.filter(d => d.location?.coordinates);
      if (validDisasters.length > 0) {
        const bounds = L.latLngBounds(
          validDisasters.map(d => [d.location.coordinates!.lat, d.location.coordinates!.lng])
        );
        mapRef.current.fitBounds(bounds, { padding: [50, 50], maxZoom: 5 });
      }
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
      className="w-full h-full" 
      style={{ 
        background: 'linear-gradient(135deg, #1a1a2e 0%, #0a0a12 100%)',
        minHeight: '400px'
      }}
    />
  );
}
