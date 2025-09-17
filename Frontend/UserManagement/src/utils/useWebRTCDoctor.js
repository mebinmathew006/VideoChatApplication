// useWebRTCDoctor.js
import { useEffect, useRef, useState, useCallback } from "react";

export function useWebRTCDoctor({ socket }) {
  const [localStream, setLocalStream] = useState(null);
  const [remoteStream, setRemoteStream] = useState(null);
  const [connectionState, setConnectionState] = useState("disconnected");
  const [error, setError] = useState(null);

  const peerRef = useRef(null);
  const remoteUserIdRef = useRef(null);

  const cleanup = useCallback(() => {
    if (peerRef.current) {
      peerRef.current.close();
      peerRef.current = null;
    }
    if (localStream) {
      localStream.getTracks().forEach(track => track.stop());
      setLocalStream(null);
    }
    setRemoteStream(null);
    setConnectionState("disconnected");
  }, [localStream]);

  useEffect(() => {
    if (!socket || socket.readyState !== WebSocket.OPEN) {
      cleanup();
      return;
    }

    const peer = new RTCPeerConnection({
      iceServers: [{ urls: "stun:stun.l.google.com:19302" }]
    });
    peerRef.current = peer;
    setConnectionState("connecting");

    const handleIceCandidate = (event) => {
      if (event.candidate && remoteUserIdRef.current) {
        socket.send(JSON.stringify({
          to: remoteUserIdRef.current,
          type: "ice-candidate",
          payload: event.candidate
        }));
      }
    };

    const handleTrack = (event) => {
      setRemoteStream(event.streams[0]);
      setConnectionState("connected");
    };

    peer.onicecandidate = handleIceCandidate;
    peer.ontrack = handleTrack;

    const initMedia = async () => {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({
          video: true,
          audio: true
        });
        stream.getTracks().forEach(track => peer.addTrack(track, stream));
        setLocalStream(stream);
      } catch (err) {
        setError(err);
        setConnectionState("failed");
        cleanup();
      }
    };

    const handleMessage = async (event) => {
      try {
        const data = JSON.parse(event.data);
        if (!peerRef.current) return;

        switch (data.type) {
          case "offer":
            remoteUserIdRef.current = data.from;
            await peerRef.current.setRemoteDescription(data.payload);
            const answer = await peerRef.current.createAnswer();
            await peerRef.current.setLocalDescription(answer);
            socket.send(JSON.stringify({
              to: remoteUserIdRef.current,
              type: "answer",
              payload: answer
            }));
            break;
          case "ice-candidate":
            try {
              await peerRef.current.addIceCandidate(new RTCIceCandidate(data.payload));
            } catch (err) {
              console.error("Error adding ICE candidate:", err);
            }
            break;
          default:
            break;
        }
      } catch (err) {
        console.error("Error handling message:", err);
        setError(err);
      }
    };

    initMedia();
    socket.addEventListener("message", handleMessage);

    return () => {
      cleanup();
      socket.removeEventListener("message", handleMessage);
    };
  }, [socket, cleanup]);

  return { localStream, remoteStream, connectionState, error };
}