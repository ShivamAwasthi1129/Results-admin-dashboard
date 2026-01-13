'use client';

import React, { useEffect, useRef, useState } from 'react';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { User } from '@/app/dashboard/user-management/UserManagementClient';
import { generateUserCoordinates, generateUserPath, getUserRoleColor, LocationPoint } from '@/utils/userLocation';

interface AllUsersMapProps {
  users: User[];
  showPaths?: boolean;
  height?: string;
  onUserClick?: (user: User) => void;
  userLocations?: Record<string, { latitude: number; longitude: number; accuracy?: number; lastUpdatedAt?: string; isActive?: boolean }>;
}

export default function AllUsersMap({ users, showPaths = false, height = '600px', onUserClick, userLocations = {} }: AllUsersMapProps) {
  const mapRef = useRef<L.Map | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const markersRef = useRef<L.Marker[]>([]);
  const pathsRef = useRef<L.Polyline[]>([]);
  const [selectedUserId, setSelectedUserId] = useState<string | null>(null);

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

    // Clear existing markers and paths
    markersRef.current.forEach(marker => marker.remove());
    markersRef.current = [];
    pathsRef.current.forEach(path => path.remove());
    pathsRef.current = [];

    const mapLocations: Array<[number, number]> = [];

    // Add markers for each user
    users.forEach((user) => {
      // Use real location data if available, otherwise fallback to generated coordinates
      let coordinates: { lat: number; lng: number };
      if (userLocations && userLocations[user.id] && userLocations[user.id].latitude && userLocations[user.id].longitude) {
        coordinates = {
          lat: userLocations[user.id].latitude,
          lng: userLocations[user.id].longitude,
        };
      } else {
        coordinates = generateUserCoordinates(
          user.city,
          user.state,
          user.country,
          user.id
        );
      }

      mapLocations.push([coordinates.lat, coordinates.lng]);

      const roleColor = getUserRoleColor(user.role);
      const isSelected = selectedUserId === user.id;

      // Create custom marker icon
      const userIcon = L.divIcon({
        className: 'custom-user-marker',
        html: `
          <div style="
            width: ${isSelected ? '60px' : '45px'};
            height: ${isSelected ? '60px' : '45px'};
            background: ${roleColor};
            border-radius: 50%;
            border: ${isSelected ? '5px' : '3px'} solid white;
            display: flex;
            align-items: center;
            justify-content: center;
            box-shadow: 0 ${isSelected ? '6px' : '4px'} ${isSelected ? '16px' : '12px'} rgba(0,0,0,0.${isSelected ? '5' : '3'});
            font-weight: bold;
            color: white;
            font-size: ${isSelected ? '22px' : '18px'};
            cursor: pointer;
            transition: all 0.3s;
            z-index: ${isSelected ? '1000' : '1'};
            ${isSelected ? 'animation: pulse 2s infinite;' : ''}
          ">
            ${user.fullName?.charAt(0)?.toUpperCase() || 'U'}
          </div>
        `,
        iconSize: [isSelected ? 60 : 45, isSelected ? 60 : 45],
        iconAnchor: [isSelected ? 30 : 22.5, isSelected ? 60 : 45],
      });

      const marker = L.marker([coordinates.lat, coordinates.lng], { icon: userIcon })
        .addTo(mapRef.current!);

      // Add popup
      marker.bindPopup(`
        <div style="padding: 10px; min-width: 220px;">
          <div style="display: flex; align-items: center; gap: 8px; margin-bottom: 8px;">
            <div style="
              width: 32px;
              height: 32px;
              background: ${roleColor};
              border-radius: 50%;
              display: flex;
              align-items: center;
              justify-content: center;
              color: white;
              font-weight: bold;
              font-size: 14px;
            ">
              ${user.fullName?.charAt(0)?.toUpperCase() || 'U'}
            </div>
            <div>
              <strong style="font-size: 14px; color: #1f2937; display: block;">${user.fullName || 'Unknown User'}</strong>
              ${user.username ? `<span style="font-size: 12px; color: #6b7280;">@${user.username}</span>` : user.email ? `<span style="font-size: 12px; color: #6b7280;">${user.email}</span>` : ''}
            </div>
          </div>
          ${user.city && user.state ? `<div style="font-size: 12px; color: #6b7280; margin-bottom: 4px;">📍 ${user.city}, ${user.state}</div>` : ''}
          ${user.phoneNumber ? `<div style="font-size: 12px; color: #6b7280; margin-bottom: 4px;">📞 ${user.phoneNumber}</div>` : ''}
          <div style="font-size: 12px; color: #6b7280; margin-top: 8px; padding-top: 8px; border-top: 1px solid #e5e7eb;">
            Role: <span style="color: ${roleColor}; font-weight: 600;">${user.role.replace('_', ' ')}</span>
          </div>
        </div>
      `);

      // Create hover tooltip
      let tooltip: L.Popup | null = null;
      
      marker.on('mouseover', () => {
        if (!mapRef.current) return;
        
        // Create a custom tooltip with user details
        const tooltipContent = `
          <div style="padding: 12px; min-width: 240px; max-width: 280px; background: white; border-radius: 8px; box-shadow: 0 4px 12px rgba(0,0,0,0.15);">
            <div style="display: flex; align-items: center; gap: 10px; margin-bottom: 10px; padding-bottom: 10px; border-bottom: 1px solid #e5e7eb;">
              <div style="
                width: 40px;
                height: 40px;
                background: ${roleColor};
                border-radius: 50%;
                display: flex;
                align-items: center;
                justify-content: center;
                color: white;
                font-weight: bold;
                font-size: 16px;
                flex-shrink: 0;
              ">
                ${user.fullName?.charAt(0)?.toUpperCase() || 'U'}
              </div>
              <div style="flex: 1; min-width: 0;">
                <div style="font-size: 14px; font-weight: 600; color: #1f2937; margin-bottom: 2px; white-space: nowrap; overflow: hidden; text-overflow: ellipsis;">
                  ${user.fullName || 'Unknown User'}
                </div>
                ${user.username ? `
                  <div style="font-size: 12px; color: #6b7280; white-space: nowrap; overflow: hidden; text-overflow: ellipsis;">
                    @${user.username}
                  </div>
                ` : user.email ? `
                  <div style="font-size: 12px; color: #6b7280; white-space: nowrap; overflow: hidden; text-overflow: ellipsis;">
                    ${user.email}
                  </div>
                ` : ''}
              </div>
            </div>
            <div style="space-y: 6px;">
              ${user.email ? `
                <div style="display: flex; align-items: center; gap: 6px; margin-bottom: 6px;">
                  <span style="font-size: 12px; color: #6b7280; min-width: 60px;">Email:</span>
                  <span style="font-size: 12px; color: #1f2937; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; flex: 1;">
                    ${user.email}
                  </span>
                  ${user.emailVerified ? '<span style="color: #10b981; font-size: 12px;">✓</span>' : ''}
                </div>
              ` : ''}
              ${user.phoneNumber ? `
                <div style="display: flex; align-items: center; gap: 6px; margin-bottom: 6px;">
                  <span style="font-size: 12px; color: #6b7280; min-width: 60px;">Phone:</span>
                  <span style="font-size: 12px; color: #1f2937;">${user.phoneNumber}</span>
                  ${user.phoneVerified ? '<span style="color: #10b981; font-size: 12px;">✓</span>' : ''}
                </div>
              ` : ''}
              ${user.city && user.state ? `
                <div style="display: flex; align-items: center; gap: 6px; margin-bottom: 6px;">
                  <span style="font-size: 12px; color: #6b7280; min-width: 60px;">Location:</span>
                  <span style="font-size: 12px; color: #1f2937;">${user.city}, ${user.state}</span>
                </div>
              ` : ''}
              <div style="display: flex; align-items: center; gap: 6px; margin-top: 8px; padding-top: 8px; border-top: 1px solid #e5e7eb;">
                <span style="font-size: 12px; color: #6b7280; min-width: 60px;">Role:</span>
                <span style="font-size: 12px; color: ${roleColor}; font-weight: 600;">${user.role.replace('_', ' ')}</span>
              </div>
              <div style="display: flex; align-items: center; gap: 8px; margin-top: 6px;">
                ${user.isActive ? '<span style="font-size: 11px; padding: 2px 6px; background: #10b981; color: white; border-radius: 4px;">Active</span>' : '<span style="font-size: 11px; padding: 2px 6px; background: #6b7280; color: white; border-radius: 4px;">Inactive</span>'}
                ${user.isVerified ? '<span style="font-size: 11px; padding: 2px 6px; background: #3b82f6; color: white; border-radius: 4px;">Verified</span>' : ''}
                ${user.isSubscriber ? '<span style="font-size: 11px; padding: 2px 6px; background: #f59e0b; color: white; border-radius: 4px;">Subscriber</span>' : ''}
              </div>
            </div>
          </div>
        `;
        
        tooltip = L.popup({
          closeButton: false,
          className: 'user-hover-tooltip',
          autoPan: false,
          offset: [0, -10],
        })
        .setLatLng([coordinates.lat, coordinates.lng])
        .setContent(tooltipContent)
        .openOn(mapRef.current);
      });

      marker.on('mouseout', () => {
        if (tooltip && mapRef.current) {
          mapRef.current.closePopup(tooltip);
          tooltip = null;
        }
      });

      // Handle marker click
      marker.on('click', () => {
        setSelectedUserId(user.id);
        // Use setTimeout to ensure modal renders after map click event
        setTimeout(() => {
          if (onUserClick) {
            onUserClick(user);
          }
        }, 100);
        marker.openPopup();
      });

      markersRef.current.push(marker);

      // Generate and show path if requested
      if (showPaths) {
        const path = generateUserPath(coordinates, user.id, 5);
        const pathCoordinates = path.map(p => [p.coordinates.lat, p.coordinates.lng] as [number, number]);
        
        const polyline = L.polyline(pathCoordinates, {
          color: roleColor,
          weight: 2,
          opacity: 0.5,
          dashArray: '8, 4',
        }).addTo(mapRef.current!);

        pathsRef.current.push(polyline);
      }
    });

    // Fit bounds to show all users
    if (mapLocations.length > 0) {
      const bounds = L.latLngBounds(mapLocations);
      mapRef.current.fitBounds(bounds, { padding: [50, 50], maxZoom: 6 });
    }
  }, [users, showPaths, selectedUserId, onUserClick, userLocations]);

  return (
    <div
      ref={containerRef}
      style={{ height, width: '100%', borderRadius: '8px', overflow: 'hidden', position: 'relative', zIndex: 1 }}
      className="all-users-map-container"
    />
  );
}

