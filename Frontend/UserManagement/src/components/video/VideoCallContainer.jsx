import React from "react";
import VideoCallHeader from "./VideoCallHeader";
import VideoCallMain from "./VideoCallMain";
import VideoCallControls from "./VideoCallControls";

function VideoCallContainer({
  localStream,
  remoteStream,
  isConnected,
  connectionStatus,
  callDuration,
  isUsingFallbackVideo,
  localVideoRef,
  remoteVideoRef,
  isVideoOff,
  toggleMute,
  toggleVideo,
  endCall,
  stopRecording='',
  startRecording='',
  isRecording=false,
  isMuted,
  userType = "doctor", // 'doctor' or 'patient'
  children,
  isRecordingtoggle,
}) {
  return (
    <div className=" bg-gradient-to-br from-blue-900 via-indigo-900 to-purple-900 flex flex-col">
      <VideoCallHeader
        isConnected={isConnected}
        connectionStatus={connectionStatus}
        callDuration={callDuration}
        isUsingFallbackVideo={isUsingFallbackVideo}
        userType={userType}
      >
        {children}
      </VideoCallHeader>

      <VideoCallMain
        localStream={localStream}
        remoteStream={remoteStream}
        localVideoRef={localVideoRef}
        remoteVideoRef={remoteVideoRef}
        isVideoOff={isVideoOff}
        isUsingFallbackVideo={isUsingFallbackVideo}
        userType={userType}
      />

      <VideoCallControls
        toggleMute={toggleMute}
        toggleVideo={toggleVideo}
        endCall={endCall}
        isMuted={isMuted}
        isVideoOff={isVideoOff}
        userType={userType}
        stopRecording={stopRecording}
      startRecording={startRecording}
      isRecording={isRecording}
        isRecordingtoggle={isRecordingtoggle}
      />
    </div>
  );
}

export default VideoCallContainer;
