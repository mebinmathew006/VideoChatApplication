import React from "react";
import { Clock, Users, Settings, RefreshCw } from "lucide-react";
import NotificationDropdown from "../NotificationDropdown";

function VideoCallHeader({
  isConnected,
  connectionStatus,
  callDuration,
  isUsingFallbackVideo,
  userType,
  children
}) {
  const formatDuration = (seconds) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, "0")}:${secs.toString().padStart(2, "0")}`;
  };

  //  Use callback from parent component
  const handleReconnect = () => {
    
      window.location.reload();
    
  };

  return (
    <div className="flex items-center justify-between p-6 bg-black/20 backdrop-blur-sm border-b border-white/10 relative z-50">
      <div className="flex items-center space-x-4">
        <div className="flex items-center space-x-2">
          <div
            className={`w-3 h-3 rounded-full ${
              isConnected
                ? "bg-emerald-400 animate-pulse"
                : "bg-amber-400 animate-pulse"
            }`}
          />
          <h1 className="text-white text-xl font-semibold">
            {userType === "doctor" ? "Doctor Console" : "Patient Console"}
          </h1>
        </div>

        <span
          className={`text-sm px-3 py-1 rounded-full ${
            isConnected
              ? "bg-emerald-500/20 text-emerald-300"
              : "bg-amber-500/20 text-amber-300"
          }`}
        >
          {connectionStatus}
        </span>

        {isUsingFallbackVideo && (
          <span className="text-xs px-2 py-1 bg-orange-500/20 text-orange-300 rounded-full">
            Fallback Video
          </span>
        )}

        {isConnected && (
          <div className="flex items-center space-x-2 bg-white/10 rounded-lg px-3 py-1">
            <Clock size={16} className="text-white/70" />
            <span className="text-white text-sm font-mono">
              {formatDuration(callDuration)}
            </span>
          </div>
        )}
      </div>

      <div className="flex items-center space-x-3 relative z-50">
        <NotificationDropdown />
        <button 
          onClick={handleReconnect}
          className="p-3 rounded-xl bg-white/10 hover:bg-white/20 transition-all duration-200 text-white/70 hover:text-white group"
          title="Reconnect"
        >
          <RefreshCw size={20} className="group-hover:rotate-180 transition-transform duration-300" />
        </button>
      </div>
    </div>
  );
}

export default VideoCallHeader;