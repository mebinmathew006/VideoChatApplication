import { Download } from "lucide-react";
import React from "react";

export default function MediaPreview({ media, getFileIcon, formatFileSize }) {
const baseurl = import.meta.env.VITE_BASE_URL_MEDIA;
  if (media.type.startsWith("image/")) {
    return (
      <img  
        src={`${baseurl}${media.url}`}
        alt={media.name}
        className="max-w-xs max-h-64 rounded-lg cursor-pointer hover:opacity-90 transition"
        onClick={() => window.open(media.data, "_blank")}
      />
    );
  }

  if (media.type.startsWith("video/")) {
    return (
      <video
        src={`${baseurl}${media.url}`}
        controls
        className="max-w-xs max-h-64 rounded-lg"
      />
    );
  }

  return (
    <div className="flex items-center space-x-2 bg-gray-100 px-3 py-2 rounded-lg">
      {getFileIcon(media.type)}
      <div className="flex-1 min-w-0">
        <div className="text-sm font-medium truncate">{media.name}</div>
        <div className="text-xs text-gray-500">
          {formatFileSize(media.size)}
        </div>
      </div>
      <a
        href={`${baseurl}${media.url}`}
        download={media.name}
        className="text-indigo-600 hover:text-indigo-700"
      >
        <Download className="w-4 h-4" />
      </a>
    </div>
  );
}