import React, { useState, useEffect } from 'react';
import { StyleSheet, Text, View, TouchableOpacity } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { colors } from "../../constants";
import CustomInput from "../../components/CustomInput";
import CustomButton from "../../components/CustomButton";
import CustomAlert from "../../components/CustomAlert/CustomAlert";
import { supabase } from "../../supabase";
import AsyncStorage from '@react-native-async-storage/async-storage';
import { I18nManager } from 'react-native';

I18nManager.allowRTL(false);
I18nManager.forceRTL(false);

const OTPVerificationScreen = ({ navigation, route }) => {
  const { phone, isSignUp } = route.params;
  const [otp, setOtp] = useState("");
  const [error, setError] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  const verifyOTP = async () => {
    setError("");
    setIsLoading(true);

    try {
      if (!otp) {
        return setError("الرجاء إدخال رمز التحقق");
      }

      if (isSignUp) {
        // First verify the phone OTP
        const { data: verifyData, error: verifyError } = await supabase.auth.verifyOtp({
          phone: phone,
          token: otp,
          type: 'sms'
        });

        if (verifyError) throw verifyError;

        // Get stored registration data
        const registrationDataStr = await AsyncStorage.getItem('pendingRegistration');
        if (!registrationDataStr) {
          throw new Error('No pending registration data found');
        }
        const registrationData = JSON.parse(registrationDataStr);

        // Create user with verified phone
        const { data: authData, error: signUpError } = await supabase.auth.signUp({
          email: registrationData.email,
          password: registrationData.password,
          phone: phone, // This will be stored in auth.phone
          options: {
            data: {
              name: registrationData.name,
            },
          },
        });

        if (signUpError) throw signUpError;

        // Create user in public.users table
        const { error: userError } = await supabase
          .from('users')
          .insert([
            {
              id: authData.user.id,
              email: registrationData.email,
              phone_number: phone,
              first_name: registrationData.name.split(" ")[0],
              last_name: registrationData.name.split(" ")[1] || "",
              is_vip: false,
              is_admin: false,
              phone_verified: true
            },
          ]);

        if (userError) throw userError;

        // Clear stored registration data
        await AsyncStorage.removeItem('pendingRegistration');

        // Show success message and navigate to login
        alert("تم إنشاء الحساب بنجاح");
        navigation.replace("login");
      } else {
        // Handle login OTP verification
        const { data, error } = await supabase.auth.verifyOtp({
          phone,
          token: otp,
          type: 'sms'
        });

        if (error) throw error;

        // Get user data and navigate appropriately
        const { data: userData, error: userError } = await supabase
          .from('users')
          .select('*')
          .eq('id', data.user.id)
          .single();

        if (userError) throw userError;

        if (userData.is_admin) {
          navigation.replace("dashboard", { authUser: userData });
        } else if (userData.is_vip) {
          navigation.replace("vip-dashboard", { user: userData });
        } else {
          navigation.replace("tab", { user: userData });
        }
      }
    } catch (error) {
      console.error("Verification Error:", error);
      setError("رمز التحقق غير صحيح أو حدث خطأ");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <View style={styles.container}>
      <View style={styles.TopBarContainer}>
        <TouchableOpacity onPress={() => navigation.goBack()}>
          <Ionicons
            name="arrow-back-circle-outline"
            size={30}
            color={colors.muted}
          />
        </TouchableOpacity>
      </View>

      <View style={styles.screenNameContainer}>
        <Text style={styles.screenNameText}>التحقق من رقم الهاتف</Text>
        <Text style={styles.screenNameParagraph}>
          أدخل رمز التحقق المرسل إلى {phone}
        </Text>
      </View>

      <View style={styles.formContainer}>
        <CustomAlert message={error} type={"error"} />
        
        <CustomInput
          placeholder={"رمز التحقق"}
          value={otp}
          setValue={setOtp}
          keyboardType="number-pad"
          placeholderTextColor={colors.muted}
          radius={5}
        />
      </View>

      <CustomButton
        text={"تحقق"}
        onPress={verifyOTP}
        radius={5}
        loading={isLoading}
      />
    </View>
  );
};

export default OTPVerificationScreen;

const styles = StyleSheet.create({
  container: {
    flexDirecion: "row",
    backgroundColor: colors.light,
    alignItems: "center",
    padding: 20,
    flex: 1,
  },
  TopBarContainer: {
    width: "100%",
    display: "flex",
    flexDirection: "row",
    justifyContent: "flex-start",
    alignItems: "center",
  },
  screenNameContainer: {
    marginTop: 10,
    width: "100%",
    display: "flex",
    flexDirection: "column",
    justifyContent: "flex-start",
    alignItems: "flex-start",
  },
  screenNameText: {
    fontSize: 30,
    fontWeight: "800",
    color: colors.muted,
    textAlign: "right",
  },
  screenNameParagraph: {
    marginTop: 5,
    fontSize: 15,
    textAlign: "right",
  },
  formContainer: {
    marginTop: 10,
    marginBottom: 20,
    justifyContent: "flex-start",
    alignItems: "center",
    display: "flex",
    width: "100%",
    flexDirecion: "row",
  },
}); 