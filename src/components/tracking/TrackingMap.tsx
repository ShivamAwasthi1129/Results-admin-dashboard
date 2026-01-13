'use client';

import React, { useEffect, useRef } from 'react';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';

// Add custom tooltip styles inline
if (typeof document !== 'undefined') {
  const style = document.createElement('style');
  style.textContent = `
    .custom-location-tooltip {
      background: white !important;
      border: 1px solid #e5e7eb !important;
      border-radius: 8px !important;
      box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15) !important;
      padding: 0 !important;
      margin-top: -15px !important;
      max-width: 320px !important;
      font-family: system-ui, -apple-system, sans-serif !important;
      z-index: 99999 !important;
      position: relative !important;
    }
    .leaflet-tooltip.custom-location-tooltip {
      z-index: 99999 !important;
    }
    .leaflet-tooltip-top.custom-location-tooltip::before,
    .leaflet-tooltip-bottom.custom-location-tooltip::before,
    .leaflet-tooltip-left.custom-location-tooltip::before,
    .leaflet-tooltip-right.custom-location-tooltip::before {
      z-index: 99998 !important;
    }
    .custom-location-tooltip::before {
      border-top-color: white !important;
    }
    .custom-location-tooltip::after {
      border-top-color: white !important;
    }
  `;
  if (!document.getElementById('custom-location-tooltip-styles')) {
    style.id = 'custom-location-tooltip-styles';
    document.head.appendChild(style);
  }
}

interface Location {
  id: string;
  userId: string;
  userName?: string;
  latitude: number;
  longitude: number;
  accuracy?: number;
  altitude?: number;
  speed?: number;
  heading?: number;
  address?: string;
  city?: string;
  state?: string;
  country?: string;
  lastUpdatedAt: string;
  isActive: boolean;
}

interface Geofence {
  id: string;
  name: string;
  centerLat: number;
  centerLng: number;
  radius: number;
  type: 'circle' | 'polygon';
  polygon?: Array<{ lat: number; lng: number }>;
  isActive: boolean;
}

interface TrackingMapProps {
  locations: Location[];
  geofences?: Geofence[];
  onLocationClick?: (location: Location) => void;
  height?: string;
  selectedLocationId?: string;
}

