import {
  StyleSheet,
  Text,
  View,
  StatusBar,
  TouchableOpacity,
  SafeAreaView,
  ScrollView,
  I18nManager,
  Alert,
} from "react-native";
import React, { useEffect, useState } from "react";
import UserProfileCard from "../../components/UserProfileCard/UserProfileCard";
import { Ionicons } from "@expo/vector-icons";
import OptionList from "../../components/OptionList/OptionList";
import { colors } from "../../constants";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { LinearGradient } from 'expo-linear-gradient';
import { supabase } from "../../supabase";
import * as Linking from 'expo-linking';


I18nManager.allowRTL(false);
I18nManager.forceRTL(false);

const UserProfileScreen = ({ navigation, route }) => {
  const [userInfo, setUserInfo] = useState({});
  const [counts, setCounts] = useState({
    orders: 0,
    wishlist: 0
  });
  const { user } = route.params;
  const [unreadNotifications, setUnreadNotifications] = useState(0);
  const [shippingAddress, setShippingAddress] = useState(null);

  const fetchUserInfo = async () => {
    try {
      const { data, error } = await supabase
        .from('users')
        .select('*')
        .eq('id', user.id)
        .single();

      if (error) throw error;

      if (data) {
        setUserInfo(data);
      }
    } catch (error) {
      console.error('Error fetching user info:', error);
    }
  };

  const getCounts = async (userId) => {
    try {
      // Get orders count
      const { count: ordersCount, error: ordersError } = await supabase
        .from('orders')
        .select('*', { count: 'exact' })
        .eq('user_id', userId);

      // Get wishlist count
      const { count: wishlistCount, error: wishlistError } = await supabase
        .from('wishlist')
        .select('*', { count: 'exact' })
        .eq('user_id', userId);

      if (ordersError) throw ordersError;
      if (wishlistError) throw wishlistError;

      setCounts({
        orders: ordersCount || 0,
        wishlist: wishlistCount || 0
      });

    } catch (error) {
      console.error('Error fetching counts:', error);
    }
  };

  const fetchUnreadNotificationsCount = async () => {
    try {
      const { count, error } = await supabase
        .from('notification_by_admin')
        .select('*', { count: 'exact' })
        .eq('user_id', user.id)
        .eq('is_seen', false);

      if (error) throw error;
      setUnreadNotifications(count || 0);
    } catch (error) {
      console.error('Error fetching notifications count:', error);
    }
  };

  const fetchShippingAddress = async () => {
    try {
      const { data, error } = await supabase
        .from('shipping_addresses')
        .select('city, country')
        .eq('user_id', user.id)
        .single();

      if (error && error.code !== 'PGRST116') {
        console.error('Error fetching shipping address:', error);
        return;
      }

      setShippingAddress(data);
    } catch (error) {
      console.error('Error:', error);
    }
  };

  useEffect(() => {
    fetchUserInfo();
  }, [user.id]);

  useEffect(() => {
    if (userInfo?.id) {
      getCounts(userInfo.id);
    }
  }, [userInfo]);

  useEffect(() => {
    fetchUnreadNotificationsCount();
  }, []);

  useEffect(() => {
    fetchShippingAddress();
  }, [user.id]);

  console.log('Current userInfo:', userInfo);

  const handlePhonePress = async () => {
    try {
      // Get current session
      const { data: { session }, error: sessionError } = await supabase.auth.getSession();
      
      if (sessionError) {
        console.error('Session error:', sessionError);
        // Handle session error - maybe redirect to login
        await AsyncStorage.removeItem("authUser");
        navigation.replace("login");
        return;
      }

      if (!session) {
        // No valid session - need to reauthenticate
        await AsyncStorage.removeItem("authUser");
        navigation.replace("login");
        return;
      }

      // If we have a valid session, navigate to phone number screen
      navigation.navigate('phonenumber', { 
        user: user,
        session: session,
        accessToken: session.access_token
      });
    } catch (error) {
      console.error('Error in handlePhonePress:', error);
      // Handle any other errors
      Alert.alert(
        "خطأ",
        "حدث خطأ أثناء التحقق من الجلسة. الرجاء تسجيل الدخول مرة أخرى.",
        [
          {
            text: "حسناً",
            onPress: async () => {
              await AsyncStorage.removeItem("authUser");
              navigation.replace("login");
            }
          }
        ]
      );
    }
  };

  const openSocialLink = (url) => {
    Linking.openURL(url);
  };

  const callPhoneNumber = () => {
    Linking.openURL('tel:0655042803');
  };

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="light-content" />
      <LinearGradient
        colors={[colors.primary, colors.primary + '80']}
        style={styles.headerGradient}
      >
        <View style={styles.TopBarContainer}>
          <TouchableOpacity 
            onPress={() => navigation.navigate("home", { user })}
          >
            <Ionicons name="chevron-forward" size={28} color={colors.white} />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>
            {userInfo?.first_name ? `الملف الشخصي لـ ${userInfo.first_name}` : 'ملفي الشخصي'}
          </Text>
          <TouchableOpacity 
            style={styles.notificationButton}
            onPress={() => navigation.navigate("usernotifications", { user })}
          >
            {unreadNotifications > 0 && (
              <View style={styles.headerBadge}>
                <Text style={styles.headerBadgeText}>{unreadNotifications}</Text>
              </View>
            )}
            <Ionicons name="notifications-outline" size={24} color={colors.white} />
          </TouchableOpacity>
        </View>
      </LinearGradient>

      <ScrollView style={styles.contentContainer}>
        <View style={styles.profileSection}>
          <UserProfileCard
            Icon={Ionicons}
            firstName={userInfo?.first_name}
            lastName={userInfo?.last_name}
            email={userInfo?.email}
            isVip={Boolean(userInfo?.is_vip)}
          />
        </View>

        <View style={styles.quickStatsContainer}>
          <View style={styles.statCard}>
            <Ionicons name="cart-outline" size={24} color={colors.primary} />
            <Text style={styles.statNumber}>{counts.orders}</Text>
            <Text style={styles.statLabel}>الطلبات</Text>
          </View>
          <View style={styles.statCard}>
            <Ionicons name="heart-outline" size={24} color={colors.primary} />
            <Text style={styles.statNumber}>{counts.wishlist}</Text>
            <Text style={styles.statLabel}>المفضلة</Text>
          </View>
        </View>

        <View style={styles.optionsContainer}>
          <Text style={styles.sectionTitle}>إعدادات الحساب</Text>
          <View style={styles.optionsWrapper}>
           
          <OptionList
    text="رقم الهاتف"
    Icon={Ionicons}
    iconName="call-outline"
    value={user?.phone || 'لم يتم التحديد'}
    onPress={handlePhonePress}
/>
            
            <OptionList
              text="قائمة المفضلة"
              Icon={Ionicons}
              iconName="heart-outline"
              onPress={() => navigation.navigate("mywishlist", { user: userInfo })}
            />
            <OptionList
              text="عنوان الشحن"
              Icon={Ionicons}
              iconName="location-outline"
              value={shippingAddress ? `${shippingAddress.city}, ${shippingAddress.country}` : 'لم يتم التحديد'}
              onPress={() => navigation.navigate("shippingaddress", { 
                user: {
                  id: user.id  // Make sure we're passing the correct user ID
                }
              })}
            />
          </View>

          <Text style={styles.sectionTitle}>إعدادات التطبيق</Text>
          <View style={styles.optionsWrapper}>
            
            <OptionList
              text="تغيير كلمة المرور"
              Icon={Ionicons}
              iconName="lock-closed-outline"
              onPress={() => navigation.navigate("updatepassword", { userID: userInfo.id })}
            />
            <OptionList
              text="تسجيل الخروج"
              Icon={Ionicons}
              iconName="log-out-outline"
              onPress={async () => {
                await AsyncStorage.removeItem("authUser");
                navigation.replace("login");
              }}
            />
          </View>
        </View>

        <View style={styles.socialLinksContainer}>
          <Text style={styles.socialTitle}>تواصل معنا</Text>
          <View style={styles.socialIconsContainer}>
            <TouchableOpacity 
              style={styles.socialButton}
              onPress={() => openSocialLink('https://www.instagram.com/chetioui.confiserie/')}
            >
              <Ionicons name="logo-instagram" size={24} color={colors.primary} />
            </TouchableOpacity>

            <TouchableOpacity 
              style={styles.socialButton}
              onPress={() => openSocialLink('https://www.tiktok.com/@chetioui.confiserie?_t=8nowMem4xVu&_r=1')}
            >
              <Ionicons name="logo-tiktok" size={24} color={colors.primary} />
            </TouchableOpacity>

            <TouchableOpacity 
              style={styles.socialButton}
              onPress={() => openSocialLink('https://www.facebook.com/people/Chetioui-Confiserie/100088112490881/?mibextid=LQQJ4d')}
            >
              <Ionicons name="logo-facebook" size={24} color={colors.primary} />
            </TouchableOpacity>

            <TouchableOpacity 
              style={styles.socialButton}
              onPress={callPhoneNumber}
            >
              <Ionicons name="call" size={24} color={colors.primary} />
            </TouchableOpacity>
          </View>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
};

