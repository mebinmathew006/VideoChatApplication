import React, { useEffect, useRef, useState } from "react";
import { Users, VideoOff, Circle, StopCircle, Download } from "lucide-react";

function VideoCallMain({
  localStream,
  remoteStream,
  localVideoRef,
  remoteVideoRef,
  isVideoOff,
  isUsingFallbackVideo,
  userType,
  // Recording props
  onRecordingStart,
  onRecordingStop,
  onRecordingError,
}) {
  // Recording state
  const [isRecording, setIsRecording] = useState(false);
  const [recordedVideoUrl, setRecordedVideoUrl] = useState(null);
  const [recordingDuration, setRecordingDuration] = useState(0);
  
  // Recording refs
  const mediaRecorderRef = useRef(null);
  const recordedChunksRef = useRef([]);
  const canvasRef = useRef(null);
  const recordingIntervalRef = useRef(null);
  const compositeStreamRef = useRef(null);

  // Timer for recording duration
  useEffect(() => {
    if (isRecording) {
      recordingIntervalRef.current = setInterval(() => {
        setRecordingDuration(prev => prev + 1);
      }, 1000);
    } else {
      if (recordingIntervalRef.current) {
        clearInterval(recordingIntervalRef.current);
      }
      if (!isRecording && recordingDuration > 0) {
        // Reset duration when stopping
        setTimeout(() => setRecordingDuration(0), 1000);
      }
    }
    
    return () => {
      if (recordingIntervalRef.current) {
        clearInterval(recordingIntervalRef.current);
      }
    };
  }, [isRecording, recordingDuration]);

  // Format duration for display
  const formatDuration = (seconds) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  // Create composite stream for recording (combines both videos)
  const createCompositeStream = () => {
    const canvas = canvasRef.current;
    if (!canvas) return null;

    const ctx = canvas.getContext('2d');
    canvas.width = 1280;
    canvas.height = 720;

    const drawFrame = () => {
      if (!isRecording) return;

      // Clear canvas
      ctx.fillStyle = '#1e293b';
      ctx.fillRect(0, 0, canvas.width, canvas.height);

      // Draw remote video (main)
      if (remoteVideoRef?.current && remoteStream) {
        const remoteVideo = remoteVideoRef.current;
        if (remoteVideo.videoWidth > 0) {
          ctx.drawImage(remoteVideo, 0, 0, canvas.width, canvas.height);
        }
      }

      // Draw local video (PiP) - bottom right corner
      if (localVideoRef?.current && localStream && !isVideoOff) {
        const localVideo = localVideoRef.current;
        if (localVideo.videoWidth > 0) {
          const pipWidth = 320;
          const pipHeight = 240;
          const pipX = canvas.width - pipWidth - 20;
          const pipY = canvas.height - pipHeight - 20;
          
          // Draw PiP border
          ctx.strokeStyle = '#ffffff';
          ctx.lineWidth = 2;
          ctx.strokeRect(pipX - 2, pipY - 2, pipWidth + 4, pipHeight + 4);
          
          ctx.drawImage(localVideo, pipX, pipY, pipWidth, pipHeight);
        }
      }

      // Draw recording indicator
      if (isRecording) {
        ctx.fillStyle = '#ef4444';
        ctx.beginPath();
        ctx.arc(50, 50, 15, 0, 2 * Math.PI);
        ctx.fill();
        
        ctx.fillStyle = '#ffffff';
        ctx.font = '16px Arial';
        ctx.fillText('REC', 70, 55);
        ctx.fillText(formatDuration(recordingDuration), 70, 75);
      }

      requestAnimationFrame(drawFrame);
    };

    drawFrame();
    return canvas.captureStream(30); // 30 FPS
  };

  // Start recording
  const startRecording = async () => {
    try {
      // Create composite stream
      const compositeStream = createCompositeStream();
      if (!compositeStream) {
        throw new Error('Failed to create composite stream');
      }

      compositeStreamRef.current = compositeStream;
      recordedChunksRef.current = [];

      // Setup MediaRecorder
      const options = {
        mimeType: 'video/webm;codecs=vp8,opus',
        videoBitsPerSecond: 2500000,
      };

      if (!MediaRecorder.isTypeSupported(options.mimeType)) {
        options.mimeType = 'video/webm';
      }

      mediaRecorderRef.current = new MediaRecorder(compositeStream, options);

      mediaRecorderRef.current.ondataavailable = (event) => {
        if (event.data.size > 0) {
          recordedChunksRef.current.push(event.data);
        }
      };

      mediaRecorderRef.current.onstop = () => {
        const blob = new Blob(recordedChunksRef.current, { type: 'video/webm' });
        const url = URL.createObjectURL(blob);
        setRecordedVideoUrl(url);
        onRecordingStop?.(blob, url);
      };

      mediaRecorderRef.current.start(1000);
      setIsRecording(true);
      setRecordingDuration(0);
      onRecordingStart?.();
      
    } catch (error) {
      console.error('Failed to start recording:', error);
      onRecordingError?.(error);
    }
  };

  // Stop recording
  const stopRecording = () => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop();
      setIsRecording(false);
      
      // Clean up composite stream
      if (compositeStreamRef.current) {
        compositeStreamRef.current.getTracks().forEach(track => track.stop());
      }
    }
  };

  // Download recording
  const downloadRecording = () => {
    if (recordedVideoUrl) {
      const a = document.createElement('a');
      a.href = recordedVideoUrl;
      a.download = `video-call-${Date.now()}.webm`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
    }
  };

  // Debug effect to monitor stream changes
  useEffect(() => {
    console.log("=== VideoCallMain Debug ===");
    console.log("Local stream:", localStream);
    console.log("Remote stream:", remoteStream);
    console.log("Local video ref:", localVideoRef?.current);
    console.log("Remote video ref:", remoteVideoRef?.current);
  }, [localStream, remoteStream]);

  // Effect to handle remote video assignment
  useEffect(() => {
    if (remoteStream && remoteVideoRef?.current) {
      const videoElement = remoteVideoRef.current;
      
      if (videoElement.srcObject !== remoteStream) {
        videoElement.srcObject = remoteStream;
        
        videoElement.onloadedmetadata = () => {
          videoElement.play().catch(e => {
            console.error("Failed to play remote video:", e);
          });
        };
      }
    }
  }, [remoteStream, remoteVideoRef]);

  // Effect to handle local video assignment
  useEffect(() => {
    if (localStream && localVideoRef?.current) {
      const videoElement = localVideoRef.current;
      
      if (videoElement.srcObject !== localStream) {
        videoElement.srcObject = localStream;
        videoElement.play().catch(e => {
          console.error("Failed to play local video:", e);
        });
      }
    }
  }, [localStream, localVideoRef]);

  return (
    <div className="flex-1 relative p-6 ms-90 z-10 max-w-200">
      {/* Hidden canvas for recording */}
      <canvas
        ref={canvasRef}
        style={{ display: 'none' }}
        width={1280}
        height={720}
      />

      {/* Recording Controls */}
      {userType === "patient" && (
        <div className="absolute top-4 right-4 z-20 flex items-center space-x-2">
          <button
            onClick={isRecording ? stopRecording : startRecording}
            className={`p-3 rounded-full transition-all duration-200 ${
              isRecording
                ? "bg-red-500 hover:bg-red-600 text-white shadow-lg animate-pulse"
                : "bg-white/10 hover:bg-white/20 text-white backdrop-blur-sm"
            }`}
            title={isRecording ? "Stop recording" : "Start recording"}
          >
            {isRecording ? <StopCircle size={20} /> : <Circle size={20} />}
          </button>
          
          {recordedVideoUrl && (
            <button
              onClick={downloadRecording}
              className="p-3 rounded-full bg-green-500 hover:bg-green-600 text-white transition-all duration-200"
              title="Download recording"
            >
              <Download size={20} />
            </button>
          )}
        </div>
      )}

      {/* Recording Status */}
      {isRecording && (
        <div className="absolute top-4 left-4 z-20 bg-red-500 text-white px-3 py-2 rounded-lg flex items-center space-x-2">
          <Circle className="w-3 h-3 fill-current animate-pulse" />
          <span className="font-medium">REC {formatDuration(recordingDuration)}</span>
        </div>
      )}

      {/* Remote Video (Main) */}
      <div className="relative rounded-2xl overflow-hidden bg-slate-800/50 backdrop-blur-sm border border-white/10 shadow-2xl min-h-[400px]">
        <video
          ref={remoteVideoRef}
          autoPlay
          playsInline
          className="w-full h-full object-cover"
          style={{ 
            minHeight: '400px',
            backgroundColor: '#1e293b'
          }}
        />
        
        {/* Show waiting message when no remote stream */}
        {!remoteStream && (
          <div className="absolute inset-0 flex items-center justify-center">
            <div className="text-center">
              <div className="w-24 h-24 rounded-full bg-gradient-to-r from-blue-500 to-indigo-500 flex items-center justify-center mb-4 mx-auto animate-pulse">
                <Users size={40} className="text-white" />
              </div>
              <p className="text-white/70 text-lg">
                Waiting for {userType === "doctor" ? "patient" : "doctor"} to join...
              </p>
            </div>
          </div>
        )}

        {/* Remote Video Overlay */}
        {remoteStream && (
          <div className="absolute top-4 left-4 bg-black/40 backdrop-blur-sm rounded-lg px-3 py-2">
            <p className="text-white text-sm font-medium">
              {userType === "doctor" ? "Patient" : "Doctor"}
            </p>
          </div>
        )}
      </div>

      {/* Local Video (Picture-in-Picture) */}
      <div className="absolute bottom-6 right-6 w-64 h-48 rounded-xl overflow-hidden bg-slate-800 border-2 border-white/20 shadow-2xl group hover:scale-105 transition-transform duration-200">
        <video
          ref={localVideoRef}
          autoPlay
          playsInline
          muted
          className="w-full h-full object-cover"
        />
        
        {isVideoOff && (
          <div className="absolute inset-0 bg-slate-800 flex items-center justify-center">
            <div className="w-16 h-16 rounded-full bg-gradient-to-r from-blue-500 to-purple-500 flex items-center justify-center">
              <VideoOff size={24} className="text-white" />
            </div>
          </div>
        )}

        <div className="absolute top-2 left-2 bg-black/50 backdrop-blur-sm rounded px-2 py-1">
          <p className="text-white text-xs">
            {userType === "doctor" ? "Dr. You" : "You"} {isUsingFallbackVideo && "(Fallback)"}
          </p>
        </div>
      </div>

      {/* Recorded Video Preview */}
      {recordedVideoUrl && (
        <div className="absolute bottom-6 left-6 w-80 bg-black/80 backdrop-blur-sm rounded-xl p-4">
          <h3 className="text-white text-sm font-medium mb-2">Recorded Video</h3>
          <video
            src={recordedVideoUrl}
            controls
            className="w-full h-32 object-cover rounded-lg"
          />
          <button
            onClick={downloadRecording}
            className="mt-2 w-full bg-green-500 hover:bg-green-600 text-white px-3 py-1 rounded-lg text-sm transition-colors"
          >
            Download Recording
          </button>
        </div>
      )}
    </div>
  );
}

export default VideoCallMain;