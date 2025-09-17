import React, { useRef, useCallback, useState } from 'react';
import { Send, Paperclip, X, Image, File, Video, Mic } from 'lucide-react';


const MessageInput = ({
  newMessage,
  setNewMessage,
  handleSendMessage,
  isConnected,
  onFileUpload ,
  activeChat
}) => {
  const inputRef = useRef(null);
  const fileInputRef = useRef(null);
  const [attachedFiles, setAttachedFiles] = useState([]);
  const [isDragOver, setIsDragOver] = useState(false);

  const handleKeyPress = useCallback((e) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage(attachedFiles);
      setAttachedFiles([]);
    }
  }, [handleSendMessage, attachedFiles]);

  const handleFileSelect = useCallback((e) => {
    const files = Array.from(e.target.files);
    handleFiles(files);
  }, []);

  const handleFiles = useCallback((files) => {
    const validFiles = files.filter(file => {
      // Accept images, videos, audio, and documents
      const allowedTypes = [
        'image/', 'video/', 'audio/', 
        'application/pdf', 'text/', 'application/msword',
        'application/vnd.openxmlformats-officedocument'
      ];
      return allowedTypes.some(type => file.type.startsWith(type));
    });

    const newFiles = validFiles.map(file => ({
      id: Date.now() + Math.random(),
      file,
      name: file.name,
      size: file.size,
      type: file.type,
      preview: file.type.startsWith('image/') ? URL.createObjectURL(file) : null
    }));

    setAttachedFiles(prev => [...prev, ...newFiles]);
    
    // Call parent handler if provided
    if (onFileUpload) {
      onFileUpload(newFiles);
    }
  }, [onFileUpload]);

  const removeFile = useCallback((fileId) => {
    setAttachedFiles(prev => {
      const updated = prev.filter(f => f.id !== fileId);
      // Revoke object URLs to prevent memory leaks
      const removedFile = prev.find(f => f.id === fileId);
      if (removedFile?.preview) {
        URL.revokeObjectURL(removedFile.preview);
      }
      return updated;
    });
  }, []);

  const handleDragOver = useCallback((e) => {
    e.preventDefault();
    setIsDragOver(true);
  }, []);

  const handleDragLeave = useCallback((e) => {
    e.preventDefault();
    setIsDragOver(false);
  }, []);

  const handleDrop = useCallback((e) => {
    e.preventDefault();
    setIsDragOver(false);
    const files = Array.from(e.dataTransfer.files);
    handleFiles(files);
  }, [handleFiles]);

  const getFileIcon = (fileType) => {
    if (fileType.startsWith('image/')) return <Image className="w-4 h-4" />;
    if (fileType.startsWith('video/')) return <Video className="w-4 h-4" />;
    if (fileType.startsWith('audio/')) return <Mic className="w-4 h-4" />;
    return <File className="w-4 h-4" />;
  };

  const formatFileSize = (bytes) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  const  handleSend = async () => {
    handleSendMessage(attachedFiles);
    setAttachedFiles([]);
  };

  return (
    <div className="bg-gradient-to-br from-blue-50 to-green-50 border-t border-gray-200">
      {/* File Attachments Preview */}
      {attachedFiles.length > 0 && (
        <div className="px-4 pt-3 border-b border-gray-100">
          <div className="flex flex-wrap gap-2 max-h-32 overflow-y-auto">
            {attachedFiles.map((file) => (
              <div
                key={file.id}
                className="flex items-center gap-2 bg-gray-50 rounded-lg p-2 border border-gray-200 group hover:bg-gray-100 transition-colors"
              >
                {file.preview ? (
                  <img
                    src={file.preview}
                    alt={file.name}
                    className="w-8 h-8 object-cover rounded"
                  />
                ) : (
                  <div className="w-8 h-8 bg-gray-200 rounded flex items-center justify-center">
                    {getFileIcon(file.type)}
                  </div>
                )}
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-gray-700 truncate">
                    {file.name}
                  </p>
                  <p className="text-xs text-gray-500">
                    {formatFileSize(file.size)}
                  </p>
                </div>
                <button
                  onClick={() => removeFile(file.id)}
                  className="opacity-0 group-hover:opacity-100 transition-opacity p-1 hover:bg-gray-200 rounded"
                >
                  <X className="w-3 h-3 text-gray-500" />
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Input Area */}
      <div
        className={`p-4 ${isDragOver ? 'bg-green-50' : ''} transition-colors`}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
      >
        {isDragOver && (
          <div className="absolute inset-0 bg-green-50 border-2 border-dashed border-green-300 rounded-lg flex items-center justify-center z-10">
            <div className="text-center">
              <Paperclip className="w-8 h-8 text-green-500 mx-auto mb-2" />
              <p className="text-green-600 font-medium">Drop files here to attach</p>
            </div>
          </div>
        )}

        <div className="flex items-end gap-3">
          {/* File Upload Button */}
          <div className="relative">
            <input
              ref={fileInputRef}
              type="file"
              multiple
              onChange={handleFileSelect}
              className="hidden"
              accept="image/*,video/*,audio/*,.pdf,.doc,.docx,.txt"
            />
            <button
              onClick={() => fileInputRef.current?.click()}
              disabled={!isConnected}
              className="p-2.5 text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded-full transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              title="Attach files"
            >
              <Paperclip className="w-5 h-5" />
            </button>
          </div>

          {/* Message Input */}
          <div className="flex-1 relative">
            <textarea
              ref={inputRef}
              value={newMessage}
              onChange={(e) => setNewMessage(e.target.value)}
              onKeyPress={handleKeyPress}
              placeholder="Type a message..."
              className="w-full px-4 py-3 pr-12 rounded-2xl border border-gray-300 focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent resize-none max-h-32 min-h-[48px]"
              disabled={!isConnected}
              rows={1}
              style={{
                height: 'auto',
                minHeight: '48px'
              }}
              onInput={(e) => {
                e.target.style.height = 'auto';
                e.target.style.height = Math.min(e.target.scrollHeight, 128) + 'px';
              }}
            />
          </div>

          {/* Send Button */}
          <button
            onClick={handleSend}
            disabled={(!newMessage.trim() && attachedFiles.length === 0) || !isConnected}
            className="p-2.5 bg-green-500 text-white rounded-full hover:bg-green-600 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            title="Send message"
          >
            <Send className="w-5 h-5" />
          </button>
        </div>

        {/* Connection Status Indicator */}
        {!isConnected && (
          <div className="flex items-center gap-2 mt-2 text-sm text-gray-500">
            <div className="w-2 h-2 bg-red-400 rounded-full"></div>
            Disconnected - Check your connection
          </div>
        )}
      </div>
    </div>
  );
};

export default MessageInput;