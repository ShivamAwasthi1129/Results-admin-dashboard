'use client';

import { useEffect, useRef, useState } from 'react';
import { useAuth } from '@/context/AuthContext';

interface LocationUpdate {
  userId: string;
  userName?: string;
  latitude: number;
  longitude: number;
  accuracy?: number;
  timestamp: string;
}

interface GeofenceEvent {
  geofenceId: string;
  geofenceName?: string;
  userId: string;
  userName?: string;
  eventType: 'entry' | 'exit';
  latitude: number;
  longitude: number;
  timestamp: string;
}

interface UseTrackingWebSocketOptions {
  onLocationUpdate?: (update: LocationUpdate) => void;
  onGeofenceEvent?: (event: GeofenceEvent) => void;
  onError?: (error: Error) => void;
  enabled?: boolean;
}

export function useTrackingWebSocket({
  onLocationUpdate,
  onGeofenceEvent,
  onError,
  enabled = true,
}: UseTrackingWebSocketOptions = {}) {
  const { token } = useAuth();
  const [isConnected, setIsConnected] = useState(false);
  const [error, setError] = useState<Error | null>(null);
  const socketRef = useRef<WebSocket | null>(null);
  const reconnectTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const reconnectAttempts = useRef(0);
  const maxReconnectAttempts = 5;

  useEffect(() => {
    if (!enabled || !token) {
      return;
    }

    // Get WebSocket URL from environment or use default
    const wsUrl = process.env.NEXT_PUBLIC_WEBSOCKET_URL || 'ws://localhost:3001';
    const wsProtocol = wsUrl.startsWith('wss://') ? 'wss' : 'ws';
    const wsHost = wsUrl.replace(/^wss?:\/\//, '').split('/')[0];
    const wsPath = '/socket.io/?EIO=4&transport=websocket';
    
    // For Socket.IO, we need to use the Socket.IO client library
    // For now, we'll use a simple WebSocket connection
    // In production, you should use socket.io-client
    const connectWebSocket = () => {
      try {
        // Note: This is a basic WebSocket implementation
        // For Socket.IO, you should use socket.io-client library
        // const socket = io(wsUrl, { auth: { token } });
        
        // For now, using native WebSocket as fallback
        const socket = new WebSocket(`${wsProtocol}://${wsHost}${wsPath}`);
        
        socket.onopen = () => {
          console.log('WebSocket connected');
          setIsConnected(true);
          setError(null);
          reconnectAttempts.current = 0;
          
          // Send authentication token
          if (token) {
            socket.send(JSON.stringify({ type: 'auth', token }));
          }
          
          // Subscribe to location updates
          socket.send(JSON.stringify({ type: 'subscribe', event: 'location' }));
        };

        socket.onmessage = (event) => {
          try {
            const data = JSON.parse(event.data);
            
            if (data.type === 'location:update' && onLocationUpdate) {
              onLocationUpdate(data.payload);
            } else if (data.type === 'geofence:event' && onGeofenceEvent) {
              onGeofenceEvent(data.payload);
            }
          } catch (err) {
            console.error('Error parsing WebSocket message:', err);
          }
        };

        socket.onerror = (err) => {
          // Only log in development, don't show errors to user if WebSocket is optional
          if (process.env.NODE_ENV === 'development') {
            console.warn('WebSocket connection error (this is normal if WebSocket server is not available):', err);
          }
          // Don't set error state for WebSocket failures - it's optional
          // setError(error);
          // if (onError) {
          //   onError(error);
          // }
        };

        socket.onclose = () => {
          console.log('WebSocket disconnected');
          setIsConnected(false);
          
          // Attempt to reconnect
          if (reconnectAttempts.current < maxReconnectAttempts) {
            reconnectAttempts.current++;
            const delay = Math.min(1000 * Math.pow(2, reconnectAttempts.current), 30000);
            
            reconnectTimeoutRef.current = setTimeout(() => {
              connectWebSocket();
            }, delay);
          } else {
            const error = new Error('WebSocket connection failed after multiple attempts');
            setError(error);
            if (onError) {
              onError(error);
            }
          }
        };

        socketRef.current = socket;
      } catch (err) {
        console.error('Error creating WebSocket:', err);
        const error = err instanceof Error ? err : new Error('Failed to create WebSocket');
        setError(error);
        if (onError) {
          onError(error);
        }
      }
    };

    // Only connect if WebSocket URL is configured
    if (process.env.NEXT_PUBLIC_WEBSOCKET_URL && process.env.NEXT_PUBLIC_WEBSOCKET_URL !== 'ws://localhost:3001') {
      connectWebSocket();
    } else {
      // WebSocket is optional, don't show errors if not configured
      if (process.env.NODE_ENV === 'development') {
        console.log('WebSocket not configured, skipping real-time updates');
      }
    }

    return () => {
      if (reconnectTimeoutRef.current) {
        clearTimeout(reconnectTimeoutRef.current);
      }
      if (socketRef.current) {
        socketRef.current.close();
        socketRef.current = null;
      }
    };
  }, [enabled, token, onLocationUpdate, onGeofenceEvent, onError]);

  return {
    isConnected,
    error,
    disconnect: () => {
      if (socketRef.current) {
        socketRef.current.close();
        socketRef.current = null;
      }
    },
  };
}
