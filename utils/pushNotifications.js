import * as Notifications from 'expo-notifications';
import { Platform } from 'react-native';
import { supabase } from '../supabase';

// Configure how notifications are handled
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: true,
  }),
});

// Request push notification permissions
export async function requestPushNotificationPermissions() {
  const { status: existingStatus } = await Notifications.getPermissionsAsync();
  let finalStatus = existingStatus;
  
  if (existingStatus !== 'granted') {
    const { status } = await Notifications.requestPermissionsAsync();
    finalStatus = status;
  }
  
  if (finalStatus !== 'granted') {
    console.warn('Failed to get push token for push notification!');
    return null;
  }
  
  return await Notifications.getExpoPushTokenAsync({ projectId: 'e9fd2e28-5612-4315-8b3f-8c82599ddf93' });
}

// Register the push token with your backend
export async function registerPushToken(userId) {
  try {
    const token = await requestPushNotificationPermissions();
    
    if (!token) return null;

    // Store token in Supabase for this user
    const { error } = await supabase
      .from('user_push_tokens')
      .upsert({ 
        user_id: userId, 
        push_token: token.data,
        platform: Platform.OS 
      }, { 
        onConflict: 'user_id' 
      });

    if (error) {
      console.error('Error registering push token:', error);
    }

    return token;
  } catch (error) {
    console.error('Error in registerPushToken:', error);
    return null;
  }
}

// Send a push notification
export async function sendPushNotification(pushToken, title, body, data = {}) {
  const message = {
    to: pushToken,
    sound: 'default',
    title,
    body,
    data,
  };

  await fetch('https://exp.host/--/api/v2/push/send', {
    method: 'POST',
    headers: {
      Accept: 'application/json',
      'Accept-encoding': 'gzip, deflate',
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(message),
  });
}

// Listen for notification interactions
export function setupNotificationListeners() {
  // Triggered when a notification is received while the app is foregrounded
  Notifications.addNotificationReceivedListener(notification => {
    console.log('Notification received in foreground:', notification);
  });

  // Triggered when user taps on a notification
  Notifications.addNotificationResponseReceivedListener(response => {
    console.log('Notification tapped:', response);
    // You can handle navigation or specific actions here
  });
}
