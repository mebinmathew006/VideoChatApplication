import { useEffect, useRef } from 'react';
import { useNotifications } from './NotificationContext';

export const useNotificationSound = (soundUrl = '/notification.wav') => {
  const { notifications } = useNotifications();
  const audioRef = useRef(null);
  const prevNotificationCount = useRef(0);

  useEffect(() => {
    // Create audio element
    audioRef.current = new Audio(soundUrl);
    audioRef.current.volume = 0.5;

    return () => {
      if (audioRef.current) {
        audioRef.current.pause();
        audioRef.current = null;
      }
    };
  }, [soundUrl]);

  useEffect(() => {
    // Play sound when new notification arrives
    if (notifications.length > prevNotificationCount.current && prevNotificationCount.current > 0) {
      if (audioRef.current) {
        audioRef.current.play().catch(e => console.log('Could not play notification sound:', e));
      }
    }
    prevNotificationCount.current = notifications.length;
  }, [notifications.length]);
};
