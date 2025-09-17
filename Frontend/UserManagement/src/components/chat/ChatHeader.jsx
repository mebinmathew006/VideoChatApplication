// components/chat/ChatHeader.js
import React, { useState, useEffect } from "react";
import { Menu, Video, Bell, X } from "lucide-react";
import { useNotifications } from "../../utils/NotificationContext";
import { useNotificationSound } from "../../utils/useNotificationSound";
import { useNavigate } from "react-router-dom";
import { toast } from "react-toastify";

const ChatHeader = ({
  activeUser,
  isOnline,
  setSidebarOpen,
  userType,
  handleSendMessage,
  setNewMessage,
}) => {
  const [showNotificationPanel, setShowNotificationPanel] = useState(false);
  const [notificationFilter, setNotificationFilter] = useState("all"); // all, unread, read
  const navigate = useNavigate();
  const [videoCallRequested, setVideoCallRequested] = useState(false);

  useEffect(() => {
    if (videoCallRequested) {
      handleSendMessage();
      setVideoCallRequested(false);
    }
  }, [videoCallRequested, handleSendMessage]);
  // Show different user info based on chat type
  const displayUser =
    userType === "doctor" ? activeUser?.user : activeUser?.user;

  // Get notification state and functions
  const {
    notifications,
    unreadCount,
    connectionStatus,
    markAsRead,
    markAllAsRead,
    removeNotification,
    sendNotification,
  } = useNotifications();

  // Enable notification sound
  useNotificationSound();

  // Filter notifications for the notification panel
  const filteredNotifications = notifications
    .filter((notification) => {
      const matchesFilter =
        notificationFilter === "all" ||
        (notificationFilter === "unread" && !notification.read) ||
        (notificationFilter === "read" && notification.read);
      return matchesFilter;
    })
    .slice(0, 5); // Show only latest 5 notifications

  const handleVideoCall = () => {
    sendNotification(
      activeUser,
      "User wants to connect with you",
      "videocall"
    );
    setNewMessage("requested for a video call");
    setVideoCallRequested(true);
    toast.success('Wait for the Doctor Replay',{position:'bottom-center'})
  };

  const formatTime = (timestamp) => {
    const date = new Date(timestamp);
    const now = new Date();
    const diff = now - date;

    if (diff < 60000) return "Just now";
    if (diff < 3600000) return `${Math.floor(diff / 60000)}m ago`;
    if (diff < 86400000) return `${Math.floor(diff / 3600000)}h ago`;
    if (diff < 604800000) return `${Math.floor(diff / 86400000)}d ago`;
    return date.toLocaleDateString();
  };

  const getNotificationIcon = (type) => {
    switch (type) {
      case "message":
        return "💬";
      case "appointment":
        return "📅";
      case "reminder":
        return "⏰";
      case "videocall":
        return "📹";
      case "system":
        return "🔔";
      default:
        return "🔔";
    }
  };

  // Handle consultation navigation
  const handleConsultationNavigation = (consultationId,notificationId) => {
    removeNotification(notificationId)
    setShowNotificationPanel(false); // Close notification panel
    navigate(`/videocall_doctor`, {
      state: {
        consultationId: consultationId,
      },
    });
  };

  // Close notification panel when clicking outside
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (
        showNotificationPanel &&
        !event.target.closest(".notification-panel")
      ) {
        setShowNotificationPanel(false);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [showNotificationPanel]);

  return (
    <div className="bg-gradient-to-br  from-blue-50  to-green-50 border-b border-gray-200 px-4 py-3 flex items-center justify-between shadow-sm relative">
      <div className="flex items-center space-x-3">
        <button
          onClick={() => setSidebarOpen(true)}
          className="lg:hidden p-2 hover:bg-gray-100 rounded-full"
        >
          <Menu className="w-5 h-5 text-gray-600" />
        </button>
        {activeUser && (
          <>
            <div className="relative">
              <img
                src={
                  displayUser?.user_profile?.profile_image ||
                  displayUser?.profile_image ||
                  "/powerpoint-template-icons-b.jpg"
                }
                alt={displayUser?.name}
                className="w-10 h-10 rounded-full"
              />
              {activeUser.online && (
                <div className="absolute bottom-0 right-0 w-3 h-3 bg-green-500 border-2 border-white rounded-full"></div>
              )}
            </div>
            <div className="flex-1">
              <h1 className="font-semibold text-gray-900">
                {displayUser?.name}
              </h1>
              <p
                className={`text-sm ${
                  activeUser.online ? "text-green-500" : "text-gray-500"
                }`}
              >
                {isOnline ? "Online" : "Offline"}
              </p>
            </div>
          </>
        )}
      </div>

      <div className="flex items-center space-x-2">
        {/* Notification Bell */}
        <div className="relative notification-panel">
          <button
            onClick={() => setShowNotificationPanel(!showNotificationPanel)}
            className="relative p-2 hover:bg-gray-100 rounded-full transition-colors"
          >
            <Bell className="w-5 h-5 text-gray-600" />
            {unreadCount > 0 && (
              <span className="absolute -top-1 -right-1 bg-red-500 text-white text-xs rounded-full h-5 w-5 flex items-center justify-center font-medium">
                {unreadCount > 99 ? "99+" : unreadCount}
              </span>
            )}
          </button>

          {/* Notification Panel */}
          {showNotificationPanel && (
            <div className="absolute right-0 top-full mt-2 w-80 bg-white rounded-lg shadow-lg border border-gray-200 z-50 max-h-96 overflow-hidden">
              {/* Panel Header */}
              <div className="px-4 py-3 border-b border-gray-100">
                <div className="flex items-center justify-between">
                  <h3 className="font-semibold text-gray-900">Notifications</h3>
                  <div className="flex items-center space-x-2">
                    {/* Connection Status */}
                    <div className="flex items-center space-x-1">
                      <div
                        className={`w-2 h-2 rounded-full ${
                          connectionStatus === "connected"
                            ? "bg-green-500"
                            : connectionStatus === "connecting"
                            ? "bg-yellow-500"
                            : "bg-red-500"
                        }`}
                      />
                      <span className="text-xs text-gray-500 capitalize">
                        {connectionStatus}
                      </span>
                    </div>
                    <button
                      onClick={() => setShowNotificationPanel(false)}
                      className="p-1 hover:bg-gray-100 rounded"
                    >
                      <X className="w-4 h-4 text-gray-500" />
                    </button>
                  </div>
                </div>

                {/* Filter Buttons */}
                <div className="flex bg-gray-100 rounded-lg p-1 mt-2">
                  {["all", "unread", "read"].map((filterType) => (
                    <button
                      key={filterType}
                      onClick={() => setNotificationFilter(filterType)}
                      className={`px-2 py-1 rounded-md text-xs font-medium transition-colors flex-1 ${
                        notificationFilter === filterType
                          ? "bg-white text-green-600 shadow-sm"
                          : "text-gray-600 hover:text-gray-900"
                      }`}
                    >
                      {filterType.charAt(0).toUpperCase() + filterType.slice(1)}
                      {filterType === "unread" && unreadCount > 0 && (
                        <span className="ml-1 bg-red-500 text-white text-xs px-1 rounded-full">
                          {unreadCount}
                        </span>
                      )}
                    </button>
                  ))}
                </div>

                {/* Mark All Read Button */}
                {unreadCount > 0 && (
                  <button
                    onClick={markAllAsRead}
                    className="w-full mt-2 px-3 py-1 bg-green-600 text-white text-xs rounded-md hover:bg-green-700 transition-colors"
                  >
                    Mark all as read
                  </button>
                )}
              </div>

              {/* Notifications List */}
              <div className="max-h-64 overflow-y-auto">
                {filteredNotifications.length === 0 ? (
                  <div className="p-4 text-center text-gray-500">
                    <Bell className="w-8 h-8 text-gray-300 mx-auto mb-2" />
                    <p className="text-sm">
                      {notificationFilter === "unread"
                        ? "No unread notifications"
                        : notificationFilter === "read"
                        ? "No read notifications"
                        : "No notifications yet"}
                    </p>
                  </div>
                ) : (
                  filteredNotifications.map((notification) => (
                    <div
                      key={notification.id}
                      className={`px-4 py-3 border-b border-gray-50 hover:bg-gray-50 transition-colors ${
                        !notification.read ? "bg-green-50" : ""
                      }`}
                    >
                      <div className="flex items-start space-x-3">
                        <span className="text-lg flex-shrink-0">
                          {getNotificationIcon(notification.notification_type)}
                        </span>
                        <div className="flex-1 min-w-0">
                          <p
                            className={`text-sm ${
                              !notification.read
                                ? "font-medium text-gray-900"
                                : "text-gray-700"
                            }`}
                          >
                            {notification.message}
                          </p>

                          {/* Consultation Navigation Button */}
                          {notification.notification_type === "appointment" &&
                            notification.consultation_id && (
                              <button
                                onClick={() =>
                                  handleConsultationNavigation(
                                    notification.consultation_id,
                                    notification.id
                                  )
                                }
                                className="mt-2 inline-flex items-center px-2 py-1 bg-green-600 text-white text-xs rounded-md hover:bg-green-700 transition-colors"
                              >
                                Join Session
                              </button>
                            )}

                          <div className="flex items-center justify-between mt-1">
                            <span className="text-xs text-gray-500">
                              {formatTime(notification.created_at)}
                            </span>
                            <div className="flex items-center space-x-1">
                              {!notification.read && (
                                <button
                                  onClick={() => markAsRead(notification.id)}
                                  className="text-green-600 hover:text-green-800 text-xs"
                                >
                                  Mark read
                                </button>
                              )}
                              <button
                                onClick={() =>
                                  removeNotification(notification.id)
                                }
                                className="text-red-600 hover:text-red-800 text-xs ml-2"
                              >
                                Remove
                              </button>
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                  ))
                )}
              </div>

              {/* View All Button */}
              {notifications.length > 5 && (
                <div className="px-4 py-3 border-t border-gray-100">
                  <button
                    onClick={() => {
                      setShowNotificationPanel(false);
                      // Navigate to full notifications page if needed
                      // navigate('/notifications');
                    }}
                    className="w-full text-center text-green-600 hover:text-green-800 text-sm font-medium"
                  >
                    View all notifications
                  </button>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Video Call Button */}
        {activeUser && userType === "user" && (
          <button
            onClick={handleVideoCall}
            className="flex items-center space-x-2 px-4 py-2 rounded-lg font-medium transition-colors bg-green-900 hover:bg-green-800 text-white"
          >
            <Video className="w-4 h-4" />
            <span className="hidden sm:inline">Request Session</span>
          </button>
        )}
      </div>
    </div>
  );
};

export default ChatHeader;
