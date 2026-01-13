# Live Tracking System - Setup Guide

## Environment Variables

Add the following environment variables to your `.env.local` file:

```env
# JWT Secret (Required for authentication)
JWT_SECRET=your-jwt-secret-key-here

# Tracking API URL (URL of your tracking backend service)
TRACKING_API_URL=http://localhost:3001

# WebSocket URL (for real-time updates)
NEXT_PUBLIC_WEBSOCKET_URL=ws://localhost:3001

# Optional: Location Tracking Settings
LOCATION_UPDATE_INTERVAL=60
LOCATION_HISTORY_RETENTION_DAYS=30
```

## Important Notes

1. **JWT_SECRET**: This is REQUIRED. Without it, all API calls will return "Not authorized. No token provided."
   - Set a strong, random secret key
   - Keep it secure and never commit it to version control
   - Use the same JWT_SECRET that your tracking backend uses

2. **TRACKING_API_URL**: The base URL of your tracking API backend
   - Default: `http://localhost:3001`
   - Update this to match your actual tracking service URL

3. **NEXT_PUBLIC_WEBSOCKET_URL**: WebSocket URL for real-time updates
   - Default: `ws://localhost:3001`
   - For production with HTTPS, use `wss://your-domain.com`

## API Endpoints Created

All endpoints are GET-only (read-only) for admin panel:

### Location Tracking
- `GET /api/tracking/location/current` - Get current location of authenticated user
- `GET /api/tracking/location/current/[userId]` - Get current location of specific user
- `GET /api/tracking/location/history` - Get location history
- `GET /api/tracking/location/history/[userId]` - Get location history of specific user
- `GET /api/tracking/location/shared` - Get list of users who can see my location
- `GET /api/tracking/location/visible` - Get list of users whose location I can see
- `GET /api/tracking/location/nearby` - Get nearby users
- `GET /api/tracking/location/multiple` - Get multiple user locations

### Geofences
- `GET /api/geofence` - Get all geofences
- `GET /api/geofence/[id]` - Get specific geofence
- `GET /api/geofence/[id]/events` - Get geofence events
- `GET /api/geofence/events` - Get all geofence events

## Authentication

All API routes use JWT authentication:
- Token is extracted from `Authorization: Bearer <token>` header
- Falls back to `auth-token` cookie if header is not present
- Token is forwarded to the tracking API backend

## Features

1. **Live Map View**: Real-time location tracking on interactive map
2. **Location History**: View historical location data with filters
3. **Geofences**: View all geofences and their details
4. **Geofence Events**: View entry/exit events with filtering
5. **Real-time Updates**: WebSocket integration for live location updates
6. **User Filtering**: Filter by user, date range, geofence

## Permissions

Tracking features are available to:
- `super_admin`
- `admin`

## Testing

1. Make sure JWT_SECRET is set in `.env.local`
2. Make sure TRACKING_API_URL points to your tracking backend
3. Start the Next.js dev server: `npm run dev`
4. Navigate to `/dashboard/tracking`
5. Verify that locations are fetched and displayed

## Troubleshooting

### "Not authorized. No token provided"
- Check that JWT_SECRET is set in `.env.local`
- Restart the Next.js server after adding environment variables
- Verify that the user is logged in and has a valid token

### "Failed to fetch locations"
- Check that TRACKING_API_URL is correct
- Verify that the tracking backend is running
- Check network connectivity between services

### WebSocket not connecting
- Verify NEXT_PUBLIC_WEBSOCKET_URL is correct
- Check that the WebSocket server is running
- For production, ensure WSS (secure WebSocket) is used with HTTPS
