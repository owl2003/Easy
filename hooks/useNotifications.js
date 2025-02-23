import { useState, useEffect, useRef, useCallback } from 'react';
import { AppState } from 'react-native';
import { supabase } from '../supabase';
import { notificationService } from '../services/NotificationService';
import * as Notifications from 'expo-notifications';
import { configurePushNotifications } from '../utils/notifications';

export function useNotifications() {
  const [unreadNotifications, setUnreadNotifications] = useState([]);
  const [notificationCount, setNotificationCount] = useState(0);
  const [messages, setMessages] = useState([]);
  const [loading, setLoading] = useState(false);
  const appStateSubscription = useRef();
  const notificationListener = useRef();
  const responseListener = useRef();

  // Function to mark notification as read
  const markNotificationAsRead = async (notificationId) => {
    try {
      const { error } = await supabase
        .from('notifications')
        .update({ read: true })
        .eq('id', notificationId);

      if (error) throw error;

      setUnreadNotifications(prev => 
        prev.filter(notification => notification.id !== notificationId)
      );
      setNotificationCount(prev => Math.max(0, prev - 1));
    } catch (error) {
      console.error('Error marking notification as read:', error);
    }
  };

  // Function to mark all notifications as read
  const markAllNotificationsAsRead = async (userId) => {
    try {
      const { error } = await supabase
        .from('notifications')
        .update({ read: true })
        .eq('user_id', userId)
        .eq('read', false);

      if (error) throw error;

      setUnreadNotifications([]);
      setNotificationCount(0);
    } catch (error) {
      console.error('Error marking all notifications as read:', error);
    }
  };

  // Use NotificationService to fetch notifications
  const fetchUnreadNotifications = useCallback(async (userId) => {
    try {
      const notifications = await notificationService.getUnreadNotifications(userId);
      setUnreadNotifications(notifications || []);
      setNotificationCount(notifications?.length || 0);
    } catch (error) {
      console.error('Error fetching notifications:', error);
    }
  }, []);

  // Use NotificationService to fetch messages
  const fetchMessages = useCallback(async (userId, isAdmin) => {
    try {
      setLoading(true);
      const messages = await notificationService.getMessages(userId, isAdmin);
      setMessages(messages || []);
    } catch (error) {
      console.error('Error fetching messages:', error);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    const setupNotifications = async () => {
      // Configure notifications
      await configurePushNotifications();

      // Listen for notifications when app is foregrounded
      notificationListener.current = Notifications.addNotificationReceivedListener(
        notification => {
          const { data } = notification.request.content;
          fetchUnreadNotifications(data.userId);
        }
      );

      // Listen for notification responses
      responseListener.current = Notifications.addNotificationResponseReceivedListener(
        response => {
          const { data } = response.notification.request.content;
          if (data.notificationId) {
            markNotificationAsRead(data.notificationId);
          }
        }
      );
    };

    setupNotifications();

    // Cleanup
    return () => {
      if (notificationListener.current) {
        Notifications.removeNotificationSubscription(notificationListener.current);
      }
      if (responseListener.current) {
        Notifications.removeNotificationSubscription(responseListener.current);
      }
    };
  }, []);

  useEffect(() => {
    const initializeNotifications = async () => {
      try {
        const { data: { session } } = await supabase.auth.getSession();
        if (session?.user) {
          await fetchUnreadNotifications(session.user.id);
        }
      } catch (error) {
        console.error('Error initializing notifications:', error);
      }
    };

    initializeNotifications();

    // Handle app state changes
    appStateSubscription.current = AppState.addEventListener('change', async (nextAppState) => {
      if (nextAppState === 'active') {
        const { data: { user } } = await supabase.auth.getUser();
        if (user) {
          await fetchUnreadNotifications(user.id);
        }
      }
    });

    return () => {
      appStateSubscription.current?.remove();
    };
  }, [fetchUnreadNotifications]);

  return {
    unreadNotifications,
    notificationCount,
    messages,
    loading,
    markNotificationAsRead,
    markAllNotificationsAsRead,
    fetchUnreadNotifications,
    fetchMessages
  };
}
