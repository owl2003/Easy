import { supabase } from "../supabase";
import * as Notifications from 'expo-notifications';
import * as Device from 'expo-device';
import * as TaskManager from 'expo-task-manager';

const BACKGROUND_NOTIFICATION_TASK = 'BACKGROUND_NOTIFICATION_TASK';

// Register background task
TaskManager.defineTask(BACKGROUND_NOTIFICATION_TASK, async ({ data, error, executionInfo }) => {
  if (error) {
    console.error("Background task error:", error);
    return;
  }
  
  if (data) {
    // Handle the notification data
    const { notification } = data;
    console.log("Received background notification:", notification);
  }
});

Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: true,
  }),
});

export async function sendNotification({ userId, title, message, type = 'text', data = {} }) {
  try {
    // Insert into notifications table
    const { data: notification, error: notificationError } = await supabase
      .from('notifications')
      .insert([{
        user_id: userId,
        title,
        message,
        type,
        data,
        notification_type: 'text',
        is_admin_message: false
      }])
      .select()
      .single();

    if (notificationError) {
      console.error('Error inserting notification:', notificationError);
      throw notificationError;
    }

    return notification;
  } catch (error) {
    console.error('Error sending notification:', error);
    throw error;
  }
}

// Function for new order notifications (visible to all admins)
export async function sendNewOrderNotification(orderData) {
  try {
    // Get first admin user to use as the notification owner
    const { data: adminUser, error: adminError } = await supabase
      .from('users')
      .select('id')
      .eq('is_admin', true)
      .limit(1)
      .single();

    if (adminError) {
      console.error('Error fetching admin user:', adminError);
      throw adminError;
    }

    // Create notification with admin as the owner
    const { data: notification, error: notifError } = await supabase
      .from('notifications')
      .insert([{
        user_id: adminUser.id, // Use admin's ID as the owner
        title: 'طلب جديد',
        message: `تم استلام طلب جديد بقيمة ${orderData.totalCost} دج من ${orderData.userName}`,
        type: 'new_order',
        notification_type: 'order',
        is_admin_message: false,
        data: {
          order_id: orderData.orderId,
          total: orderData.totalCost,
          user_name: orderData.userName,
          wilaya: orderData.city,
          isAdminNotification: true,
          forAdmins: true,
          orderUserId: orderData.userId // Store the ordering user's ID in data
        }
      }])
      .select()
      .single();

    if (notifError) {
      console.error('Error creating order notification:', notifError);
      throw notifError;
    }

    console.log('New order notification created for admins');
    return notification;
  } catch (error) {
    console.error('Error sending order notification:', error);
    throw error;
  }
}

// Function specifically for admin notifications
export async function sendAdminNotification({ 
  userId, 
  adminId, 
  message, 
  type = 'text', 
  referenceId = null 
}) {
  try {
    // Prepare notification details
    const title = type === 'text' ? 'رسالة إدارية' : 
                  type === 'product' ? 'منتج' : 
                  'تحديث طلب';

    // Insert notification into database
    const { data: notification, error } = await supabase
      .from('notifications')
      .insert([{
        user_id: userId,
        sender_id: adminId,
        title,
        message,
        type,
        data: {
          reference_id: referenceId,
          is_admin_message: true
        }
      }])
      .select()
      .single();

    if (error) {
      console.error('Error sending admin notification:', error);
      throw error;
    }

    return notification;
  } catch (error) {
    console.error('Error sending admin notification:', error);
    throw error;
  }
}

// Function for sending bulk admin notifications
export async function sendBulkAdminNotifications({ 
  userIds, 
  adminId, 
  message, 
  type = 'text', 
  referenceId = null 
}) {
  try {
    // Prepare notification details
    const title = type === 'text' ? 'رسالة إدارية' : 
                  type === 'product' ? 'منتج' : 
                  'تحديث طلب';

    // Prepare bulk insert data
    const bulkNotifications = userIds.map(userId => ({
      user_id: userId,
      sender_id: adminId,
      title,
      message,
      type,
      data: {
        reference_id: referenceId,
        is_admin_message: true
      }
    }));

    // Insert bulk notifications
    const { data: notifications, error } = await supabase
      .from('notifications')
      .insert(bulkNotifications)
      .select();

    if (error) {
      console.error('Error sending bulk admin notifications:', error);
      throw error;
    }

    return notifications;
  } catch (error) {
    console.error('Error sending bulk admin notifications:', error);
    throw error;
  }
}

// Function to send user message to all admins
export async function sendUserMessageToAdmins({ 
  userId, 
  userName,
  message 
}) {
  try {
    // Fetch all admin users
    const { data: adminUsers, error: adminError } = await supabase
      .from('users')
      .select('id')
      .eq('is_admin', true);

    if (adminError || !adminUsers) {
      console.error('Error fetching admin users:', adminError);
      throw adminError;
    }

    // Prepare bulk insert data for admin notifications
    const adminNotifications = adminUsers.map(admin => ({
      user_id: admin.id,
      sender_id: userId,
      title: 'رسالة جديدة من المستخدم',
      message: `رسالة من ${userName}: ${message}`,
      type: 'user_message',
      data: {
        sender_id: userId,
        sender_name: userName,
        is_admin_message: false
      }
    }));

    // Insert bulk notifications
    const { data: notifications, error } = await supabase
      .from('notifications')
      .insert(adminNotifications)
      .select();

    if (error) {
      console.error('Error sending user message to admins:', error);
      throw error;
    }

    return notifications;
  } catch (error) {
    console.error('Error sending user message to admins:', error);
    throw error;
  }
}

// For user sending message to admin
export async function sendUserMessage({ userId, userName, message }) {
  try {
    // Get first admin to use as recipient
    const { data: adminUser } = await supabase
      .from('users')
      .select('id')
      .eq('is_admin', true)
      .limit(1)
      .single();

    const { data: notification, error } = await supabase
      .from('notifications')
      .insert({
        user_id: adminUser.id,  // Send to admin instead of the user
        title: 'رسالة جديدة من المستخدم',
        message: message,
        type: 'text',
        notification_type: 'text',
        is_admin_message: false,
        data: {
          sender_id: userId,
          sender_name: userName,
          message_type: 'user_to_admin'
        }
      })
      .select()
      .single();

    if (error) throw error;
    return notification;
  } catch (error) {
    console.error('Error sending user message:', error);
    throw error;
  }
}

// For admin sending message to user
export async function sendAdminMessage({ userId, adminId, message }) {
  try {
    const { data: notification, error } = await supabase
      .from('notifications')
      .insert({
        user_id: userId,
        sender_id: adminId,
        title: 'رسالة من الإدارة',
        message: message,
        type: 'text',
        notification_type: 'text',
        is_admin_message: true,
        data: {
          message_type: 'admin_to_user'
        }
      })
      .select()
      .single();

    if (error) throw error;
    return notification;
  } catch (error) {
    console.error('Error sending admin message:', error);
    throw error;
  }
}

// Add this new function to configure notifications
export async function configurePushNotifications() {
  if (Device.isDevice) {
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

    // Register for background notifications
    await Notifications.registerTaskAsync(BACKGROUND_NOTIFICATION_TASK);
  }
}
