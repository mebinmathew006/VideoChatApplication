import { ChevronUp, Loader } from "lucide-react";
import MessageBubble from "./MessageBubble";
import React from "react";
export default function MessagesContainer({
  messages,
  username,
  messagesEndRef,
  getFileIcon,
  formatFileSize,
  MediaPreview,
  isLoadingMore,
  hasMore,
  onLoadMore,
}) {
  return (
    <div className="flex-1 bg-white p-6 overflow-y-auto relative" id="messages-container">
      {hasMore && (
        <button
          onClick={onLoadMore}
          disabled={isLoadingMore}
          className="w-full mb-4 flex items-center justify-center gap-2 px-4 py-2 bg-blue-100 hover:bg-blue-200 text-blue-700 rounded-lg transition disabled:opacity-50"
        >
          {isLoadingMore ? (
            <Loader className="w-4 h-4 animate-spin" />
          ) : (
            <ChevronUp className="w-4 h-4" />
          )}
          {isLoadingMore ? "Loading..." : "Load More Messages"}
        </button>
      )}

      <div className="space-y-4">
        {messages.length === 0 ? (
          <div className="text-center text-gray-400 py-8">
            No messages yet. Start the conversation!
          </div>
        ) : (
          messages.map((msg) => (
            <div key={msg.id}>
              <MessageBubble
                msg={msg}
                isOwn={msg.username === username}
                getFileIcon={getFileIcon}
                formatFileSize={formatFileSize}
                MediaPreview={MediaPreview}
              />
            </div>
          ))
        )}
        <div ref={messagesEndRef} />
      </div>
    </div>
  );
}