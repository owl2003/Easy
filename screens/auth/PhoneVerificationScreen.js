import React, { useState, useRef } from 'react';
import {
  StyleSheet,
  Text,
  View,
  TouchableOpacity,
  TextInput,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { colors } from "../../constants";
import { Ionicons } from "@expo/vector-icons";
import CustomAlert from "../../components/CustomAlert/CustomAlert";
import { supabase } from "../../supabase";
import LottieView from "lottie-react-native";
import { I18nManager } from 'react-native';

I18nManager.allowRTL(false);
I18nManager.forceRTL(false);

const PhoneVerificationScreen = ({ navigation, route }) => {
  const { phone, userId } = route.params;
  const [otp, setOtp] = useState(['', '', '', '', '', '']);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const inputs = useRef([]);

  const focusNext = (index, value) => {
    if (value && index < 5) {
      inputs.current[index + 1].focus();
    }
  };

  const focusPrevious = (index) => {
    if (index > 0) {
      inputs.current[index - 1].focus();
    }
  };

  const handleOtpChange = (index, value) => {
    const newOtp = [...otp];
    newOtp[index] = value;
    setOtp(newOtp);
    
    if (value) {
      focusNext(index, value);
    }
  };

  const handleKeyPress = (index, key) => {
    if (key === 'Backspace' && !otp[index]) {
      focusPrevious(index);
    }
  };

  const verifyOtp = async () => {
    setLoading(true);
    setError('');
    
    const otpString = otp.join('');
    if (otpString.length !== 6) {
      setError('الرجاء إدخال رمز التحقق كاملاً');
      setLoading(false);
      return;
    }

    try {
      const { error } = await supabase.auth.verifyOtp({
        phone,
        token: otpString,
        type: 'sms'
      });

      if (error) throw error;

      // Update user verification status
      const { error: updateError } = await supabase
        .from('users')
        .update({ phone_verified: true })
        .eq('id', userId);

      if (updateError) throw updateError;

      navigation.replace('login');
    } catch (error) {
      console.error('Verification Error:', error);
      setError('رمز التحقق غير صحيح');
    } finally {
      setLoading(false);
    }
  };

  const resendOtp = async () => {
    try {
      const { error } = await supabase.auth.signInWithOtp({
        phone,
      });

      if (error) throw error;
      
      setError('');
      alert('تم إرسال رمز جديد');
    } catch (error) {
      console.error('Resend Error:', error);
      setError('فشل إرسال رمز جديد');
    }
  };

  return (
    <KeyboardAvoidingView 
      behavior={Platform.OS === "ios" ? "padding" : "height"}
      style={styles.container}
    >
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()}>
          <Ionicons name="arrow-back-circle" size={32} color={colors.muted} />
        </TouchableOpacity>
      </View>

      <View style={styles.content}>
        <Text style={styles.title}>التحقق من رقم الجوال</Text>
        <Text style={styles.subtitle}>
          تم إرسال رمز التحقق إلى الرقم {phone}
        </Text>

        {loading && (
          <LottieView
            source={require('../../assets/candy-loading.json')}
            autoPlay
            loop
            style={styles.loadingAnimation}
          />
        )}

        <CustomAlert message={error} type="error" />

        <View style={styles.otpContainer}>
          {otp.map((digit, index) => (
            <TextInput
              key={index}
              ref={ref => inputs.current[index] = ref}
              style={styles.otpInput}
              value={digit}
              onChangeText={(value) => handleOtpChange(index, value)}
              onKeyPress={({ nativeEvent: { key } }) => handleKeyPress(index, key)}
              keyboardType="numeric"
              maxLength={1}
              selectTextOnFocus
            />
          ))}
        </View>

        <TouchableOpacity 
          style={styles.verifyButton} 
          onPress={verifyOtp}
          disabled={loading}
        >
          <Text style={styles.verifyButtonText}>تحقق</Text>
        </TouchableOpacity>

        <TouchableOpacity 
          style={styles.resendButton} 
          onPress={resendOtp}
          disabled={loading}
        >
          <Text style={styles.resendButtonText}>إعادة إرسال الرمز</Text>
        </TouchableOpacity>
      </View>
    </KeyboardAvoidingView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.light,
  },
  header: {
    padding: 20,
  },
  content: {
    flex: 1,
    alignItems: 'center',
    paddingHorizontal: 20,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: colors.primary,
    marginBottom: 10,
    textAlign: 'center',
  },
  subtitle: {
    fontSize: 16,
    color: colors.muted,
    marginBottom: 30,
    textAlign: 'center',
  },
  otpContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 30,
  },
  otpInput: {
    width: 45,
    height: 45,
    borderWidth: 1,
    borderColor: colors.primary,
    borderRadius: 10,
    fontSize: 24,
    textAlign: 'center',
    marginHorizontal: 5,
    color: colors.primary,
  },
  verifyButton: {
    backgroundColor: colors.primary,
    paddingVertical: 12,
    paddingHorizontal: 30,
    borderRadius: 25,
    marginBottom: 20,
  },
  verifyButtonText: {
    color: colors.white,
    fontSize: 18,
    fontWeight: '600',
  },
  resendButton: {
    padding: 10,
  },
  resendButtonText: {
    color: colors.primary,
    fontSize: 16,
  },
  loadingAnimation: {
    width: 100,
    height: 100,
  },
});

export default PhoneVerificationScreen; 