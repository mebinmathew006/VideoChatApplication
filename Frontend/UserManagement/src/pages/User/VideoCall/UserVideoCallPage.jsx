// pages/PatientVideoCallPage.js
import React, { useEffect } from "react";
import { useSelector } from "react-redux";
import { useNavigate, useLocation } from "react-router-dom";
import { usePatientWebRTC } from "../../utils/usePatientWebRTC";
import Swal from "sweetalert2";

function UserVideoCallPage() {
  const navigate = useNavigate();
  const location = useLocation();

  // Get doctor ID and consultation ID from route state or props
  const patientId = useSelector((state) => state.userDetails.id);
  const { doctorId, psychologist_fee, consultationId, isRecordingtoggle } = location?.state || {};

  const handleCallEnd = ( ) => {
    setTimeout(() => {
      navigate("/user_consultations");
    }, 500);
  };

  const {
  recordingDuration,
  recordingError,
  recordingMethod,
  setRecordingMethod,
    isMuted,
    isVideoOff,
    isConnected,
    localStream,
    callDuration,
    remoteStream,
    connectionStatus,
    isUsingFallbackVideo,
    localVideoRef,
    remoteVideoRef,
    startRecording,
    stopRecording,
    isRecording,
    toggleMute,
    toggleVideo,
    endCall,
  } = usePatientWebRTC({
    patientId,
    doctorId,
    consultationId,
    onCallEnd: handleCallEnd,
    isRecordingtoggle,
  });

  useEffect(() => {
    // 1. Handle browser tab/window closing (using standard beforeunload)
    const handleBeforeUnload = (e) => {
      if (isConnected || isRecording) {
        e.preventDefault();
        e.returnValue = 'You have an ongoing video call. Are you sure you want to leave?';
        return e.returnValue;
      }
    };

    // 2. Handle internal navigation attempts (using SweetAlert)
    const handleInternalNavigation = (e) => {
      // Skip if not a link click or if no href
      if (!e.target.closest('a') || !e.target.closest('a').href) return;
      
      if (isConnected || isRecording) {
        e.preventDefault();
        const href = e.target.closest('a').href;
        
        Swal.fire({
          title: "End Video Call?",
          text: "You have an ongoing call. Do you want to end it?",
          icon: "warning",
          showCancelButton: true,
          confirmButtonText: "Yes, End Call",
          cancelButtonText: "No, Continue",
          focusCancel: true,
        }).then((result) => {
          if (result.isConfirmed) {
            // Clean up call and recording
            if (isRecording) stopRecording();
            endCall();
            
            // Navigate after cleanup
            setTimeout(() => {
              window.location.href = href;
            }, 100);
          }
        });
      }
    };

    // Set up event listeners
    window.addEventListener('beforeunload', handleBeforeUnload);
    document.addEventListener('click', handleInternalNavigation, true); // Use capture phase
    
    return () => {
      window.removeEventListener('beforeunload', handleBeforeUnload);
      document.removeEventListener('click', handleInternalNavigation, true);
    };
  }, [isConnected, isRecording, endCall, stopRecording]);

  return (
    <VideoCallContainer
      localStream={localStream}
      remoteStream={remoteStream}
      isConnected={isConnected}
      connectionStatus={connectionStatus}
      callDuration={callDuration}
      isUsingFallbackVideo={isUsingFallbackVideo}
      localVideoRef={localVideoRef}
      remoteVideoRef={remoteVideoRef}
      isVideoOff={isVideoOff}
      stopRecording={stopRecording}
      startRecording={startRecording}
      isRecording={isRecording}
      toggleMute={toggleMute}
      toggleVideo={toggleVideo}
      endCall={endCall}
      isMuted={isMuted}
      userType="patient"
      isRecordingtoggle={isRecordingtoggle}
      recordingDuration={recordingDuration}
      recordingError={recordingError}
      recordingMethod={recordingMethod}
      setRecordingMethod={setRecordingMethod}
    >
      <NotificationDropdown
        notifications={notifications}
        unreadCount={unreadCount}
        markAsRead={markAsRead}
        markAllAsRead={markAllAsRead}
        removeNotification={removeNotification}
      />
    </VideoCallContainer>
  );
}

export default UserVideoCallPage;