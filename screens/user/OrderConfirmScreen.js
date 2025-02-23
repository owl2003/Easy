import { StyleSheet, Image, Text, View, StatusBar, ScrollView } from "react-native";
import React, { useEffect, useState } from "react";
import CustomButton from "../../components/CustomButton";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { colors } from "../../constants";
import { supabase } from "../../supabase";
import { Ionicons } from "@expo/vector-icons";
import { I18nManager } from 'react-native';

I18nManager.allowRTL(false);
I18nManager.forceRTL(false);

const OrderConfirmScreen = ({ navigation, route }) => {
  const [user, setUser] = useState({});
  const [orderDetails, setOrderDetails] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const { orderId } = route.params || {};

  const getUserData = async () => {
    try {
      const value = await AsyncStorage.getItem("authUser");
      if (value) {
        setUser(JSON.parse(value));
      }
    } catch (error) {
      console.error("Error getting user data:", error);
    }
  };

  const fetchOrderDetails = async () => {
    if (!orderId) {
      setIsLoading(false);
      return;
    }

    try {
      // Get order details with nested relationships
      const { data: order, error: orderError } = await supabase
        .from('orders')
        .select(`
          *,
          order_items (
            *,
            products (
              id,
              title,
              price,
              image_url,
              description
            )
          ),
          users (
            first_name,
            last_name,
            email,
            phone_number
          )
        `)
        .eq('order_id', orderId)
        .single();

      if (orderError) throw orderError;

      // Get latest status from order_status_logs
      const { data: statusLog, error: statusError } = await supabase
        .from('order_status_logs')
        .select('status, changed_at')
        .eq('order_id', orderId)
        .order('changed_at', { ascending: false })
        .limit(1)
        .single();

      if (!statusError && statusLog) {
        order.current_status = statusLog.status;
      }

      setOrderDetails(order);
    } catch (error) {
      console.error("Error fetching order details:", error);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    getUserData();
    fetchOrderDetails();
  }, [orderId]);

  const getStatusColor = (status) => {
    switch (status?.toLowerCase()) {
      case 'pending':
        return colors.warning;
      case 'shipped':
        return colors.primary;
      case 'delivered':
        return colors.success;
      default:
        return colors.muted;
    }
  };

  if (isLoading) {
    return (
      <View style={styles.container}>
        <StatusBar />
        <View style={styles.loadingContainer}>
          <Text style={styles.loadingText}>جاري تحميل تفاصيل الطلب...</Text>
        </View>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <StatusBar />
      <View style={styles.topBarContainer}>
        <Text style={styles.topBarText}>تأكيد الطلب</Text>
      </View>

      <ScrollView style={styles.scrollContainer}>
        <View style={styles.successContainer}>
          <Ionicons name="checkmark-circle" size={80} color={colors.success} />
          <Text style={styles.successText}>تم تأكيد الطلب بنجاح!</Text>
          <Text style={styles.orderIdText}>طلب رقم #{orderId}</Text>
        </View>

        {orderDetails && (
          <>
            <View style={styles.infoContainer}>
              <Text style={styles.sectionTitle}>حالة الطلب</Text>
              <View style={styles.statusContainer}>
                <Text style={[
                  styles.statusText,
                  { color: getStatusColor(orderDetails.current_status || orderDetails.status) }
                ]}>
                  {(orderDetails.current_status || orderDetails.status) === 'pending' ? 'قيد الانتظار' :
                   (orderDetails.current_status || orderDetails.status) === 'shipped' ? 'تم الشحن' :
                   (orderDetails.current_status || orderDetails.status) === 'delivered' ? 'تم التوصيل' :
                   orderDetails.current_status || orderDetails.status}
                </Text>
                <Text style={styles.dateText}>
                  {new Date(orderDetails.created_at).toLocaleString('ar-DZ')}
                </Text>
              </View>
            </View>

            <View style={styles.infoContainer}>
              <Text style={styles.sectionTitle}>عنوان التوصيل</Text>
              <Text style={styles.addressText}>{orderDetails.shipping_address}</Text>
              <Text style={styles.addressText}>
                {orderDetails.city}، {orderDetails.country}
              </Text>
              <Text style={styles.addressText}>{orderDetails.zipcode}</Text>
            </View>

            <View style={styles.infoContainer}>
              <Text style={styles.sectionTitle}>ملخص الطلب</Text>
              {orderDetails.order_items?.map((item, index) => (
                <View key={index} style={styles.itemContainer}>
                  {item.products?.image_url && (
                    <Image
                      source={{ uri: item.products.image_url }}
                      style={styles.productImage}
                    />
                  )}
                  <View style={styles.itemDetails}>
                    <Text style={styles.itemTitle}>{item.products?.title}</Text>
                    <Text style={styles.itemQuantity}>الكمية: {item.quantity}</Text>
                    <Text style={styles.itemPrice}>
                      {(item.price * item.quantity).toFixed(2)} دج
                    </Text>
                  </View>
                </View>
              ))}
              
              <View style={styles.totalContainer}>
                <Text style={styles.totalText}>المبلغ الإجمالي</Text>
                <Text style={styles.totalAmount}>
                  {Number(orderDetails.total_cost).toFixed(2)} دج
                </Text>
              </View>
            </View>
          </>
        )}
      </ScrollView>

      <View style={styles.bottomContainer}>
        <CustomButton
          text="مواصلة التسوق"
          onPress={() => navigation.replace("tab", { user })}
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
  topBarContainer: {
    backgroundColor: colors.white,
    padding: 15,
    alignItems: 'center',
    elevation: 2,
  },
  topBarText: {
    fontSize: 18,
    fontWeight: 'bold',
    color: colors.primary,
    textAlign: 'right',
  },
  scrollContainer: {
    flex: 1,
    padding: 15,
  },
  successContainer: {
    alignItems: 'center',
    backgroundColor: colors.white,
    padding: 20,
    borderRadius: 10,
    marginBottom: 15,
    elevation: 2,
  },
  successText: {
    fontSize: 22,
    fontWeight: 'bold',
    color: colors.primary,
    marginTop: 10,
    textAlign: 'center',
  },
  orderIdText: {
    fontSize: 16,
    color: colors.muted,
    marginTop: 5,
    textAlign: 'center',
  },
  infoContainer: {
    backgroundColor: colors.white,
    padding: 15,
    borderRadius: 10,
    marginBottom: 15,
    elevation: 2,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 10,
    color: colors.dark,
    textAlign: 'right',
  },
  statusContainer: {
    flexDirection: 'row-reverse',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  statusText: {
    fontSize: 16,
    fontWeight: 'bold',
  },
  dateText: {
    fontSize: 14,
    color: colors.muted,
  },
  addressText: {
    fontSize: 15,
    color: colors.dark,
    marginBottom: 5,
    textAlign: 'right',
  },
  itemContainer: {
    flexDirection: 'row-reverse',
    padding: 10,
    borderBottomWidth: 1,
    borderBottomColor: colors.light,
  },
  productImage: {
    width: 70,
    height: 70,
    borderRadius: 10,
    marginLeft: 10,
  },
  itemDetails: {
    flex: 1,
    justifyContent: 'space-between',
    alignItems: 'flex-end',
  },
  itemTitle: {
    fontSize: 16,
    fontWeight: '500',
    textAlign: 'right',
  },
  itemQuantity: {
    fontSize: 14,
    color: colors.muted,
    textAlign: 'right',
  },
  itemPrice: {
    fontSize: 15,
    fontWeight: 'bold',
    color: colors.primary,
    textAlign: 'right',
  },
  totalContainer: {
    flexDirection: 'row-reverse',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 15,
    paddingTop: 15,
    borderTopWidth: 1,
    borderTopColor: colors.light,
  },
  totalText: {
    fontSize: 18,
    fontWeight: 'bold',
    textAlign: 'right',
  },
  totalAmount: {
    fontSize: 20,
    fontWeight: 'bold',
    color: colors.primary,
    textAlign: 'right',
  },
  bottomContainer: {
    padding: 15,
    backgroundColor: colors.white,
    elevation: 5,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    fontSize: 16,
    color: colors.muted,
    textAlign: 'center',
  },
});

export default OrderConfirmScreen;
