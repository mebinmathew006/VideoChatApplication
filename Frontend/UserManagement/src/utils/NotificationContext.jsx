import React, { createContext, useContext, useReducer, useEffect, useRef, useCallback } from 'react';

const NotificationContext = createContext();
const socketBaseUrl = import.meta.env.VITE_WEBSOCKET_URL;

// Constants for connection management
const MAX_RECONNECT_ATTEMPTS = 5;
const INITIAL_RECONNECT_DELAY = 1000; // 1 second
const MAX_RECONNECT_DELAY = 30000; // 30 seconds
const KEEP_ALIVE_INTERVAL = 20000; // 20 seconds
const CONNECTION_TIMEOUT = 10000; // 10 seconds

// Reducer remains the same as your original
const notificationReducer = (state, action) => {
  switch (action.type) {
    case 'ADD_NOTIFICATION':
      return {
        ...state,
        notifications: [action.payload, ...state.notifications],
        unreadCount: state.unreadCount + 1
      };
    case 'MARK_AS_READ':
      return {
        ...state,
        notifications: state.notifications.map(notif => 
          notif.id === action.payload ? { ...notif, read: true } : notif
        ),
        unreadCount: Math.max(0, state.unreadCount - 1)
      };
    case 'MARK_ALL_AS_READ':
      return {
        ...state,
        notifications: state.notifications.map(notif => ({ ...notif, read: true })),
        unreadCount: 0
      };
    case 'REMOVE_NOTIFICATION':
      const notificationToRemove = state.notifications.find(notif => notif.id === action.payload);
      return {
        ...state,
        notifications: state.notifications.filter(notif => notif.id !== action.payload),
        unreadCount: notificationToRemove && !notificationToRemove.read 
          ? Math.max(0, state.unreadCount - 1) 
          : state.unreadCount
      };
    case 'SET_CONNECTION_STATUS':
      return {
        ...state,
        connectionStatus: action.payload
      };
    case 'SET_NOTIFICATIONS':
      return {
        ...state,
        notifications: action.payload,
        unreadCount: action.payload.filter(notif => !notif.read).length
      };
    case 'CLEAR_NOTIFICATIONS':
      return {
        ...state,
        notifications: [],
        unreadCount: 0
      };
    default:
      return state;
  }
};

const initialState = {
  notifications: [],
  unreadCount: 0,
  connectionStatus: 'disconnected'
};

