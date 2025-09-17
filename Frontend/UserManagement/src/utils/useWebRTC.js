import { useCallback, useEffect, useRef, useState } from "react";
import { toast } from "react-toastify";
import axiosInstance from "../axiosconfig";

export const useWebRTC = ({
  userId,
  userType,
  signalingURL,
  onCallEnd,
  isRecordingtoggle = false,
}) => {
  const [targetUserId, setTargetUserId] = useState(null);
  const [isMuted, setIsMuted] = useState(false);
  const [isVideoOff, setIsVideoOff] = useState(false);
  const [isConnected, setIsConnected] = useState(false);
  const [localStream, setLocalStream] = useState(null);
  const [callDuration, setCallDuration] = useState(0);
  const [remoteStream, setRemoteStream] = useState(null);
  const [consultationId, setConsultationId] = useState(null);
  const [connectionStatus, setConnectionStatus] = useState(
    userType === "doctor" ? "Waiting for patient" : "Connecting to doctor"
  );
  const [isUsingFallbackVideo, setIsUsingFallbackVideo] = useState(false);

  // Recording states
  const [isRecording, setIsRecording] = useState(false);
  const [recordedBlob, setRecordedBlob] = useState(null);
  const [recordingError, setRecordingError] = useState(null);

  const wsRef = useRef(null);
  const pcRef = useRef(null);
  const localVideoRef = useRef(null);
  const remoteVideoRef = useRef(null);
  const callStartTime = useRef(null);
  const fallbackVideoElement = useRef(null);
  const callDurationInterval = useRef(null);

  // Recording refs
  const mediaRecorderRef = useRef(null);
  const recordedChunksRef = useRef([]);
  const combinedStreamRef = useRef(null);
  const canvasRef = useRef(null);
  const recordingContextRef = useRef(null);

  const checkStreamActive = useCallback((stream) => {
    return new Promise((resolve) => {
      if (!stream) {
        resolve(false);
        return;
      }

      const videoTrack = stream.getVideoTracks()[0];
      const audioTrack = stream.getAudioTracks()[0];

      if (!videoTrack && !audioTrack) {
        resolve(false);
        return;
      }

      const checkTracks = () => {
        const videoReady = videoTrack ? videoTrack.readyState === "live" : true;
        const audioReady = audioTrack ? audioTrack.readyState === "live" : true;
        return videoReady && audioReady;
      };

      if (checkTracks()) {
        resolve(true);
        return;
      }

      const onActive = () => {
        if (checkTracks()) {
          if (videoTrack) videoTrack.removeEventListener("active", onActive);
          if (audioTrack) audioTrack.removeEventListener("active", onActive);
          resolve(true);
        }
      };

      if (videoTrack) videoTrack.addEventListener("active", onActive);
      if (audioTrack) audioTrack.addEventListener("active", onActive);

      setTimeout(() => {
        resolve(checkTracks());
      }, 5000);
    });
  }, []);

  const createFallbackVideoStream = async () => {
    return new Promise((resolve, reject) => {
      const canvas = document.createElement("canvas");
      canvas.width = 640;
      canvas.height = 480;
      const ctx = canvas.getContext("2d");

      let frame = 0;
      const animate = () => {
        ctx.fillStyle = "#1e293b";
        ctx.fillRect(0, 0, canvas.width, canvas.height);

        const gradient = ctx.createLinearGradient(
          0,
          0,
          canvas.width,
          canvas.height
        );
        gradient.addColorStop(0, "#3b82f6");
        gradient.addColorStop(1, "#8b5cf6");
        ctx.fillStyle = gradient;
        ctx.fillRect(0, 0, canvas.width, canvas.height);

        const centerX = canvas.width / 2;
        const centerY = canvas.height / 2;
        const radius = 50 + Math.sin(frame * 0.1) * 20;

        ctx.beginPath();
        ctx.arc(centerX, centerY, radius, 0, 2 * Math.PI);
        ctx.fillStyle = "rgba(255, 255, 255, 0.3)";
        ctx.fill();

        ctx.fillStyle = "white";
        ctx.font = "20px Arial";
        ctx.textAlign = "center";
        ctx.fillText("Camera Unavailable", centerX, centerY - 20);
        ctx.fillText("Using Default Stream", centerX, centerY + 20);

        frame++;
        requestAnimationFrame(animate);
      };

      animate();

      try {
        const stream = canvas.captureStream(30);
        const audioContext = new (window.AudioContext || window.AudioContext)();
        const oscillator = audioContext.createOscillator();
        const gainNode = audioContext.createGain();

        oscillator.connect(gainNode);
        gainNode.connect(audioContext.destination);
        gainNode.gain.setValueAtTime(0, audioContext.currentTime);

        const dest = audioContext.createMediaStreamDestination();
        gainNode.connect(dest);
        oscillator.start();

        const audioTrack = dest.stream.getAudioTracks()[0];
        if (audioTrack) {
          stream.addTrack(audioTrack);
        }

        resolve(stream);
      } catch (error) {
        reject(error);
      }
    });
  };

  const getUserMediaWithFallback = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { width: 640, height: 480 },
        audio: true,
      });
      setIsUsingFallbackVideo(false);
      return stream;
    } catch (error) {
      toast.warning("Camera unavailable, using fallback video", {
        position: "bottom-center",
      });
      setIsUsingFallbackVideo(true);

      const fallbackStream = await createFallbackVideoStream();
      return fallbackStream;
    }
  };

  // Create combined stream for recording (both local and remote video)
  const createCombinedStream = useCallback(() => {
    if (!localStream || !remoteStream) return null;

    try {
      const canvas = document.createElement("canvas");
      // Use a single video frame size (e.g., 1280x720)
      canvas.width = 1280;
      canvas.height = 720;
      const ctx = canvas.getContext("2d");

      canvasRef.current = canvas;
      recordingContextRef.current = ctx;

      // Create video elements for drawing
      const localVideo = document.createElement("video");
      const remoteVideo = document.createElement("video");

      localVideo.srcObject = localStream;
      remoteVideo.srcObject = remoteStream;

      localVideo.play();
      remoteVideo.play();

      // Draw both videos with one as PiP
      const drawFrame = () => {
        if (!isRecording) return;

        ctx.clearRect(0, 0, canvas.width, canvas.height);

        // Draw main video (remote) - full size
        ctx.drawImage(remoteVideo, 0, 0, canvas.width, canvas.height);

        // Draw PiP video (local) - smaller in corner
        const pipWidth = canvas.width / 3;
        const pipHeight =
          (pipWidth * localVideo.videoHeight) / localVideo.videoWidth;
        const pipX = canvas.width - pipWidth - 20; // 20px from right
        const pipY = 20; // 20px from top

        // Draw rounded rectangle background for PiP
        ctx.beginPath();
        ctx.roundRect(pipX - 5, pipY - 5, pipWidth + 10, pipHeight + 10, 10);
        ctx.fillStyle = "rgba(0, 0, 0, 0.5)";
        ctx.fill();

        // Draw local video as PiP
        ctx.drawImage(localVideo, pipX, pipY, pipWidth, pipHeight);

        // Add border to PiP
        ctx.strokeStyle = "#3b82f6";
        ctx.lineWidth = 3;
        ctx.strokeRect(pipX, pipY, pipWidth, pipHeight);

        // Add labels
        ctx.fillStyle = "white";
        ctx.font = "16px Arial";
        ctx.fillText("You", pipX + 10, pipY + 25);
        ctx.fillText("Remote", 20, 40);

        requestAnimationFrame(drawFrame);
      };

      localVideo.onloadedmetadata = () => {
        remoteVideo.onloadedmetadata = () => {
          drawFrame();
        };
      };

      // Get canvas stream
      const canvasStream = canvas.captureStream(30);

      // Add audio tracks from both streams
      const audioTracks = [
        ...localStream.getAudioTracks(),
        ...remoteStream.getAudioTracks(),
      ];

      // Create audio context to mix audio
      const audioContext = new (window.AudioContext ||
        window.webkitAudioContext)();
      const destination = audioContext.createMediaStreamDestination();

      audioTracks.forEach((track) => {
        const source = audioContext.createMediaStreamSource(
          new MediaStream([track])
        );
        source.connect(destination);
      });

      // Add mixed audio to canvas stream
      destination.stream.getAudioTracks().forEach((track) => {
        canvasStream.addTrack(track);
      });

      combinedStreamRef.current = canvasStream;
      return canvasStream;
    } catch (error) {
      console.error("Error creating combined stream:", error);
      setRecordingError("Failed to create recording stream");
      return null;
    }
  }, [localStream, remoteStream, isRecording]);

  // Start recording
  const startRecording = useCallback(async () => {
    try {
      setRecordingError(null);
      recordedChunksRef.current = [];

      // Create combined stream
      const combinedStream = createCombinedStream();
      if (!combinedStream) {
        throw new Error("Failed to create combined stream");
      }

      // Check if MediaRecorder is supported
      if (!MediaRecorder.isTypeSupported("video/webm")) {
        throw new Error("WebM recording not supported");
      }

      const mediaRecorder = new MediaRecorder(combinedStream, {
        mimeType: "video/webm;codecs=vp9",
        videoBitsPerSecond: 2500000, // 2.5 Mbps
      });

      mediaRecorderRef.current = mediaRecorder;

      mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          recordedChunksRef.current.push(event.data);
        }
      };

      mediaRecorder.onstop = () => {
        const blob = new Blob(recordedChunksRef.current, {
          type: "video/webm",
        });
        setRecordedBlob(blob);

        // Optional: Auto-download the recording
        const url = URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = `consultation-${consultationId}-${new Date().toISOString()}.webm`;
        a.click();
        URL.revokeObjectURL(url);

        toast.success("Recording saved successfully!", {
          position: "bottom-center",
        });
      };

      mediaRecorder.onerror = (event) => {
        console.error("MediaRecorder error:", event.error);
        setRecordingError("Recording failed: " + event.error.message);
        toast.error("Recording failed!", {
          position: "bottom-center",
        });
      };

      mediaRecorder.start(1000); // Collect data every second
      setIsRecording(true);

      toast.info("Recording started", {
        position: "bottom-center",
      });
    } catch (error) {
      console.error("Error starting recording:", error);
      setRecordingError("Failed to start recording: " + error.message);
      toast.error("Failed to start recording!", {
        position: "bottom-center",
      });
    }
  }, [createCombinedStream, consultationId]);

  // Stop recording
  const stopRecording = useCallback(() => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop();
      setIsRecording(false);

      // Clean up combined stream
      if (combinedStreamRef.current) {
        combinedStreamRef.current.getTracks().forEach((track) => track.stop());
        combinedStreamRef.current = null;
      }

      // toast.info("Recording stopped", {
      //   position: "bottom-center",
      // });
    }
  }, [isRecording]);

  // Auto-start recording when both streams are available and recording is enabled
  useEffect(() => {
    if (
      isRecordingtoggle &&
      localStream &&
      remoteStream &&
      isConnected &&
      !isRecording
    ) {
      // Start recording automatically after a short delay
      const timer = setTimeout(() => {
        startRecording();
      }, 2000);

      return () => clearTimeout(timer);
    }
  }, [
    isRecordingtoggle,
    localStream,
    remoteStream,
    isConnected,
    isRecording,
    startRecording,
  ]);

  const toggleMute = () => {
    if (localStream) {
      const audioTrack = localStream.getAudioTracks()[0];
      if (audioTrack) {
        audioTrack.enabled = !audioTrack.enabled;
        setIsMuted(!audioTrack.enabled);
      }
    }
  };

  const toggleVideo = () => {
    if (localStream) {
      const videoTrack = localStream.getVideoTracks()[0];
      if (videoTrack) {
        videoTrack.enabled = !videoTrack.enabled;
        setIsVideoOff(!videoTrack.enabled);
      }
    }
  };

  const updateUserAvailability = async (userId, status) => {
    try {
  
       await axiosInstance.patch(
        `/users/psychologists/${userId}/availability`,
        { is_available: status }
      );
    } catch (error) {
      console.error("Availability update failed:", error);
    }
  };

  const startCallDurationTimer = () => {
    callStartTime.current = Date.now();
    callDurationInterval.current = setInterval(() => {
      if (callStartTime.current) {
        setCallDuration(
          Math.floor((Date.now() - callStartTime.current) / 1000)
        );
      }
    }, 1000);
  };

  const stopCallDurationTimer = () => {
    if (callDurationInterval.current) {
      clearInterval(callDurationInterval.current);
      callDurationInterval.current = null;
    }
  };

  const endCall = () => {
    // Stop recording if active
    if (isRecording) {
      stopRecording();
    }

    if (wsRef.current?.readyState === WebSocket.OPEN) {
      wsRef.current.send(
        JSON.stringify({
          type: "call-end",
          senderId: userId,
          sender: userType,
          targetId: targetUserId,
          consultationId: consultationId, // Explicitly include consultationId
          duration: callDuration,
          timestamp: Date.now(),
        })
      );
    }
    cleanup();
    setConnectionStatus("Call ended");
    setIsConnected(false);

    if (userType === "doctor") {
      updateUserAvailability(userId, true).catch(console.error);
    }

    if (onCallEnd) {
      onCallEnd({ consultationId, callDuration, recordedBlob });
    }
  };

  const cleanup = () => {
    stopCallDurationTimer();

    // Stop recording if active
    if (isRecording) {
      stopRecording();
    }

    if (pcRef.current) {
      pcRef.current.ontrack = null;
      pcRef.current.onicecandidate = null;
      pcRef.current.onconnectionstatechange = null;
      pcRef.current.close();
      pcRef.current = null;
    }

    if (wsRef.current) {
      wsRef.current.onmessage = null;
      wsRef.current.onclose = null;
      wsRef.current.onerror = null;
      wsRef.current.close();
      wsRef.current = null;
    }

    if (localStream) {
      localStream.getTracks().forEach((track) => track.stop());
      setLocalStream(null);
    }

    if (remoteStream) {
      remoteStream.getTracks().forEach((track) => track.stop());
      setRemoteStream(null);
    }

    if (combinedStreamRef.current) {
      combinedStreamRef.current.getTracks().forEach((track) => track.stop());
      combinedStreamRef.current = null;
    }

    if (fallbackVideoElement.current) {
      if (document.body.contains(fallbackVideoElement.current)) {
        document.body.removeChild(fallbackVideoElement.current);
      }
      fallbackVideoElement.current = null;
    }

    // Clean up recording references
    mediaRecorderRef.current = null;
    recordedChunksRef.current = [];
    canvasRef.current = null;
    recordingContextRef.current = null;

    setCallDuration(0);
    setIsMuted(false);
    setIsVideoOff(false);
    setIsUsingFallbackVideo(false);
    setIsRecording(false);
    setRecordedBlob(null);
    setRecordingError(null);
    callStartTime.current = null;
  };

  return {
    // State
    targetUserId,
    isMuted,
    isVideoOff,
    isConnected,
    localStream,
    callDuration,
    remoteStream,
    consultationId,
    connectionStatus,
    isUsingFallbackVideo,

    // Recording state
    isRecording,
    recordedBlob,
    recordingError,

    // Refs
    localVideoRef,
    remoteVideoRef,
    wsRef,
    pcRef,

    // Functions
    toggleMute,
    toggleVideo,
    endCall,
    cleanup,
    getUserMediaWithFallback,
    startCallDurationTimer,
    updateUserAvailability,
    checkStreamActive,
    startRecording,
    stopRecording,

    // Setters
    setTargetUserId,
    setConsultationId,
    setCallDuration,
    setConnectionStatus,
    setIsConnected,
    setLocalStream,
    setRemoteStream,
  };
};
