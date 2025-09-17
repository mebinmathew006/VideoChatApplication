import React from 'react';

const MessageBubble = React.memo(({ 
  message, 
  isCurrentUser, 
  senderName, 
  activeUser, 
  userType, 
  formatMessageTime 
}) => {
  const BASE_URL_FOR_MEDIA = import.meta.env.VITE_BASE_URL
  
  const renderAttachment = (attachment) => {
    const fileType = attachment.file_type.split('/')[0];
    const fileSizeMB = (attachment.file_size / (1024 * 1024)).toFixed(2);

    switch (fileType) {
      case 'image':
        return (
          <img 
            src={`${attachment.file_url}`} 
            // src={`${BASE_URL_FOR_MEDIA}/consultations/files/${attachment.filurl}`} 
            alt={`${BASE_URL_FOR_MEDIA}/${attachment.filename}`} 
            className="max-h-60 rounded-md object-contain"
          />
        );
      case 'video':
        return (
          <video controls className="max-h-60 rounded-md">
            <source 
            src={`${attachment.file_url}`} type={attachment.file_type} />
            {/* src={`${BASE_URL_FOR_MEDIA}/consultations/files/${attachment.filename}`} type={attachment.file_type} /> */}
            Your browser does not support the video tag.
          </video>
        );
      case 'audio':
        return (
          <audio controls className="max-w-64">
            <source src={`${attachment.file_url}`} type={attachment.file_type} />
            Your browser does not support the audio element.
          </audio>
        );
      default:
        if (message=='requested for a video call'){
          return(
            <div className='flex'>
              <p>user Requested For another session </p>
              <button>accept</button>
              <button>reject</button>
            </div>
          )
        }
        return (
          <a 
            href={`${attachment.file_url}`}
            target="_blank" 
            rel="noopener noreferrer"
            className="flex items-center p-2 rounded hover:bg-gray-100"
          >
            <div className="mr-2">
              <FileIcon type={fileType} />
            </div>
            <div>
              <div className="text-sm font-medium">{attachment.original_filename}</div>
              <div className="text-xs text-gray-500">{fileSizeMB} MB</div>
            </div>
          </a>
        );
    }
  };

  return (
    <div className={`flex ${isCurrentUser ? "justify-end" : "justify-start"} mb-4`}>
      <div
        className={`flex items-end space-x-2 max-w-xs lg:max-w-md ${
          isCurrentUser ? "flex-row-reverse space-x-reverse" : ""
        }`}
      >
        {!isCurrentUser && (
          <img
            src={
              activeUser?.user?.user_profile?.profile_image ||
              activeUser?.doctor?.profile_image ||
              "/powerpoint-template-icons-b.jpg"
            }
            alt="Avatar"
            className="w-8 h-8 rounded-full"
          />
        )}
        <div className="flex flex-col">
          <span className="text-xs text-gray-500 mb-1">{senderName}</span>
          <div
            className={`px-4 py-2 rounded-2xl ${
              isCurrentUser
                ? "bg-green-900 text-white rounded-br-sm"
                : "bg-white text-gray-900 rounded-bl-sm shadow-sm border border-gray-200"
            }`}
          >
            {/* Text message */}
            {message.message && <p className="text-sm mb-2">{message.message}</p>}
            
            {/* Attachments */}
            {message.attachments?.length > 0 && (
              <div className="space-y-2">
                {message.attachments.map((attachment) => (
                  <div key={attachment.id || attachment.file_url} className="max-w-full">
                    {renderAttachment(attachment)}
                  </div>
                ))}
              </div>
            )}
          </div>
          <span
            className={`text-xs text-gray-500 mt-1 ${
              isCurrentUser ? "text-right" : "text-left"
            }`}
          >
            {formatMessageTime(message.created_at)}
          </span>
        </div>
      </div>
    </div>
  );
});

// Simple file icon component
const FileIcon = ({ type }) => {
  const iconClass = "w-6 h-6 text-gray-500";
  
  switch (type) {
    case 'pdf':
      return <div className={`${iconClass} bg-red-100 rounded p-1`}>PDF</div>;
    case 'video':
      return <div className={`${iconClass} bg-green-100 rounded p-1`}>VID</div>;
    case 'audio':
      return <div className={`${iconClass} bg-purple-100 rounded p-1`}>AUD</div>;
    default:
      return <div className={`${iconClass} bg-gray-100 rounded p-1`}>DOC</div>;
  }
};

export default MessageBubble;