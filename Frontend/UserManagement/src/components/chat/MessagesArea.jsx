// components/chat/MessagesArea.js
import React, { useMemo, useEffect } from 'react';
import MessageBubble from './MessageBubble';

const MessagesArea = ({ 
  messages, 
  activeUser, 
  isLoadingMessages, 
  isTyping, 
  messagesEndRef,
  userType = 'doctor',
  currentUserId
}) => {
  const formatMessageTime = (dateString) => {
    if (!dateString) return "";
    const date = new Date(dateString);
    return date.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
  };

  // Debug: Log messages when they change
  useEffect(() => {
    console.log("[MESSAGES AREA] Messages updated:", messages);
  }, [messages]);

  const renderedMessages = useMemo(() => {
    console.log("[MESSAGES AREA] Rendering messages:", messages.length);
    
    if (!messages || messages.length === 0) {
      return [];
    }

    return messages.map((message, index) => {
      const isCurrentUser = message.sender === userType;
      const senderName = isCurrentUser ? "You" : 
        (userType === 'doctor' ? 
          activeUser?.user?.name || activeUser?.user_name : 
          activeUser?.user?.name 
        ) || "User";

      console.log("[MESSAGES AREA] Rendering message:", {
        index,
        id: message.id,
        message: message.message,
        sender: message.sender,
        isCurrentUser,
        senderName
      });

      return (
        <MessageBubble
          key={message.id || `${message.sender_id}-${message.created_at}-${index}`}
          message={message}
          isCurrentUser={isCurrentUser}
          senderName={senderName}
          activeUser={activeUser}
          userType={userType}
          formatMessageTime={formatMessageTime}
        />
      );
    });
  }, [messages, activeUser, userType]);

  if (isLoadingMessages) {
    return (
      <div className="flex-1 overflow-y-auto p-4 space-y-4 bg-gradient-to-br from-blue-50 to-green-50">
        <div className="flex justify-center items-center h-32">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-green-500"></div>
          <span className="ml-2 text-gray-500">Loading messages...</span>
        </div>
      </div>
    );
  }

  return (
    <div className="flex-1 overflow-y-auto p-4 space-y-4 bg-gradient-to-br  from-blue-50  to-green-50">
      {/* Show message count for debugging */}
      {process.env.NODE_ENV === 'development' && (
        <div className="text-xs text-gray-400 text-center">
          {messages.length} message{messages.length !== 1 ? 's' : ''}
        </div>
      )}

      {/* No messages state */}
      {messages.length === 0 && !isLoadingMessages && (
        <div className=" flex justify-center items-center h-32">
          <div className="text-center text-gray-500">
            <p>No messages yet</p>
            <p className="text-sm">Start the conversation!</p>
          </div>
        </div>
      )}

      {/* Render messages */}
      {renderedMessages}

      {/* Typing indicator */}
      {isTyping && (
        <div className="flex justify-start">
          <div className="flex items-end space-x-2 max-w-xs">
            <img
              src={
                activeUser?.user?.user_profile?.profile_image ||
                activeUser?.user?.profile_image ||
                activeUser?.doctor?.profile_image ||
                "/powerpoint-template-icons-b.jpg"
              }
              alt="Avatar"
              className="w-8 h-8 rounded-full"
            />
            <div className="bg-gradient-to-br  from-blue-50  to-green-50 px-4 py-2 rounded-2xl rounded-bl-sm shadow-sm border border-gray-200">
              <div className="flex space-x-1">
                <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce"></div>
                <div
                  className="w-2 h-2 bg-gray-400 rounded-full animate-bounce"
                  style={{ animationDelay: "0.1s" }}
                ></div>
                <div
                  className="w-2 h-2 bg-gray-400 rounded-full animate-bounce"
                  style={{ animationDelay: "0.2s" }}
                ></div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Scroll anchor */}
      <div ref={messagesEndRef} />
    </div>
  );
};

export default MessagesArea;