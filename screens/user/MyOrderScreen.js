import {
  StyleSheet,
  Text,
  StatusBar,
  View,
  ScrollView,
  TouchableOpacity,
  RefreshControl,
} from "react-native";
import React, { useState, useEffect, useCallback } from "react";
import { colors } from "../../constants";
import { Ionicons, MaterialCommunityIcons } from "@expo/vector-icons";
import CustomAlert from "../../components/CustomAlert/CustomAlert";
import ProgressDialog from "react-native-progress-dialog";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { supabase } from "../../supabase";
import { LinearGradient } from 'expo-linear-gradient';
import { useFocusEffect } from '@react-navigation/native';
import { I18nManager } from 'react-native';

I18nManager.allowRTL(false);
I18nManager.forceRTL(false);

const MyOrderScreen = ({ navigation }) => {
  const [isLoading, setIsLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState("");
  const [alertType, setAlertType] = useState("error");
  const [orders, setOrders] = useState([]);
  const [user, setUser] = useState(null);

  const getStatusColor = (status) => {
    switch (status?.toLowerCase()) {
      case 'pending':
        return ['#FFA41B', '#FF5151'];
      case 'shipped':
        return ['#3B82F6', '#1D4ED8'];
      case 'delivered':
        return ['#22C55E', '#15803D'];
      default:
        return [colors.primary, colors.primary_light];
    }
  };

  const getStatusIcon = (status) => {
    switch (status?.toLowerCase()) {
      case 'pending':
        return 'clock-time-four';
      case 'shipped':
        return 'truck-delivery';
      case 'delivered':
        return 'check-circle';
      default:
        return 'help-circle';
    }
  };

  const getStatusText = (status) => {
    switch (status?.toLowerCase()) {
      case 'pending':
        return 'قيد الانتظار';
      case 'shipped':
        return 'تم الشحن';
      case 'delivered':
        return 'تم التسليم';
      default:
        return 'غير معروف';
    }
  };

  const fetchOrders = useCallback(async () => {
    if (!user) return;
    
    setIsLoading(true);
    try {
      const { data: orders, error } = await supabase
        .from('orders')
        .select(`
          *,
          order_items (
            quantity,
            price,
            products (
              title,
              image_url
            )
          ),
          order_status_logs (
            status,
            changed_at
          )
        `)
        .eq('user_id', user.id)
        .order('created_at', { ascending: false });

      if (error) throw error;

      // Get latest status for each order
      const ordersWithStatus = orders.map(order => {
        const latestStatus = order.order_status_logs
          .sort((a, b) => new Date(b.changed_at) - new Date(a.changed_at))[0];
        return {
          ...order,
          current_status: latestStatus?.status || order.status
        };
      });

      setOrders(ordersWithStatus);
      setError("");
    } catch (error) {
      console.error("Error fetching orders:", error);
      setError("Failed to load orders");
      setAlertType("error");
    } finally {
      setIsLoading(false);
    }
  }, [user]);

  useFocusEffect(
    useCallback(() => {
      if (user) {
        fetchOrders();
      }
      
      // Optional: Set up real-time subscription
      const subscription = supabase
        .channel('orders-channel')
        .on('postgres_changes', 
          {
            event: '*',
            schema: 'public',
            table: 'orders',
            filter: `user_id=eq.${user?.id}`
          },
          () => {
            fetchOrders();
          }
        )
        .subscribe();

      // Cleanup subscription on unfocus
      return () => {
        subscription.unsubscribe();
      };
    }, [user, fetchOrders])
  );

  useEffect(() => {
    const loadUserAndOrders = async () => {
      try {
        const value = await AsyncStorage.getItem("authUser");
        if (value) {
          const userData = JSON.parse(value);
          setUser(userData);
        }
      } catch (error) {
        console.error("Error loading user:", error);
        setError("Failed to load user data");
        setAlertType("error");
      }
    };

    loadUserAndOrders();
  }, []);

  const handleRefresh = async () => {
    setRefreshing(true);
    await fetchOrders();
    setRefreshing(false);
  };

  const handleOrderDetail = (order) => {
    navigation.navigate("myorderdetail", { orderDetail: order });
  };

  const formatDate = (dateString) => {
    const options = { 
      year: 'numeric', 
      month: 'long', 
      day: 'numeric',
      hour: 'numeric',
      minute: 'numeric'
    };
    return new Date(dateString).toLocaleDateString('fr-FR', options);
  };

  const renderOrderCard = (order) => (
    <TouchableOpacity
      key={order.order_id}
      style={styles.orderCard}
      onPress={() => handleOrderDetail(order)}
    >
      <LinearGradient
        colors={getStatusColor(order.current_status)}
        style={styles.statusBadge}
      >
        <MaterialCommunityIcons 
          name={getStatusIcon(order.current_status)} 
          size={16} 
          color="white" 
        />
        <Text style={styles.statusText}>
          {getStatusText(order.current_status)}
        </Text>
      </LinearGradient>

      <View style={styles.orderInfo}>
        <Text style={styles.orderId}>
          طلب رقم #{order.order_id || ''}
        </Text>
        <Text style={styles.orderDate}>
          {formatDate(order.created_at)}
        </Text>
      </View>

      <View style={styles.orderDetails}>
        <View style={styles.itemsInfo}>
          <Text style={styles.itemCount}>
            {order.order_items?.length || 0} {(order.order_items?.length || 0) === 1 ? 'منتج' : 'منتجات'}
          </Text>
          <Text style={styles.totalAmount}>
            {order.total_cost || 0} د.ج
          </Text>
        </View>
        
        <View style={styles.addressInfo}>
          <MaterialCommunityIcons 
            name="map-marker" 
            size={16} 
            color={colors.muted} 
          />
          <Text style={styles.addressText} numberOfLines={1}>
            {order.shipping_address || ''}, {order.city || ''}
          </Text>
        </View>
      </View>

      <View style={styles.cardFooter}>
        <TouchableOpacity 
          style={styles.viewDetailsButton}
          onPress={() => handleOrderDetail(order)}
        >
          <Text style={styles.viewDetailsText}>عرض التفاصيل</Text>
          <MaterialCommunityIcons 
            name="chevron-right" 
            size={20} 
            color={colors.primary} 
          />
        </TouchableOpacity>
      </View>
    </TouchableOpacity>
  );

  return (
    <View style={styles.container}>
      <ProgressDialog visible={isLoading} label="Loading..." />
      
      <LinearGradient
        colors={[colors.primary, colors.primary_light]}
        style={styles.header}
      >
        <View style={styles.headerTop}>
         
          <Text style={styles.headerTitle}>طلباتي</Text>
          <View style={{ width: 32 }} />
        </View>
      </LinearGradient>

      <CustomAlert message={error} type={alertType} />

      {orders.length === 0 ? (
        <View style={styles.emptyContainer}>
          <MaterialCommunityIcons 
            name="shopping-outline" 
            size={64} 
            color={colors.muted} 
          />
          <Text style={styles.emptyText}>لا توجد طلبات حتى الآن</Text>
          <TouchableOpacity
            style={styles.shopButton}
            onPress={() => navigation.navigate("home")}
          >
            <Text style={styles.shopButtonText}>ابدأ التسوق</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <ScrollView
          style={styles.ordersList}
          showsVerticalScrollIndicator={false}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={handleRefresh}
              colors={[colors.primary]}
              tintColor={colors.primary}
            />
          }
        >
          {orders.map((order) => renderOrderCard(order))}
          <View style={styles.bottomPadding} />
        </ScrollView>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.light,
  },
  header: {
    padding: 20,
    paddingTop: 50,
    marginBottom: 20,
    borderBottomLeftRadius: 30,
    borderBottomRightRadius: 30,
  },
  headerTop: {
    flexDirection: 'row-reverse',
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: colors.white,
  },
  ordersList: {
    flex: 1,
    padding: 15,
  },
  orderCard: {
    backgroundColor: colors.white,
    borderRadius: 15,
    marginBottom: 15,
    elevation: 3,
    overflow: 'hidden',
  },
  statusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderBottomLeftRadius: 15,
    position: 'absolute',
    right: 0,
    top: 0,
  },
  statusText: {
    color: colors.white,
    fontSize: 12,
    fontWeight: 'bold',
    marginLeft: 4,
  },
  orderInfo: {
    padding: 15,
    borderBottomWidth: 1,
    borderBottomColor: colors.light,
  },
  orderId: {
    fontSize: 16,
    fontWeight: 'bold',
    marginBottom: 4,
    textAlign: 'left',
  },
  orderDate: {
    fontSize: 13,
    color: colors.muted,
    textAlign: 'left',
  },
  orderDetails: {
    padding: 15,
  },
  itemsInfo: {
    flexDirection: 'row-reverse',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  itemCount: {
    fontSize: 14,
    color: colors.muted,
  },
  totalAmount: {
    fontSize: 16,
    fontWeight: 'bold',
    color: colors.primary,
  },
  addressInfo: {
    flexDirection: 'row-reverse',
    alignItems: 'center',
  },
  addressText: {
    fontSize: 13,
    color: colors.muted,
    marginRight: 4,
    textAlign: 'right',
  },
  cardFooter: {
    borderTopWidth: 1,
    borderTopColor: colors.light,
    padding: 12,
  },
  viewDetailsButton: {
    flexDirection: 'row-reverse',
    alignItems: 'center',
    justifyContent: 'center',
  },
  viewDetailsText: {
    fontSize: 14,
    color: colors.primary,
    fontWeight: '600',
    marginLeft: 4,
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  emptyText: {
    fontSize: 18,
    color: colors.muted,
    marginTop: 10,
    marginBottom: 20,
    textAlign: 'center',
  },
  shopButton: {
    backgroundColor: colors.primary,
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 25,
  },
  shopButtonText: {
    color: colors.white,
    fontSize: 16,
    fontWeight: '600',
  },
  bottomPadding: {
    height: 20,
  },
});

export default MyOrderScreen;