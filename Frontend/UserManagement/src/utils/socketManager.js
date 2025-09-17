import { socketConnected, socketConnecting, socketDisconnected, socketError } from "../store/socketSlice";

let activeSocket = null;
let reconnectAttempts = 0;
const MAX_RECONNECT_ATTEMPTS = 5;
const eventListeners = new Set();
const messageQueue = []; // Add this if it was missing

export const connectWebSocket = (userId) => async (dispatch) => {
  console.log('inside the socket ...................')
  
  // Clean up existing connection
  if (activeSocket) {
    activeSocket.close();
  }

  const url = `ws://localhost/consultations/ws/chat_and_notification/${userId}`;
  dispatch(socketConnecting({ url }));
  
  activeSocket = new WebSocket(url);

  activeSocket.onopen = () => {
    reconnectAttempts = 0;
    dispatch(socketConnected({
      url: activeSocket.url,
      readyState: activeSocket.readyState
    }));
    
    // Send any queued messages
    while (messageQueue.length > 0) {
      const message = messageQueue.shift();
      activeSocket.send(JSON.stringify(message));
    }
  };

  activeSocket.onmessage = (event) => {
    eventListeners.forEach(cb => cb(event));
  };

  activeSocket.onerror = (error) => {
    console.error("WebSocket error:", error);
    dispatch(socketError(error.message || 'WebSocket error'));
    if (!activeSocket || activeSocket.readyState === WebSocket.CLOSED) {
      attemptReconnect(userId, dispatch);
    }
  };

  activeSocket.onclose = () => {
    if (reconnectAttempts < MAX_RECONNECT_ATTEMPTS) {
      attemptReconnect(userId, dispatch);
    } else {
      dispatch(socketDisconnected());
    }
  };

  return activeSocket;
};

export const getActiveSocket = () => activeSocket;

const attemptReconnect = (userId, dispatch) => {
  reconnectAttempts++;
  setTimeout(() => connectWebSocket(userId)(dispatch), 
    Math.min(1000 * reconnectAttempts, 5000)); // Exponential backoff max 5s
};

export const addSocketListener = (callback) => {
  eventListeners.add(callback);
  return () => eventListeners.delete(callback);
};

export const sendSocketMessage = (message) => {
  const socket = getActiveSocket();
  if (socket?.readyState === WebSocket.OPEN) {
    socket.send(JSON.stringify(message));
  } else {
    messageQueue.push(message);
  }
};

// Helper to check if socket is connected
export const isSocketConnected = () => {
  return activeSocket?.readyState === WebSocket.OPEN;
};