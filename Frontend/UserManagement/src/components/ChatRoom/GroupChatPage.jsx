import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Send, Paperclip, X, Image, File, Video, Mic, Menu, LogOut, Users } from 'lucide-react';

const GroupChatPage = () => {
  // Get roomId from URL or props - adjust based on your routing setup
  const [roomId] = useState(() => {
  const params = new URLSearchParams(window.location.search);
  return params.get('roomId');
});
  
  // WebSocket
  const ws = useRef(null);
  const [connectionStatus, setConnectionStatus] = useState('Connecting...');
  const [isConnected, setIsConnected] = useState(false);
  
  // Messages
  const [messages, setMessages] = useState([]);
  const [newMessage, setNewMessage] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const [typingUsers, setTypingUsers] = useState([]);
  
  // Files
  const [attachedFiles, setAttachedFiles] = useState([]);
  const fileInputRef = useRef(null);
  
  // Room info
  const [onlineUsers, setOnlineUsers] = useState([]);
  
  // UI
  const [showSidebar, setShowSidebar] = useState(false);
  const messagesEndRef = useRef(null);
  const typingTimeoutRef = useRef(null);
  
  // Current user (simulated - replace with your auth)
  const [currentUser] = useState({
    id: Math.floor(Math.random() * 1000),
    name: 'User' + Math.floor(Math.random() * 100)
  });

  // WebSocket connection
  useEffect(() => {
    if (!roomId) return;

    // Replace with your actual WebSocket URL
    const token = 'your-auth-token'; // Get from localStorage or context
    const wsUrl = `ws://127.0.0.1:8000/ws/chat/${roomId}/?token=${token}`;
    
    console.log('Connecting to:', wsUrl);
    ws.current = new WebSocket(wsUrl);

    ws.current.onopen = () => {
      console.log('WebSocket Connected');
      setConnectionStatus('Connected');
      setIsConnected(true);
    };

    ws.current.onclose = () => {
      console.log('WebSocket Disconnected');
      setConnectionStatus('Disconnected');
      setIsConnected(false);
    };

    ws.current.onerror = (error) => {
      console.error('WebSocket Error:', error);
      setConnectionStatus('Connection Error');
      setIsConnected(false);
    };

    ws.current.onmessage = (event) => {
      const data = JSON.parse(event.data);
      handleWebSocketMessage(data);
    };

    // Cleanup
    return () => {
      if (ws.current) {
        ws.current.close();
      }
    };
  }, [roomId]);

  // Handle incoming WebSocket messages
  const handleWebSocketMessage = (data) => {
    console.log('Received:', data);

    switch (data.type) {
      case 'connection_established':
        console.log('Connected to room:', data.room_id);
        fetchMessageHistory();
        break;

      case 'chat_message':
        setMessages(prev => [...prev, data.message]);
        scrollToBottom();
        break;

      case 'typing':
        handleTypingIndicator(data);
        break;

      case 'user_join':
        setOnlineUsers(prev => {
          const exists = prev.find(u => u.id === data.user_id);
          if (!exists) {
            return [...prev, { id: data.user_id, name: data.user_name }];
          }
          return prev;
        });
        addSystemMessage(`${data.user_name} joined the chat`);
        break;

      case 'user_leave':
        setOnlineUsers(prev => prev.filter(u => u.id !== data.user_id));
        addSystemMessage(`${data.user_name} left the chat`);
        break;

      case 'message_history':
        setMessages(data.messages);
        scrollToBottom();
        break;

      case 'video_call_request':
        handleVideoCallRequest(data);
        break;

      case 'video_call_response':
        handleVideoCallResponse(data);
        break;

      case 'error':
        console.error('Server error:', data.message);
        alert('Error: ' + data.message);
        break;

      default:
        console.log('Unknown message type:', data.type);
    }
  };

  // Send message
  const handleSendMessage = useCallback(async () => {
    if ((!newMessage.trim() && attachedFiles.length === 0) || !isConnected) return;

    const messageData = {
      type: 'chat_message',
      message: newMessage.trim(),
      attachments: []
    };

    // Handle file attachments
    if (attachedFiles.length > 0) {
      for (const file of attachedFiles) {
        const base64 = await fileToBase64(file.file);
        messageData.attachments.push({
          file: base64,
          name: file.name,
          type: file.type
        });
      }
    }

    ws.current.send(JSON.stringify(messageData));
    setNewMessage('');
    setAttachedFiles([]);
    stopTyping();
  }, [newMessage, attachedFiles, isConnected]);

  // Typing indicator
  const handleTyping = useCallback(() => {
    if (!isConnected) return;

    if (!isTyping) {
      setIsTyping(true);
      ws.current.send(JSON.stringify({
        type: 'typing',
        is_typing: true
      }));
    }

    if (typingTimeoutRef.current) {
      clearTimeout(typingTimeoutRef.current);
    }

    typingTimeoutRef.current = setTimeout(() => {
      stopTyping();
    }, 3000);
  }, [isConnected, isTyping]);

  const stopTyping = () => {
    if (isTyping && isConnected) {
      setIsTyping(false);
      ws.current.send(JSON.stringify({
        type: 'typing',
        is_typing: false
      }));
    }
  };

  const handleTypingIndicator = (data) => {
    if (data.is_typing) {
      setTypingUsers(prev => {
        if (!prev.find(u => u.id === data.user_id)) {
          return [...prev, { id: data.user_id, name: data.user_name }];
        }
        return prev;
      });
    } else {
      setTypingUsers(prev => prev.filter(u => u.id !== data.user_id));
    }
  };

  // File handling
  const handleFileSelect = (e) => {
    const files = Array.from(e.target.files);
    const newFiles = files.map(file => ({
      id: Date.now() + Math.random(),
      file,
      name: file.name,
      size: file.size,
      type: file.type,
      preview: file.type.startsWith('image/') ? URL.createObjectURL(file) : null
    }));
    setAttachedFiles(prev => [...prev, ...newFiles]);
  };

  const removeFile = (fileId) => {
    setAttachedFiles(prev => {
      const file = prev.find(f => f.id === fileId);
      if (file?.preview) URL.revokeObjectURL(file.preview);
      return prev.filter(f => f.id !== fileId);
    });
  };

  const fileToBase64 = (file) => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.readAsDataURL(file);
      reader.onload = () => resolve(reader.result);
      reader.onerror = error => reject(error);
    });
  };

  // Fetch message history
  const fetchMessageHistory = () => {
    if (ws.current && isConnected) {
      ws.current.send(JSON.stringify({
        type: 'fetch_messages',
        limit: 50,
        offset: 0
      }));
    }
  };

  // Video call
  const handleVideoCallRequest = (data) => {
    const accept = window.confirm(`${data.caller_name} wants to start a video call. Accept?`);
    ws.current.send(JSON.stringify({
      type: 'video_call_response',
      caller_id: data.caller_id,
      accepted: accept
    }));
  };

  const handleVideoCallResponse = (data) => {
    if (data.accepted) {
      alert(`${data.responder_name} accepted the video call!`);
    } else {
      alert(`${data.responder_name} rejected the video call`);
    }
  };

  const requestVideoCall = () => {
    if (onlineUsers.length === 0) {
      alert('No other users online');
      return;
    }
    ws.current.send(JSON.stringify({
      type: 'video_call_request',
      target_user_id: null
    }));
  };

  // Utilities
  const addSystemMessage = (text) => {
    setMessages(prev => [...prev, {
      id: Date.now() + Math.random(),
      message: text,
      sender: 'system',
      created_at: new Date().toISOString()
    }]);
  };

  const scrollToBottom = () => {
    setTimeout(() => {
      messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, 100);
  };

  const formatTime = (dateString) => {
    const date = new Date(dateString);
    return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };

  const formatFileSize = (bytes) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  const getFileIcon = (fileType) => {
    if (fileType?.startsWith('image/')) return <Image className="w-4 h-4" />;
    if (fileType?.startsWith('video/')) return <Video className="w-4 h-4" />;
    if (fileType?.startsWith('audio/')) return <Mic className="w-4 h-4" />;
    return <File className="w-4 h-4" />;
  };

  const handleExit = () => {
    if (window.confirm('Are you sure you want to leave this chat?')) {
      window.location.href = '/';
    }
  };

  return (
    <div className="flex h-screen bg-gradient-to-br from-blue-50 to-green-50">
      {/* Sidebar */}
      <div className={`${showSidebar ? 'translate-x-0' : '-translate-x-full'} fixed inset-y-0 left-0 z-10 w-80 bg-white border-r border-gray-200 transform transition-transform duration-300 lg:translate-x-0 lg:static`}>
        <div className="flex flex-col h-full">
          {/* Sidebar Header */}
          <div className="p-4 border-b border-gray-200">
            <div className="flex items-center justify-between mb-2">
              <h2 className="text-lg font-semibold text-gray-900">Room Info</h2>
              <button
                onClick={() => setShowSidebar(false)}
                className="lg:hidden p-2 hover:bg-gray-100 rounded-full"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className={`text-sm font-medium ${isConnected ? 'text-green-500' : 'text-red-500'}`}>
              {connectionStatus}
            </div>
          </div>

          {/* Online Users */}
          <div className="flex-1 overflow-y-auto p-4">
            <div className="mb-4">
              <h3 className="text-sm font-semibold text-gray-700 mb-2 flex items-center">
                <Users className="w-4 h-4 mr-2" />
                Online Users ({onlineUsers.length})
              </h3>
              <div className="space-y-2">
                {onlineUsers.length === 0 ? (
                  <p className="text-sm text-gray-500">No other users online</p>
                ) : (
                  onlineUsers.map(user => (
                    <div key={user.id} className="flex items-center space-x-2 p-2 bg-green-50 rounded-lg">
                      <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                      <span className="text-sm text-gray-700">{user.name}</span>
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>

          {/* Exit Button */}
          <div className="p-4 border-t border-gray-200">
            <button
              onClick={handleExit}
              className="w-full flex items-center justify-center space-x-2 px-4 py-3 text-red-600 hover:bg-red-50 rounded-lg transition-colors"
            >
              <LogOut className="w-5 h-5" />
              <span className="font-medium">Leave Room</span>
            </button>
          </div>
        </div>
      </div>

      {/* Main Chat Area */}
      <div className="flex-1 flex flex-col">
        {/* Header */}
        <div className="bg-white border-b border-gray-200 px-4 py-3 flex items-center justify-between shadow-sm">
          <div className="flex items-center space-x-3">
            <button
              onClick={() => setShowSidebar(true)}
              className="lg:hidden p-2 hover:bg-gray-100 rounded-full"
            >
              <Menu className="w-5 h-5" />
            </button>
            <div>
              <h1 className="font-semibold text-gray-900">Group Chat</h1>
              <p className="text-sm text-gray-500">Room #{roomId}</p>
            </div>
          </div>

          <button
            onClick={requestVideoCall}
            disabled={!isConnected}
            className="flex items-center space-x-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            <Video className="w-4 h-4" />
            <span className="hidden sm:inline">Video Call</span>
          </button>
        </div>

        {/* Messages Area */}
        <div className="flex-1 overflow-y-auto p-4 space-y-4">
          {messages.length === 0 && (
            <div className="flex justify-center items-center h-full">
              <div className="text-center text-gray-500">
                <p className="text-lg font-medium mb-2">No messages yet</p>
                <p className="text-sm">Start the conversation!</p>
              </div>
            </div>
          )}

          {messages.map((message, index) => {
            const isCurrentUser = message.sender_id === currentUser.id;
            const isSystem = message.sender === 'system';

            if (isSystem) {
              return (
                <div key={index} className="flex justify-center">
                  <div className="bg-gray-200 text-gray-600 text-xs px-3 py-1 rounded-full">
                    {message.message}
                  </div>
                </div>
              );
            }

            return (
              <div key={message.id || index} className={`flex ${isCurrentUser ? 'justify-end' : 'justify-start'}`}>
                <div className={`max-w-xs lg:max-w-md ${isCurrentUser ? 'items-end' : 'items-start'} flex flex-col`}>
                  <span className="text-xs text-gray-500 mb-1">
                    {isCurrentUser ? 'You' : message.sender_name}
                  </span>
                  <div className={`px-4 py-2 rounded-2xl ${
                    isCurrentUser
                      ? 'bg-green-600 text-white rounded-br-sm'
                      : 'bg-white text-gray-900 rounded-bl-sm border border-gray-200'
                  }`}>
                    {message.message && <p className="text-sm break-words">{message.message}</p>}
                    
                    {message.attachments?.length > 0 && (
                      <div className="space-y-2 mt-2">
                        {message.attachments.map((att, idx) => (
                          <div key={idx}>
                            {att.file_type?.startsWith('image/') && (
                              <img src={att.file_url} alt="" className="max-h-60 rounded-md" />
                            )}
                            {att.file_type?.startsWith('video/') && (
                              <video controls className="max-h-60 rounded-md">
                                <source src={att.file_url} type={att.file_type} />
                              </video>
                            )}
                            {att.file_type?.startsWith('audio/') && (
                              <audio controls className="max-w-64">
                                <source src={att.file_url} type={att.file_type} />
                              </audio>
                            )}
                            {!att.file_type?.startsWith('image/') && !att.file_type?.startsWith('video/') && !att.file_type?.startsWith('audio/') && (
                              <a
                                href={att.file_url}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="flex items-center p-2 rounded hover:bg-gray-100 text-sm"
                              >
                                {getFileIcon(att.file_type)}
                                <span className="ml-2">{att.original_filename}</span>
                              </a>
                            )}
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                  <span className="text-xs text-gray-500 mt-1">
                    {formatTime(message.created_at)}
                  </span>
                </div>
              </div>
            );
          })}

          {/* Typing Indicator */}
          {typingUsers.length > 0 && (
            <div className="flex justify-start">
              <div className="bg-white px-4 py-2 rounded-2xl border border-gray-200">
                <div className="flex items-center space-x-2">
                  <div className="flex space-x-1">
                    <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce"></div>
                    <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0.1s' }}></div>
                    <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0.2s' }}></div>
                  </div>
                  <span className="text-xs text-gray-500">
                    {typingUsers.map(u => u.name).join(', ')} {typingUsers.length === 1 ? 'is' : 'are'} typing...
                  </span>
                </div>
              </div>
            </div>
          )}

          <div ref={messagesEndRef} />
        </div>

        {/* Input Area */}
        <div className="bg-white border-t border-gray-200">
          {/* File Attachments Preview */}
          {attachedFiles.length > 0 && (
            <div className="px-4 pt-3 border-b border-gray-100">
              <div className="flex flex-wrap gap-2 max-h-32 overflow-y-auto">
                {attachedFiles.map(file => (
                  <div key={file.id} className="flex items-center gap-2 bg-gray-50 rounded-lg p-2 border border-gray-200 group">
                    {file.preview ? (
                      <img src={file.preview} alt="" className="w-8 h-8 object-cover rounded" />
                    ) : (
                      <div className="w-8 h-8 bg-gray-200 rounded flex items-center justify-center">
                        {getFileIcon(file.type)}
                      </div>
                    )}
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-gray-700 truncate">{file.name}</p>
                      <p className="text-xs text-gray-500">{formatFileSize(file.size)}</p>
                    </div>
                    <button onClick={() => removeFile(file.id)} className="opacity-0 group-hover:opacity-100 p-1 hover:bg-gray-200 rounded transition-opacity">
                      <X className="w-3 h-3" />
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Input */}
          <div className="p-4 flex items-end gap-3">
            <input
              ref={fileInputRef}
              type="file"
              multiple
              onChange={handleFileSelect}
              className="hidden"
              accept="image/*,video/*,audio/*,.pdf,.doc,.docx"
            />
            <button
              onClick={() => fileInputRef.current?.click()}
              disabled={!isConnected}
              className="p-2.5 text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded-full disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              title="Attach files"
            >
              <Paperclip className="w-5 h-5" />
            </button>

            <textarea
              value={newMessage}
              onChange={(e) => {
                setNewMessage(e.target.value);
                handleTyping();
              }}
              onKeyPress={(e) => {
                if (e.key === 'Enter' && !e.shiftKey) {
                  e.preventDefault();
                  handleSendMessage();
                }
              }}
              placeholder="Type a message..."
              className="flex-1 px-4 py-3 rounded-2xl border border-gray-300 focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent resize-none max-h-32 min-h-[48px]"
              disabled={!isConnected}
              rows={1}
              onInput={(e) => {
                e.target.style.height = 'auto';
                e.target.style.height = Math.min(e.target.scrollHeight, 128) + 'px';
              }}
            />

            <button
              onClick={handleSendMessage}
              disabled={(!newMessage.trim() && attachedFiles.length === 0) || !isConnected}
              className="p-2.5 bg-green-600 text-white rounded-full hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              title="Send message"
            >
              <Send className="w-5 h-5" />
            </button>
          </div>

          {/* Connection Status */}
          {!isConnected && (
            <div className="px-4 pb-3 flex items-center gap-2 text-sm text-red-500">
              <div className="w-2 h-2 bg-red-400 rounded-full"></div>
              Disconnected - Check your connection
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default GroupChatPage;