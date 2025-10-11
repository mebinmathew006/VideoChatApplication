import React from "react";

export default function MessageBubble({ msg, isOwn, getFileIcon, formatFileSize, MediaPreview }) {
  if (msg.type === "system") {
    return (
      <div className="text-center text-sm text-gray-500 py-2">
        {msg.message}
      </div>
    );
  }

  return (
    <div className={`flex ${isOwn ? "justify-end" : "justify-start"}`}>
      <div
        className={`max-w-md px-4 py-2 rounded-2xl ${
          isOwn ? "bg-indigo-600 text-white" : "bg-gray-200 text-gray-800"
        }`}
      >
        <div className="font-semibold text-sm mb-1">{msg.username}</div>
        {msg.message && <div className="mb-2">{msg.message}</div>}
        {msg.media && msg.media.length > 0 && (
          <div className="space-y-2 mt-2">
            {msg.media.map((media, idx) => (
              <MediaPreview key={idx} media={media} />
            ))}
          </div>
        )}
        <div
          className={`text-xs mt-1 ${
            isOwn ? "text-indigo-200" : "text-gray-500"
          }`}
        >
          {msg.timestamp}
        </div>
      </div>
    </div>
  );
}