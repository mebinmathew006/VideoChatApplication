// components/chat/UserListItem.js
import React from 'react';

const UserListItem = React.memo(({ 
  user, 
  activeChat, 
  handleUserSelect, 
  formatTime,
  userType = 'doctor'
}) => {
  // For doctor chat, show user info. For user chat, show doctor info
//   const displayUser = userType === 'doctor' ? user.user : user.doctor;
  const displayUser = user.user 
 const userId = userType === 'doctor' ? user.user_id : user.psychologist_id;

//   const userId = userType === 'doctor' ? user.user_id : user.doctor_id;
  
  return (
    <div
      onClick={() => handleUserSelect(userId, user.id)}
      className={`flex items-center p-4 hover:bg-gray-50 cursor-pointer border-b border-gray-100 transition-colors ${
        activeChat === userId
          ? "bg-green-50 border-r-2 border-r-green-500"
          : ""
      }`}
    >
      <div className="relative">
        <img
          src={
            displayUser?.user_profile?.profile_image ||
            displayUser?.profile_image ||
            "/powerpoint-template-icons-b.jpg"
          }
          alt=""
          className="w-12 h-12 rounded-full"
        />
        {user.online && (
          <div className="absolute bottom-0 right-0 w-3 h-3 bg-green-500 border-2 border-white rounded-full"></div>
        )}
      </div>
      <div className="ml-3 flex-1 min-w-0">
        <div className="flex items-center justify-between">
          <p className="text-sm font-medium text-gray-900 truncate">
            {displayUser?.name}
          </p>
          <p className="text-xs text-gray-500">
            {formatTime(user.last_message_time)}
          </p>
        </div>
        <div className="flex items-center justify-between">
          <p className="text-sm text-gray-600 truncate">
            {displayUser?.email}
          </p>
          {user.unread > 0 && (
            <span className="inline-flex items-center justify-center w-5 h-5 text-xs font-bold text-white bg-green-500 rounded-full">
              {user.unread}
            </span>
          )}
        </div>
      </div>
    </div>
  );
});

export default UserListItem;