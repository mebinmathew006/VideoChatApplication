// useSocket.js
import { useEffect, useRef } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { socketConnecting, socketConnected, socketDisconnected, socketError } from '../../src/store/socketSlice';
import { createSocket } from './createSocket';

export const useSocket = (userId) => {
  const dispatch = useDispatch();
  const { socket, status } = useSelector((state) => state.socketDetails);
  const retryCountRef = useRef(0);
  const retryTimerRef = useRef(null);

  useEffect(() => {
    if (!userId || status === 'connected') return;

    const connect = () => {
      if (!socket || socket.readyState === WebSocket.CLOSED) {
        dispatch(socketConnecting());
        
        try {
          const newSocket = createSocket(userId, {
            onOpen: (sock) => {
              retryCountRef.current = 0; // Reset retry count on success
              dispatch(socketConnected(sock));
            },
            onClose: () => {
              dispatch(socketDisconnected());
              // Exponential backoff for reconnection
              const delay = Math.min(1000 * Math.pow(2, retryCountRef.current), 30000);
              retryTimerRef.current = setTimeout(() => {
                retryCountRef.current += 1;
                connect();
              }, delay);
            },
            onError: (err) => {
              dispatch(socketError(err));
            }
          });
        } catch (err) {
          dispatch(socketError(err));
        }
      }
    };

    connect();

    return () => {
      clearTimeout(retryTimerRef.current);
      if (socket) socket.close();
    };
  }, [userId, status, dispatch, socket]);

  return socket;
};