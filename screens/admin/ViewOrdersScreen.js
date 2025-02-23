import {
  StyleSheet,
  Text,
  StatusBar,
  View,
  ScrollView,
  TouchableOpacity,
  RefreshControl,
  Dimensions,
} from "react-native";
import React, { useState, useEffect } from "react";
import { colors } from "../../constants";
import { Ionicons, MaterialIcons, MaterialCommunityIcons } from "@expo/vector-icons";
import CustomAlert from "../../components/CustomAlert/CustomAlert";
import CustomInput from "../../components/CustomInput";
import ProgressDialog from "react-native-progress-dialog";
import OrderList from "../../components/OrderList/OrderList";
import { supabase } from "../../supabase";
import { LinearGradient } from 'expo-linear-gradient';
import { I18nManager } from 'react-native';

I18nManager.allowRTL(false);
I18nManager.forceRTL(false);

const { width } = Dimensions.get('window');

// Update the card size to be slightly smaller
const cardSize = width * 0.2; // Reduced from 0.22

const OrderStatusCard = ({ title, count, icon, color, onPress, isSelected }) => (
    <TouchableOpacity 
      style={[
        styles.statusCard, 
        { width: cardSize, height: cardSize },
        isSelected && { borderColor: color, borderWidth: 2 }
      ]} 
      onPress={onPress}
    >
      <View style={[styles.iconContainer, { backgroundColor: color + '20' }]}>
        <MaterialCommunityIcons name={icon} size={10} color={color} />
      </View>
      <Text style={[styles.statusCount, { color: color }]}>{count}</Text>
      <Text style={styles.statusTitle}>{title}</Text>
    </TouchableOpacity>
  );

