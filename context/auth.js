import { createContext, useContext, useState, useEffect } from 'react';
import { supabase } from '../supabase';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { notificationService } from '../services/NotificationService';

const AuthContext = createContext({});

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  const updateUser = async (newUser) => {
    // Skip if same user
    if (user?.id === newUser?.id) {
      return;
    }

    setUser(newUser);
    if (newUser) {
      await AsyncStorage.setItem('authUser', JSON.stringify(newUser));
      notificationService.setCurrentUser(newUser);
    } else {
      await AsyncStorage.removeItem('authUser');
      notificationService.setCurrentUser(null);
    }
  };

  useEffect(() => {
    // Check for stored user data on mount
    checkUser();

    // Subscribe to auth state changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
      if (event === 'SIGNED_IN') {
        const { data: userData, error } = await supabase
          .from('users')
          .select('*')
          .eq('id', session.user.id)
          .single();

        if (!error) {
          const completeUser = { ...session.user, ...userData };
          updateUser(completeUser);
        }
      } else if (event === 'SIGNED_OUT') {
        updateUser(null);
      }
    });

    return () => {
      subscription?.unsubscribe();
    };
  }, []);

  const checkUser = async () => {
    try {
      const storedUser = await AsyncStorage.getItem('authUser');
      if (storedUser) {
        updateUser(JSON.parse(storedUser));
      }
    } catch (error) {
      console.error('Error checking stored user:', error);
    } finally {
      setLoading(false);
    }
  };

  const signIn = async (email, password) => {
    try {
      const { data: { session }, error: authError } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (authError) throw authError;

      const { data: userData, error: userError } = await supabase
        .from('users')
        .select('*')
        .eq('id', session.user.id)
        .single();

      if (userError) throw userError;

      const completeUser = { ...session.user, ...userData };
      updateUser(completeUser);
      return { user: completeUser, error: null };
    } catch (error) {
      return { user: null, error };
    }
  };

  const signOut = async () => {
    try {
      await supabase.auth.signOut();
      notificationService.clearProcessedNotifications();
      updateUser(null);
      return { error: null };
    } catch (error) {
      console.error('Error logging out:', error);
      return { error };
    }
  };

  const value = {
    user,
    loading,
    signIn,
    signOut,
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
