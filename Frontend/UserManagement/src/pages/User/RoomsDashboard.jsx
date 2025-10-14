import React, { useState, useEffect, useCallback } from "react";
import {
  Video,
  MessageCircle,
  Users,
  Search,
  Clock,
  Eye,
  Plus,
  AlertCircle,
} from "lucide-react";
import { useNavigate } from "react-router-dom";
import { fetchRoomsRoute } from "../../api/userService";
import { toast } from "react-toastify";
import NavigationBar from "../../components/navigationBar/NavigationBar";
import Pagination from "../../components/Pagination";

// Constants
const PAGE_SIZE = 6;
const SEARCH_DEBOUNCE_MS = 800;

// Error handler utility
const handleApiError = (error) => {
  const message =
    error?.response?.data?.message ||
    error?.message ||
    "An unexpected error occurred";
  console.error("API Error:", error);
  return message;
};

function RoomsDashboard() {
  // State management
  const [state, setState] = useState({
    currentPage: 1,
    totalPages: 1,
    totalCount: 0,
    searchTerm: "",
    filterType: "all",
    rooms: [],
    loading: false,
    error: null,
  });

  const navigate = useNavigate();

  // Fetch rooms with proper error handling
  const fetchRooms = useCallback(
    async (page = 1, search = "", type = "all") => {
      setState((prev) => ({ ...prev, loading: true, error: null }));

      try {
        const params = new URLSearchParams({
          page,
          page_size: PAGE_SIZE,
          ...(search.trim() && { search: search.trim() }),
          ...(type !== "all" && { type }),
        });

        const response = await fetchRoomsRoute(`?${params.toString()}`);

        // Validate response structure
        if (!response?.data?.results || !Array.isArray(response.data.results)) {
          throw new Error("Invalid response format from server");
        }

        const totalCount = response.data.count || 0;
        const totalPages = Math.ceil(totalCount / PAGE_SIZE) || 1;

        setState((prev) => ({
          ...prev,
          rooms: response.data.results,
          totalCount,
          totalPages,
          currentPage: page,
          loading: false,
        }));
      } catch (error) {
        const errorMessage = handleApiError(error);
        setState((prev) => ({
          ...prev,
          loading: false,
          error: errorMessage,
          rooms: [],
        }));
        toast.error(errorMessage, { position: "bottom-center" });
      }
    },
    []
  );

  // Initial data fetch
  useEffect(() => {
    fetchRooms();
  }, [fetchRooms]);

  // Debounced search and filter
  useEffect(() => {
    const delayTimer = setTimeout(() => {
      fetchRooms(1, state.searchTerm, state.filterType);
    }, SEARCH_DEBOUNCE_MS);

    return () => clearTimeout(delayTimer);
  }, [state.searchTerm, state.filterType, fetchRooms]);

  // Event handlers
  const handleSearchChange = useCallback((e) => {
    setState((prev) => ({
      ...prev,
      searchTerm: e.target.value,
    }));
  }, []);


  const handlePageChange = useCallback(
    (page) => {
      fetchRooms(page, state.searchTerm, state.filterType);
      window.scrollTo({ top: 0, behavior: "smooth" });
    },
    [fetchRooms, state.searchTerm, state.filterType]
  );

  const handleJoinRoom = useCallback(
    (roomId, roomName) => {
      if (!roomId || !roomName) {
        toast.error("Invalid room data", { position: "bottom-center" });
        return;
      }
      navigate("/chat", { state: { roomId, roomName } });
    },
    [navigate]
  );

  const handleCreateRoom = useCallback(() => {
    navigate("/room");
  }, [navigate]);

  // Format date helper
  const formatDate = useCallback((dateString) => {
    try {
      return new Date(dateString).toLocaleDateString("en-US", {
        month: "short",
        day: "numeric",
        hour: "2-digit",
        minute: "2-digit",
      });
    } catch (error) {
      console.warn("Invalid date format:", dateString);
      return "Invalid date";
    }
  }, []);

  // Render room card
  const RoomCard = React.memo(({ room }) => (
    <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden hover:shadow-md transition-shadow duration-200">
      <div className="p-6 pb-4">
        <div className="flex items-start justify-between mb-3">
          <div className="flex items-center space-x-3 flex-1 min-w-0">
            <div
              className={`w-10 h-10 rounded-lg flex items-center justify-center flex-shrink-0 ${
                room.type === "chat" ? "bg-indigo-100" : "bg-purple-100"
              }`}
            >
              {room.type === "chat" ? (
                <MessageCircle size={20} className="text-indigo-600" />
              ) : (
                <Video size={20} className="text-purple-600" />
              )}
            </div>
            <div className="min-w-0 flex-1">
              <h3 className="font-semibold text-gray-900 text-lg truncate">
                {room.name}
              </h3>
            </div>
          </div>
          <div
            className={`px-2 py-1 rounded-full text-xs font-medium flex-shrink-0 ml-2 ${
              room.is_active
                ? "bg-green-100 text-green-700"
                : "bg-gray-100 text-gray-600"
            }`}
          >
            {room.is_active ? "Active" : "Inactive"}
          </div>
        </div>

        <p className="text-gray-600 text-sm mb-4 line-clamp-2">
          {room.description || "No description provided"}
        </p>

        <div className="space-y-2 mb-4">
          <div className="flex items-center justify-between text-sm">
            <div className="flex items-center space-x-1 text-gray-600">
              <Users size={14} />
              <span>{room.participants || 0} participants</span>
            </div>
            <div className="flex items-center space-x-1 text-gray-500">
              <Clock size={14} />
              <span>{formatDate(room.created_at)}</span>
            </div>
          </div>
        </div>

        <div className="text-xs text-gray-500 mb-4 truncate">
          Created by {room.owner?.name || "Unknown"}
        </div>
      </div>

      <div className="px-6 pb-6">
        <button
          onClick={() => handleJoinRoom(room.id, room.name)}
          disabled={!room.is_active}
          aria-label={`Join ${room.name} room`}
          className={`w-full flex items-center justify-center space-x-2 px-4 py-3 rounded-xl font-medium transition-all duration-200 ${
            room.is_active
              ? "bg-gradient-to-r from-indigo-600 to-purple-600 text-white hover:from-indigo-700 hover:to-purple-700 transform hover:scale-[1.02]"
              : "bg-gray-100 text-gray-500 cursor-not-allowed"
          }`}
        >
          <Eye size={16} />
          <span>{!room.is_active ? "Room Inactive" : "Join Room"}</span>
        </button>
      </div>
    </div>
  ));

  RoomCard.displayName = "RoomCard";

  const { rooms, loading, error, currentPage, totalPages, totalCount, searchTerm, filterType } = state;

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-blue-50">
      <NavigationBar />

      <div className="max-w-7xl mx-auto px-4 py-8">
        {/* Error Banner */}
        {error && (
          <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg flex items-start space-x-3">
            <AlertCircle className="text-red-600 flex-shrink-0 mt-0.5" size={20} />
            <div>
              <p className="text-red-900 font-medium">Error loading rooms</p>
              <p className="text-red-700 text-sm">{error}</p>
            </div>
          </div>
        )}

        {/* Search and Filters */}
        <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-6 mb-8">
          <div className="flex  lg:flex-row lg:items-center space-y-4 lg:space-y-0 lg:space-x-6">
            <div className="flex-1 relative">
              <Search
                size={20}
                className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400"
              />
              <input
                type="text"
                placeholder="Search rooms by name or description..."
                value={searchTerm}
                onChange={handleSearchChange}
                disabled={loading}
                aria-label="Search rooms"
                className="w-full pl-10 pr-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-all duration-200 bg-gray-50/50 disabled:opacity-60 disabled:cursor-not-allowed"
              />
            </div>

            
            <button
              onClick={handleCreateRoom}
              aria-label="Create a new room"
              className="flex items-center space-x-2 px-3 py-3 bg-gradient-to-r from-indigo-600 to-purple-600 text-white font-semibold rounded-xl shadow-lg hover:from-indigo-700 hover:to-purple-700 transform hover:scale-105 transition-all duration-200"
            >
              <Plus size={20} />
              <span>Create Room</span>
            </button>
          </div>
        </div>

        

        {/* Loading State */}
        {loading && (
          <div className="flex justify-center items-center py-12" role="progressbar">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600" />
          </div>
        )}

        {/* Rooms Grid */}
        {!loading && rooms.length > 0 && (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-8">
            {rooms.map((room) => (
              <RoomCard key={room.id} room={room} />
            ))}
          </div>
        )}

        {/* Empty State */}
        {!loading && rooms.length === 0 && (
          <div className="text-center py-12">
            <div className="mx-auto w-24 h-24 bg-gray-100 rounded-full flex items-center justify-center mb-4">
              <Search size={32} className="text-gray-400" />
            </div>
            <h3 className="text-lg font-medium text-gray-900 mb-2">
              No rooms found
            </h3>
            <p className="text-gray-600 mb-6">
              {searchTerm || filterType !== "all"
                ? "Try adjusting your search or filters"
                : "Start by creating your first room"}
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

      {/* Pagination */}
      {!loading && rooms.length > 0 && (
        <div className="px-4 pb-4">
          <Pagination
            currentPage={currentPage}
            totalPages={totalPages}
            totalCount={totalCount}
            pageSize={PAGE_SIZE}
            onPageChange={handlePageChange}
            maxPageButtons={5}
            size="md"
          />
        </div>
      )}
    </div>
  );
}

export default RoomsDashboard;