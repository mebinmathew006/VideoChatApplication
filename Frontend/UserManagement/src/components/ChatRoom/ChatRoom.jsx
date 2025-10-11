import { useLocation, useNavigate } from "react-router-dom";
import ChatHeader from "../chat/ChatHeader";
import MessagesContainer from "../chat/MessagesContainer";
import InputArea from "../chat/InputArea";
import { Film, Image, FileText } from "lucide-react";
import React, { useEffect, useRef, useState } from "react";
import { useDispatch, useSelector } from "react-redux";
import MediaPreview from "../chat/MediaPreview";
import { updateAccessToken } from "../../store/UserDetailsSlice";
import axios from "axios";

export default function ChatRoom() {
  const navigate = useNavigate();
  const location = useLocation();
  const dispatch = useDispatch()
  const { roomId, roomName } = location.state || {};
  const username = useSelector((state) => state.userDetails.name);
  const token = useSelector((state) => state.userDetails.access_token);
  const baseurl = import.meta.env.VITE_BASE_URL;
  const wsBaseurl = import.meta.env.VITE_BASE_URL_WS;

  const [messages, setMessages] = useState([]);
  const [inputMessage, setInputMessage] = useState("");
  const [isConnected, setIsConnected] = useState(false);
  const [selectedFiles, setSelectedFiles] = useState([]);
  const [previewUrls, setPreviewUrls] = useState([]);
  const [tokenExpired, setTokenExpired] = useState(false);

  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const [hasMore, setHasMore] = useState(true);
  const [totalMessages, setTotalMessages] = useState(0);
  const [messageOffset, setMessageOffset] = useState(0);
  
  const wsRef = useRef(null);
  const messagesEndRef = useRef(null);
  const fileInputRef = useRef(null);
  const accessTokenRef = useRef(token);

  useEffect(() => {
    accessTokenRef.current = token;
  }, [token]);



  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

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

    // Check token every 30 seconds
    const tokenCheckInterval = setInterval(checkTokenExpiry, 30000);
    
    // Initial check
    checkTokenExpiry();

    return () => clearInterval(tokenCheckInterval);
  }, []);

  const connectWebSocket = () => {
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
            // Update token ref with new token
            accessTokenRef.current = data.access_token;
            console.log("Token refreshed successfully via WebSocket");
            setTokenExpired(false);
          } else if (data.type === "token_error" || data.type === "auth_error") {
            console.error("Token error:", data.message);
            setTokenExpired(true);
            // Try to refresh via API if WebSocket refresh failed
            refreshTokenViaAPI();
          } else if (data.type === "connection_established") {
            console.log("WebSocket connection established");
          } else if (data.type === "user_join" || data.type === "user_leave") {
            // Handle user join/leave notifications
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
        
        // If closed due to authentication error, try to refresh
        if (event.code === 4001 || event.code === 4000) {
          setTokenExpired(true);
          refreshTokenViaAPI();
        }
      };

      wsRef.current = ws;
    } catch (error) {
      console.error("WebSocket connection error:", error);
    }
  };

  // Refresh token via HTTP API (more reliable)
  const refreshTokenViaAPI = async () => {
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
      navigate('/');
    }
  };

  // Refresh token via WebSocket (alternative method)
  const refreshTokenViaWebSocket = () => {
    if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
      wsRef.current.send(
        JSON.stringify({
          type: "refresh_token",
        })
      );
    } else {
      // Fallback to API refresh
      refreshTokenViaAPI();
    }
  };

  useEffect(() => {
    if (roomId) {
      connectWebSocket();
    } else {
      console.error("No roomId provided");
      navigate(-1);
    }

    return () => {
      // Cleanup preview URLs
      previewUrls.forEach((url) => {
        if (url) URL.revokeObjectURL(url);
      });
      
      // Close WebSocket connection
      if (wsRef.current) {
        wsRef.current.close();
      }
    };
  }, [roomId]);

  const formatMessages = (msgs) => {
    return msgs.map((msg) => ({
      id: msg.id,
      username: msg.sender_name,
      message: msg.message,
      media: msg.media || [],
      sender_id: msg.sender_id,
      timestamp: new Date(msg.created_at).toLocaleTimeString(),
    }));
  };

  const handleLoadMore = () => {
    if (isLoadingMore || !hasMore || !isConnected) return;

    setIsLoadingMore(true);
    wsRef.current?.send(
      JSON.stringify({
        type: "fetch_messages",
        limit: 20,
        offset: messageOffset,
      })
    );
  };

  const handleFileSelect = (e) => {
    const files = Array.from(e.target.files);
    setSelectedFiles((prev) => [...prev, ...files]);

    const newPreviewUrls = files.map((file) => {
      if (file.type.startsWith("image/") || file.type.startsWith("video/")) {
        return URL.createObjectURL(file);
      }
      return null;
    });

    setPreviewUrls((prev) => [...prev, ...newPreviewUrls]);
  };

  const removeFile = (index) => {
    setSelectedFiles((prev) => prev.filter((_, i) => i !== index));
    if (previewUrls[index]) {
      URL.revokeObjectURL(previewUrls[index]);
    }
    setPreviewUrls((prev) => prev.filter((_, i) => i !== index));
  };

  const fileToBase64 = (file) => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.readAsDataURL(file);
      reader.onload = () => resolve(reader.result);
      reader.onerror = (error) => reject(error);
    });
  };

  const sendMessage = async () => {
    if (
      (!inputMessage.trim() && selectedFiles.length === 0) ||
      !wsRef.current ||
      wsRef.current.readyState !== WebSocket.OPEN
    ) {
      return;
    }

    const message = {
      type: "message",
      message: inputMessage,
      username: username || "Anonymous",
      media: [],
    };

    if (selectedFiles.length > 0) {
      for (const file of selectedFiles) {
        try {
          const base64 = await fileToBase64(file);
          message.media.push({
            name: file.name,
            type: file.type,
            size: file.size,
            data: base64,
          });
        } catch (error) {
          console.error("Error converting file:", error);
        }
      }
    }

    console.log("Sending message:", message);
    wsRef.current.send(JSON.stringify(message));
    setInputMessage("");
    setSelectedFiles([]);
    previewUrls.forEach((url) => url && URL.revokeObjectURL(url));
    setPreviewUrls([]);
  };

  const handleKeyPress = (e) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  };

  const leaveRoom = () => {
    if (wsRef.current) {
      wsRef.current.close();
      wsRef.current = null;
    }
    setIsConnected(false);
    setMessages([]);
    setSelectedFiles([]);
    previewUrls.forEach((url) => url && URL.revokeObjectURL(url));
    setPreviewUrls([]);
    navigate(-1);
  };

  const getFileIcon = (fileType) => {
    if (fileType.startsWith("image/")) return <Image className="w-4 h-4" />;
    if (fileType.startsWith("video/")) return <Film className="w-4 h-4" />;
    return <FileText className="w-4 h-4" />;
  };

  const formatFileSize = (bytes) => {
    if (bytes < 1024) return bytes + " B";
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + " KB";
    return (bytes / (1024 * 1024)).toFixed(1) + " MB";
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 p-4">
      <div className="max-w-4xl mx-auto h-screen flex flex-col py-4">
        {/* Connection Status Indicators */}
        {tokenExpired && (
          <div className="bg-yellow-100 border border-yellow-400 text-yellow-700 px-4 py-3 rounded mb-4 flex items-center justify-between">
            <p>Token expired. Refreshing...</p>
            <button 
              onClick={refreshTokenViaAPI}
              className="bg-yellow-500 hover:bg-yellow-600 text-white px-3 py-1 rounded text-sm"
            >
              Retry
            </button>
          </div>
        )}

        {!isConnected && !tokenExpired && (
          <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-4">
            <p>Disconnected from chat. Reconnecting...</p>
          </div>
        )}

        <ChatHeader
          roomId={roomId}
          roomName={roomName}
          isConnected={isConnected}
          onLeave={leaveRoom}
          messageCount={totalMessages}
        />

        <MessagesContainer
          messages={messages}
          username={username}
          messagesEndRef={messagesEndRef}
          getFileIcon={getFileIcon}
          formatFileSize={formatFileSize}
          MediaPreview={MediaPreview}
          isLoadingMore={isLoadingMore}
          hasMore={hasMore}
          onLoadMore={handleLoadMore}
        />

        <InputArea
          selectedFiles={selectedFiles}
          previewUrls={previewUrls}
          inputMessage={inputMessage}
          isConnected={isConnected}
          onInputChange={setInputMessage}
          onKeyPress={handleKeyPress}
          onFileSelect={handleFileSelect}
          onRemoveFile={removeFile}
          onSendMessage={sendMessage}
          fileInputRef={fileInputRef}
          getFileIcon={getFileIcon}
          formatFileSize={formatFileSize}
        />
      </div>
    </div>
  );
}