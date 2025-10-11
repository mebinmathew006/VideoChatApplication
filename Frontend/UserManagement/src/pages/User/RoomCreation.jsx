import React, { useState } from "react";
import { Settings,  LogOutIcon } from "lucide-react";
import { RoomCreationRoute } from "../../api/userService";
import { toast } from "react-toastify";
import { useNavigate } from "react-router-dom";
import NavigationBar from "../../components/navigationBar/NavigationBar";

function RoomCreation() {
  const navigate = useNavigate();
  const [formData, setFormData] = useState({
    name: "",
    type: "chat",
    description: "",
  });

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: value,
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      await RoomCreationRoute(formData);
      toast.success("Room Created Successfully", { position: "bottom-center" });
      navigate("/home");
    } catch (error) {
      toast.error(error.response.data.error, { position: "bottom-center" });
    }
  };

  return (
    <div className="d-flex">
      <NavigationBar />

      <div className="min-h-screen bg-gradient-to-br from-indigo-50 via-white to-indigo-50 flex items-center justify-center relative overflow-hidden p-4">
        {/* Animated Background Elements */}

        <div className="absolute inset-0 overflow-hidden">
          <div className="absolute top-20 right-20 w-32 h-32 bg-indigo-200 rounded-full opacity-20 animate-pulse"></div>
          <div className="absolute bottom-32 left-16 w-24 h-24 bg-indigo-200 rounded-full opacity-20 animate-pulse delay-1000"></div>
          <div className="absolute top-1/2 right-1/3 w-16 h-16 bg-pink-200 rounded-full opacity-20 animate-pulse delay-500"></div>
          <div className="absolute top-1/3 left-1/4 w-20 h-20 bg-blue-200 rounded-full opacity-20 animate-pulse delay-700"></div>
          <div className="absolute top-3/4 right-1/4 w-12 h-12 bg-cyan-200 rounded-full opacity-20 animate-pulse delay-300"></div>
        </div>

        <div className="w-full max-w-lg bg-white/80 backdrop-blur-sm rounded-2xl shadow-xl border border-white/20 p-8 space-y-6 z-10">
          <div className="text-center">
            <h1 className="text-3xl font-bold bg-gradient-to-r from-indigo-600 to-indigo-600 bg-clip-text text-transparent">
              Create Room
            </h1>
            <p className="text-gray-600 mt-2">
              Start a new room for your community
            </p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Room Name */}
            <div className="space-y-2">
              <label
                htmlFor="name"
                className="text-sm font-medium text-gray-700"
              >
                Room Name *
              </label>
              <input
                type="text"
                id="name"
                name="name"
                value={formData.name}
                onChange={handleInputChange}
                required
                maxLength="120"
                placeholder="Enter room name"
                className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-all duration-200 bg-gray-50/50"
              />
              <p className="text-xs text-gray-500">Maximum 120 characters</p>
            </div>

            {/* Room Type */}

            {/* Description */}
            <div className="space-y-2">
              <label
                htmlFor="description"
                className="text-sm font-medium text-gray-700"
              >
                Description
              </label>
              <textarea
                id="description"
                name="description"
                value={formData.description}
                onChange={handleInputChange}
                rows="4"
                placeholder="Describe what this room is about..."
                className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-all duration-200 bg-gray-50/50 resize-none"
              />
              <p className="text-xs text-gray-500">
                Help others understand the purpose of your room
              </p>
            </div>

            {/* Submit Button */}
            <div className="flex justify-between">
              <button
                type="submit"
                className="m-3 flex items-center justify-center px-6 py-4 bg-gradient-to-r from-indigo-600 to-indigo-600 text-white font-semibold rounded-xl shadow-lg hover:from-indigo-700 hover:to-indigo-700 transform hover:scale-[1.02] transition-all duration-200 space-x-2"
              >
                <Settings size={20} />
                <span>Create Room </span>
              </button>
              <button
                type="button"
                onClick={()=>navigate(-1)}
                className="m-3 flex items-center justify-center px-6 py-4 bg-gradient-to-r from-indigo-600 to-indigo-600 text-white font-semibold rounded-xl shadow-lg hover:from-indigo-700 hover:to-indigo-700 transform hover:scale-[1.02] transition-all duration-200 space-x-2"
              >
                <LogOutIcon size={20} />
                <span>Cancel Room</span>
              </button>
            </div>
          </form>

          {/* Footer */}
          <div className="text-center pt-4">
            <p className="text-sm text-gray-500">
              Room will be created and active immediately
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

export default RoomCreation;
