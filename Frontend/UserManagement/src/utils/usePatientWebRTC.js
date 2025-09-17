import { useEffect, useCallback } from "react";
import { useWebRTC } from "./useWebRTC";
import { toast } from "react-toastify";

export const usePatientWebRTC = ({
  patientId,
  doctorId,
  consultationId,
  onCallEnd,
  isRecordingtoggle = false,
}) => {
  const socketBaseUrl = import.meta.env.VITE_WEBSOCKET_URL;
  const signalingURL = `${socketBaseUrl}/consultations/ws/create_signaling/${patientId}`;

  const webRTC = useWebRTC({
    userId: patientId,
    userType: "patient",
    signalingURL,
    onCallEnd,
    isRecordingtoggle, // Pass recording toggle to the base hook
  });

  const {
    wsRef,
    pcRef,
    localVideoRef,
    remoteVideoRef,
    getUserMediaWithFallback,
    startCallDurationTimer,
    setTargetUserId,
    setConsultationId,
    setCallDuration,
    setConnectionStatus,
    setIsConnected,
    setLocalStream,
    setRemoteStream,
    // Recording functions
    startRecording,
    stopRecording,
    isRecording,
    recordedBlob,
    recordingError,
  } = webRTC;

  const initializeWebRTC = async () => {
    setConnectionStatus("Connecting...");

    wsRef.current = new WebSocket(signalingURL);

    await new Promise((resolve, reject) => {
      wsRef.current.onopen = () => {
        console.log("[Patient] WebSocket connected");
        resolve();
      };

      wsRef.current.onerror = (error) => {
        console.error("[Patient] WebSocket error:", error);
        setConnectionStatus("Connection failed");
        reject(error);
      };
    });

    wsRef.current.onmessage = async (event) => {
      const message = JSON.parse(event.data);
      console.log("Incoming WebSocket message:", message);

      if (message.type === "call-answer") {
        await handleCallAnswer(message);
      }

      if (message.type === "ice-candidate" && pcRef.current) {
        await handleIceCandidate(message);
      }

      if (message.type === "call-end") {
        setConsultationId(message.consultationId);
        setCallDuration(message.duration);
        handleCallEnd();
      }
    };

    wsRef.current.onclose = (event) => {
      console.log("WebSocket closed:", event.code, event.reason);
      setConnectionStatus("Disconnected");
      setIsConnected(false);
    };

    await initiateCall();
  };

  const initiateCall = async () => {
    try {
      setConnectionStatus("Starting call...");
      setTargetUserId(doctorId);
      setConsultationId(consultationId);

      const pc = new RTCPeerConnection({
        iceServers: [
          { urls: "stun:stun.l.google.com:19302" }, // Optional extra STUN
          {
            urls: "turn:3.110.225.141:3478",
            username: "user",
            credential: "supersecret",
          },
        ],
      });
      pcRef.current = pc;

      const stream = await getUserMediaWithFallback();
      console.log(
        "✅ Local stream set:",
        stream,
        "Tracks:",
        stream.getTracks()
      );
      setLocalStream(stream);

      if (localVideoRef.current) {
        localVideoRef.current.srcObject = stream;
      }

      stream.getTracks().forEach((track) => {
        console.log(`Adding ${track.kind} track to peer connection`, track);
        pc.addTrack(track, stream);
      });

      pc.ontrack = (event) => {
        console.log("✅ Remote stream received!", event.streams[0]);
        const remoteStream = event.streams[0];

        if (remoteVideoRef.current) {
          remoteVideoRef.current.srcObject = remoteStream;
        }

        console.log("🔄 Setting remote stream...");
        setRemoteStream(remoteStream);
        setIsConnected(true);
        setConnectionStatus("Call connected");
        startCallDurationTimer();
      };

      pc.onicecandidate = (event) => {
        if (event.candidate) {
          wsRef.current.send(
            JSON.stringify({
              type: "ice-candidate",
              targetId: doctorId,
              senderId: patientId,
              candidate: event.candidate,
            })
          );
        }
      };

      pc.onconnectionstatechange = () => {
        console.log("Connection state:", pc.connectionState);
        if (pc.connectionState === "failed") {
          setConnectionStatus("Connection failed");
        }
      };

      const offer = await pc.createOffer();
      await pc.setLocalDescription(offer);
      console.log("✅ Created and set local description");

      wsRef.current.send(
        JSON.stringify({
          type: "call-initiate",
          targetId: doctorId,
          senderId: patientId,
          consultation_id: consultationId,
          offer: pc.localDescription,
        })
      );
      console.log("✅ Sent call initiation");
      setConnectionStatus("Waiting for doctor to accept...");
    } catch (error) {
      console.error("Error initiating call:", error);
      setConnectionStatus("Call initiation failed");
    }
  };

  const handleCallAnswer = async (message) => {
    try {
      await pcRef.current.setRemoteDescription(
        new RTCSessionDescription(message.answer)
      );
      console.log("✅ Set remote description from answer");
    } catch (error) {
      console.error("Error handling call answer:", error);
      setConnectionStatus("Call setup failed");
    }
  };

  const handleIceCandidate = async (message) => {
    try {
      await pcRef.current.addIceCandidate(
        new RTCIceCandidate(message.candidate)
      );
      console.log("✅ Added ICE candidate");
    } catch (err) {
      console.error("[Patient] Failed to add ICE candidate:", err);
    }
  };

  const handleCallEnd = () => {
    setConnectionStatus("Call ended");
    setIsConnected(false);
    webRTC.endCall();
  };

  useEffect(() => {
    initializeWebRTC();
    return () => {
      webRTC.cleanup();
    };
  }, []);

  // Return all webRTC properties plus recording-specific ones
  return {
    ...webRTC,
    // Recording specific properties
    startRecording,
    stopRecording,
    isRecording,
    recordedBlob,
    recordingError,
  };
};
