"use client";

import { useEffect } from 'react';
import { toast } from 'sonner';
import { useSocketContext } from '@/lib/socket-context';

/**
 * Component that watches socket state for notifications and shows toasts
 * This centralizes all toast notifications from socket events
 */
export function SocketNotifications() {
  const { state, dispatch } = useSocketContext();
  const { pendingNotification } = state;

  useEffect(() => {
    if (!pendingNotification) return;

    // Show toast based on notification type
    switch (pendingNotification.type) {
      case 'success':
        toast.success(pendingNotification.message, {
          description: pendingNotification.description,
        });
        break;
      case 'error':
        toast.error(pendingNotification.message, {
          description: pendingNotification.description,
        });
        break;
      case 'warning':
        toast.warning(pendingNotification.message, {
          description: pendingNotification.description,
        });
        break;
      case 'info':
      default:
        toast.info(pendingNotification.message, {
          description: pendingNotification.description,
        });
        break;
    }

    // Clear the notification after showing
    dispatch({ type: 'CLEAR_NOTIFICATION' });
  }, [pendingNotification, dispatch]);

  // This component doesn't render anything
  return null;
}
