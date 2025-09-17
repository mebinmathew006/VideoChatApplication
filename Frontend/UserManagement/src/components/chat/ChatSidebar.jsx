// components/chat/ChatSidebar.js
import React from 'react';
import { Search, X, LogOut } from 'lucide-react';
import UserListItem from './UserListItem';

const ChatSidebar = ({
  sidebarOpen,
  setSidebarOpen,
  users,
  activeChat,
  handleUserSelect,
  connectionStatus,
  isConnected,
  onExit,
  userType,
}) => {
  const formatTime = (dateString) => {
    if (!dateString) return "";
    const date = new Date(dateString);
    const now = new Date();
    const diffInHours = (now - date) / (1000 * 60 * 60);

    if (diffInHours < 24) {
      return date.toLocaleTimeString([], {
        hour: "2-digit",
        minute: "2-digit",
      });
    } else if (diffInHours < 48) {
      return "Yesterday";
    } else {
      return date.toLocaleDateString([], { month: "short", day: "numeric" });
    }
  };

  return (
    <div
      className={`${
        sidebarOpen ? "translate-x-0" : "-translate-x-full"
      } fixed inset-y-0 left-0 z-10 w-80 bg-gradient-to-br  from-blue-50  to-green-50 border-r border-gray-200 transform transition-transform duration-300 ease-in-out lg:translate-x-0 lg:static lg:inset-0`}
    >
      <div className="flex flex-col h-full">
        {/* Sidebar Header */}
        <div className="p-4 border-b border-gray-200">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-semibold text-gray-900">Messages</h2>
            <button
              className="flex items-center space-x-3 px-4 py-3 text-red-600 hover:bg-red-50 rounded-lg transition-colors"
              onClick={onExit}
            >
              <LogOut className="w-5 h-5" />
              <span className="font-medium">Exit</span>
            </button>

            <button
              onClick={() => setSidebarOpen(false)}
              className="lg:hidden p-2 hover:bg-gray-100 rounded-full"
            >
              <X className="w-5 h-5 text-gray-600" />
            </button>
          </div>
          <div className="mt-2">
            <span
              className={`text-sm ${
                isConnected ? "text-green-500" : "text-red-500"
              }`}
            >
              {connectionStatus}
            </span>
          </div>
        </div>

        {/* Search */}
        <div className="p-4">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input
              type="text"
              placeholder="Search conversations..."
              className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent"
            />
          </div>
        </div>

        {/* Users List */}
        {users.length > 0 && (
          <div className="flex-1 overflow-y-auto">
            {users.map((user) => (
              <UserListItem
                key={user.id}
                user={user}
                activeChat={activeChat}
                handleUserSelect={handleUserSelect}
                formatTime={formatTime}
                userType={userType}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default ChatSidebar;