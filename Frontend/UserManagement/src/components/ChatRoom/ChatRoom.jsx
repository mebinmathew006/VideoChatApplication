import { useLocation, useNavigate } from "react-router-dom";
import ChatHeader from "../chat/ChatHeader";
import MessagesContainer from "../chat/MessagesContainer";
import InputArea from "../chat/InputArea";
import { Film, Image, FileText } from "lucide-react";
import React, { useEffect, useRef, useState } from "react";
import { useSelector } from "react-redux";
import MediaPreview from "../chat/MediaPreview";
import { useChatWebSocket } from "../../utils/useChatWebSocket";

export default function ChatRoom() {
  const navigate = useNavigate();
  const location = useLocation();
  const { roomId, roomName } = location.state || {};
  const username = useSelector((state) => state.userDetails.name);
  const token = useSelector((state) => state.userDetails.access_token);

  const {
    messages,
    isConnected,
    tokenExpired,
    isLoadingMore,
    hasMore,
    totalMessages,
    sendMessage,
    loadMoreMessages,
    disconnect,
    refreshTokenViaAPI,
  } = useChatWebSocket(roomId, token, username);

  const [inputMessage, setInputMessage] = useState("");
  const [selectedFiles, setSelectedFiles] = useState([]);
  const [previewUrls, setPreviewUrls] = useState([]);

  const messagesEndRef = useRef(null);
  const fileInputRef = useRef(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

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

  const handleSendMessage = async () => {
    if (
      (!inputMessage.trim() && selectedFiles.length === 0) ||
      !isConnected
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
    const success = sendMessage(message);
    
    if (success) {
      setInputMessage("");
      setSelectedFiles([]);
      previewUrls.forEach((url) => url && URL.revokeObjectURL(url));
      setPreviewUrls([]);
    }
  };

  const handleKeyPress = (e) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  const handleLeaveRoom = () => {
    disconnect();
    setInputMessage("");
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
          onLeave={handleLeaveRoom}
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
          onLoadMore={loadMoreMessages}
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
          onSendMessage={handleSendMessage}
          fileInputRef={fileInputRef}
          getFileIcon={getFileIcon}
          formatFileSize={formatFileSize}
        />
      </div>
    </div>
  );
}