export default function TrackingMap({ 
  locations, 
  geofences = [], 
  onLocationClick,
  height = '600px',
  selectedLocationId
}: TrackingMapProps) {
  const mapRef = useRef<L.Map | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const markersRef = useRef<L.Marker[]>([]);
  const circlesRef = useRef<L.Circle[]>([]);
  const polygonsRef = useRef<L.Polygon[]>([]);

  useEffect(() => {
    if (!containerRef.current || mapRef.current) return;

    // Initialize map centered on USA
    mapRef.current = L.map(containerRef.current, {
      center: [39.8283, -98.5795],
      zoom: 4,
      zoomControl: true,
      attributionControl: false,
    });

    // Add tile layer
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      maxZoom: 19,
      attribution: '© OpenStreetMap contributors'
    }).addTo(mapRef.current);

    return () => {
      if (mapRef.current) {
        mapRef.current.remove();
        mapRef.current = null;
      }
    };
  }, []);

  useEffect(() => {
    if (!mapRef.current) return;

    // Clear existing markers
    markersRef.current.forEach(marker => marker.remove());
    markersRef.current = [];

    // Clear existing geofences
    circlesRef.current.forEach(circle => circle.remove());
    circlesRef.current = [];
    polygonsRef.current.forEach(polygon => polygon.remove());
    polygonsRef.current = [];

    const bounds: L.LatLngExpression[] = [];
    let validMarkers = 0;
    let invalidMarkers = 0;

    console.log('[TrackingMap] Rendering', locations.length, 'locations');

    // Add location markers - process ALL locations
    locations.forEach((location, index) => {
      // Validate coordinates - allow negative values (valid for longitude)
      const lat = Number(location.latitude);
      const lng = Number(location.longitude);
      
      // More lenient validation - only skip if truly invalid
      // Allow negative values (longitude can be negative, latitude can be negative in southern hemisphere)
      if (lat === null || lat === undefined || lng === null || lng === undefined || 
          isNaN(lat) || isNaN(lng) || 
          lat < -90 || lat > 90 || lng < -180 || lng > 180) {
        console.warn('[TrackingMap] Invalid location skipped:', {
          index,
          userId: location.userId,
          userName: location.userName,
          lat: location.latitude,
          lng: location.longitude
        });
        invalidMarkers++;
        return;
      }

      bounds.push([lat, lng]);
      validMarkers++;

      // Create custom marker icon
      const markerIcon = L.divIcon({
        className: 'custom-location-marker',
        html: `
          <div style="
            width: 40px;
            height: 40px;
            background: ${location.isActive ? '#10b981' : '#6b7280'};
            border-radius: 50%;
            border: 3px solid white;
            display: flex;
            align-items: center;
            justify-content: center;
            box-shadow: 0 4px 12px rgba(0,0,0,0.3);
            font-weight: bold;
            color: white;
            font-size: 16px;
          ">
            ${location.userName?.charAt(0)?.toUpperCase() || 'U'}
          </div>
        `,
        iconSize: [40, 40],
        iconAnchor: [20, 40],
      });

      const marker = L.marker([lat, lng], { icon: markerIcon })
        .addTo(mapRef.current!);

      // Create detailed tooltip content matching modal information exactly
      const formatDate = (dateString: string) => {
        if (!dateString) return 'N/A';
        return new Date(dateString).toLocaleString('en-US', {
          year: 'numeric',
          month: 'short',
          day: 'numeric',
          hour: '2-digit',
          minute: '2-digit',
        });
      };

      const tooltipContent = `
        <div style="
          padding: 0;
          min-width: 320px;
          max-width: 380px;
          font-family: system-ui, -apple-system, sans-serif;
          background: linear-gradient(135deg, #ffffff 0%, #f8fafc 100%);
          border-radius: 12px;
          box-shadow: 0 10px 40px rgba(0, 0, 0, 0.15), 0 0 0 1px rgba(0, 0, 0, 0.05);
          overflow: hidden;
        ">
          <!-- Header with gradient background -->
          <div style="
            background: linear-gradient(135deg, ${location.isActive ? '#10b981' : '#6b7280'} 0%, ${location.isActive ? '#059669' : '#4b5563'} 100%);
            padding: 20px;
            color: white;
          ">
            <div style="display: flex; align-items: center; gap: 14px;">
              <div style="
                width: 56px;
                height: 56px;
                background: rgba(255, 255, 255, 0.25);
                backdrop-filter: blur(10px);
                border-radius: 50%;
                display: flex;
                align-items: center;
                justify-content: center;
                color: white;
                font-weight: bold;
                font-size: 24px;
                flex-shrink: 0;
                border: 2px solid rgba(255, 255, 255, 0.3);
              ">
                ${location.userName?.charAt(0)?.toUpperCase() || 'U'}
              </div>
              <div style="flex: 1; min-width: 0;">
                <strong style="font-size: 20px; color: white; display: block; margin-bottom: 4px; word-wrap: break-word; line-height: 1.3; font-weight: 700;">${location.userName || 'Unknown User'}</strong>
                <div style="display: flex; align-items: center; gap: 8px; margin-top: 6px;">
                  <span style="
                    padding: 4px 10px;
                    border-radius: 20px;
                    background: rgba(255, 255, 255, 0.25);
                    backdrop-filter: blur(10px);
                    color: white;
                    font-size: 11px;
                    font-weight: 600;
                    text-transform: uppercase;
                    letter-spacing: 0.5px;
                  ">
                    ${location.isActive ? '🟢 Active' : '⚫ Inactive'}
                  </span>
                </div>
              </div>
            </div>
          </div>

          <!-- Content -->
          <div style="padding: 18px;">
            <!-- Address Section -->
            <div style="margin-bottom: 16px;">
              <div style="display: flex; align-items: center; gap: 6px; margin-bottom: 8px;">
                <span style="font-size: 16px;">📍</span>
                <p style="font-size: 11px; color: #6b7280; text-transform: uppercase; letter-spacing: 0.5px; font-weight: 600; margin: 0;">Location</p>
              </div>
              <p style="font-size: 14px; color: #1f2937; line-height: 1.6; margin: 0; font-weight: 500;">
                ${location.address || location.city || location.state || location.country || 'N/A'}
                ${location.city && !location.address ? `, ${location.city}` : ''}
                ${location.state && !location.city && !location.address ? `, ${location.state}` : ''}
                ${location.country && !location.state && !location.city && !location.address ? `, ${location.country}` : ''}
              </p>
              ${(location.city || location.state || location.country) ? `
                <div style="margin-top: 8px; padding-top: 8px; border-top: 1px solid #e5e7eb; display: flex; flex-wrap: gap: 8px; font-size: 11px; color: #9ca3af;">
                  ${location.city ? `<span>🏙️ ${location.city}</span>` : ''}
                  ${location.state ? `<span>🗺️ ${location.state}</span>` : ''}
                  ${location.country ? `<span>🌍 ${location.country}</span>` : ''}
                </div>
              ` : ''}
            </div>

            <!-- Coordinates -->
            <div style="margin-bottom: 16px; padding: 12px; background: #f9fafb; border-radius: 8px; border: 1px solid #e5e7eb;">
              <p style="font-size: 11px; color: #6b7280; text-transform: uppercase; letter-spacing: 0.5px; font-weight: 600; margin: 0 0 10px 0;">Coordinates</p>
              <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 12px;">
                <div>
                  <p style="font-size: 10px; color: #9ca3af; margin: 0 0 4px 0; font-weight: 500;">Latitude</p>
                  <p style="font-size: 15px; color: #1f2937; font-family: 'Courier New', monospace; font-weight: 700; margin: 0;">${lat.toFixed(6)}</p>
                </div>
                <div>
                  <p style="font-size: 10px; color: #9ca3af; margin: 0 0 4px 0; font-weight: 500;">Longitude</p>
                  <p style="font-size: 15px; color: #1f2937; font-family: 'Courier New', monospace; font-weight: 700; margin: 0;">${lng.toFixed(6)}</p>
                </div>
              </div>
            </div>

            <!-- Location Details Grid -->
            ${(location.accuracy || location.speed || location.heading || location.altitude) ? `
              <div style="margin-bottom: 16px; padding-top: 16px; border-top: 1px solid #e5e7eb;">
                <p style="font-size: 11px; color: #6b7280; text-transform: uppercase; letter-spacing: 0.5px; font-weight: 600; margin: 0 0 12px 0;">Details</p>
                <div style="display: grid; grid-template-columns: repeat(2, 1fr); gap: 10px;">
                  ${location.accuracy ? `
                    <div style="padding: 10px; background: #eff6ff; border-radius: 8px; border: 1px solid #dbeafe;">
                      <p style="font-size: 10px; color: #3b82f6; margin: 0 0 4px 0; font-weight: 600;">🎯 Accuracy</p>
                      <p style="font-size: 16px; color: #1e40af; font-weight: 700; margin: 0;">${location.accuracy.toFixed(0)}m</p>
                    </div>
                  ` : ''}
                  ${location.speed ? `
                    <div style="padding: 10px; background: #f0fdf4; border-radius: 8px; border: 1px solid #bbf7d0;">
                      <p style="font-size: 10px; color: #16a34a; margin: 0 0 4px 0; font-weight: 600;">⚡ Speed</p>
                      <p style="font-size: 16px; color: #15803d; font-weight: 700; margin: 0;">${(location.speed * 3.6).toFixed(1)} km/h</p>
                    </div>
                  ` : ''}
                  ${location.heading ? `
                    <div style="padding: 10px; background: #fef3c7; border-radius: 8px; border: 1px solid #fde68a;">
                      <p style="font-size: 10px; color: #d97706; margin: 0 0 4px 0; font-weight: 600;">🧭 Heading</p>
                      <p style="font-size: 16px; color: #92400e; font-weight: 700; margin: 0;">${location.heading.toFixed(0)}°</p>
                    </div>
                  ` : ''}
                  ${location.altitude ? `
                    <div style="padding: 10px; background: #f3e8ff; border-radius: 8px; border: 1px solid #e9d5ff;">
                      <p style="font-size: 10px; color: #9333ea; margin: 0 0 4px 0; font-weight: 600;">⛰️ Altitude</p>
                      <p style="font-size: 16px; color: #7e22ce; font-weight: 700; margin: 0;">${location.altitude.toFixed(1)}m</p>
                    </div>
                  ` : ''}
                </div>
              </div>
            ` : ''}

            <!-- Last Updated -->
            <div style="padding-top: 16px; border-top: 1px solid #e5e7eb;">
              <div style="display: flex; align-items: center; gap: 6px; margin-bottom: 6px;">
                <span style="font-size: 14px;">🕐</span>
                <p style="font-size: 11px; color: #6b7280; text-transform: uppercase; letter-spacing: 0.5px; font-weight: 600; margin: 0;">Last Updated</p>
              </div>
              <p style="font-size: 13px; color: #374151; font-weight: 500; margin: 0;">${formatDate(location.lastUpdatedAt)}</p>
            </div>
          </div>
        </div>
      `;

      // Bind tooltip that shows on hover (replaces modal)
      marker.bindTooltip(tooltipContent, {
        permanent: false,
        direction: 'top',
        offset: [0, -15],
        className: 'custom-location-tooltip',
        interactive: true,
        opacity: 1,
      });

      // Also bind popup for click (optional fallback)
      marker.bindPopup(tooltipContent);

      // Handle marker click (optional - keeping for compatibility)
      if (onLocationClick) {
        marker.on('click', () => {
          onLocationClick(location);
        });
      }

      markersRef.current.push(marker);
    });
    
    console.log('[TrackingMap] Valid markers:', validMarkers, 'Invalid markers:', invalidMarkers, 'Total locations:', locations.length);

    // Add geofences
    geofences.forEach((geofence) => {
      if (!geofence.isActive) return;

      if (geofence.type === 'circle') {
        const circle = L.circle([geofence.centerLat, geofence.centerLng], {
          radius: geofence.radius,
          color: '#3b82f6',
          fillColor: '#3b82f6',
          fillOpacity: 0.2,
          weight: 2,
        }).addTo(mapRef.current!);

        circle.bindPopup(`
          <div style="padding: 8px;">
            <strong style="font-size: 14px;">${geofence.name}</strong><br/>
            <span style="font-size: 12px; color: #6b7280;">Radius: ${geofence.radius}m</span>
          </div>
        `);

        circlesRef.current.push(circle);
        bounds.push([geofence.centerLat, geofence.centerLng]);
      } else if (geofence.type === 'polygon' && geofence.polygon) {
        const polygonPoints = geofence.polygon.map(p => [p.lat, p.lng] as [number, number]);
        const polygon = L.polygon(polygonPoints, {
          color: '#3b82f6',
          fillColor: '#3b82f6',
          fillOpacity: 0.2,
          weight: 2,
        }).addTo(mapRef.current!);

        polygon.bindPopup(`
          <div style="padding: 8px;">
            <strong style="font-size: 14px;">${geofence.name}</strong><br/>
            <span style="font-size: 12px; color: #6b7280;">Polygon Geofence</span>
          </div>
        `);

        polygonsRef.current.push(polygon);
        geofence.polygon.forEach(p => bounds.push([p.lat, p.lng]));
      }
    });

    // Fit bounds to show all locations and geofences
    if (bounds.length > 0) {
      const boundsObj = L.latLngBounds(bounds);
      console.log('[TrackingMap] Fitting bounds for', bounds.length, 'points');
      mapRef.current.fitBounds(boundsObj, { 
        padding: [80, 80], // Increased padding to ensure all markers are visible
        maxZoom: 15 // Increased maxZoom to show more detail when needed
      });
    } else {
      console.warn('[TrackingMap] No valid bounds to fit - no markers added');
    }
  }, [locations, geofences, onLocationClick]);

  // Pan to selected location
  useEffect(() => {
    if (!mapRef.current || !selectedLocationId) return;

    const location = locations.find(l => l.id === selectedLocationId || l.userId === selectedLocationId);
    if (location && location.latitude && location.longitude) {
      mapRef.current.setView(
        [location.latitude, location.longitude],
        15,
        { animate: true }
      );
    }
  }, [selectedLocationId, locations]);

  return (
    <div
      ref={containerRef}
      style={{ height, width: '100%', borderRadius: '8px', overflow: 'hidden', position: 'relative', zIndex: 1 }}
      className="tracking-map-container"
    />
  );
}
