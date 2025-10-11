import React from "react";
import {
  LogOut,
  Users,
} from "lucide-react";

// ===== HEADER COMPONENT =====
export default function ChatHeader({ roomId, roomName,isConnected, onLeave }) {
  return (
    <div className="bg-white rounded-t-2xl shadow-lg p-4 flex items-center justify-between">
      <div className="flex items-center space-x-3">
        <Users className="w-6 h-6 text-indigo-600" />
        <div>
          <h2 className="font-bold text-gray-800">{roomName}</h2>
          <p className="text-sm text-gray-500">
            {isConnected ? (
              <span className="text-green-600">● Connected</span>
            ) : (
              <span className="text-red-600">● Disconnected</span>
            )}
          </p>
        </div>
      </div>
      <button
        onClick={onLeave}
        className="flex items-center space-x-2 px-4 py-2 bg-red-500 hover:bg-red-600 text-white rounded-lg transition"
      >
        <LogOut className="w-4 h-4" />
        <span>Leave</span>
      </button>
    </div>
  );
}