// createSocket.js
export const createSocket = (userId, {
  onOpen,
  onClose,
  onError,
} = {}) => {
  const socket = new WebSocket(`ws://localhost/consultations/ws/create_socket/${userId}`);

  socket.onopen = () => {
    console.log('Socket connected');
    onOpen?.(socket);
  };

  socket.onclose = () => {
    console.log('Socket disconnected');
    onClose?.();
  };

  socket.onerror = (err) => {
    console.error('Socket error', err);
    onError?.(err);
  };

  return socket;
};
