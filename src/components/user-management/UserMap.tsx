'use client';

import React, { useEffect, useRef } from 'react';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { User } from '@/app/dashboard/user-management/UserManagementClient';
import { generateUserCoordinates, generateUserPath, getUserRoleColor, LocationPoint } from '@/utils/userLocation';

interface UserMapProps {
  user: User;
  showPath?: boolean;
  height?: string;
}

export default function UserMap({ user, showPath = false, height = '400px' }: UserMapProps) {
  const mapRef = useRef<L.Map | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const markersRef = useRef<L.Marker[]>([]);
  const pathRef = useRef<L.Polyline | null>(null);

  useEffect(() => {
    if (!containerRef.current || mapRef.current) return;

    // Generate coordinates for user
    const coordinates = generateUserCoordinates(
      user.city,
      user.state,
      user.country,
      user.id
    );

    // Initialize map
    mapRef.current = L.map(containerRef.current, {
      center: [coordinates.lat, coordinates.lng],
      zoom: 13,
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

    // Clear existing markers and path
    markersRef.current.forEach(marker => marker.remove());
    markersRef.current = [];
    if (pathRef.current) {
      pathRef.current.remove();
      pathRef.current = null;
    }

    // Generate coordinates
    const coordinates = generateUserCoordinates(
      user.city,
      user.state,
      user.country,
      user.id
    );

    // Center map on user location
    mapRef.current.setView([coordinates.lat, coordinates.lng], 13, { animate: true });

    const roleColor = getUserRoleColor(user.role);

    // Create custom marker icon
    const userIcon = L.divIcon({
      className: 'custom-user-marker',
      html: `
        <div style="
          width: 50px;
          height: 50px;
          background: ${roleColor};
          border-radius: 50%;
          border: 4px solid white;
          display: flex;
          align-items: center;
          justify-content: center;
          box-shadow: 0 4px 12px rgba(0,0,0,0.3);
          font-weight: bold;
          color: white;
          font-size: 18px;
        ">
          ${user.fullName?.charAt(0)?.toUpperCase() || 'U'}
        </div>
      `,
      iconSize: [50, 50],
      iconAnchor: [25, 50],
    });

    // Add current location marker
    const currentMarker = L.marker([coordinates.lat, coordinates.lng], { icon: userIcon })
      .addTo(mapRef.current);

    // Add popup
    currentMarker.bindPopup(`
      <div style="padding: 8px; min-width: 200px;">
        <strong style="font-size: 14px; color: #1f2937;">${user.fullName || 'Unknown User'}</strong><br/>
        <span style="font-size: 12px; color: #6b7280;">@${user.username}</span><br/>
        ${user.city && user.state ? `<span style="font-size: 12px; color: #6b7280;">📍 ${user.city}, ${user.state}</span>` : ''}
        ${user.phoneNumber ? `<br/><span style="font-size: 12px; color: #6b7280;">📞 ${user.phoneNumber}</span>` : ''}
      </div>
    `).openPopup();

    markersRef.current.push(currentMarker);

    // Generate and show path if requested - animated like delivery apps
    if (showPath) {
      const path = generateUserPath(coordinates, user.id, 10);
      
      // Create animated polyline for path (like delivery apps)
      const pathCoordinates = path.map(p => [p.coordinates.lat, p.coordinates.lng] as [number, number]);
      
      // Create the full path line (faded)
      pathRef.current = L.polyline(pathCoordinates, {
        color: roleColor,
        weight: 4,
        opacity: 0.4,
      }).addTo(mapRef.current);

      // Create animated path segment (growing line effect)
      let animatedPath: L.Polyline | null = null;
      let currentIndex = 0;
      
      const animatePath = () => {
        if (!mapRef.current || currentIndex >= pathCoordinates.length) return;
        
        // Remove previous animated segment
        if (animatedPath) {
          animatedPath.remove();
        }
        
        // Create new segment up to current index
        const segment = pathCoordinates.slice(0, currentIndex + 1);
        animatedPath = L.polyline(segment, {
          color: roleColor,
          weight: 5,
          opacity: 0.8,
        }).addTo(mapRef.current);
        
        currentIndex++;
        
        if (currentIndex < pathCoordinates.length) {
          setTimeout(animatePath, 200); // Animate every 200ms
        }
      };
      
      // Start animation
      setTimeout(animatePath, 500);

      // Add small markers for path points (like breadcrumbs)
      path.forEach((point, index) => {
        if (index === 0) return; // Skip current location (already added)
        if (index === path.length - 1) return; // Skip first point (start)

        const pathIcon = L.divIcon({
          className: 'custom-path-marker',
          html: `
            <div style="
              width: 12px;
              height: 12px;
              background: ${roleColor};
              border-radius: 50%;
              border: 2px solid white;
              box-shadow: 0 2px 4px rgba(0,0,0,0.3);
            "></div>
          `,
          iconSize: [12, 12],
          iconAnchor: [6, 6],
        });

        if (!mapRef.current) return;
        const pathMarker = L.marker([point.coordinates.lat, point.coordinates.lng], { icon: pathIcon })
          .addTo(mapRef.current);

        pathMarker.bindPopup(`
          <div style="padding: 6px; font-size: 12px;">
            <strong>${point.label || 'Location'}</strong><br/>
            ${point.timestamp.toLocaleTimeString()}
          </div>
        `);

        markersRef.current.push(pathMarker);
      });

      // Add start marker
      if (path.length > 1) {
        const startPoint = path[path.length - 1];
        const startIcon = L.divIcon({
          className: 'custom-start-marker',
          html: `
            <div style="
              width: 24px;
              height: 24px;
              background: #6b7280;
              border-radius: 50%;
              border: 3px solid white;
              box-shadow: 0 2px 6px rgba(0,0,0,0.3);
              display: flex;
              align-items: center;
              justify-content: center;
              font-size: 12px;
              color: white;
              font-weight: bold;
            ">S</div>
          `,
          iconSize: [24, 24],
          iconAnchor: [12, 12],
        });

        const startMarker = L.marker([startPoint.coordinates.lat, startPoint.coordinates.lng], { icon: startIcon })
          .addTo(mapRef.current);

        startMarker.bindPopup(`
          <div style="padding: 6px; font-size: 12px;">
            <strong>Start</strong><br/>
            ${startPoint.timestamp.toLocaleString()}
          </div>
        `);

        markersRef.current.push(startMarker);
      }

      // Fit bounds to show entire path
      if (path.length > 0) {
        const bounds = L.latLngBounds(path.map(p => [p.coordinates.lat, p.coordinates.lng] as [number, number]));
        mapRef.current.fitBounds(bounds, { padding: [50, 50] });
      }
    }
  }, [user, showPath]);

  return (
    <div
      ref={containerRef}
      style={{ height, width: '100%', borderRadius: '8px', overflow: 'hidden', position: 'relative', zIndex: 1 }}
      className="user-map-container"
    />
  );
}