const ViewOrdersScreen = ({ navigation, route }) => {
  const { authUser } = route.params;
  const [isloading, setIsloading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [alertType, setAlertType] = useState("error");
  const [label, setLabel] = useState("جاري التحميل...");
  const [error, setError] = useState("");
  const [orders, setOrders] = useState([]);
  const [foundItems, setFoundItems] = useState([]);
  const [filterItem, setFilterItem] = useState("");
  const [selectedStatus, setSelectedStatus] = useState("all");
  const [orderStats, setOrderStats] = useState({
    all: 0,
    pending: 0,
    shipped: 0,
    delivered: 0
  });

  const fetchOrders = async () => {
    setIsloading(true);
    setLabel("جاري تحميل الطلبات...");
    try {
      const { data, error } = await supabase
        .from('orders')
        .select(`
          *,
          user:users(
            id,
            email,
            first_name,
            last_name,
            phone_number
          ),
          order_items(
            order_item_id,
            price,
            quantity,
            product:products(
              id,
              title
            )
          )
        `)
        .order('created_at', { ascending: false });

      if (error) throw error;

      setOrders(data);
      setFoundItems(data);

      // Calculate order statistics
      const stats = data.reduce((acc, order) => {
        acc.all++;
        acc[order.status] = (acc[order.status] || 0) + 1;
        return acc;
      }, { all: 0, pending: 0, shipped: 0, delivered: 0 });

      setOrderStats(stats);
      setError("");
    } catch (error) {
      setError("حدث خطأ في تحميل الطلبات");
      setAlertType("error");
    } finally {
      setIsloading(false);
    }
  };

  const filterOrders = () => {
    let filtered = orders;

    // Filter by status
    if (selectedStatus !== 'all') {
      filtered = filtered.filter(order => order.status === selectedStatus);
    }

    // Filter by search term
    if (filterItem) {
      filtered = filtered.filter(order => 
        order.order_id.toString().includes(filterItem) ||
        order.user?.email?.toLowerCase().includes(filterItem.toLowerCase()) ||
        `${order.user?.first_name} ${order.user?.last_name}`.toLowerCase().includes(filterItem.toLowerCase())
      );
    }

    setFoundItems(filtered);
  };

  useEffect(() => {
    fetchOrders();
  }, []);

  useEffect(() => {
    filterOrders();
  }, [filterItem, selectedStatus]);

  return (
    <View style={styles.container}>
      <StatusBar backgroundColor={colors.primary} />
      
      {/* Header */}
      <LinearGradient
        colors={[colors.primary, colors.primary_light]}
        style={styles.header}
      >
        <View style={styles.headerTop}>
          <TouchableOpacity onPress={() => navigation.goBack()}>
            <Ionicons name="arrow-back-circle" size={32} color={colors.white} />
          </TouchableOpacity>
          <View style={styles.headerTitle}>
            <Text style={styles.headerText}>الطلبات</Text>
            <Text style={styles.headerSubText}>إدارة ومتابعة الطلبات</Text>
          </View>
        </View>

        <View style={styles.searchContainer}>
          <CustomInput
            radius={25}
            placeholder="بحث برقم الطلب، البريد، أو اسم العميل..."
            value={filterItem}
            setValue={setFilterItem}
            rightIcon={
              <MaterialIcons name="search" size={24} color={colors.muted} />
            }
          />
        </View>
      </LinearGradient>

      <View style={styles.contentContainer}>
        {/* Order Status Cards */}
        <ScrollView 
          horizontal 
          showsHorizontalScrollIndicator={false}
          style={styles.statusCardsContainer}
          contentContainerStyle={styles.statusCardsContent}
        >
          <OrderStatusCard
            title="الكل"
            count={orderStats.all}
            icon="shopping"
            color="#6B7280"
            onPress={() => setSelectedStatus('all')}
            isSelected={selectedStatus === 'all'}
          />
          <OrderStatusCard
            title="معلق"
            count={orderStats.pending}
            icon="clock-time-four"
            color="#F59E0B"
            onPress={() => setSelectedStatus('pending')}
            isSelected={selectedStatus === 'pending'}
          />
          <OrderStatusCard
            title="شحن"
            count={orderStats.shipped}
            icon="truck-delivery"
            color="#3B82F6"
            onPress={() => setSelectedStatus('shipped')}
            isSelected={selectedStatus === 'shipped'}
          />
          <OrderStatusCard
            title="مكتمل"
            count={orderStats.delivered}
            icon="check-circle"
            color="#10B981"
            onPress={() => setSelectedStatus('delivered')}
            isSelected={selectedStatus === 'delivered'}
          />
        </ScrollView>

        <CustomAlert message={error} type={alertType} />

        {/* Orders List */}
        <ScrollView
          style={styles.ordersList}
          showsVerticalScrollIndicator={false}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={fetchOrders} />
          }
        >
          {isloading ? (
            <ProgressDialog visible={true} label={label} />
          ) : foundItems.length === 0 ? (
            <View style={styles.emptyContainer}>
              <MaterialCommunityIcons name="clipboard-text-off" size={64} color={colors.muted} />
              <Text style={styles.emptyText}>لا توجد طلبات مطابقة للبحث</Text>
            </View>
          ) : (
            foundItems.map((order, index) => (
              <OrderList
                key={index}
                item={order}
                onPress={() => navigation.navigate("vieworderdetails", {
                  orderDetail: order,
                  Token: authUser.token,
                })}
              />
            ))
          )}
        </ScrollView>
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
    padding: 15,
    paddingTop: 40,
    borderBottomLeftRadius: 30,
    borderBottomRightRadius: 30,
    elevation: 5,
  },
  headerTop: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 15,
  },
  headerTitle: {
    flex: 1,
    marginRight: 15,
    alignItems: 'flex-end',
  },
  headerText: {
    fontSize: 24,
    fontWeight: 'bold',
    color: colors.white,
  },
  headerSubText: {
    fontSize: 14,
    color: colors.white,
    opacity: 0.8,
  },
  searchContainer: {
    marginBottom: -22,
    zIndex: 1,
  },
  contentContainer: {
    flex: 1,
  },
  statusCardsContainer: {
    maxHeight: cardSize + 30,
    minHeight: cardSize + 30,
  },
  statusCardsContent: {
    paddingHorizontal: 15,
    paddingTop: 15,
    paddingBottom: 5,
  },
  statusCard: {
    backgroundColor: colors.white,
    borderRadius: 12,
    padding: 8,
    marginRight: 8,
    alignItems: 'center',
    justifyContent: 'center',
    elevation: 3,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
  },
  iconContainer: {
    padding: 6,
    borderRadius: 8,
    marginBottom: 6,
  },
  statusCount: {
    fontSize: 16,
    fontWeight: 'bold',
    marginBottom: 2,
  },
  statusTitle: {
    fontSize: 10,
    color: colors.muted,
    textAlign: 'center',
    fontWeight: '600',
  },
  ordersList: {
    flex: 1,
    paddingHorizontal: 15,
    marginTop: 5,
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  emptyText: {
    fontSize: 16,
    color: colors.muted,
    marginTop: 10,
    textAlign: 'center',
  },
});

export default ViewOrdersScreen;