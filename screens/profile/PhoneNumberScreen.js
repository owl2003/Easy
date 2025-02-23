﻿import React, { useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  StatusBar,
  TextInput,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors } from '../../constants';
import { supabase } from '../../supabase';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { I18nManager } from 'react-native';

I18nManager.allowRTL(false);
I18nManager.forceRTL(false);

const PhoneNumberScreen = ({ navigation, route }) => {
  const { user } = route.params;
  const [phoneNumber, setPhoneNumber] = useState(user?.phone || '');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const formatToE164 = (phone) => {
    // Remove any spaces, dashes or other characters
    let cleaned = phone.replace(/\D/g, '');
    
    // If starts with 0, remove it
    if (cleaned.startsWith('0')) {
      cleaned = cleaned.substring(1);
    }
    
    // Add +213 prefix if not present
    if (!cleaned.startsWith('213')) {
      cleaned = '213' + cleaned;
    }
    
    // Add + at the beginning if not present
    if (!cleaned.startsWith('+')) {
      cleaned = '+' + cleaned;
    }
    
    return cleaned;
  };

  const handleUpdatePhoneNumber = async () => {
    if (!phoneNumber || phoneNumber.length < 9) {
      setError('الرجاء إدخال رقم هاتف صحيح');
      return;
    }

    setLoading(true);
    setError('');

    try {
      const e164Phone = formatToE164(phoneNumber);
      console.log('Updating phone number to:', e164Phone);

      // Get current session
      const { data: { session } } = await supabase.auth.getSession();
      
      if (!session) {
        throw new Error('No valid session');
      }

      // Update in auth table
      const { data, error: updateError } = await supabase.auth.updateUser({
        phone: e164Phone
      }, {
        accessToken: session.access_token // Use the session token
      });

      if (updateError) throw updateError;

      // Add this line to update users table
      await updatePhoneInUsersTable(phoneNumber);

      const updatedUser = {
        ...user,
        phone: phoneNumber.startsWith('0') ? phoneNumber : '0' + phoneNumber
      };
      await AsyncStorage.setItem('authUser', JSON.stringify(updatedUser));

      Alert.alert(
        'تم بنجاح',
        'تم تحديث رقم الهاتف بنجاح',
        [{ text: 'حسناً', onPress: () => navigation.goBack() }]
      );

    } catch (error) {
      console.error('Error updating phone:', error);
      if (error.message.includes('session')) {
        // Session error - need to reauthenticate
        Alert.alert(
          "خطأ",
          "انتهت صلاحية الجلسة. الرجاء تسجيل الدخول مرة أخرى.",
          [
            {
              text: "حسناً",
              onPress: async () => {
                await AsyncStorage.removeItem("authUser");
                navigation.reset({
                  index: 0,
                  routes: [{ name: 'login' }],
                });
              }
            }
          ]
        );
      } else {
        setError('حدث خطأ أثناء تحديث رقم الهاتف');
      }
    } finally {
      setLoading(false);
    }
  };

  const updatePhoneInUsersTable = async (phoneNumber) => {
    try {
      const { error } = await supabase
        .from('users')
        .update({ phone_number: phoneNumber })
        .eq('id', user.id);

      if (error) {
        console.error('Error updating phone in users table:', error);
        throw error;
      }
    } catch (error) {
      console.error('Error in updatePhoneInUsersTable:', error);
      throw error;
    }
  };

  

  return (
    <View style={styles.container}>
      <StatusBar backgroundColor={colors.primary} />
      
      <View style={styles.header}>
        <TouchableOpacity 
          style={styles.backButton}
          onPress={() => navigation.goBack()}
        >
          <Ionicons name="arrow-back" size={24} color={colors.white} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>تحديث رقم الهاتف</Text>
        <View style={{ width: 40 }} />
      </View>

      <View style={styles.content}>
        {error ? (
          <View style={styles.errorContainer}>
            <Ionicons name="alert-circle" size={24} color={colors.danger} />
            <Text style={styles.errorText}>{error}</Text>
          </View>
        ) : null}

        <View style={styles.inputContainer}>
          <Text style={styles.label}>رقم الهاتف</Text>
          <TextInput
            value={phoneNumber}
            onChangeText={setPhoneNumber}
            placeholder="أدخل رقم الهاتف"
            keyboardType="phone-pad"
            style={styles.input}
          />
        </View>

        <TouchableOpacity
          style={[
            styles.updateButton,
            (loading || !phoneNumber) && styles.updateButtonDisabled
          ]}
          onPress={handleUpdatePhoneNumber}
          disabled={loading || !phoneNumber}
        >
          {loading ? (
            <ActivityIndicator color={colors.white} />
          ) : (
            <Text style={styles.updateButtonText}>تحديث رقم الهاتف</Text>
          )}
        </TouchableOpacity>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.white,
  },
  header: {
    backgroundColor: colors.primary,
    padding: 20,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  backButton: {
    padding: 8,
  },
  headerTitle: {
    color: colors.white,
    fontSize: 18,
    fontWeight: 'bold',
  },
  content: {
    flex: 1,
    padding: 20,
  },
  errorContainer: {
    backgroundColor: colors.danger + '15',
    padding: 15,
    borderRadius: 12,
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 20,
  },
  errorText: {
    color: colors.danger,
    marginLeft: 10,
    flex: 1,
  },
  inputContainer: {
    marginBottom: 20,
    alignItems: 'flex-end',
  },
  label: {
    fontSize: 16,
    color: colors.dark,
    marginBottom: 8,
    fontWeight: '600',
  },
  input: {
    backgroundColor: colors.white,
    borderWidth: 1,
    borderColor: colors.light,
    borderRadius: 12,
    padding: 15,
    fontSize: 16,
  },
  updateButton: {
    backgroundColor: colors.primary,
    borderRadius: 12,
    padding: 15,
    alignItems: 'center',
  },
  updateButtonDisabled: {
    backgroundColor: colors.muted,
  },
  updateButtonText: {
    color: colors.white,
    fontSize: 16,
    fontWeight: 'bold',
  },
});

export default PhoneNumberScreen;