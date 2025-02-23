import { StyleSheet, Image, View, ActivityIndicator } from "react-native";
import React, { useEffect, useState } from "react";
import { colors } from "../../constants";
import logo from "../../assets/logo/logo_white.png";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { supabase } from "../../supabase"; // Import Supabase client
import { LinearGradient } from "expo-linear-gradient";
import { I18nManager } from 'react-native';

I18nManager.allowRTL(false);
I18nManager.forceRTL(false);

const Splash = ({ navigation }) => {
  const [isLoading, setIsLoading] = useState(true);

  // Method to fetch the authUser data from Supabase and navigate accordingly
  const _retrieveData = async () => {
    try {
      // Get the current session
      const { data: { session }, error } = await supabase.auth.getSession();

      if (session) {
        // Fetch user data including role
        const { data: userData, error: userError } = await supabase
          .from('users')
          .select('*')
          .eq('id', session.user.id)
          .single();

        if (userError) throw userError;

        // Combine session user and database user data
        const completeUserData = {
          ...session.user,
          ...userData
        };

        // Store in AsyncStorage
        await AsyncStorage.setItem('authUser', JSON.stringify(completeUserData));

        // Navigate based on user role
        setTimeout(() => {
          if (userData.is_admin) {
            navigation.replace("dashboard", { 
              authUser: completeUserData 
            });
          } else {
            // For regular users, navigate to the tab navigator
            navigation.replace("tab", { 
              user: completeUserData 
            });
          }
        }, 2000);
      } else {
        // No session, go to login
        setTimeout(() => {
          navigation.replace("login");
        }, 2000);
      }
    } catch (error) {
      console.error('Session check error:', error);
      setTimeout(() => {
        navigation.replace("login");
      }, 2000);
    } finally {
      setIsLoading(false);
    }
  };

  // Check the authUser and navigate accordingly on initial render
  useEffect(() => {
    _retrieveData();
  }, []);

  return (
    <LinearGradient
      colors={[colors.primary, colors.secondary]}
      style={styles.container}
    >
      <Image style={styles.logo} source={logo} />
      {isLoading && (
        <ActivityIndicator 
          size="large" 
          color={colors.light} 
          style={styles.loader}
        />
      )}
    </LinearGradient>
  );
};

export default Splash;

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  logo: {
    resizeMode: "contain",
    width: 100,
    height: 100,
  },
  loader: {
    marginTop: 20,
  }
});