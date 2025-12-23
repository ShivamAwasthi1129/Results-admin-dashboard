'use client';

import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';

export interface Notification {
  id: string;
  type: 'info' | 'success' | 'warning' | 'error' | 'emergency';
  title: string;
  message: string;
  timestamp: Date;
  read: boolean;
  link?: string;
}

interface NotificationContextType {
  notifications: Notification[];
  unreadCount: number;
  addNotification: (notification: Omit<Notification, 'id' | 'timestamp' | 'read'>) => void;
  markAsRead: (id: string) => void;
  markAllAsRead: () => void;
  removeNotification: (id: string) => void;
  clearAll: () => void;
}

const NotificationContext = createContext<NotificationContextType | undefined>(undefined);

// Sample initial notifications for demo
const initialNotifications: Notification[] = [
  {
    id: '1',
    type: 'emergency',
    title: 'Critical: Cyclone Alert',
    message: 'Cyclone approaching coastal areas. Immediate evacuation required.',
    timestamp: new Date(Date.now() - 5 * 60 * 1000), // 5 mins ago
    read: false,
    link: '/dashboard/disasters'
  },
  {
    id: '2',
    type: 'warning',
    title: 'New Emergency Request',
    message: '3 new emergency requests require immediate attention.',
    timestamp: new Date(Date.now() - 15 * 60 * 1000), // 15 mins ago
    read: false,
    link: '/dashboard/emergencies'
  },
  {
    id: '3',
    type: 'success',
    title: 'Volunteer Assigned',
    message: 'Rahul Kumar has been assigned to Flood Relief Camp.',
    timestamp: new Date(Date.now() - 30 * 60 * 1000), // 30 mins ago
    read: false,
    link: '/dashboard/volunteers'
  },
  {
    id: '4',
    type: 'info',
    title: 'New Service Provider',
    message: 'Quick Medical Services has registered. Verification pending.',
    timestamp: new Date(Date.now() - 60 * 60 * 1000), // 1 hour ago
    read: true,
    link: '/dashboard/services'
  },
  {
    id: '5',
    type: 'info',
    title: 'Weekly Report Ready',
    message: 'Your weekly disaster management report is ready to download.',
    timestamp: new Date(Date.now() - 2 * 60 * 60 * 1000), // 2 hours ago
    read: true,
    link: '/dashboard/reports'
  }
];

export function NotificationProvider({ children }: { children: ReactNode }) {
  const [notifications, setNotifications] = useState<Notification[]>(initialNotifications);

  const unreadCount = notifications.filter(n => !n.read).length;

  const addNotification = (notification: Omit<Notification, 'id' | 'timestamp' | 'read'>) => {
    const newNotification: Notification = {
      ...notification,
      id: Date.now().toString(),
      timestamp: new Date(),
      read: false
    };
    setNotifications(prev => [newNotification, ...prev]);
  };

  const markAsRead = (id: string) => {
    setNotifications(prev =>
      prev.map(n => (n.id === id ? { ...n, read: true } : n))
    );
  };

  const markAllAsRead = () => {
    setNotifications(prev => prev.map(n => ({ ...n, read: true })));
  };

  const removeNotification = (id: string) => {
    setNotifications(prev => prev.filter(n => n.id !== id));
  };

  const clearAll = () => {
    setNotifications([]);
  };

  // Simulate real-time notifications (for demo)
  useEffect(() => {
    const interval = setInterval(() => {
      // Random chance to add a notification
      if (Math.random() > 0.95) {
        const types = ['info', 'success', 'warning', 'emergency'] as const;
        const randomType = types[Math.floor(Math.random() * types.length)];
        const messages = [
          { title: 'New volunteer registered', message: 'A new volunteer has joined the platform.' },
          { title: 'Disaster update', message: 'Flood situation improving in affected areas.' },
          { title: 'Emergency resolved', message: 'Medical emergency #1234 has been resolved.' },
          { title: 'Service request', message: 'New service request from relief camp.' },
        ];
        const randomMessage = messages[Math.floor(Math.random() * messages.length)];
        
        addNotification({
          type: randomType,
          ...randomMessage
        });
      }
    }, 30000); // Check every 30 seconds

    return () => clearInterval(interval);
  }, []);

  return (
    <NotificationContext.Provider
      value={{
        notifications,
        unreadCount,
        addNotification,
        markAsRead,
        markAllAsRead,
        removeNotification,
        clearAll
      }}
    >
      {children}
    </NotificationContext.Provider>
  );
}

export function useNotifications() {
  const context = useContext(NotificationContext);
  if (context === undefined) {
    throw new Error('useNotifications must be used within a NotificationProvider');
  }
  return context;
}

