import { supabase } from '../supabase';
import NetInfo from '@react-native-community/netinfo';
import { sendNotification } from '../utils/notifications';
import * as Notifications from 'expo-notifications';
import { configurePushNotifications } from '../utils/notifications';

class NotificationService {
  constructor() {
    this.supabase = supabase;
    this.processedNotifications = new Set();
    this.currentUser = null;
    this.setupNotificationListeners();
    this.setupBackgroundHandler();
  }

  setCurrentUser(user) {
    // Skip if same user is being set
    if (this.currentUser?.id === user?.id) {
      console.log('Same user, skipping setCurrentUser');
      return;
    }

    this.currentUser = user;
    console.log('Current user set:', {
      id: user?.id,
      isAdmin: user?.is_admin
    });

    // Fetch existing unread notifications when user is set
    if (user) {
      this.fetchUnreadNotifications(user);
    }
  }

  async fetchUnreadNotifications(user) {
    try {
      // Get already delivered notifications for this user
      const { data: delivered } = await this.supabase
        .from('notification_deliveries')
        .select('notification_id')
        .eq('user_id', user.id);

      const deliveredIds = delivered?.map(d => d.notification_id) || [];

      let query = this.supabase
        .from('notifications')
        .select('*')
        .eq('read', false)
        .not('id', 'in', `(${deliveredIds.join(',')})`); // Exclude delivered

      if (user.is_admin) {
        // Admins see only new orders and user messages
        query = query.or(
          'title.eq.طلب جديد,title.eq.رسالة جديدة من المستخدم'
        );
      } else {
        // Regular users see their notifications
        query = query
          .eq('user_id', user.id)
          .or(
            'title.eq.منتج,title.eq.تم تأكيد الطلب,title.eq.تحديث حالة الطلب,title.eq.رسالة إدارية'
          );
      }

      const { data: notifications, error } = await query
        .order('created_at', { ascending: false });

      if (error) {
        console.error('Error fetching unread notifications:', error);
        return;
      }

      // Show and mark as delivered
      for (const notification of notifications || []) {
        await this.showNotification(notification);
        await this.markAsDelivered(notification.id);
      }
    } catch (error) {
      console.error('Error in fetchUnreadNotifications:', error);
    }
  }

  async setupNotificationListeners() {
    try {
      const notificationsSubscription = this.supabase
        .channel('notifications-channel')
        .on('postgres_changes', { event: 'INSERT', table: 'notifications' },
          async (payload) => {
            const notification = payload.new;
            
            if (!this.currentUser) return;

            // Check if already delivered to this user
            const { data: existing } = await this.supabase
              .from('notification_deliveries')
              .select('*')
              .eq('notification_id', notification.id)
              .eq('user_id', this.currentUser.id)
              .single();

            if (existing) {
              console.log('Notification already delivered:', notification.id);
              return;
            }

            let shouldShowNotification = false;

            if (this.currentUser.is_admin) {
              // Admins see:
              shouldShowNotification = (
                notification.title === 'طلب جديد' ||  // New orders
                notification.title === 'رسالة جديدة من المستخدم'  // User messages
              );
              // Explicitly skip order status updates for admins
             
            } else {
              // Regular users see their notifications
              shouldShowNotification = (
                notification.user_id === this.currentUser.id && 
                (
                  notification.title === 'تم تأكيد الطلب' ||
                  notification.title === 'تحديث حالة الطلب' ||
                  notification.title === 'رسالة إدارية'||
                  notification.title === 'منتج' ||
                  notification.title === 'تحديث طلب'

                )
              );
            }

            if (shouldShowNotification) {
              await this.showNotification(notification);
              await this.markAsDelivered(notification.id);
            }
          });

      // Subscribe to order status changes
      const orderStatusSubscription = this.supabase
        .channel('order-status-channel')
        .on(
          'postgres_changes',
          {
            event: 'INSERT',
            schema: 'public',
            table: 'order_status_logs'
          },
          
          async (payload) => {
            const statusLog = payload.new;
            
            // Get order details
            const { data: order } = await this.supabase
              .from('orders')
              .select('user_id, order_id')
              .eq('order_id', statusLog.order_id)
              .single();
            
        
          }
          
        )
        .subscribe();

      console.log('Notification listeners setup complete');
    } catch (error) {
      console.error('Error setting up notification listeners:', error);
    }
  }

  async setupBackgroundHandler() {
    // Set up notification received handler
    Notifications.addNotificationReceivedListener(notification => {
      console.log('Notification received in foreground:', notification);
      this.handleReceivedNotification(notification);
    });

    // Set up notification response handler
    Notifications.addNotificationResponseReceivedListener(response => {
      console.log('Notification response received:', response);
      this.handleNotificationResponse(response);
    });

    // Configure push notifications
    await configurePushNotifications();
  }

  async handleReceivedNotification(notification) {
    const { data } = notification.request.content;
    
    if (this.currentUser) {
      // Update local state and handle the notification
      await this.processNotification(data);
    }
  }

