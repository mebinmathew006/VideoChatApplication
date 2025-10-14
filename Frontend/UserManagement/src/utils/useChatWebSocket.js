import { useEffect, useRef, useState, useCallback } from "react";
import { useDispatch } from "react-redux";
import axios from "axios";
import { updateAccessToken } from "../store/UserDetailsSlice";

export const useChatWebSocket = (roomId, token, initialUsername) => {
  const dispatch = useDispatch();
  
  const [messages, setMessages] = useState([]);
  const [isConnected, setIsConnected] = useState(false);
  const [tokenExpired, setTokenExpired] = useState(false);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const [hasMore, setHasMore] = useState(true);
  const [totalMessages, setTotalMessages] = useState(0);
  const [messageOffset, setMessageOffset] = useState(0);

  const wsRef = useRef(null);
  const accessTokenRef = useRef(token);
  
  const baseurl = import.meta.env.VITE_BASE_URL;
  const wsBaseurl = import.meta.env.VITE_BASE_URL_WS;

  useEffect(() => {
    accessTokenRef.current = token;
  }, [token]);

  const formatMessages = useCallback((msgs) => {
    return msgs.map((msg) => ({
      id: msg.id,
      username: msg.sender_name,
      message: msg.message,
      media: msg.media || [],
      sender_id: msg.sender_id,
      timestamp: new Date(msg.created_at).toLocaleTimeString(),
    }));
  }, []);

  const refreshTokenViaAPI = useCallback(async () => {
    try {
      const response = await axios.post(
        `${baseurl}/v1/auth/refresh`,
        {},
        { withCredentials: true }
      );
      
      const newAccessToken = response.data?.access_token;
      
      if (!newAccessToken) {
        throw new Error("Missing access token in refresh response");
      }
      
      accessTokenRef.current = newAccessToken;
      dispatch(updateAccessToken(newAccessToken));
      console.log('Token refreshed successfully via API');
      setTokenExpired(false);
      
      // Reconnect WebSocket with new token
      if (wsRef.current) {
        wsRef.current.close();
      }
      setTimeout(() => connectWebSocket(), 1000);
      
    } catch (error) {
      console.error('Token refresh error via API:', error);
      throw error;
    }
  }, [dispatch, baseurl]);

  const refreshTokenViaWebSocket = useCallback(() => {
    if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
      wsRef.current.send(
        JSON.stringify({
          type: "refresh_token",
        })
      );
    } else {
      refreshTokenViaAPI();
    }
  }, [refreshTokenViaAPI]);

  const connectWebSocket = useCallback(() => {
    const token = accessTokenRef.current;
    if (!token) {
      console.error("No token available for WebSocket connection");
      return;
    }

    const wsUrl = `${wsBaseurl}/ws/chat/${roomId}/?token=${token}`;

    try {
      const ws = new WebSocket(wsUrl);
      ws.onopen = () => {
        console.log("WebSocket Connected");
        setIsConnected(true);
        setTokenExpired(false);
      };
      ws.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data);
          console.log("Message received:", data);

          if (data.type === "message_history") {
            const formattedMessages = formatMessages(data.messages);
            setMessages((prev) =>
              data.offset === 0
                ? formattedMessages
                : [...formattedMessages, ...prev]
            );
            setTotalMessages(data.total);
            setHasMore(data.has_more);
            setMessageOffset(data.offset + data.messages.length);
            setIsLoadingMore(false);
          } else if (data.type === "chat_message") {
            setMessages((prev) => [
              ...prev,
              {
                id: data.id,
                username: data.username,
                message: data.message,
                media: data.media || [],
                sender_id: data.sender_id,
                timestamp: new Date(data.timestamp).toLocaleTimeString(),
              },
            ]);
          } else if (data.type === "token_refreshed") {
            accessTokenRef.current = data.access_token;
            console.log("Token refreshed successfully via WebSocket");
            setTokenExpired(false);
          } else if (data.type === "token_error" || data.type === "auth_error") {
            console.error("Token error:", data.message);
            setTokenExpired(true);
            refreshTokenViaAPI();
          } else if (data.type === "connection_established") {
            console.log("WebSocket connection established");
          } else if (data.type === "user_join" || data.type === "user_leave") {
            console.log(data.message);
          }
        } catch (error) {
          console.error("Error parsing message:", error);
        }
      };

      ws.onerror = (error) => {
        console.error("WebSocket error:", error);
        setIsConnected(false);
      };

      ws.onclose = (event) => {
        console.log("WebSocket Disconnected", event.code, event.reason);
        setIsConnected(false);
        
        if (event.code === 4001 || event.code === 4000) {
          setTokenExpired(true);
          refreshTokenViaAPI();
        }
      };

      wsRef.current = ws;
    } catch (error) {
      console.error("WebSocket connection error:", error);
    }
  }, [roomId, wsBaseurl, formatMessages, refreshTokenViaAPI]);

  // Token expiration checker
  useEffect(() => {
    const checkTokenExpiry = () => {
      const token = accessTokenRef.current;
      if (!token) return;

      try {
        const payload = JSON.parse(atob(token.split('.')[1]));
        const expiresAt = payload.exp * 1000; 
        const timeUntilExpiry = expiresAt - Date.now();
        if (timeUntilExpiry < 2 * 60 * 1000) {
          console.log('Token expiring soon, refreshing...');
          refreshTokenViaAPI();
        }
      } catch (error) {
        console.error('Error checking token expiry:', error);
      }
    };

    const tokenCheckInterval = setInterval(checkTokenExpiry, 30000);
    checkTokenExpiry();

    return () => clearInterval(tokenCheckInterval);
  }, [refreshTokenViaAPI]);

  // Connect/Disconnect WebSocket
  useEffect(() => {
    if (roomId) {
      connectWebSocket();
    } else {
      console.error("No roomId provided");
    }

    return () => {
      if (wsRef.current) {
        wsRef.current.close();
      }
    };
  }, [roomId, connectWebSocket]);

  const sendMessage = useCallback((messageData) => {
    if (
      !wsRef.current ||
      wsRef.current.readyState !== WebSocket.OPEN
    ) {
      console.error("WebSocket is not connected");
      return false;
    }

    wsRef.current.send(JSON.stringify(messageData));
    return true;
  }, []);

  const loadMoreMessages = useCallback(() => {
    if (isLoadingMore || !hasMore || !isConnected) return;

    setIsLoadingMore(true);
    wsRef.current?.send(
      JSON.stringify({
        type: "fetch_messages",
        limit: 20,
        offset: messageOffset,
      })
    );
  }, [isLoadingMore, hasMore, isConnected, messageOffset]);

  const disconnect = useCallback(() => {
    if (wsRef.current) {
      wsRef.current.close();
      wsRef.current = null;
    }
    setIsConnected(false);
    setMessages([]);
  }, []);

  return {
    messages,
    setMessages,
    isConnected,
    tokenExpired,
    isLoadingMore,
    hasMore,
    totalMessages,
    sendMessage,
    loadMoreMessages,
    disconnect,
    refreshTokenViaAPI,
    refreshTokenViaWebSocket,
  };
};