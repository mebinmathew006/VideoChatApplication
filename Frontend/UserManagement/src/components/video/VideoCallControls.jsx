import React from "react";
import {
  Mic,
  MicOff,
  Video,
  VideoOff,
  PhoneOff,
  Circle,
  StopCircle,
} from "lucide-react";
import { toast } from "react-toastify";

function VideoCallControls({
  toggleMute,
  toggleVideo,
  endCall,
  isMuted,
  isVideoOff,
  userType,
  consultationId,
  stopRecording,
  startRecording,
  isRecording
}) {
  

  const handleEndCall = () => {
    if (isRecording) {
      stopRecording();
    }
    endCall();
  };
  const handleStopRecording = () => {
    toast.info("Sorry you cant stop Recording", { position: "bottom-center" });
  };

  return (
    <div className="p-6 bg-black/30 backdrop-blur-sm border-t border-white/10">
      {/* Main Call Controls */}
      <div className="flex items-center justify-center space-x-4 mb-4">
        {/* Mute Button */}
        <button
          onClick={toggleMute}
          className={`p-4 rounded-2xl transition-all duration-200 ${
            isMuted
              ? "bg-red-500 hover:bg-red-600 text-white shadow-lg shadow-red-500/25"
              : "bg-white/10 hover:bg-white/20 text-white"
          }`}
        >
          {isMuted ? <MicOff size={24} /> : <Mic size={24} />}
        </button>

        {/* Video Toggle */}
        <button
          onClick={toggleVideo}
          className={`p-4 rounded-2xl transition-all duration-200 ${
            isVideoOff
              ? "bg-red-500 hover:bg-red-600 text-white shadow-lg shadow-red-500/25"
              : "bg-white/10 hover:bg-white/20 text-white"
          }`}
        >
          {isVideoOff ? <VideoOff size={24} /> : <Video size={24} />}
        </button>

        {/* End Call */}
        <button
          onClick={handleEndCall}
          className="p-4 rounded-2xl bg-red-500 hover:bg-red-600 text-white transition-all duration-200 shadow-lg shadow-red-500/25 hover:shadow-red-500/40"
        >
          <PhoneOff size={24} />
        </button>

        {/* Patient-Only Record Button (Toggle only) */}
        {userType === "patient" && (
          <button
            onClick={isRecording ? handleStopRecording : startRecording}
            className={`p-4 rounded-2xl transition-all duration-200 ${
              isRecording
                ? "bg-red-500 hover:bg-red-600 text-white shadow-lg shadow-red-500/25"
                : "bg-white/10 hover:bg-white/20 text-white"
            }`}
          >
            {isRecording ? <StopCircle size={24} /> : <Circle size={24} />}
          </button>
        )}
      </div>



    </div>
  );
}

export default VideoCallControls;
