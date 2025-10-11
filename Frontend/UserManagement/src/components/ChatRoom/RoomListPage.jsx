import React from 'react';
import { BrowserRouter, Routes, Route, useNavigate, useLocation } from 'react-router-dom';
import GroupChatPage from './components/GroupChatPage';

// Example: Room List Page
const RoomListPage = () => {
  const navigate = useNavigate();

  const rooms = [
    { id: 1, name: 'General Discussion', participants: 5 },
    { id: 2, name: 'Tech Support', participants: 3 },
    { id: 3, name: 'Random Chat', participants: 8 },
  ];

  const handleJoinRoom = (roomId) => {
    navigate(`/chat/${roomId}`);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-green-50 p-8">
      <div className="max-w-4xl mx-auto">
        <h1 className="text-3xl font-bold text-gray-900 mb-8">Available Rooms</h1>
        <div className="grid gap-4">
          {rooms.map(room => (
            <div
              key={room.id}
              className="bg-white rounded-lg p-6 shadow-md hover:shadow-lg transition-shadow cursor-pointer"
              onClick={() => handleJoinRoom(room.id)}
            >
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="text-xl font-semibold text-gray-900">{room.name}</h2>
                  <p className="text-sm text-gray-500 mt-1">
                    {room.participants} participants online
                  </p>
                </div>
                <button className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors">
                  Join Room
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};