export default UserProfileScreen;

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.light,
  },
  headerGradient: {
    paddingTop: StatusBar.currentHeight,
    paddingBottom: 60,
  },
  TopBarContainer: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 20,
    paddingTop: 10,
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: "600",
    color: colors.white,
    textAlign: 'right',
  },
  contentContainer: {
    flex: 1,
    marginTop: -50,
    borderTopLeftRadius: 30,
    borderTopRightRadius: 30,
    backgroundColor: colors.light,
    paddingHorizontal: 20,
  },
  profileSection: {
    backgroundColor: colors.white,
    borderRadius: 20,
    padding: 20,
    marginBottom: 20,
    marginTop: 20,
    elevation: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
  },
  quickStatsContainer: {
    flexDirection: 'row-reverse',
    justifyContent: 'space-between',
    marginBottom: 25,
  },
  statCard: {
    flex: 1,
    backgroundColor: colors.white,
    marginHorizontal: 5,
    borderRadius: 15,
    padding: 15,
    alignItems: 'center',
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  statNumber: {
    fontSize: 18,
    fontWeight: '700',
    color: colors.dark,
    marginTop: 8,
  },
  statLabel: {
    fontSize: 12,
    color: colors.muted,
    marginTop: 4,
    textAlign: 'left',
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: colors.dark,
    marginBottom: 15,
    marginTop: 10,
    textAlign: 'right',
  },
  optionsWrapper: {
    backgroundColor: colors.white,
    borderRadius: 15,
    padding: 5,
    marginBottom: 20,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  optionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    backgroundColor: colors.white,
    borderRadius: 12,
    marginBottom: 12,
  },
  optionContent: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  optionText: {
    fontSize: 16,
    fontWeight: 'bold',
    color: colors.dark,
    marginRight: 8,
  },
  badge: {
    backgroundColor: colors.primary,
    paddingHorizontal: 4,
    paddingVertical: 2,
    borderRadius: 12,
  },
  badgeText: {
    fontSize: 12,
    fontWeight: 'bold',
    color: colors.white,
  },
  notificationButton: {
    position: 'relative',
    padding: 4,  // Add padding to make the touch target larger
  },
  headerBadge: {
    position: 'absolute',
    top: 0,
    right: 0,
    backgroundColor: colors.danger,
    minWidth: 18,
    height: 18,
    borderRadius: 9,
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 1,
  },
  headerBadgeText: {
    color: colors.white,
    fontSize: 10,
    fontWeight: 'bold',
    paddingHorizontal: 4,
  },
  menuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 12,
    backgroundColor: colors.white,
    borderRadius: 12,
    marginBottom: 12,
  },
  menuItemContent: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  menuItemText: {
    fontSize: 16,
    fontWeight: 'bold',
    color: colors.dark,
    marginRight: 8,
  },
  menuItemValue: {
    fontSize: 14,
    color: colors.muted,
  },
  socialLinksContainer: {
    backgroundColor: colors.white,
    borderRadius: 15,
    padding: 20,
    marginBottom: 30,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  socialTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: colors.dark,
    marginBottom: 15,
    textAlign: 'center',
  },
  socialIconsContainer: {
    flexDirection: 'row-reverse',
    justifyContent: 'space-around',
    alignItems: 'center',
  },
  socialButton: {
    width: 50,
    height: 50,
    borderRadius: 25,
    backgroundColor: colors.light,
    justifyContent: 'center',
    alignItems: 'center',
    elevation: 2,
    shadowColor: colors.primary,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 3,
  },
});