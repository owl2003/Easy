import {
  StyleSheet,
  StatusBar,
  View,
  TouchableOpacity,
  Text,
  ScrollView,
  RefreshControl,
  Dimensions,
} from "react-native";
import React, { useState, useEffect } from "react";
import { Ionicons, MaterialCommunityIcons, FontAwesome5 } from "@expo/vector-icons";
import { colors } from "../../constants";
import CustomCard from "../../components/CustomCard/CustomCard";
import OptionList from "../../components/OptionList/OptionList";
import InternetConnectionAlert from "react-native-internet-connection-alert";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { LinearGradient } from "expo-linear-gradient";
import { supabase } from "../../supabase";
import Loading from '../../components/Loading/Loading';
import { I18nManager } from 'react-native';

I18nManager.allowRTL(false);
I18nManager.forceRTL(false);

const DashboardScreen = ({ navigation, route }) => {
  const { authUser } = route.params;
  const [user, setUser] = useState(authUser);
  const [isLoading, setIsLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [stats, setStats] = useState({
    usersCount: 0,
    ordersCount: 0,
    productsCount: 0,
    categoriesCount: 0,
    totalRevenue: 0,
    vipProducts: 0,
    discountedProducts: 0,
    newProducts: 0,
    recentOrders: [],
    recentUsers: [],
    dailySales: {
      count: 0,
      revenue: 0
    }
  });

  const logout = async () => {
    await AsyncStorage.removeItem("authUser");
    navigation.replace("login");
  };

  const fetchDashboardData = async () => {
    setIsLoading(true);
    try {
      // Get today's date at start of day
      const today = new Date();
      today.setHours(0, 0, 0, 0);

      // Fetch today's orders
      const { data: todayOrders, error: ordersError } = await supabase
        .from('orders')
        .select('*')
        .gte('created_at', today.toISOString());

      if (ordersError) throw ordersError;

      const dailySales = {
        count: todayOrders?.length || 0,
        revenue: todayOrders?.reduce((sum, order) => sum + order.total_cost, 0) || 0
      };

      // Fetch users count
      const { count: usersCount } = await supabase
        .from('users')
        .select('*', { count: 'exact' });

      // Fetch orders and revenue
      const { data: orders, count: ordersCount } = await supabase
        .from('orders')
        .select('*', { count: 'exact' });
      
      const totalRevenue = orders?.reduce((sum, order) => sum + order.total_cost, 0) || 0;

      // Fetch products stats
      const { count: productsCount } = await supabase
        .from('products')
        .select('*', { count: 'exact' });

      const { count: vipProducts } = await supabase
        .from('products')
        .select('*', { count: 'exact' })
        .eq('vip', true);

      const { count: discountedProducts } = await supabase
        .from('products')
        .select('*', { count: 'exact' })
        .eq('issold', true);

      const { count: newProducts } = await supabase
        .from('products')
        .select('*', { count: 'exact' })
        .eq('isnew', true);

      // Fetch categories count
      const { count: categoriesCount } = await supabase
        .from('categories')
        .select('*', { count: 'exact' });

      // Fetch recent orders
      const { data: recentOrders } = await supabase
        .from('orders')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(5);

      // Fetch recent users
      const { data: recentUsers } = await supabase
        .from('users')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(5);

      setStats(prev => ({
        ...prev,
        usersCount: usersCount || 0,
        ordersCount: ordersCount || 0,
        productsCount: productsCount || 0,
        categoriesCount: categoriesCount || 0,
        totalRevenue,
        vipProducts: vipProducts || 0,
        discountedProducts: discountedProducts || 0,
        newProducts: newProducts || 0,
        recentOrders: recentOrders || [],
        recentUsers: recentUsers || [],
        dailySales
      }));

    } catch (error) {
      console.error('Dashboard data fetch error:', error);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchDashboardData();
  }, []);

  const handleOnRefresh = () => {
    setRefreshing(true);
    fetchDashboardData();
    setRefreshing(false);
  };

  return (
    <InternetConnectionAlert>
      <View style={styles.container}>
        <StatusBar barStyle="light-content" />

        {/* Header Section */}
        <LinearGradient
          colors={[colors.primary, colors.primary]}
          style={styles.header}
        >
          <View style={styles.headerContent}>
            <TouchableOpacity onPress={logout}>
              <Ionicons name="log-out" size={30} color={colors.light} />
            </TouchableOpacity>
            <Text style={styles.headerTitle}>لوحة التحكم</Text>
            <TouchableOpacity>
              <Ionicons name="person-circle-outline" size={30} color={colors.white} />
            </TouchableOpacity>
          </View>

          <View style={styles.revenueContainer}>
            <Text style={styles.revenueTitle}>مبيعات اليوم</Text>
            <Text style={styles.revenueAmount}>{stats.dailySales.count} طلب</Text>
            <Text style={styles.dailyRevenue}>{stats.dailySales.revenue.toLocaleString()} دج</Text>
          </View>
        </LinearGradient>

        <ScrollView
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={handleOnRefresh} />
          }
          style={styles.content}
        >
          {/* Main Stats */}
          <View style={styles.statsGrid}>
            <View style={styles.statsRow}>
              <CustomCard
                title="المستخدمين"
                value={stats.usersCount}
                iconName="person"
                type="primary"
                onPress={() => navigation.navigate("viewusers", { authUser: user })}
              />
              <CustomCard
                title="الطلبات"
                value={stats.ordersCount}
                iconName="cart"
                type="secondary"
                onPress={() => navigation.navigate("vieworder", { authUser: user })}
              />
            </View>
            <View style={styles.statsRow}>
              <CustomCard
                title="المنتجات"
                value={stats.productsCount}
                iconName="cube"
                type="warning"
                onPress={() => navigation.navigate("viewproduct", { authUser: user })}
              />
              <CustomCard
                title="الفئات"
                value={stats.categoriesCount}
                iconName="list"
                type="muted"
                onPress={() => navigation.navigate("viewcategories", { authUser: user })}
              />
            </View>
          </View>

       

          {/* Recent Orders */}
          <View style={styles.recentActivity}>
            <Text style={styles.sectionTitle}>آخر الطلبات</Text>
            <View style={styles.activityContainer}>
              {stats.recentOrders.map((order) => (
                <TouchableOpacity 
                  key={order.id}
                  style={styles.activityItem}
                  onPress={() => navigation.navigate("vieworder", { 
                    authUser,
                    orderId: order.id 
                  })}
                >
                  <Ionicons name="chevron-back" size={24} color={colors.muted} />
                  <View style={styles.activityInfo}>
                    <Text style={styles.activityTitle}>
                      طلب جديد #{order.id}
                    </Text>
                    <Text style={styles.activityMeta}>
                      {order.total_cost} دينار جزائري
                    </Text>
                  </View>
                  <View style={styles.activityIcon}>
                    <MaterialCommunityIcons 
                      name="shopping" 
                      size={24} 
                      color={colors.primary_light} 
                    />
                  </View>
                </TouchableOpacity>
              ))}
            </View>
          </View>

          {/* Recent Users */}
          <View style={styles.recentActivity}>
            <Text style={styles.sectionTitle}>آخر المستخدمين</Text>
            <View style={styles.activityContainer}>
              {stats.recentUsers.map((user) => (
                <TouchableOpacity 
                  key={user.id}
                  style={styles.activityItem}
                  onPress={() => navigation.navigate("viewusers", { 
                    authUser,
                    selectedUser: user 
                  })}
                >
                  <View style={[styles.activityIcon, { backgroundColor: colors.info }]}>
                    <MaterialCommunityIcons 
                      name="account" 
                      size={24} 
                      color={colors.primary_light} 
                    />
                  </View>
                  <View style={styles.activityInfo}>
                    <Text style={styles.activityTitle}>
                      {user.first_name+ ' ' + user.last_name || 'مستخدم جديد'}
                    </Text>
                    <Text style={styles.activityMeta}>
                      {user.email}
                    </Text>
                  </View>
                  <Ionicons name="chevron-forward" size={24} color={colors.muted} />
                </TouchableOpacity>
              ))}
            </View>
          </View>

          {/* Quick Actions */}
          <View style={styles.actionsContainer}>
            <Text style={styles.sectionTitle}>الإجراءات السريعة</Text>
            <View style={styles.actionList}>
              <OptionList
                text="المنتجات"
                Icon={Ionicons}
                iconName="cube"
                onPress={() => navigation.navigate("viewproduct", { authUser: user })}
                onPressSecondary={() => navigation.navigate("addproduct", { authUser: user })}
                type="modern"
              />
              <OptionList
                text="النشرات"
                Icon={Ionicons}
                iconName="megaphone"
                onPress={() => navigation.navigate("pub", { authUser: user })}
                onPressSecondary={() => navigation.navigate("addpub", { authUser: user })}
                type="modern"
              />
              <OptionList
                text="الفئات"
                Icon={Ionicons}
                iconName="list"
                onPress={() => navigation.navigate("viewcategories", { authUser: user })}
                onPressSecondary={() => navigation.navigate("addcategories", { authUser: user })}
                type="modern"
              />
              <OptionList
                text="الطلبات"
                Icon={Ionicons}
                iconName="cart"
                onPress={() => navigation.navigate("vieworder", { authUser: user })}
                type="modern"
              />
              <OptionList
                text="المستخدمين"
                Icon={Ionicons}
                iconName="people"
                onPress={() => navigation.navigate("viewusers", { authUser: user })}
                type="modern"
              />
              
              <OptionList
                text="إشعارات المستخدمين"
                Icon={Ionicons}
                iconName="notifications"
                onPress={() => navigation.navigate("adminnotifications", { authUser: user })}
                type="modern"
              />


              <OptionList
                text="الطلبات اليدوية"
                Icon={MaterialCommunityIcons}
                iconName="receipt"
                onPress={() => navigation.navigate("viewmanualorders")}
                type="modern"
              />
            </View>
          </View>
        </ScrollView>
        {isLoading && <Loading />}
      </View>
    </InternetConnectionAlert>
  );
};

