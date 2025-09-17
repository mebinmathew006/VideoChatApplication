// components/DoctorChat.js
import React, { useEffect, useState } from "react";
import { MessageCircle } from "lucide-react";
import { useSelector } from "react-redux";
import { useNavigate } from "react-router-dom";
import { useChat } from "../../hooks/useChat";
import ChatSidebar from "../../components/chat/ChatSidebar";
import ChatHeader from "../../components/chat/ChatHeader";
import MessagesArea from "../../components/chat/MessagesArea";
import MessageInput from "../../components/chat/MessageInput";

export default function UserChat() {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const userId = useSelector((state) => state.userDetails.id);
  const navigate = useNavigate();

  const {
    activeChat,
    activeUser,
    newMessage,
    setNewMessage,
    messages,
    users,
    isOnline,
    isConnected,
    connectionStatus,
    isLoadingMessages,
    isTyping,
    messagesEndRef,
    handleSendMessage,
    handleUserSelect,
  } = useChat(userId, 'user');

  const handleExit = () => {
    navigate(-1);
  };




  return (
    <div className="flex h-screen bg-gradient-to-br from-blue-50 to-green-50">
      {/* Sidebar */}
      <ChatSidebar
        sidebarOpen={sidebarOpen}
        setSidebarOpen={setSidebarOpen}
        users={users}
        activeChat={activeChat}
        handleUserSelect={handleUserSelect}
        connectionStatus={connectionStatus}
        isConnected={isConnected}
        onExit={handleExit}
        userType="user"
      />

      {/* Overlay for mobile */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 bg-black bg-opacity-50 z-40 lg:hidden"
          onClick={() => setSidebarOpen(false)}
        ></div>
      )}

      {/* Main Chat Area */}
      <div className="flex-1 flex flex-col">
        {/* Chat Header */}
        <ChatHeader
          activeUser={activeUser}
          isOnline={isOnline}
          setSidebarOpen={setSidebarOpen}
          handleSendMessage={handleSendMessage}
          setNewMessage={setNewMessage}
          userType="user"
        />

        {/* Messages Area */}
        {activeChat ? (
          <>
            <MessagesArea
              messages={messages}
              activeUser={activeUser}
              isLoadingMessages={isLoadingMessages}
              isTyping={isTyping}
              messagesEndRef={messagesEndRef}
              userType="user"
              currentUserId={userId}
            />

            {/* Message Input */}
            <MessageInput
              newMessage={newMessage}
              setNewMessage={setNewMessage}
              handleSendMessage={handleSendMessage}
              isConnected={isConnected}
              activeChat= {activeChat}
            />
          </>
        ) : (
          <div className="flex-1 flex items-center justify-center">
            <div className="text-center">
              <MessageCircle className="w-16 h-16 text-gray-400 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-gray-900 mb-2">
                Select a conversation
              </h3>
              <p className="text-gray-500">
                Choose a user to start messaging
              </p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}