  async handleNotificationResponse(response) {
    const { data } = response.notification.request.content;
    
    if (this.currentUser) {
      // Handle user interaction with the notification
      await this.processNotificationResponse(data);
    }
  }

  async processNotification(notificationData) {
    // Process the notification based on its type
    switch (notificationData.type) {
      case 'new_order':
      case 'order_status':
      case 'message':
        await this.fetchUnreadNotifications(this.currentUser);
        break;
      default:
        console.log('Unknown notification type:', notificationData.type);
    }
  }

  async processNotificationResponse(notificationData) {
    // Handle user interaction with notification
    if (notificationData.notificationId) {
      await this.markAsDelivered(notificationData.notificationId);
    }
  }

  async showNotification(notification) {
    try {
      // Check if app is in foreground
      const appState = await NetInfo.fetch();
      const isForegrounded = appState.isConnected;

      const notificationContent = {
        title: notification.title,
        body: notification.message,
        data: {
          notificationId: notification.id,
          type: notification.type,
          ...notification.data
        },
        sound: true,
      };

      if (isForegrounded) {
        // Show immediate notification
        await Notifications.scheduleNotificationAsync({
          content: notificationContent,
          trigger: null,
        });
      } else {
        // Schedule notification for background
        await Notifications.scheduleNotificationAsync({
          content: notificationContent,
          trigger: {
            seconds: 1, // Show after 1 second
          },
        });
      }

      await this.markAsDelivered(notification.id);
    } catch (error) {
      console.error('Error showing notification:', error);
    }
  }

  async markAsDelivered(notificationId) {
    try {
      // First check if already delivered to this user
      const { data: existing } = await this.supabase
        .from('notification_deliveries')
        .select('*')
        .eq('notification_id', notificationId)
        .eq('user_id', this.currentUser.id)
        .single();

      if (existing) {
        console.log('Notification already delivered:', notificationId);
        return;
      }

      // Insert delivery record
      const { error } = await this.supabase
        .from('notification_deliveries')
        .insert({
          notification_id: notificationId,
          user_id: this.currentUser.id,
          delivered_at: new Date().toISOString()
        });

      if (error) throw error;
    } catch (error) {
      console.error('Error marking notification as delivered:', error);
    }
  }

  async sendAdminPushNotification(title, message, type, data = {}) {
    try {
      const { data: adminUsers, error: adminError } = await supabase
        .from('users')
        .select('id, expo_push_token')
        .eq('is_admin', true);

      if (adminError) throw adminError;

      // Send notification to each admin
      for (const admin of adminUsers) {
        if (admin.expo_push_token) {
          await this.showNotification({
            title,
            message,
            type,
            isAdminNotification: true,
            ...data
          });
        }
      }
    } catch (error) {
      console.error('Error sending admin push notification:', error);
    }
  }

  async registerPushToken(userId) {
    try {
      const { status: existingStatus } = await Notifications.getPermissionsAsync();
      let finalStatus = existingStatus;
      
      if (existingStatus !== 'granted') {
        const { status } = await Notifications.requestPermissionsAsync();
        finalStatus = status;
      }
      
      if (finalStatus !== 'granted') {
        console.log('Failed to get push token for push notification!');
        return;
      }

      const token = (await Notifications.getExpoPushTokenAsync()).data;

      // Update user's expo push token
      const { error } = await this.supabase
        .from('users')
        .update({ expo_push_token: token })
        .eq('id', userId);

      if (error) {
        console.error('Error updating push token:', error);
      }

      return token;
    } catch (error) {
      console.error('Error registering push token:', error);
    }
  }

  // Add method to clear processed notifications (call this on logout)
  clearProcessedNotifications() {
    this.processedNotifications.clear();
  }

  async getUnreadNotifications(userId) {
    try {
      const { data: user } = await supabase
        .from('users')
        .select('*')
        .eq('id', userId)
        .single();

      if (!user) return [];

      let query = supabase
        .from('notifications')
        .select('*')
        .eq('read', false);

      if (user.is_admin) {
        query = query.or(
          'title.eq.طلب جديد,title.eq.رسالة جديدة من المستخدم'
        );
      } else {
        query = query
          .eq('user_id', userId)
          .or(
            'title.eq.منتج,title.eq.تم تأكيد الطلب,title.eq.تحديث حالة الطلب,title.eq.رسالة إدارية'
          );
      }

      const { data, error } = await query
        .order('created_at', { ascending: false });

      if (error) throw error;
      return data || [];
    } catch (error) {
      console.error('Error getting unread notifications:', error);
      return [];
    }
  }

  async getMessages(userId, isAdmin) {
    try {
      let query = supabase
        .from('notifications')
        .select('*')
        .eq('type', 'text')
        .order('created_at', { ascending: false });

      if (isAdmin) {
        query = query.eq('is_admin_message', false);
      } else {
        query = query.eq('user_id', userId);
      }

      const { data, error } = await query;
      if (error) throw error;
      return data || [];
    } catch (error) {
      console.error('Error getting messages:', error);
      return [];
    }
  }
}

export const notificationService = new NotificationService();
