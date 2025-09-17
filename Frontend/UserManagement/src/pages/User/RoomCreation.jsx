
  import React, { useState } from "react";
import { Video, MessageCircle, Settings } from "lucide-react";
import { RoomCreationRoute } from "../../api/userService";
import { toast } from "react-toastify";
import { useNavigate } from "react-router-dom";

function RoomCreation() {
  const navigate = useNavigate()
  const [formData, setFormData] = useState({
    name: '',
    type: 'chat',
    description: ''
  });

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
          await RoomCreationRoute(formData)
 toast.success('Room Created Successfully',{position:'bottom-center'})
    navigate('/home')
    } catch (error) {
      toast.error(error.response.data.error,{position:'bottom-center'})
    }
  
   
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-green-50 via-white to-green-50 flex items-center justify-center relative overflow-hidden p-4">
      {/* Animated Background Elements */}
      <div className="absolute inset-0 overflow-hidden">
        <div className="absolute top-20 right-20 w-32 h-32 bg-green-200 rounded-full opacity-20 animate-pulse"></div>
        <div className="absolute bottom-32 left-16 w-24 h-24 bg-green-200 rounded-full opacity-20 animate-pulse delay-1000"></div>
        <div className="absolute top-1/2 right-1/3 w-16 h-16 bg-pink-200 rounded-full opacity-20 animate-pulse delay-500"></div>
        <div className="absolute top-1/3 left-1/4 w-20 h-20 bg-blue-200 rounded-full opacity-20 animate-pulse delay-700"></div>
        <div className="absolute top-3/4 right-1/4 w-12 h-12 bg-cyan-200 rounded-full opacity-20 animate-pulse delay-300"></div>
      </div>

      <div className="w-full max-w-lg bg-white/80 backdrop-blur-sm rounded-2xl shadow-xl border border-white/20 p-8 space-y-6 z-10">
        <div className="text-center">
          <div className="mx-auto w-20 h-20 bg-gradient-to-br from-green-100 to-green-100 rounded-2xl flex items-center justify-center mb-6 shadow-lg">
            <div className="flex space-x-1">
              <MessageCircle size={20} className="text-green-600" />
              <Video size={20} className="text-green-600" />
            </div>
          </div>
          <h1 className="text-3xl font-bold bg-gradient-to-r from-green-600 to-green-600 bg-clip-text text-transparent">
            Create Room
          </h1>
          <p className="text-gray-600 mt-2">
            Start a new chat or video room for your community
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Room Name */}
          <div className="space-y-2">
            <label htmlFor="name" className="text-sm font-medium text-gray-700">
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
              className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-green-500 focus:border-transparent transition-all duration-200 bg-gray-50/50"
            />
            <p className="text-xs text-gray-500">Maximum 120 characters</p>
          </div>

          {/* Room Type */}
          <div className="space-y-3">
            <label className="text-sm font-medium text-gray-700">Room Type *</label>
            <div className="grid grid-cols-2 gap-3">
              <label className={`flex items-center space-x-3 p-4 rounded-xl border-2 cursor-pointer transition-all duration-200 ${
                formData.type === 'chat' 
                  ? 'border-green-500 bg-green-50' 
                  : 'border-gray-200 hover:border-gray-300 bg-gray-50/30'
              }`}>
                <input
                  type="radio"
                  name="type"
                  value="chat"
                  checked={formData.type === 'chat'}
                  onChange={handleInputChange}
                  className="sr-only"
                />
                <MessageCircle size={20} className={formData.type === 'chat' ? 'text-green-600' : 'text-gray-500'} />
                <span className={`font-medium ${formData.type === 'chat' ? 'text-green-700' : 'text-gray-600'}`}>
                  Chat Room
                </span>
              </label>

              <label className={`flex items-center space-x-3 p-4 rounded-xl border-2 cursor-pointer transition-all duration-200 ${
                formData.type === 'video' 
                  ? 'border-green-500 bg-green-50' 
                  : 'border-gray-200 hover:border-gray-300 bg-gray-50/30'
              }`}>
                <input
                  type="radio"
                  name="type"
                  value="video"
                  checked={formData.type === 'video'}
                  onChange={handleInputChange}
                  className="sr-only"
                />
                <Video size={20} className={formData.type === 'video' ? 'text-green-600' : 'text-gray-500'} />
                <span className={`font-medium ${formData.type === 'video' ? 'text-green-700' : 'text-gray-600'}`}>
                  Video Room
                </span>
              </label>
            </div>
          </div>

          {/* Description */}
          <div className="space-y-2">
            <label htmlFor="description" className="text-sm font-medium text-gray-700">
              Description (Optional)
            </label>
            <textarea
              id="description"
              name="description"
              value={formData.description}
              onChange={handleInputChange}
              rows="4"
              placeholder="Describe what this room is about..."
              className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-green-500 focus:border-transparent transition-all duration-200 bg-gray-50/50 resize-none"
            />
            <p className="text-xs text-gray-500">Help others understand the purpose of your room</p>
          </div>

          {/* Submit Button */}
          <button
            type="submit"
            className="w-full flex items-center justify-center px-6 py-4 bg-gradient-to-r from-green-600 to-green-600 text-white font-semibold rounded-xl shadow-lg hover:from-green-700 hover:to-green-700 transform hover:scale-[1.02] transition-all duration-200 space-x-2"
          >
            <Settings size={20} />
            <span>Create Room</span>
          </button>
        </form>

        {/* Footer */}
        <div className="text-center pt-4">
          <p className="text-sm text-gray-500">
            Room will be created and active immediately
          </p>
        </div>
      </div>
    </div>
  );
}

export default RoomCreation;