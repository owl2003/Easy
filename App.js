import 'react-native-url-polyfill/auto'; 
import Routes from "./routes/Routes";
import { AuthProvider } from './context/auth';
import { useNotifications } from './hooks/useNotifications';
import { configurePushNotifications } from './utils/notifications';
import { Provider } from "react-redux";
import { store } from "./states/store";
import { useEffect } from 'react';
import * as Notifications from 'expo-notifications';
import { I18nManager } from 'react-native';

Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: true,
  }),
});




export default function App() {
  useNotifications();
  console.reportErrorsAsExceptions = false;

  I18nManager.allowRTL(false);
  I18nManager.forceRTL(false);

// In your App component
useEffect(() => {
  configurePushNotifications();
}, []);

  useEffect(() => {
    const configurePushNotifications = async () => {
      const { status: existingStatus } = await Notifications.getPermissionsAsync();
      let finalStatus = existingStatus;
      
      if (existingStatus !== 'granted') {
        const { status } = await Notifications.requestPermissionsAsync();
        finalStatus = status;
      }
      
      if (finalStatus !== 'granted') {
        console.log('Failed to get push notification permissions!');
        return;
      }
    };

    configurePushNotifications();
  }, []);

  
  return (
      <AuthProvider>
        <Provider store={store}>
          <Routes />
        </Provider>
      </AuthProvider>
  );



}
