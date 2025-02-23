import React, { useState, useEffect } from "react";
import {
  StyleSheet,
  Image,
  Text,
  View,
  StatusBar,
  KeyboardAvoidingView,
  ActivityIndicator,
  Dimensions,
  TouchableOpacity,
  TextInput,
  Platform,
} from "react-native";
import { colors } from "../../constants";
import CustomInput from "../../components/CustomInput";
import header_logo from "../../assets/logo/logo2.png";
import { Ionicons } from "@expo/vector-icons";
import CustomButton from "../../components/CustomButton";
import CustomAlert from "../../components/CustomAlert/CustomAlert";
import ProgressDialog from "react-native-progress-dialog";
import InternetConnectionAlert from "react-native-internet-connection-alert";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { supabase } from "../../supabase";
import { LinearGradient } from 'expo-linear-gradient';
import Loading from "../../components/Loading/Loading";
import { I18nManager } from 'react-native';

I18nManager.allowRTL(false);
I18nManager.forceRTL(false);

const { width, height } = Dimensions.get('window');

const LoginScreen = ({ navigation }) => {
  const [identifier, setIdentifier] = useState(""); // Combined state for email/phone
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [isloading, setIsloading] = useState(false);
  const [checkingSession, setCheckingSession] = useState(true);
  const [loginType, setLoginType] = useState("email"); // Track if user is using email or phone
  const [data, setData] = useState(null); // State to store fetched data

  // Effect for checking session
  useEffect(() => {
    const checkSession = async () => {
      try {
        const userString = await AsyncStorage.getItem("authUser");
        if (userString) {
          const user = JSON.parse(userString);
          if (user.is_admin) {
            navigation.replace("dashboard", { authUser: user });
          } else if (user.is_vip) {
            navigation.replace("tab", { user });
          } else {
            navigation.replace("tab", { user });
          }
        }
      } catch (error) {
        console.log("Session Check Error:", error);
      } finally {
        setCheckingSession(false);
      }
    };

    checkSession();
  }, [navigation]);

  // Effect for fetching data from an API
  useEffect(() => {
    const abortController = new AbortController();

    const fetchData = async () => {
      try {
        const response = await fetch("https://api.example.com/data", {
          signal: abortController.signal,
        });
        const data = await response.json();
        if (!abortController.signal.aborted) {
          setData(data); // Update state only if the component is still mounted
        }
      } catch (error) {
        if (!abortController.signal.aborted) {
          console.error("Fetch error:", error);
        }
      }
    };

    fetchData();

    return () => {
      abortController.abort(); // Cancel the request when the component unmounts
    };
  }, []);

  const _storeData = async (user) => {
    try {
      await AsyncStorage.setItem("authUser", JSON.stringify(user));
      console.log("User Stored:", user);
    } catch (error) {
      console.log(error);
      setError("حدث خطأ أثناء حفظ بيانات المستخدم");
    }
  };

  const formatToE164 = (phone) => {
    // Remove any spaces, dashes, plus signs and other characters
    let cleaned = phone.replace(/\D/g, '');
    
    // If starts with 0, remove it
    if (cleaned.startsWith('0')) {
      cleaned = cleaned.substring(1);
    }
    
    // If starts with 213, keep it as is
    if (cleaned.startsWith('213')) {
      return cleaned;
    }
    
    // Otherwise, add 213 prefix
    return '213' + cleaned;
  };

  const getInputIcon = (text) => {
    // Check if the text contains any letters
    const hasLetters = /[a-zA-Z]/.test(text);
    return hasLetters ? "mail-outline" : "phone-portrait-outline";
  };

  const loginHandle = async () => {
    setIsloading(true);
    setError("");

    if (!identifier || !password) {
      setIsloading(false);
      return setError("الرجاء إدخال جميع البيانات المطلوبة");
    }

    if (password.length < 6) {
      setIsloading(false);
      return setError("كلمة المرور يجب أن تكون على الأقل 6 أحرف");
    }

    try {
      let authData;
      // Check if input is email or phone
      const isEmail = identifier.includes('@');
      
      if (isEmail) {
        const { data, error: authError } = await supabase.auth.signInWithPassword({
          email: identifier,
          password,
        });
        authData = data;
        if (authError) throw authError;
      } else {
        // Phone number login with E.164 format
        const e164Phone = formatToE164(identifier);
        console.log('Attempting login with phone:', e164Phone); // For debugging
        
        const { data, error: authError } = await supabase.auth.signInWithPassword({
          phone: e164Phone,
          password,
        });
        authData = data;
        if (authError) throw authError;
      }

      const { data: userData, error: userError } = await supabase
        .from('users')
        .select('*')
        .eq('id', authData.user.id)
        .single();

      if (userError) {
        setIsloading(false);
        console.log("User Fetch Error:", userError);
        return setError("حدث خطأ أثناء جلب بيانات المستخدم");
      }

      const combinedUserData = {
        ...authData.user,
        ...userData,
      };
      await _storeData(combinedUserData);

      if (userData.is_admin) {
        navigation.replace("dashboard", { authUser: combinedUserData });
      } else {
        navigation.replace("tab", { user: combinedUserData });
      }
    } catch (error) {
      setIsloading(false);
      console.log("login Error:", error);
      setError("البريد الإلكتروني/رقم الهاتف أو كلمة المرور غير صحيحة");
    }
  };

  if (checkingSession) {
    return (
      <View style={styles.loadingContainer}>
        <Loading />
      </View>
    );
  }

  return (
    <InternetConnectionAlert onChange={(connectionState) => {}}>
      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : undefined}
        style={styles.container}
        keyboardVerticalOffset={Platform.OS === "ios" ? 0 : -150}
      >
        <StatusBar backgroundColor={colors.primary} barStyle="light-content" />
        
        <LinearGradient
          colors={[colors.primary, colors.primary + 'DD', colors.primary + '99']}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={styles.headerSection}
        >
          <View style={styles.logoWrapper}>
            <Image style={styles.logo} source={header_logo} />
            <View style={styles.logoGlow} />
          </View>
         
        </LinearGradient>

        <View style={styles.formSection}>
          <View style={styles.welcomeContainer}>
            <Text style={styles.welcomeText}>مرحباً بعودتك!</Text>
            <Text style={styles.welcomeSubText}>سجل دخولك للمتابعة</Text>
          </View>

          <View style={styles.formContainer}>
            {error ? (
              <View style={styles.errorContainer}>
                <Ionicons name="alert-circle" size={24} color={colors.danger} />
                <Text style={styles.errorText}>{error}</Text>
              </View>
            ) : null}

            <View style={styles.inputsContainer}>
              <View style={styles.inputField}>
                <Ionicons 
                  name={getInputIcon(identifier)}
                  size={20} 
                  color={identifier ? colors.primary : colors.muted} 
                />
                <TextInput
                  value={identifier}
                  onChangeText={(text) => {
                    setIdentifier(text);
                    if (/[a-zA-Z]/.test(text)) {
                      setLoginType('email');
                    } else {
                      setLoginType('email');
                    }
                  }}
                  placeholder="البريد الإلكتروني أو رقم الهاتف"
                  placeholderTextColor={colors.muted}
                  style={styles.input}
                  keyboardType={loginType === 'phone' ? 'phone-pad' : 'email-address'}
                  autoCapitalize="none"
                />
              </View>

              <View style={styles.inputField}>
                <Ionicons 
                  name="lock-closed-outline" 
                  size={20} 
                  color={password ? colors.primary : colors.muted} 
                />
                <TextInput
                  value={password}
                  onChangeText={setPassword}
                  secureTextEntry
                  placeholder="كلمة المرور"
                  placeholderTextColor={colors.muted}
                  style={styles.input}
                />
              </View>
            </View>

            <TouchableOpacity 
              onPress={() => navigation.navigate("forgetpassword")}
              style={styles.forgetPasswordContainer}
            >
              <Text style={styles.ForgetText}>نسيت كلمة المرور؟</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[
                styles.loginButton,
                (!identifier || !password) && styles.loginButtonDisabled
              ]}
              onPress={loginHandle}
              disabled={!identifier || !password || isloading}
            >
              {isloading ? (
                <Loading style={styles.buttonLoading} />
              ) : (
                <Text style={styles.loginButtonText}>تسجيل الدخول</Text>
              )}
            </TouchableOpacity>

            <View style={styles.socialContainer}>
              <View style={styles.dividerContainer}>
                <View style={styles.divider} />
                <Text style={styles.dividerText}>أو</Text>
                <View style={styles.divider} />
              </View>

              <View style={styles.bottomContainer}>
                <Text style={styles.bottomText}>ليس لديك حساب؟</Text>
                <TouchableOpacity 
                  onPress={() => navigation.navigate("signup")}
                  style={styles.signupButton}
                >
                  <Text style={styles.signupText}>إنشاء حساب جديد</Text>
                </TouchableOpacity>
              </View>
            </View>
          </View>
        </View>
      </KeyboardAvoidingView>
    </InternetConnectionAlert>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.white,
  },
  headerSection: {
    height: height * 0.32, // Slightly increased for better spacing
    justifyContent: 'center',
    alignItems: 'center',
    paddingTop: Platform.OS === 'ios' ? 40 : StatusBar.currentHeight + 10,
    paddingBottom: height * 0.02,
  },
  logoWrapper: {
    alignItems: 'center',
    justifyContent: 'center',
    width: Math.min(width * 0.25, 100),
    aspectRatio: 1,
    marginBottom: height * 0.02,
  },
  logo: {
    width: '100%',
    height: '100%',
    resizeMode: 'contain',
  },
  logoGlow: {
    position: 'absolute',
    width: '120%',
    height: '120%',
    borderRadius: 999,
    backgroundColor: colors.white + '20',
    transform: [{ scale: 1.2 }],
  },
  formSection: {
    flex: 1,
    backgroundColor: colors.white,
    marginTop: -30,
    borderTopLeftRadius: 30,
    borderTopRightRadius: 30,
    paddingHorizontal: Math.min(width * 0.06, 25),
    paddingTop: height * 0.03,
  },
  welcomeContainer: {
    marginBottom: height * 0.03,
    alignItems: 'center',
    paddingHorizontal: width * 0.05,
  },
  welcomeText: {
    fontSize: Math.min(width * 0.06, 24),
    fontWeight: 'bold',
    color: colors.dark,
    marginBottom: height * 0.01,
    textAlign: 'center',
  },
  welcomeSubText: {
    fontSize: Math.min(width * 0.04, 14),
    color: colors.muted,
    textAlign: 'center',
  },
  formContainer: {
    flex: 1,
    width: '100%',
    alignItems: 'center',
    paddingHorizontal: Math.min(width * 0.05, 20),
    justifyContent: 'space-between', // Better spacing distribution
  },
  inputsContainer: {
    width: '100%',
    maxWidth: 400,
    marginBottom: height * 0.025, // Increased spacing
  },
  inputField: {
    width: '100%',
    height: Math.min(height * 0.065, 50),
    backgroundColor: colors.white,
    borderRadius: 12,
    marginBottom: height * 0.015, // Consistent spacing between inputs
    paddingHorizontal: width * 0.05,
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: colors.light,
  },
  input: {
    flex: 1,
    height: '100%',
    marginLeft: 12,
    fontSize: Math.min(width * 0.04, 16),
    color: colors.dark,
    textAlign: 'right',
    fontWeight: '500',
  },
  forgetPasswordContainer: {
    width: '100%',
    maxWidth: 400,
    alignItems: 'flex-start',
    marginBottom: height * 0.03, // Increased spacing
  },
  ForgetText: {
    color: colors.primary,
    fontSize: Math.min(width * 0.035, 14),
    fontWeight: '600',
    paddingVertical: 5, // Better touch target
  },
  loginButton: {
    width: '100%',
    maxWidth: 400,
    backgroundColor: colors.primary,
    borderRadius: 12,
    height: Math.min(height * 0.065, 50),
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: height * 0.03, // Increased spacing
    elevation: 3,
    shadowColor: colors.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
  },
  loginButtonDisabled: {
    backgroundColor: colors.muted,
  },
  loginButtonText: {
    color: colors.white,
    fontSize: Math.min(width * 0.045, 18),
    fontWeight: 'bold',
  },
  socialContainer: {
    width: '100%',
    maxWidth: 400,
    marginTop: 'auto',
    paddingBottom: Math.max(height * 0.03, 20), // Ensure minimum bottom padding
  },
  dividerContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: height * 0.025,
    width: '100%',
    paddingVertical: 5, // Added padding
  },
  divider: {
    flex: 1,
    height: 1,
    backgroundColor: colors.muted + '40',
  },
  dividerText: {
    color: colors.muted,
    paddingHorizontal: width * 0.04,
    fontSize: Math.min(width * 0.035, 14),
  },
  bottomContainer: {
    flexDirection: 'row-reverse',
    justifyContent: 'center',
    alignItems: 'center',
    flexWrap: 'wrap',
    paddingHorizontal: width * 0.02,
    paddingVertical: 5, // Added padding
  },
  bottomText: {
    color: colors.muted,
    fontSize: Math.min(width * 0.035, 15),
    marginRight: 4,
  },
  signupButton: {
    marginLeft: 5,
    padding: 8, // Increased touch target
  },
  signupText: {
    color: colors.primary,
    fontSize: Math.min(width * 0.035, 15),
    fontWeight: 'bold',
  },
  errorContainer: {
    width: '100%',
    maxWidth: 400,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.danger + '15',
    padding: Math.min(width * 0.04, 15),
    borderRadius: 12,
    marginBottom: height * 0.02,
  },
  errorText: {
    color: colors.danger,
    marginLeft: 10,
    flex: 1,
    textAlign: 'right',
    fontSize: Math.min(width * 0.035, 14),
  },
  titleContainer: {
    alignItems: 'center',
    marginTop: height * 0.01,
    paddingBottom: height * 0.01,
  },
  appTitle: {
    fontSize: Math.min(width * 0.08, 32),
    fontWeight: 'bold',
    color: colors.white,
    textShadowColor: 'rgba(0, 0, 0, 0.2)',
    textShadowOffset: { width: 1, height: 1 },
    textShadowRadius: 3,
    textAlign: 'center',
  },
  buttonLoading: {
    height: Math.min(height * 0.05, 40),
    width: Math.min(height * 0.05, 40),
    backgroundColor: 'transparent',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: colors.white,
  },
});

export default LoginScreen;