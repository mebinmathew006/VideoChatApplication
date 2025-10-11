import React from 'react';
import { BrowserRouter, Routes, Route, useNavigate, useLocation } from 'react-router-dom';
import GroupChatPage from './GroupChatPage';

const GroupChatPageWrapper = () => {
  const location = useLocation();
  const { roomId } = location.state || {};
    
  return <GroupChatPage roomId={roomId} />;
};

export default  GroupChatPageWrapper