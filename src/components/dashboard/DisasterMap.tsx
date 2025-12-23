'use client';

import React, { useEffect, useRef } from 'react';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';

interface Disaster {
  _id: string;
  title: string;
  type: string;
  severity: string;
  status: string;
  location: {
    coordinates: [number, number];
    address: string;
    city: string;
    state: string;
  };
  estimatedAffectedPeople: number;
}

interface DisasterMapProps {
  disasters: Disaster[];
  onMarkerClick?: (disaster: Disaster) => void;
}

const DisasterMap: React.FC<DisasterMapProps> = ({ disasters, onMarkerClick }) => {
  const mapRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<L.Map | null>(null);

  const severityColors: Record<string, string> = {
    critical: '#f43f5e',
    high: '#f97316',
    medium: '#f59e0b',
    low: '#10b981',
  };

  useEffect(() => {
    if (!mapRef.current || mapInstanceRef.current) return;

    // Initialize map centered on India
    const map = L.map(mapRef.current, {
      center: [22.5937, 78.9629],
      zoom: 5,
      zoomControl: false,
      attributionControl: false,
    });

    // Add zoom control to bottom right
    L.control.zoom({ position: 'bottomright' }).addTo(map);

    // Use CartoDB dark tiles for better aesthetics
    L.tileLayer('https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png', {
      maxZoom: 19,
    }).addTo(map);

    mapInstanceRef.current = map;

    return () => {
      map.remove();
      mapInstanceRef.current = null;
    };
  }, []);

  useEffect(() => {
    const map = mapInstanceRef.current;
    if (!map) return;

    // Clear existing markers
    map.eachLayer((layer) => {
      if (layer instanceof L.Marker || layer instanceof L.CircleMarker) {
        map.removeLayer(layer);
      }
    });

    // Add markers for each disaster
    disasters.forEach((disaster) => {
      if (!disaster.location?.coordinates) return;

      const [lng, lat] = disaster.location.coordinates;
      const color = severityColors[disaster.severity] || severityColors.medium;

      // Create pulsing marker for active disasters
      const isActive = disaster.status === 'active';
      
      // Outer pulse circle (for animation effect)
      if (isActive && disaster.severity === 'critical') {
        const pulseCircle = L.circleMarker([lat, lng], {
          radius: 20,
          fillColor: color,
          fillOpacity: 0.2,
          color: color,
          weight: 1,
          opacity: 0.5,
          className: 'animate-ping',
        }).addTo(map);
      }

      // Main marker
      const marker = L.circleMarker([lat, lng], {
        radius: disaster.severity === 'critical' ? 12 : disaster.severity === 'high' ? 10 : 8,
        fillColor: color,
        fillOpacity: 0.8,
        color: '#ffffff',
        weight: 2,
        opacity: 1,
      }).addTo(map);

      // Create custom popup content
      const popupContent = `
        <div style="
          min-width: 200px;
          font-family: 'Plus Jakarta Sans', sans-serif;
        ">
          <div style="
            display: flex;
            align-items: center;
            gap: 8px;
            margin-bottom: 8px;
          ">
            <span style="
              display: inline-block;
              width: 10px;
              height: 10px;
              border-radius: 50%;
              background-color: ${color};
            "></span>
            <span style="
              font-size: 11px;
              font-weight: 600;
              text-transform: uppercase;
              color: ${color};
              letter-spacing: 0.05em;
            ">${disaster.severity}</span>
          </div>
          <h3 style="
            font-size: 14px;
            font-weight: 600;
            color: #f1f5f9;
            margin-bottom: 4px;
          ">${disaster.title}</h3>
          <p style="
            font-size: 12px;
            color: #94a3b8;
            margin-bottom: 8px;
          ">${disaster.location.city}, ${disaster.location.state}</p>
          <div style="
            display: flex;
            gap: 8px;
            flex-wrap: wrap;
          ">
            <span style="
              padding: 4px 8px;
              border-radius: 6px;
              font-size: 11px;
              font-weight: 500;
              background-color: rgba(99, 102, 241, 0.2);
              color: #818cf8;
              text-transform: capitalize;
            ">${disaster.type}</span>
            <span style="
              padding: 4px 8px;
              border-radius: 6px;
              font-size: 11px;
              font-weight: 500;
              background-color: ${disaster.status === 'active' ? 'rgba(239, 68, 68, 0.2)' : 'rgba(100, 116, 139, 0.2)'};
              color: ${disaster.status === 'active' ? '#f87171' : '#94a3b8'};
              text-transform: capitalize;
            ">${disaster.status}</span>
          </div>
          ${disaster.estimatedAffectedPeople ? `
            <p style="
              margin-top: 8px;
              font-size: 12px;
              color: #64748b;
            ">
              ~${(disaster.estimatedAffectedPeople / 1000).toFixed(0)}K people affected
            </p>
          ` : ''}
        </div>
      `;

      marker.bindPopup(popupContent, {
        className: 'custom-popup',
        maxWidth: 300,
      });

      marker.on('click', () => {
        onMarkerClick?.(disaster);
      });
    });

    // Fit bounds if there are disasters
    if (disasters.length > 0) {
      const bounds = L.latLngBounds(
        disasters
          .filter((d) => d.location?.coordinates)
          .map((d) => [d.location.coordinates[1], d.location.coordinates[0]] as L.LatLngTuple)
      );
      if (bounds.isValid()) {
        map.fitBounds(bounds, { padding: [50, 50], maxZoom: 7 });
      }
    }
  }, [disasters, onMarkerClick]);

  return (
    <div className="relative w-full h-full">
      <div ref={mapRef} className="w-full h-full" />
      
      {/* Custom Legend */}
      <div className="absolute bottom-4 left-4 z-[1000] p-4 rounded-xl bg-slate-900/90 backdrop-blur-sm border border-slate-700/50">
        <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-3">Severity</p>
        <div className="space-y-2">
          {Object.entries(severityColors).map(([severity, color]) => (
            <div key={severity} className="flex items-center gap-2">
              <span
                className={`w-3 h-3 rounded-full ${severity === 'critical' ? 'animate-pulse' : ''}`}
                style={{ backgroundColor: color }}
              />
              <span className="text-xs text-slate-300 capitalize">{severity}</span>
            </div>
          ))}
        </div>
      </div>

      <style jsx global>{`
        .custom-popup .leaflet-popup-content-wrapper {
          background: #1e293b;
          color: #f1f5f9;
          border-radius: 12px;
          border: 1px solid rgba(148, 163, 184, 0.1);
          box-shadow: 0 20px 25px -5px rgba(0, 0, 0, 0.3);
        }
        .custom-popup .leaflet-popup-tip {
          background: #1e293b;
          border-left: 1px solid rgba(148, 163, 184, 0.1);
          border-bottom: 1px solid rgba(148, 163, 184, 0.1);
        }
        .custom-popup .leaflet-popup-close-button {
          color: #94a3b8;
        }
        .custom-popup .leaflet-popup-close-button:hover {
          color: #f1f5f9;
        }
        .leaflet-control-zoom a {
          background: #1e293b !important;
          color: #f1f5f9 !important;
          border-color: rgba(148, 163, 184, 0.2) !important;
        }
        .leaflet-control-zoom a:hover {
          background: #334155 !important;
        }
      `}</style>
    </div>
  );
};

export default DisasterMap;