export const NotificationProvider = ({ children, userId }) => {
  const [state, dispatch] = useReducer(notificationReducer, initialState);
  const wsRef = useRef(null);
  const reconnectTimeoutRef = useRef(null);
  const keepAliveIntervalRef = useRef(null);
  const reconnectAttempts = useRef(0);
  const isConnecting = useRef(false);
  const shouldReconnect = useRef(true);
  const connectionTimeoutRef = useRef(null);

  const cleanup = useCallback(() => {
    console.log('Cleaning up WebSocket connection');
    
    // Clear all timeouts and intervals
    if (keepAliveIntervalRef.current) {
      clearInterval(keepAliveIntervalRef.current);
      keepAliveIntervalRef.current = null;
    }
    
    if (reconnectTimeoutRef.current) {
      clearTimeout(reconnectTimeoutRef.current);
      reconnectTimeoutRef.current = null;
    }

    if (connectionTimeoutRef.current) {
      clearTimeout(connectionTimeoutRef.current);
      connectionTimeoutRef.current = null;
    }
    
    // Close WebSocket if it exists
    if (wsRef.current) {
      const ws = wsRef.current;
      wsRef.current = null;
      
      if (ws.readyState === WebSocket.OPEN || ws.readyState === WebSocket.CONNECTING) {
        ws.close(1000, 'Component cleanup');
      }
    }
    
    isConnecting.current = false;
  }, []);

  const scheduleReconnect = useCallback(() => {
    if (!shouldReconnect.current || reconnectAttempts.current >= MAX_RECONNECT_ATTEMPTS) {
      console.log('Max reconnection attempts reached or reconnection disabled');
      return;
    }

    const delay = Math.min(
      INITIAL_RECONNECT_DELAY * Math.pow(2, reconnectAttempts.current),
      MAX_RECONNECT_DELAY
    );

    console.log(`Scheduling reconnection attempt ${reconnectAttempts.current + 1} in ${delay}ms`);
    
    reconnectTimeoutRef.current = setTimeout(() => {
      if (shouldReconnect.current) {
        reconnectAttempts.current++;
        connect();
      }
    }, delay);
  }, []);

  const connect = useCallback(() => {
    if (isConnecting.current || !shouldReconnect.current || !userId) {
      return;
    }

    // Don't reconnect if we already have an open connection
    if (wsRef.current?.readyState === WebSocket.OPEN) {
      return;
    }

    isConnecting.current = true;
    dispatch({ type: 'SET_CONNECTION_STATUS', payload: 'connecting' });
    
    console.log(`Attempting to connect WebSocket for user ${userId}`);
    
    const wsUrl = `${socketBaseUrl}/consultations/ws/notifications/${userId}`;
    const newWs = new WebSocket(wsUrl);

    // Set up connection timeout
    connectionTimeoutRef.current = setTimeout(() => {
      if (newWs.readyState === WebSocket.CONNECTING) {
        console.log('WebSocket connection timeout');
        newWs.close(1006, 'Connection timeout');
      }
    }, CONNECTION_TIMEOUT);

    newWs.onopen = () => {
      console.log('WebSocket connected successfully');
      clearTimeout(connectionTimeoutRef.current);
      wsRef.current = newWs;
      dispatch({ type: 'SET_CONNECTION_STATUS', payload: 'connected' });
      reconnectAttempts.current = 0;
      isConnecting.current = false;
      
      // Start keep-alive ping
      keepAliveIntervalRef.current = setInterval(() => {
        if (wsRef.current?.readyState === WebSocket.OPEN) {
          try {
            wsRef.current.send(JSON.stringify({ type: 'ping' }));
          } catch (error) {
            console.error('Error sending ping:', error);
            cleanup();
            scheduleReconnect();
          }
        }
      }, KEEP_ALIVE_INTERVAL);
    };

    newWs.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data);
        
        if (data.type === 'pong') {
          console.log('Received pong from server');
          return;
        }
        
        if (data.type === 'notification') {
          const notification = {
            id: data.id || `${data.timestamp}_${Math.random().toString(36).substr(2, 9)}`,
            message: data.message,
            notification_type: data.notification_type,
            consultation_id: data.consultation_id || null,
            created_at: data.timestamp || new Date().toISOString(),
            read: false,
            sender_id: data.sender_id || null,
            receiver_id: data.receiver_id || null
          };
          
          console.log('Received notification:', notification);
          dispatch({ type: 'ADD_NOTIFICATION', payload: notification });
          
          if (Notification.permission === 'granted') {
            new Notification(`New ${data.notification_type}`, {
              body: data.message,
              icon: '/favicon.ico',
              tag: notification.id
            });
          }
        }
      } catch (error) {
        console.error('Error processing WebSocket message:', error, event.data);
      }
    };

    newWs.onclose = (event) => {
      clearTimeout(connectionTimeoutRef.current);
      console.log(`WebSocket closed: code=${event.code}, reason="${event.reason}"`);
      
      if (wsRef.current === newWs) {
        wsRef.current = null;
      }
      
      if (keepAliveIntervalRef.current) {
        clearInterval(keepAliveIntervalRef.current);
        keepAliveIntervalRef.current = null;
      }
      
      isConnecting.current = false;
      dispatch({ type: 'SET_CONNECTION_STATUS', payload: 'disconnected' });
      
      // Only attempt reconnection for unexpected closures
      if (shouldReconnect.current && event.code !== 1000) {
        scheduleReconnect();
      }
    };

    newWs.onerror = (error) => {
      console.error('WebSocket error:', error);
      isConnecting.current = false;
    };

  }, [userId, cleanup, scheduleReconnect]);

  // Request notification permissions
  useEffect(() => {
    if ('Notification' in window && Notification.permission === 'default') {
      Notification.requestPermission().catch(console.error);
    }
  }, []);

  // Handle network status changes
  useEffect(() => {
    const handleOnline = () => {
      console.log('Network came back online');
      if (state.connectionStatus === 'disconnected' && shouldReconnect.current) {
        reconnectAttempts.current = 0;
        connect();
      }
    };

    const handleOffline = () => {
      console.log('Network went offline');
      cleanup();
    };

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);
    
    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, [connect, cleanup, state.connectionStatus]);

  // Main connection effect
  useEffect(() => {
    if (userId) {
      shouldReconnect.current = true;
      connect();
    }

    return () => {
      console.log('NotificationProvider unmounting, cleaning up...');
      shouldReconnect.current = false;
      cleanup();
    };
  }, [userId, connect, cleanup]);

  const sendNotification = useCallback((receiverId, message, notificationType, consultationId = null) => {
    if (wsRef.current?.readyState === WebSocket.OPEN) {
      try {
        const payload = {
          type: 'notification',
          receiver_id: receiverId,
          message,
          notification_type: notificationType,
          timestamp: new Date().toISOString()
        };
        
        if (consultationId) {
          payload.consultation_id = consultationId;
        }
        
        wsRef.current.send(JSON.stringify(payload));
        console.log('Notification sent:', payload);
        return true;
      } catch (error) {
        console.error('Error sending notification:', error);
        return false;
      }
    } else {
      console.warn('Cannot send notification: WebSocket not connected');
      return false;
    }
  }, []);

  // Other methods remain the same as your original
  const markAsRead = useCallback((notificationId) => {
    dispatch({ type: 'MARK_AS_READ', payload: notificationId });
  }, []);

  const markAllAsRead = useCallback(() => {
    dispatch({ type: 'MARK_ALL_AS_READ' });
  }, []);

  const removeNotification = useCallback((notificationId) => {
    dispatch({ type: 'REMOVE_NOTIFICATION', payload: notificationId });
  }, []);

  const clearAllNotifications = useCallback(() => {
    dispatch({ type: 'CLEAR_NOTIFICATIONS' });
  }, []);

  const setNotifications = useCallback((notifications) => {
    dispatch({ type: 'SET_NOTIFICATIONS', payload: notifications });
  }, []);

  const value = {
    ...state,
    sendNotification,
    markAsRead,
    markAllAsRead,
    removeNotification,
    clearAllNotifications,
    setNotifications
  };

  return (
    <NotificationContext.Provider value={value}>
      {children}
    </NotificationContext.Provider>
  );
};

export const useNotifications = () => {
  const context = useContext(NotificationContext);
  if (!context) {
    throw new Error('useNotifications must be used within a NotificationProvider');
  }
  return context;
};