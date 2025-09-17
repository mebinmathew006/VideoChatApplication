import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Video, VideoOff, Mic, MicOff, Phone, PhoneOff, Users } from 'lucide-react';

const WebRTCVideoRoom = (roomId) => {
  const [isConnected, setIsConnected] = useState(false);
  const [localStream, setLocalStream] = useState(null);
  const [remoteStreams, setRemoteStreams] = useState({});
  const [isVideoEnabled, setIsVideoEnabled] = useState(true);
  const [isAudioEnabled, setIsAudioEnabled] = useState(true);
  const [connectionStatus, setConnectionStatus] = useState('disconnected');
  const [connectedPeers, setConnectedPeers] = useState([]);
  
  const localVideoRef = useRef(null);
  const remoteVideoRefs = useRef({});
  const peerConnections = useRef({});
  const socket = useRef(null);
  
  // STUN servers for NAT traversal
  const iceServers = {
    iceServers: [
      { urls: 'stun:stun.l.google.com:19302' },
      { urls: 'stun:stun1.l.google.com:19302' },
    ]
  };

  // Initialize WebSocket connection for signaling
  const initializeSignaling = useCallback(() => {
    // Replace with your signaling server URL
    socket.current = new WebSocket('ws://localhost:3001');
    
    socket.current.onopen = () => {
      setConnectionStatus('connected');
      console.log('Signaling server connected');
    };
    
    socket.current.onclose = () => {
      setConnectionStatus('disconnected');
      console.log('Signaling server disconnected');
    };
    
    socket.current.onerror = (error) => {
      console.error('WebSocket error:', error);
      setConnectionStatus('error');
    };
    
    socket.current.onmessage = handleSignalingMessage;
  }, []);

  // Handle signaling messages
  const handleSignalingMessage = useCallback(async (event) => {
    const message = JSON.parse(event.data);
    const { type, from, to, data } = message;
    
    switch (type) {
      case 'user-joined':
        setConnectedPeers(prev => [...prev.filter(id => id !== data.userId), data.userId]);
        await createPeerConnection(data.userId, true);
        break;
        
      case 'user-left':
        setConnectedPeers(prev => prev.filter(id => id !== data.userId));
        closePeerConnection(data.userId);
        break;
        
      case 'offer':
        await handleOffer(from, data.offer);
        break;
        
      case 'answer':
        await handleAnswer(from, data.answer);
        break;
        
      case 'ice-candidate':
        await handleIceCandidate(from, data.candidate);
        break;
        
      default:
        console.log('Unknown message type:', type);
    }
  }, []);

  // Create peer connection
  const createPeerConnection = useCallback(async (peerId, shouldCreateOffer) => {
    if (peerConnections.current[peerId]) {
      return;
    }
    
    const pc = new RTCPeerConnection(iceServers);
    peerConnections.current[peerId] = pc;
    
    // Add local stream to peer connection
    if (localStream) {
      localStream.getTracks().forEach(track => {
        pc.addTrack(track, localStream);
      });
    }
    
    // Handle remote stream
    pc.ontrack = (event) => {
      const [remoteStream] = event.streams;
      setRemoteStreams(prev => ({
        ...prev,
        [peerId]: remoteStream
      }));
    };
    
    // Handle ICE candidates
    pc.onicecandidate = (event) => {
      if (event.candidate) {
        sendSignalingMessage({
          type: 'ice-candidate',
          to: peerId,
          data: { candidate: event.candidate }
        });
      }
    };
    
    // Handle connection state changes
    pc.onconnectionstatechange = () => {
      console.log(`Connection with ${peerId}:`, pc.connectionState);
      if (pc.connectionState === 'failed' || pc.connectionState === 'disconnected') {
        closePeerConnection(peerId);
      }
    };
    
    // Create offer if initiator
    if (shouldCreateOffer) {
      const offer = await pc.createOffer();
      await pc.setLocalDescription(offer);
      sendSignalingMessage({
        type: 'offer',
        to: peerId,
        data: { offer }
      });
    }
    
    return pc;
  }, [localStream]);

  // Handle incoming offer
  const handleOffer = useCallback(async (peerId, offer) => {
    const pc = await createPeerConnection(peerId, false);
    await pc.setRemoteDescription(offer);
    
    const answer = await pc.createAnswer();
    await pc.setLocalDescription(answer);
    
    sendSignalingMessage({
      type: 'answer',
      to: peerId,
      data: { answer }
    });
  }, [createPeerConnection]);

  // Handle incoming answer
  const handleAnswer = useCallback(async (peerId, answer) => {
    const pc = peerConnections.current[peerId];
    if (pc) {
      await pc.setRemoteDescription(answer);
    }
  }, []);

  // Handle ICE candidate
  const handleIceCandidate = useCallback(async (peerId, candidate) => {
    const pc = peerConnections.current[peerId];
    if (pc) {
      await pc.addIceCandidate(candidate);
    }
  }, []);

  // Close peer connection
  const closePeerConnection = useCallback((peerId) => {
    if (peerConnections.current[peerId]) {
      peerConnections.current[peerId].close();
      delete peerConnections.current[peerId];
      
      setRemoteStreams(prev => {
        const newStreams = { ...prev };
        delete newStreams[peerId];
        return newStreams;
      });
    }
  }, []);

  // Send signaling message
  const sendSignalingMessage = useCallback((message) => {
    if (socket.current && socket.current.readyState === WebSocket.OPEN) {
      socket.current.send(JSON.stringify({
        roomId,
        ...message
      }));
    }
  }, [roomId]);

  // Get user media
  const startLocalStream = useCallback(async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: true,
        audio: true
      });
      
      setLocalStream(stream);
      if (localVideoRef.current) {
        localVideoRef.current.srcObject = stream;
      }
      
      return stream;
    } catch (error) {
      console.error('Error accessing media devices:', error);
      throw error;
    }
  }, []);

  // Join room
  const joinRoom = useCallback(async () => {
    if (!roomId.trim()) return;
    
    try {
      // Start local stream first
      await startLocalStream();
      
      // Initialize signaling
      initializeSignaling();
      
      // Wait for connection then join room
      setTimeout(() => {
        sendSignalingMessage({
          type: 'join-room',
          data: { roomId }
        });
        setIsConnected(true);
      }, 1000);
      
    } catch (error) {
      console.error('Error joining room:', error);
      alert('Failed to access camera/microphone');
    }
  }, [roomId, startLocalStream, initializeSignaling, sendSignalingMessage]);

  // Leave room
  const leaveRoom = useCallback(() => {
    // Close all peer connections
    Object.keys(peerConnections.current).forEach(closePeerConnection);
    
    // Stop local stream
    if (localStream) {
      localStream.getTracks().forEach(track => track.stop());
      setLocalStream(null);
    }
    
    // Close WebSocket
    if (socket.current) {
      sendSignalingMessage({ type: 'leave-room' });
      socket.current.close();
    }
    
    // Reset state
    setIsConnected(false);
    setRemoteStreams({});
    setConnectedPeers([]);
    setConnectionStatus('disconnected');
  }, [localStream, closePeerConnection, sendSignalingMessage]);

  // Toggle video
  const toggleVideo = useCallback(() => {
    if (localStream) {
      const videoTrack = localStream.getVideoTracks()[0];
      if (videoTrack) {
        videoTrack.enabled = !videoTrack.enabled;
        setIsVideoEnabled(videoTrack.enabled);
      }
    }
  }, [localStream]);

  // Toggle audio
  const toggleAudio = useCallback(() => {
    if (localStream) {
      const audioTrack = localStream.getAudioTracks()[0];
      if (audioTrack) {
        audioTrack.enabled = !audioTrack.enabled;
        setIsAudioEnabled(audioTrack.enabled);
      }
    }
  }, [localStream]);

  // Update remote video refs
  useEffect(() => {
    Object.entries(remoteStreams).forEach(([peerId, stream]) => {
      if (remoteVideoRefs.current[peerId]) {
        remoteVideoRefs.current[peerId].srcObject = stream;
      }
    });
  }, [remoteStreams]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      leaveRoom();
    };
  }, [leaveRoom]);

  return (
    <div className="min-h-screen bg-gray-900 text-white p-4">
      <div className="max-w-6xl mx-auto">
        <h1 className="text-3xl font-bold text-center mb-8">WebRTC Video Room</h1>
        
        {/* Connection Status */}
        <div className="text-center mb-6">
          <span className={`inline-block px-3 py-1 rounded-full text-sm ${
            connectionStatus === 'connected' ? 'bg-green-600' : 
            connectionStatus === 'error' ? 'bg-red-600' : 'bg-yellow-600'
          }`}>
            Status: {connectionStatus}
          </span>
        </div>

        {/* Room Controls */}
        {!isConnected ? (
          <div className="text-center mb-8">
            <div className="inline-block">
              <input
                type="text"
                placeholder="Enter Room ID"
                value={roomId}
                readOnly
                className="px-4 py-2 rounded-l-lg bg-gray-800 border border-gray-600 text-white focus:outline-none focus:border-blue-500"
              />
              <button
                onClick={joinRoom}
                disabled={!roomId.trim() || connectionStatus !== 'connected'}
                className="px-6 py-2 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-600 rounded-r-lg transition-colors"
              >
                Join Room
              </button>
            </div>
          </div>
        ) : (
          <div className="text-center mb-6">
            <div className="flex items-center justify-center gap-4 mb-4">
              <span className="flex items-center gap-2">
                <Users size={20} />
                Room: {roomId}
              </span>
              <span>Connected: {connectedPeers.length + 1}</span>
            </div>
            
            {/* Media Controls */}
            <div className="flex justify-center gap-4 mb-6">
              <button
                onClick={toggleVideo}
                className={`p-3 rounded-full transition-colors ${
                  isVideoEnabled ? 'bg-gray-600 hover:bg-gray-700' : 'bg-red-600 hover:bg-red-700'
                }`}
              >
                {isVideoEnabled ? <Video size={20} /> : <VideoOff size={20} />}
              </button>
              
              <button
                onClick={toggleAudio}
                className={`p-3 rounded-full transition-colors ${
                  isAudioEnabled ? 'bg-gray-600 hover:bg-gray-700' : 'bg-red-600 hover:bg-red-700'
                }`}
              >
                {isAudioEnabled ? <Mic size={20} /> : <MicOff size={20} />}
              </button>
              
              <button
                onClick={leaveRoom}
                className="p-3 rounded-full bg-red-600 hover:bg-red-700 transition-colors"
              >
                <PhoneOff size={20} />
              </button>
            </div>
          </div>
        )}

        {/* Video Grid */}
        {isConnected && (
          <div className={`grid gap-4 ${
            Object.keys(remoteStreams).length === 0 ? 'grid-cols-1 max-w-md mx-auto' :
            Object.keys(remoteStreams).length <= 1 ? 'grid-cols-1 md:grid-cols-2' :
            Object.keys(remoteStreams).length <= 3 ? 'grid-cols-1 md:grid-cols-2 lg:grid-cols-3' :
            'grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4'
          }`}>
            {/* Local Video */}
            <div className="relative bg-gray-800 rounded-lg overflow-hidden aspect-video">
              <video
                ref={localVideoRef}
                autoPlay
                muted
                playsInline
                className="w-full h-full object-cover"
              />
              <div className="absolute bottom-2 left-2 bg-black bg-opacity-60 px-2 py-1 rounded text-sm">
                You {!isVideoEnabled && '(Video Off)'}
              </div>
            </div>
            
            {/* Remote Videos */}
            {Object.entries(remoteStreams).map(([peerId, stream]) => (
              <div key={peerId} className="relative bg-gray-800 rounded-lg overflow-hidden aspect-video">
                <video
                  ref={(el) => {
                    if (el) {
                      remoteVideoRefs.current[peerId] = el;
                      el.srcObject = stream;
                    }
                  }}
                  autoPlay
                  playsInline
                  className="w-full h-full object-cover"
                />
                <div className="absolute bottom-2 left-2 bg-black bg-opacity-60 px-2 py-1 rounded text-sm">
                  User {peerId.slice(-6)}
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Instructions */}
        <div className="mt-8 text-center text-gray-400 text-sm">
          <p>Share the room ID with others to start a video call.</p>
          <p className="mt-2">
            <strong>Note:</strong> You'll need a signaling server for this to work. 
            Replace the WebSocket URL with your server.
          </p>
        </div>
      </div>
    </div>
  );
};

export default WebRTCVideoRoom;