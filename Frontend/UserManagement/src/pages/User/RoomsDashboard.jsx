import React, { useState, useEffect } from "react";
import { Video, MessageCircle, Users, Search, Filter, Clock, Eye, Plus } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { fetchRoomsRoute } from "../../api/userService";
import { toast } from "react-toastify";

function RoomsDashboard() {
  const [searchTerm, setSearchTerm] = useState('');
  const [filterType, setFilterType] = useState('all');
  const [rooms, setRooms] = useState([]);

  const navigate = useNavigate()
  
  useEffect(()=>{
    const fetchRooms = async ()=>{
        try {
            const response = await fetchRoomsRoute()
            console.log(response)
            setRooms(response.data.rooms)
        } catch (error) {
            toast.error('error while loading rooms',{position:'bottom-center'})
        }
        
    }
    fetchRooms()
  },[])

  // Filter rooms based on search and filters
  const filteredRooms = rooms.filter(room => {
    const matchesSearch = room.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         (room.description && room.description.toLowerCase().includes(searchTerm.toLowerCase()));
    const matchesType = filterType === 'all' || room.type === filterType;
    
    return matchesSearch && matchesType;
  });

  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const handleJoinRoom = (roomId) => {
    
    const room = rooms.find(r => r.id === roomId);
    alert(`Joining room: ${room.name}`);
  };

  const handleCreateRoom = () => {
    // In a real app, this would navigate to the create room page
    navigate('/room')
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-blue-50">
      {/* Header */}
      <div className="bg-white/80 backdrop-blur-sm shadow-sm border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 py-6">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold bg-gradient-to-r from-indigo-600 to-purple-600 bg-clip-text text-transparent">
                Rooms Dashboard
              </h1>
              <p className="text-gray-600 mt-1">
                Browse and join existing rooms or create your own
              </p>
            </div>
            <button
              onClick={handleCreateRoom}
              className="flex items-center space-x-2 px-6 py-3 bg-gradient-to-r from-indigo-600 to-purple-600 text-white font-semibold rounded-xl shadow-lg hover:from-indigo-700 hover:to-purple-700 transform hover:scale-105 transition-all duration-200"
            >
              <Plus size={20} />
              <span>Create Room</span>
            </button>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 py-8">
        {/* Search and Filters */}
        <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-6 mb-8">
          <div className="flex flex-col lg:flex-row lg:items-center space-y-4 lg:space-y-0 lg:space-x-6">
            {/* Search */}
            <div className="flex-1 relative">
              <Search size={20} className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
              <input
                type="text"
                placeholder="Search rooms..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-10 pr-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-all duration-200 bg-gray-50/50"
              />
            </div>

            {/* Room Type Filter */}
            <div className="flex items-center space-x-2">
              <Filter size={16} className="text-gray-500" />
              <select
                value={filterType}
                onChange={(e) => setFilterType(e.target.value)}
                className="px-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-transparent bg-white"
              >
                <option value="all">All Types</option>
                <option value="chat">Chat Rooms</option>
                <option value="video">Video Rooms</option>
              </select>
            </div>
          </div>
        </div>

        {/* Room Statistics */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-200">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Total Rooms</p>
                <p className="text-2xl font-bold text-gray-900">{rooms.length}</p>
              </div>
              <div className="w-12 h-12 bg-indigo-100 rounded-lg flex items-center justify-center">
                <MessageCircle size={24} className="text-indigo-600" />
              </div>
            </div>
          </div>
          
          <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-200">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Active Rooms</p>
                <p className="text-2xl font-bold text-green-600">{rooms.filter(r => r.is_active).length}</p>
              </div>
              <div className="w-12 h-12 bg-green-100 rounded-lg flex items-center justify-center">
                <Video size={24} className="text-green-600" />
              </div>
            </div>
          </div>

          <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-200">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Total Participants</p>
                <p className="text-2xl font-bold text-purple-600">{rooms.reduce((sum, room) => sum + room.participants, 0)}</p>
              </div>
              <div className="w-12 h-12 bg-purple-100 rounded-lg flex items-center justify-center">
                <Users size={24} className="text-purple-600" />
              </div>
            </div>
          </div>
        </div>

        {/* Rooms Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredRooms.map((room) => (
            <div key={room.id} className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden hover:shadow-md transition-shadow duration-200">
              {/* Room Header */}
              <div className="p-6 pb-4">
                <div className="flex items-start justify-between mb-3">
                  <div className="flex items-center space-x-3">
                    <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${
                      room.type === 'chat' ? 'bg-indigo-100' : 'bg-purple-100'
                    }`}>
                      {room.type === 'chat' ? 
                        <MessageCircle size={20} className="text-indigo-600" /> : 
                        <Video size={20} className="text-purple-600" />
                      }
                    </div>
                    <div>
                      <h3 className="font-semibold text-gray-900 text-lg">{room.name}</h3>
                    </div>
                  </div>
                  <div className={`px-2 py-1 rounded-full text-xs font-medium ${
                    room.is_active 
                      ? 'bg-green-100 text-green-700' 
                      : 'bg-gray-100 text-gray-600'
                  }`}>
                    {room.is_active ? 'Active' : 'Inactive'}
                  </div>
                </div>

                <p className="text-gray-600 text-sm mb-4 line-clamp-2">
                  {room.description || "No description provided"}
                </p>

                {/* Room Info */}
                <div className="space-y-2 mb-4">
                  <div className="flex items-center justify-between text-sm">
                    <div className="flex items-center space-x-1 text-gray-600">
                      <Users size={14} />
                      <span>{room.participants} participants</span>
                    </div>
                    <div className="flex items-center space-x-1 text-gray-500">
                      <Clock size={14} />
                      <span>{formatDate(room.created_at)}</span>
                    </div>
                  </div>
                </div>

                <div className="flex items-center justify-between text-xs text-gray-500 mb-4">
                  <span>Created by {room.owner}</span>
                  <span className="capitalize">{room.type} Room</span>
                </div>
              </div>

              {/* Room Actions */}
              <div className="px-6 pb-6">
                <button
                  onClick={() => handleJoinRoom(room.id)}
                  disabled={!room.is_active}
                  className={`w-full flex items-center justify-center space-x-2 px-4 py-3 rounded-xl font-medium transition-all duration-200 ${
                    room.is_active
                      ? 'bg-gradient-to-r from-indigo-600 to-purple-600 text-white hover:from-indigo-700 hover:to-purple-700 transform hover:scale-[1.02]'
                      : 'bg-gray-100 text-gray-500 cursor-not-allowed'
                  }`}
                >
                  <Eye size={16} />
                  <span>
                    {!room.is_active ? 'Room Inactive' : 'Join Room'}
                  </span>
                </button>
              </div>
            </div>
          ))}
        </div>

        {filteredRooms.length === 0 && (
          <div className="text-center py-12">
            <div className="mx-auto w-24 h-24 bg-gray-100 rounded-full flex items-center justify-center mb-4">
              <Search size={32} className="text-gray-400" />
            </div>
            <h3 className="text-lg font-medium text-gray-900 mb-2">No rooms found</h3>
            <p className="text-gray-600 mb-6">
              Try adjusting your search or filters, or create a new room.
            </p>
            <button
              onClick={handleCreateRoom}
              className="inline-flex items-center space-x-2 px-6 py-3 bg-gradient-to-r from-indigo-600 to-purple-600 text-white font-semibold rounded-xl shadow-lg hover:from-indigo-700 hover:to-purple-700 transform hover:scale-105 transition-all duration-200"
            >
              <Plus size={20} />
              <span>Create Your First Room</span>
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

export default RoomsDashboard;