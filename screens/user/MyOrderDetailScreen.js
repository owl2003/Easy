import {
  StyleSheet,
  Text,
  Image,
  StatusBar,
  View,
  ScrollView,
  TouchableOpacity,
  I18nManager,
  Dimensions,
} from "react-native";
import React, { useState, useEffect } from "react";
import { colors } from "../../constants"; // Assuming you have a colors constant file
import { Ionicons, MaterialCommunityIcons } from "@expo/vector-icons";
import CustomAlert from "../../components/CustomAlert/CustomAlert";
import ProgressDialog from "react-native-progress-dialog";
import BasicProductList from "../../components/BasicProductList/BasicProductList";
import StepIndicator from "react-native-step-indicator";
import { supabase } from "../../supabase";
import { LinearGradient } from 'expo-linear-gradient';

I18nManager.allowRTL(false);
I18nManager.forceRTL(false);



const { width } = Dimensions.get('window');

const StatCard = ({ title, subtitle, icon, colors, style }) => (
  <LinearGradient
    colors={colors}
    style={[styles.statCard, style]}
  >
    <View style={styles.statIconContainer}>
      <MaterialCommunityIcons name={icon} size={24} color={colors.white} />
    </View>
    <View style={styles.statInfo}>
      <Text style={styles.statTitle}>{title}</Text>
      <Text style={styles.statSubtitle}>{subtitle}</Text>
    </View>
  </LinearGradient>
);

