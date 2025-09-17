// hooks/useDoctorWebRTC.js
import { useEffect } from "react";
import { useWebRTC } from "./useWebRTC";

export const useDoctorWebRTC = ({ doctorId, onCallEnd }) => {
  const socketBaseUrl = import.meta.env.VITE_WEBSOCKET_URL;
  const signalingURL = `${socketBaseUrl}/consultations/ws/create_signaling/${doctorId}`;

  const webRTC = useWebRTC({
    userId: doctorId,
    userType: "doctor",
    signalingURL,
    onCallEnd,
  });

  const {
    wsRef,
    pcRef,
    localVideoRef,
    remoteVideoRef,
    getUserMediaWithFallback,
    startCallDurationTimer,
    updateUserAvailability,
    setTargetUserId,
    setConsultationId,
    setCallDuration,
    setConnectionStatus,
    setIsConnected,
    setLocalStream,
    setRemoteStream,
  } = webRTC;

  const initializeWebRTC = async () => {
    setConnectionStatus("Connecting...");

    wsRef.current = new WebSocket(signalingURL);

    await new Promise((resolve, reject) => {
      wsRef.current.onopen = () => {
        console.log("[Doctor] WebSocket connected");
        setConnectionStatus("Waiting for patient...");
        resolve();
      };

      wsRef.current.onerror = (error) => {
        console.error("[Doctor] WebSocket error:", error);
        setConnectionStatus("Connection failed");
        reject(error);
      };
    });

    wsRef.current.onmessage = async (event) => {
      const message = JSON.parse(event.data);
      console.log("Incoming WebSocket message:", message);

      if (message.type === "call-initiate") {
        await handleCallInitiate(message);
      }

      if (message.type === "ice-candidate" && pcRef.current) {
        await handleIceCandidate(message);
      }

      if (message.type === "call-end") {
        setConsultationId(message.consultationId);
        setCallDuration(message.duration);

        handleCallEnd(message.consultationId, message.duration);
      }
    };

    wsRef.current.onclose = (event) => {
      console.log("WebSocket closed:", event.code, event.reason);
      setConnectionStatus("Disconnected");
      setIsConnected(false);
    };
  };

  const handleCallInitiate = async (message) => {
    try {
      updateUserAvailability(doctorId, false).catch(console.error);
      const incomingUserId = message.senderId;
      setConsultationId(message.consultation_id);
      setTargetUserId(incomingUserId);
      setConnectionStatus("Patient connecting...");

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

      // Get media stream
      const stream = await getUserMediaWithFallback();
      setLocalStream(stream);

      if (localVideoRef.current) {
        localVideoRef.current.srcObject = stream;
      }

      // Add tracks to peer connection
      stream.getTracks().forEach((track) => {
        console.log(`Adding ${track.kind} track to peer connection`);
        pc.addTrack(track, stream);
      });

      pc.ontrack = (event) => {
        console.log("✅ Remote stream received!", event.streams[0]);
        const remoteStream = event.streams[0];

        if (remoteVideoRef.current) {
          remoteVideoRef.current.srcObject = remoteStream;
        }

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
              targetId: incomingUserId,
              senderId: doctorId,
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

      await pc.setRemoteDescription(new RTCSessionDescription(message.offer));
      console.log("✅ Set remote description");

      const answer = await pc.createAnswer();
      await pc.setLocalDescription(answer);
      console.log("✅ Created and set local description");

      wsRef.current.send(
        JSON.stringify({
          type: "call-answer",
          targetId: incomingUserId,
          senderId: doctorId,
          answer: pc.localDescription,
        })
      );
      console.log("✅ Sent answer");
    } catch (error) {
      console.error("Error in call initiate:", error);
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
      console.error("[Doctor] Failed to add ICE candidate:", err);
    }
  };

  const handleCallEnd = (consultationId, duration) => {
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

  return webRTC;
};
