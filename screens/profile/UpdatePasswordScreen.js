import { StyleSheet, Text, TouchableOpacity, View, StatusBar, Alert, I18nManager } from "react-native";
import React, { useState } from "react";
import { Ionicons } from "@expo/vector-icons";
import { colors } from "../../constants";
import CustomInput from "../../components/CustomInput";
import CustomButton from "../../components/CustomButton";
import { LinearGradient } from 'expo-linear-gradient';
import { supabase } from "../../supabase";

I18nManager.allowRTL(false);
I18nManager.forceRTL(false);

const UpdatePasswordScreen = ({ navigation }) => {
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [isForgotFlow, setIsForgotFlow] = useState(false);
  const [email, setEmail] = useState("");
  const [otpToken, setOtpToken] = useState("");
  const [showOtpInput, setShowOtpInput] = useState(false);

  const handleForgotPassword = async () => {
    try {
      if (!email) {
        Alert.alert("تنبيه", "الرجاء إدخال البريد الإلكتروني");
        return;
      }

      setLoading(true);

      const { error } = await supabase.auth.resetPasswordForEmail(email);

      if (error) throw error;

      setShowOtpInput(true);
      Alert.alert(
        "تم بنجاح",
        "تم إرسال رمز التحقق إلى بريدك الإلكتروني",
        [{ text: "حسناً" }]
      );

    } catch (error) {
      Alert.alert("خطأ", "تأكد من صحة البريد الإلكتروني وحاول مرة أخرى");
    } finally {
      setLoading(false);
    }
  };

  const verifyOtpAndResetPassword = async () => {
    try {
      if (!otpToken || !newPassword || !confirmPassword) {
        Alert.alert("تنبيه", "الرجاء ملء جميع الحقول");
        return;
      }

      if (newPassword !== confirmPassword) {
        Alert.alert("تنبيه", "كلمة المرور غير متطابقة");
        return;
      }

      if (newPassword.length < 6) {
        Alert.alert("تنبيه", "يجب أن تكون كلمة المرور 6 أحرف على الأقل");
        return;
      }

      setLoading(true);

      // Verify OTP token
      const { error: verifyError } = await supabase.auth.verifyOtp({
        email,
        token: otpToken,
        type: 'recovery'
      });

      if (verifyError) throw verifyError;

      // Update password
      const { error: updateError } = await supabase.auth.updateUser({
        password: newPassword
      });

      if (updateError) throw updateError;

      Alert.alert(
        "نجاح",
        "تم تحديث كلمة المرور بنجاح",
        [
          {
            text: "حسناً",
            onPress: () => {
              navigation.reset({
                index: 0,
                routes: [{ name: 'login' }],
              });
            }
          }
        ]
      );

    } catch (error) {
      console.error('Error:', error);
      Alert.alert("خطأ", "رمز التحقق غير صالح أو منتهي الصلاحية");
    } finally {
      setLoading(false);
    }
  };

  if (isForgotFlow) {
    return (
      <View style={styles.container}>
        <StatusBar backgroundColor={colors.primary} barStyle="light-content" />
        
        <LinearGradient
          colors={[colors.primary, colors.primary + '90']}
          style={styles.header}
        >
          <View style={styles.topBar}>
            <TouchableOpacity
              style={styles.backButton}
              onPress={() => {
                setIsForgotFlow(false);
                setShowOtpInput(false);
              }}
            >
              <Ionicons name="chevron-forward" size={26} color={colors.white} />
            </TouchableOpacity>
            <Text style={styles.headerTitle}>نسيت كلمة المرور</Text>
            <View style={{ width: 30 }} />
          </View>
        </LinearGradient>

        <View style={styles.content}>
          <View style={styles.infoBox}>
            <Ionicons name="mail" size={30} color={colors.primary} />
            <Text style={styles.infoText}>
              {showOtpInput 
                ? "أدخل رمز التحقق المرسل إلى بريدك الإلكتروني"
                : "أدخل بريدك الإلكتروني لإعادة تعيين كلمة المرور"
              }
            </Text>
          </View>

          <View style={styles.formContainer}>
            {!showOtpInput ? (
              <View style={styles.inputGroup}>
                <Text style={styles.inputLabel}>البريد الإلكتروني</Text>
                <CustomInput
                  value={email}
                  setValue={setEmail}
                  placeholder="أدخل بريدك الإلكتروني"
                  keyboardType="email-address"
                  textAlign="right"
                />
              </View>
            ) : (
              <>
                <View style={styles.inputGroup}>
                  <Text style={styles.inputLabel}>رمز التحقق</Text>
                  <CustomInput
                    value={otpToken}
                    setValue={setOtpToken}
                    placeholder="أدخل رمز التحقق"
                    textAlign="right"
                  />
                </View>

                <View style={styles.inputGroup}>
                  <Text style={styles.inputLabel}>كلمة المرور الجديدة</Text>
                  <CustomInput
                    value={newPassword}
                    setValue={setNewPassword}
                    placeholder="أدخل كلمة المرور الجديدة"
                    secureTextEntry={true}
                    textAlign="right"
                  />
                </View>

                <View style={styles.inputGroup}>
                  <Text style={styles.inputLabel}>تأكيد كلمة المرور</Text>
                  <CustomInput
                    value={confirmPassword}
                    setValue={setConfirmPassword}
                    placeholder="أعد إدخال كلمة المرور الجديدة"
                    secureTextEntry={true}
                    textAlign="right"
                  />
                </View>
              </>
            )}
          </View>

          <CustomButton
            text={loading 
              ? "جاري المعالجة..." 
              : showOtpInput 
                ? "تحديث كلمة المرور"
                : "إرسال رمز التحقق"
            }
            onPress={showOtpInput ? verifyOtpAndResetPassword : handleForgotPassword}
            radius={10}
            style={styles.updateButton}
            disabled={loading}
          />
        </View>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <StatusBar backgroundColor={colors.primary} barStyle="light-content" />
      
      <LinearGradient
        colors={[colors.primary, colors.primary + '90']}
        style={styles.header}
      >
        <View style={styles.topBar}>
          <TouchableOpacity
            style={styles.backButton}
            onPress={() => navigation.goBack()}
          >
            <Ionicons name="chevron-forward" size={26} color={colors.white} />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>تغيير كلمة المرور</Text>
          <View style={{ width: 30 }} />
        </View>
      </LinearGradient>

      <View style={styles.content}>
        <View style={styles.infoBox}>
          <Ionicons name="lock-closed" size={30} color={colors.primary} />
          <Text style={styles.infoText}>
            يجب أن تكون كلمة المرور الجديدة مختلفة عن كلمة المرور السابقة
          </Text>
        </View>

        <TouchableOpacity 
          style={styles.forgotPasswordButton}
          onPress={() => setIsForgotFlow(true)}
        >
          <Text style={styles.forgotPasswordText}>نسيت كلمة المرور؟</Text>
        </TouchableOpacity>

        <View style={styles.formContainer}>
          <View style={styles.inputGroup}>
            <Text style={styles.inputLabel}>كلمة المرور الحالية</Text>
            <CustomInput
              value={currentPassword}
              setValue={setCurrentPassword}
              placeholder="ادخل كلمة المرور الحالية"
              secureTextEntry={true}
              textAlign="right"
              style={{ textAlign: 'right' }}
            />
          </View>

          <View style={styles.inputGroup}>
            <Text style={styles.inputLabel}>كلمة المرور الجديدة</Text>
            <CustomInput
              value={newPassword}
              setValue={setNewPassword}
              placeholder="ادخل كلمة المرور الجديدة"
              secureTextEntry={true}
              textAlign="right"
              style={{ textAlign: 'right' }}
            />
          </View>

          <View style={styles.inputGroup}>
            <Text style={styles.inputLabel}>تأكيد كلمة المرور</Text>
            <CustomInput
              value={confirmPassword}
              setValue={setConfirmPassword}
              placeholder="أعد إدخال كلمة المرور الجديدة"
              secureTextEntry={true}
              textAlign="right"
              style={{ textAlign: 'right' }}
            />
          </View>
        </View>

        <CustomButton
          text={loading ? "جاري التحديث..." : "تحديث كلمة المرور"}
          onPress={verifyOtpAndResetPassword}
          radius={10}
          style={styles.updateButton}
          disabled={loading}
        />
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.light,
  },
  header: {
    paddingTop: StatusBar.currentHeight,
    paddingBottom: 20,
    borderBottomLeftRadius: 25,
    borderBottomRightRadius: 25,
  },
  topBar: {
    flexDirection: 'row-reverse',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 15,
    paddingTop: 10,
  },
  backButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(255,255,255,0.2)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: colors.white,
  },
  content: {
    flex: 1,
    padding: 20,
  },
  infoBox: {
    backgroundColor: colors.primary + '10',
    borderRadius: 15,
    padding: 20,
    flexDirection: 'row-reverse',
    alignItems: 'center',
    marginBottom: 25,
  },
  infoText: {
    flex: 1,
    marginLeft: 15,
    fontSize: 14,
    color: colors.primary,
    textAlign: 'right',
    lineHeight: 20,
  },
  formContainer: {
    marginBottom: 25,
  },
  inputGroup: {
    marginBottom: 20,
  },
  inputLabel: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.dark,
    marginBottom: 8,
    textAlign: 'right',
  },
  updateButton: {
    marginTop: 10,
  },
  forgotPasswordButton: {
    alignItems: 'flex-start',
    marginBottom: 15,
    paddingHorizontal: 5,
  },
  forgotPasswordText: {
    color: colors.primary,
    fontSize: 14,
    fontWeight: '600',
  },
});

export default UpdatePasswordScreen;