const MyOrderDetailScreen = ({ navigation, route }) => {
  const { orderDetail } = route.params;
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");
  const [alertType, setAlertType] = useState("error");
  const [orderItems, setOrderItems] = useState([]);
  const [statusLogs, setStatusLogs] = useState([]);
  const [currentPosition, setCurrentPosition] = useState(0);

  const labels = ["قيد الانتظار", "تم الشحن", "تم التسليم"];
  const statusToPosition = {
    'pending': 0,
    'shipped': 1,
    'delivered': 2
  };

  const customStyles = {
    stepIndicatorSize: 25,
    currentStepIndicatorSize: 30,
    separatorStrokeWidth: 2,
    currentStepStrokeWidth: 3,
    stepStrokeCurrentColor: colors.primary,
    stepStrokeWidth: 3,
    stepStrokeFinishedColor: colors.primary,
    stepStrokeUnFinishedColor: colors.muted,
    separatorFinishedColor: colors.primary,
    separatorUnFinishedColor: colors.muted,
    stepIndicatorFinishedColor: colors.primary,
    stepIndicatorUnFinishedColor: colors.white,
    stepIndicatorCurrentColor: colors.white,
    stepIndicatorLabelFontSize: 13,
    currentStepIndicatorLabelFontSize: 13,
    stepIndicatorLabelCurrentColor: colors.primary,
    stepIndicatorLabelFinishedColor: colors.white,
    stepIndicatorLabelUnFinishedColor: colors.muted,
    labelColor: colors.muted,
    labelSize: 13,
    currentStepLabelColor: colors.primary,
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

  const fetchOrderDetails = async () => {
    setIsLoading(true);
    try {
      // Fetch order items with product details
      const { data: items, error: itemsError } = await supabase
        .from('order_items')
        .select(`
          quantity,
          price,
          products (
            id,
            title,
            image_url,
            description
          )
        `)
        .eq('order_id', orderDetail.order_id);

      if (itemsError) throw itemsError;
      setOrderItems(items);

      // Fetch status logs
      const { data: logs, error: logsError } = await supabase
        .from('order_status_logs')
        .select('*')
        .eq('order_id', orderDetail.order_id)
        .order('changed_at', { ascending: true });

      if (logsError) throw logsError;
      setStatusLogs(logs);

      // Set current position based on latest status
      const currentStatus = logs[logs.length - 1]?.status || orderDetail.status;
      setCurrentPosition(statusToPosition[currentStatus] || 0);

    } catch (error) {
      console.error("Error fetching order details:", error);
      setError("فشل في تحميل تفاصيل الطلب");
      setAlertType("error");
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchOrderDetails();
  }, [orderDetail.order_id]);

  const calculateTotal = () => {
    return orderItems.reduce((total, item) => total + (item.price * item.quantity), 0);
  };

  const getStatusIcon = (status) => {
    switch (status) {
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
    switch (status) {
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

  const getStatusColor = (status) => {
    switch (status) {
      case 'pending':
        return { 
          light: '#FFF3E0', 
          dark: '#F57C00' 
        };
      case 'shipped':
        return { 
          light: '#E3F2FD', 
          dark: '#1976D2' 
        };
      case 'delivered':
        return { 
          light: '#E8F5E9', 
          dark: '#388E3C' 
        };
      default:
        return { 
          light: colors.light, 
          dark: colors.muted 
        };
    }
  };

  const getStatusInfo = (status) => {
    switch (status) {
      case 'pending':
        return {
          title: 'قيد الانتظار',
          subtitle: 'طلبك قيد المراجعة',
          icon: 'clock-time-four'
        };
      case 'shipped':
        return {
          title: 'تم الشحن',
          subtitle: 'طلبك في الطريق',
          icon: 'truck-delivery'
        };
      case 'delivered':
        return {
          title: 'تم التسليم',
          subtitle: 'تم تسليم طلبك بنجاح',
          icon: 'check-circle'
        };
      default:
        return {
          title: 'غير معروف',
          subtitle: 'حالة غير معروفة',
          icon: 'help-circle'
        };
    }
  };

  return (
    <View style={styles.container}>
      <StatusBar backgroundColor={colors.primary} />
      <ScrollView style={styles.content}>
        <View style={styles.receiptContainer}>
          {/* Store Logo & Info */}
          <View style={styles.storeHeader}>
            <MaterialCommunityIcons name="store" size={24} color={colors.primary} />
            <Image source={require('../../assets/logo/mehdi(1).png')} style={{ width: 290, height: 53 }} />

            <Text style={styles.storePhone}>هاتف: {orderDetail.phone || "0655042803"}</Text>
          </View>

          {/* Order Info */}
          <View style={styles.orderInfo}>
            <View style={styles.orderInfoRow}>
              <Text style={styles.orderInfoLabel}>رقم الطلب:</Text>
              <Text style={styles.orderInfoValue}>#{orderDetail.order_id}</Text>
            </View>
            <View style={styles.orderInfoRow}>
              <Text style={styles.orderInfoLabel}>التاريخ:</Text>
              <Text style={styles.orderInfoValue}>{formatDate(orderDetail.created_at)}</Text>
            </View>
          </View>

          <View style={styles.divider} />

          {/* Status Badge */}
          <View style={styles.statusContainer}>
            <View style={[
              styles.statusBadge, 
              { backgroundColor: getStatusColor(orderDetail.status).light }
            ]}>
              <MaterialCommunityIcons 
                name={getStatusIcon(orderDetail.status)} 
                size={16} 
                color={getStatusColor(orderDetail.status).dark} 
              />
              <Text style={[
                styles.statusText, 
                { color: getStatusColor(orderDetail.status).dark }
              ]}>
                {getStatusText(orderDetail.status)}
              </Text>
            </View>
          </View>

          {/* Delivery Info */}
          <View style={styles.deliveryInfo}>
            <View style={styles.sectionHeader}>
              <MaterialCommunityIcons name="map-marker" size={20} color={colors.primary} />
              <Text style={styles.sectionTitle}>معلومات التوصيل</Text>
            </View>
            <Text style={styles.addressText}>{orderDetail.shipping_address}</Text>
            <Text style={styles.cityText}>{orderDetail.city}</Text>
            <Text style={styles.zipText}>الرمز البريدي: {orderDetail.zipcode}</Text>
          </View>

          {/* Products List */}
          <View style={styles.productsSection}>
            <View style={styles.sectionHeader}>
              <MaterialCommunityIcons name="package-variant" size={20} color={colors.primary} />
              <Text style={styles.sectionTitle}>المنتجات</Text>
            </View>
            
            <View style={styles.tableHeader}>
              <Text style={[styles.tableHeaderText, { flex: 2 }]}>المنتج</Text>
              <Text style={[styles.tableHeaderText, { flex: 1 }]}>الكمية</Text>
              <Text style={[styles.tableHeaderText, { flex: 1 }]}>السعر</Text>
            </View>

            {orderItems.map((item, index) => (
              <View key={index} style={styles.tableRow}>
                <Text style={[styles.tableCell, { flex: 2 }]} numberOfLines={1}>
                  {item.products.title}
                </Text>
                <Text style={[styles.tableCell, { flex: 1 }]}>{item.quantity}</Text>
                <Text style={[styles.tableCell, { flex: 1 }]}>{item.price} دج</Text>
              </View>
            ))}
          </View>

          {/* Total */}
          <View style={styles.totalSection}>
            <View style={styles.totalRow}>
              <Text style={styles.totalLabel}>المجموع الكلي</Text>
              <Text style={styles.totalValue}>{orderDetail.total_cost} دج</Text>
            </View>
          </View>
        </View>
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.light,
  },
  content: {
    flex: 1,
  },
  receiptContainer: {
    backgroundColor: colors.white,
    margin: 15,
    borderRadius: 10,
    padding: 20,
    elevation: 2,
  },
  storeHeader: {
    alignItems: 'center',
    marginBottom: 20,
  },
  storeName: {
    fontSize: 20,
    fontWeight: 'bold',
    color: colors.primary,
    marginTop: 8,
  },
  storePhone: {
    fontSize: 14,
    color: colors.muted,
    marginTop: 4,
  },
  orderInfo: {
    marginBottom: 15,
  },
  orderInfoRow: {
    flexDirection: 'row-reverse',
    justifyContent: 'space-between',
    marginBottom: 4,
  },
  orderInfoLabel: {
    fontSize: 14,
    color: colors.muted,
  },
  orderInfoValue: {
    fontSize: 14,
    color: colors.dark,
    textAlign: 'right',
  },
  divider: {
    height: 1,
    backgroundColor: colors.light,
    marginVertical: 15,
    borderStyle: 'dashed',
    borderWidth: 1,
  },
  statusContainer: {
    alignItems: 'flex-start',
    marginBottom: 20,
  },
  statusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 8,
    borderRadius: 15,
  },
  statusText: {
    marginRight: 4,
    fontSize: 13,
    color: '#388E3C',
  },
  deliveryInfo: {
    marginBottom: 20,
  },
  sectionHeader: {
    flexDirection: 'row-reverse',
    alignItems: 'center',
    marginBottom: 10,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    marginLeft: 8,
    color: colors.primary,
    textAlign: 'right',
  },
  addressText: {
    fontSize: 14,
    color: colors.dark,
    marginBottom: 4,
    textAlign: 'right',
  },
  cityText: {
    fontSize: 14,
    color: colors.muted,
    marginBottom: 4,
    textAlign: 'right',
  },
  zipText: {
    fontSize: 14,
    color: colors.muted,
    textAlign: 'right',
  },
  productsSection: {
    marginBottom: 20,
  },
  tableHeader: {
    flexDirection: 'row-reverse',
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: colors.light,
  },
  tableHeaderText: {
    fontSize: 14,
    fontWeight: 'bold',
    color: colors.primary,
    textAlign: 'right',
  },
  tableRow: {
    flexDirection: 'row-reverse',
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: colors.light,
  },
  tableCell: {
    fontSize: 14,
    color: colors.dark,
    textAlign: 'right',
  },
  totalSection: {
    marginTop: 20,
    paddingTop: 15,
    borderTopWidth: 1,
    borderTopColor: colors.primary,
  },
  totalRow: {
    flexDirection: 'row-reverse',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  totalLabel: {
    fontSize: 16,
    fontWeight: 'bold',
    color: colors.primary,
  },
  totalValue: {
    fontSize: 18,
    fontWeight: 'bold',
    color: colors.primary,
  },
});

export default MyOrderDetailScreen;