import { StyleSheet, Text, TouchableOpacity, View } from "react-native";
import React, { useState } from "react";
import { Ionicons } from "@expo/vector-icons";
import { colors } from "../../constants";
import CustomInput from "../../components/CustomInput";
import CustomButton from "../../components/CustomButton";
import { supabase } from "../../supabase"; // Import Supabase client
import CustomAlert from "../../components/CustomAlert/CustomAlert";
import { I18nManager } from 'react-native';

I18nManager.allowRTL(false);
I18nManager.forceRTL(false);

const ForgetPasswordScreen = ({ navigation }) => {
  const [email, setEmail] = useState("");
  const [error, setError] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  // Method to send password reset instructions
  const sendInstructionsHandle = async () => {
    setError("");
    setIsLoading(true);

    // Input validation
    if (!email) {
      setIsLoading(false);
      return setError("الرجاء إدخال البريد الإلكتروني");
    }
    if (!email.includes("@")) {
      setIsLoading(false);
      return setError("البريد الإلكتروني غير صالح");
    }

    try {
      const { error } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: null // Disable redirect
      });

      if (error) throw error;

      // Navigate to OTP screen
      navigation.navigate("otpverification", { email });
      
    } catch (error) {
      console.error("Error sending reset instructions:", error);
      setError("حدث خطأ أثناء إرسال رمز التحقق");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <View style={styles.container}>
      <View style={styles.TopBarContainer}>
        <TouchableOpacity
          onPress={() => {
            navigation.goBack();
          }}
        >
          <Ionicons
            name="arrow-back-circle-outline"
            size={30}
            color={colors.muted}
          />
        </TouchableOpacity>
      </View>
      <View style={styles.screenNameContainer}>
        <View>
          <Text style={styles.screenNameText}>إعادة تعيين كلمة المرور</Text>
        </View>
        <View>
          <Text style={styles.screenNameParagraph}>
            أدخل البريد الإلكتروني المرتبط بحسابك وسنرسل لك بريدًا إلكترونيًا
            يحتوي على تعليمات لإعادة تعيين كلمة المرور.
          </Text>
        </View>
      </View>
      <View style={styles.formContainer}>
        <CustomAlert message={error} type={error ? "error" : "success"} />
        <CustomInput
          placeholder={"أدخل بريدك الإلكتروني"}
          value={email}
          setValue={setEmail}
          placeholderTextColor={colors.muted}
          radius={5}
        />
      </View>
      <CustomButton
        text={"إرسال التعليمات"}
        onPress={sendInstructionsHandle}
        radius={5}
        loading={isLoading}
      />
    </View>
  );
};

export default ForgetPasswordScreen;

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
    justifyContent: "flex-end",
    alignItems: "flex-end",
  },
  screenNameText: {
    fontSize: 30,
    fontWeight: "800",
    color: colors.muted,
    textAlign: "right", // Align text to the right for Arabic
  },
  screenNameParagraph: {
    marginTop: 5,
    fontSize: 15,
    textAlign: "right", // Align text to the right for Arabic
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