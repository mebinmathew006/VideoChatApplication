import { X } from "lucide-react";
import React from "react";

export default function FilePreview({ file, previewUrl, index, onRemove, getFileIcon, formatFileSize }) {
  return (
    <div className="relative bg-gray-100 rounded-lg p-2 flex items-center space-x-2">
      {previewUrl && file.type.startsWith("image/") ? (
        <img src={previewUrl} alt={file.name} className="w-12 h-12 object-cover rounded" />
      ) : (
        <div className="w-12 h-12 bg-gray-200 rounded flex items-center justify-center">
          {getFileIcon(file.type)}
        </div>
      )}
      <div className="flex-1 min-w-0">
        <div className="text-xs font-medium truncate">{file.name}</div>
        <div className="text-xs text-gray-500">{formatFileSize(file.size)}</div>
      </div>
      <button
        onClick={() => onRemove(index)}
        className="text-red-500 hover:text-red-700"
      >
        <X className="w-4 h-4" />
      </button>
    </div>
  );
}