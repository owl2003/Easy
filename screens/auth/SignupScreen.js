import {
  StyleSheet,
  Text,
  View,
  Image,
  TouchableOpacity,
  Platform,
  StatusBar,
  KeyboardAvoidingView,
  ScrollView,
  Dimensions,
} from "react-native";
import React, { useState } from "react";
import { colors } from "../../constants";
import CustomInput from "../../components/CustomInput";
import header_logo from "../../assets/logo/logo2.png";
import CustomButton from "../../components/CustomButton";
import { Ionicons } from "@expo/vector-icons";
import CustomAlert from "../../components/CustomAlert/CustomAlert";
import InternetConnectionAlert from "react-native-internet-connection-alert";
import { supabase } from "../../supabase";
import LottieView from "lottie-react-native";
import { LinearGradient } from 'expo-linear-gradient';
import { I18nManager } from 'react-native';

I18nManager.allowRTL(false);
I18nManager.forceRTL(false);

const { width, height } = Dimensions.get('window');

const SignupScreen = ({ navigation }) => {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [name, setName] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const signUpHandle = async () => {
    setError("");
    setLoading(true);

    if (!email || !password || !confirmPassword || !name) {
      setLoading(false);
      return setError("الرجاء ملء جميع الحقول");
    }
    if (!email.includes("@")) {
      setLoading(false);
      return setError("البريد الإلكتروني غير صالح");
    }
    if (password.length < 6) {
      setLoading(false);
      return setError("كلمة المرور يجب أن تكون على الأقل 6 أحرف");
    }
    if (password !== confirmPassword) {
      setLoading(false);
      return setError("كلمة المرور غير متطابقة");
    }

    try {
      const { data: authData, error: authError } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: {
            name,
          },
        },
      });

      if (authError) {
        console.log("Supabase Auth Error:", authError);
        if (authError.message.includes("User already registered")) {
          return setError("البريد الإلكتروني مسجل مسبقًا");
        } else {
          return setError("حدث خطأ أثناء إنشاء الحساب");
        }
      }

      const { error: userError } = await supabase
        .from('users')
        .insert([
          {
            id: authData.user.id,
            email: authData.user.email,
            first_name: name.split(" ")[0],
            last_name: name.split(" ")[1] || "",
            is_vip: false,
            is_admin: false,
          },
        ]);

      if (userError) {
        console.log("Supabase Insert Error:", userError);
        return setError("حدث خطأ أثناء حفظ بيانات المستخدم");
      }

      navigation.navigate("login");
    } catch (error) {
      console.log("General Error:", error);
      setError("حدث خطأ أثناء إنشاء الحساب");
    } finally {
      setLoading(false);
    }
  };

  return (
    <InternetConnectionAlert>
      <View style={styles.container}>
        <StatusBar backgroundColor={colors.primary} barStyle="light-content" />
        <ScrollView
          contentContainerStyle={styles.scrollContainer}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
        >
          <LinearGradient
            colors={[colors.primary, colors.primary_light]}
            style={styles.headerSection}
          >
            <View style={styles.logoWrapper}>
              <Image source={header_logo} style={styles.logo} />
            </View>
            <View style={styles.headerTextContainer}>
              <Text style={styles.headerTitle}>إنشاء حساب</Text>
              <Text style={styles.headerSubtitle}>
                قم بإنشاء حسابك على ChetiouiConfiserie للوصول إلى المنتجات
              </Text>
            </View>
          </LinearGradient>

          <View style={styles.formSection}>
            {error ? (
              <View style={styles.errorContainer}>
                <Ionicons name="alert-circle" size={24} color={colors.danger} />
                <Text style={styles.errorText}>{error}</Text>
              </View>
            ) : null}

            <View style={styles.inputsContainer}>
              <CustomInput
                value={name}
                setValue={setName}
                placeholder="الاسم و اللقب"
                placeholderTextColor={colors.muted}
                radius={12}
                inputStyle={styles.input}
              />

              <CustomInput
                value={email}
                setValue={setEmail}
                placeholder="البريد الإلكتروني"
                placeholderTextColor={colors.muted}
                radius={12}
                keyboardType="email-address"
                inputStyle={styles.input}
              />

              <CustomInput
                value={password}
                setValue={setPassword}
                secureTextEntry={true}
                placeholder="كلمة المرور"
                placeholderTextColor={colors.muted}
                radius={12}
                inputStyle={styles.input}
              />

              <CustomInput
                value={confirmPassword}
                setValue={setConfirmPassword}
                secureTextEntry={true}
                placeholder="تأكيد كلمة المرور"
                placeholderTextColor={colors.muted}
                radius={12}
                inputStyle={styles.input}
              />
            </View>

            <View style={styles.buttonContainer}>
              <CustomButton
                text="إنشاء حساب"
                onPress={signUpHandle}
                disabled={loading}
                radius={12}
              />
            </View>

            <View style={styles.bottomContainer}>
              <Text style={styles.bottomText}>هل لديك حساب بالفعل؟</Text>
              <TouchableOpacity onPress={() => navigation.navigate("login")}>
                <Text style={styles.loginText}>تسجيل الدخول</Text>
              </TouchableOpacity>
            </View>
          </View>

          {loading && (
            <View style={styles.loadingContainer}>
              <LottieView
                source={require('../../assets/candy-loading.json')}
                autoPlay
                loop
                style={styles.loadingAnimation}
              />
            </View>
          )}
        </ScrollView>
      </View>
    </InternetConnectionAlert>
  );
};

export default SignupScreen;

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.white,
  },
  scrollContainer: {
    flexGrow: 1,
  },
  headerSection: {
    height: height * 0.35,
    paddingTop: Platform.OS === 'ios' ? 40 : StatusBar.currentHeight,
    paddingHorizontal: width * 0.05,
  },
  logoWrapper: {
    alignItems: 'center',
    marginTop: height * 0.02,
  },
  logo: {
    width: width * 0.25,
    height: width * 0.25,
    resizeMode: 'contain',
  },
  headerTextContainer: {
    marginTop: height * 0.02,
    alignItems: 'flex-end',
  },
  headerTitle: {
    fontSize: width * 0.08,
    fontWeight: 'bold',
    color: colors.white,
    marginBottom: height * 0.01,
  },
  headerSubtitle: {
    fontSize: width * 0.04,
    color: colors.white,
    opacity: 0.8,
    textAlign: 'right',
  },
  formSection: {
    flex: 1,
    backgroundColor: colors.white,
    marginTop: -20,
    borderTopLeftRadius: 30,
    borderTopRightRadius: 30,
  },
  errorContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.danger + '15',
    padding: width * 0.04,
    borderRadius: 12,
    marginBottom: height * 0.02,
  },
  errorText: {
    color: colors.danger,
    marginLeft: 10,
    flex: 1,
    textAlign: 'right',
  },
  inputsContainer: {
    gap: height * 0.02,
    marginBottom: height * 0.03,
  },
  input: {
    textAlign: 'right',
    fontWeight: '500',
  },
  buttonContainer: {
    marginBottom: height * 0.03,
  },
  bottomContainer: {
    flexDirection: 'row-reverse',
    justifyContent: 'center',
    alignItems: 'center',
    gap: width * 0.02,
  },
  bottomText: {
    color: colors.muted,
    fontSize: width * 0.035,
  },
  loginText: {
    color: colors.primary,
    fontSize: width * 0.035,
    fontWeight: 'bold',
  },
  loadingContainer: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(255, 255, 255, 0.8)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingAnimation: {
    width: width * 0.3,
    height: width * 0.3,
  },
});