export default DashboardScreen;

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.light,
  },
  header: {
    padding: 20,
    paddingTop: StatusBar.currentHeight + 10,
    borderBottomLeftRadius: 30,
    borderBottomRightRadius: 30,
  },
  headerContent: {
    flexDirection: "row-reverse",
    justifyContent: "space-between",
    alignItems: "center",
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: "bold",
    color: colors.light,
    textAlign: 'right',
  },
  revenueContainer: {
    alignItems: "center",
    marginTop: 20,
    marginBottom: 10,
  },
  revenueTitle: {
    fontSize: 16,
    color: colors.light,
    opacity: 0.8,
    textAlign: 'center',
  },
  revenueAmount: {
    fontSize: 32,
    fontWeight: "bold",
    color: colors.light,
    marginTop: 5,
  },
  dailyRevenue: {
    fontSize: 16,
    color: colors.light,
    opacity: 0.9,
    marginTop: 5,
  },
  content: {
    flex: 1,
    padding: 20,
  },
  statsGrid: {
    marginBottom: 20,
    paddingHorizontal: 10,
    alignItems: 'center',
  },
  statsRow: {
    flexDirection: "row-reverse",
    justifyContent: "center",
    marginBottom: 10,
    width: '100%',
    paddingHorizontal: 30,  // Add horizontal padding
  },
  productStats: {
    marginBottom: 20,
  },
  statsScrollContainer: {
    paddingLeft: 20,
    flexDirection: 'row-reverse',
    gap: 15,

  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: "bold",
    marginBottom: 15,
    color: colors.primary,
    textAlign: 'right',
  },
  recentActivity: {
    backgroundColor: colors.white,
    borderRadius: 15,
    padding: 15,
    marginBottom: 20,
    elevation: 2,
  },
  activityContainer: {
    marginTop: 10,
  },
  activityItem: {
    flexDirection: 'row-reverse',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: colors.light,
  },
  activityIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: colors.light,
    justifyContent: 'center',
    alignItems: 'center',
    marginLeft: 15,
  },
  activityInfo: {
    flex: 1,
    alignItems: 'flex-end',
  },
  activityTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.dark,
    textAlign: 'right',
  },
  activityMeta: {
    fontSize: 14,
    color: colors.muted,
    marginTop: 2,
    textAlign: 'right',
  },
  actionsContainer: {
    marginBottom: 20,
  },
  actionList: {
    backgroundColor: colors.white,
    borderRadius: 15,
    padding: 15,
    elevation: 2,
  },
});