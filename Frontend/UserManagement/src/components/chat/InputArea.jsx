import { Paperclip, Send } from "lucide-react";
import FilePreview from "./FilePreview";
import React from "react";

export default function InputArea({
  selectedFiles,
  previewUrls,
  inputMessage,
  isConnected,
  onInputChange,
  onKeyPress,
  onFileClick,
  onRemoveFile,
  onSendMessage,
  fileInputRef,
  getFileIcon,
  formatFileSize,
}) {
  return (
    <div className="bg-white rounded-b-2xl shadow-lg p-4">
      {selectedFiles.length > 0 && (
        <div className="mb-3 flex flex-wrap gap-2">
          {selectedFiles.map((file, idx) => (
            <FilePreview
              key={idx}
              file={file}
              previewUrl={previewUrls[idx]}
              index={idx}
              onRemove={onRemoveFile}
              getFileIcon={getFileIcon}
              formatFileSize={formatFileSize}
            />
          ))}
        </div>
      )}

      <div className="flex space-x-2">
        <input
          type="file"
          ref={fileInputRef}
          onChange={onFileClick}
          multiple
          accept="image/*,video/*,.pdf,.doc,.docx,.txt"
          className="hidden"
        />
        <button
          onClick={() => fileInputRef.current?.click()}
          disabled={!isConnected}
          className="px-4 py-3 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-lg transition disabled:bg-gray-50 disabled:cursor-not-allowed"
          title="Attach files"
        >
          <Paperclip className="w-5 h-5" />
        </button>
        <input
          type="text"
          value={inputMessage}
          onChange={(e) => onInputChange(e.target.value)}
          onKeyPress={onKeyPress}
          placeholder="Type a message..."
          disabled={!isConnected}
          className="flex-1 px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent outline-none transition disabled:bg-gray-100"
        />
        <button
          onClick={onSendMessage}
          disabled={
            !isConnected ||
            (!inputMessage.trim() && selectedFiles.length === 0)
          }
          className="px-6 py-3 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg transition disabled:bg-gray-300 disabled:cursor-not-allowed flex items-center space-x-2"
        >
          <Send className="w-5 h-5" />
          <span>Send</span>
        </button>
      </div>
    </div>
  );
}