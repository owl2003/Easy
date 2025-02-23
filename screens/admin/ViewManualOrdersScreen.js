import React, { useState, useEffect } from 'react';
import {
  StyleSheet,
  Text,
  View,
  ScrollView,
  TouchableOpacity,
  TextInput,
  RefreshControl,
  StatusBar,
} from 'react-native';
import { colors } from "../../constants";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import { supabase } from "../../supabase";
import Loading from '../../components/Loading/Loading';
import { I18nManager } from 'react-native';

I18nManager.allowRTL(false);
I18nManager.forceRTL(false);
const ViewManualOrdersScreen = ({ navigation }) => {
  const [orders, setOrders] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [refreshing, setRefreshing] = useState(false);
  

  const fetchOrders = async () => {
    setIsLoading(true);
    try {
      let query = supabase
        .from('manual_orders')
        .select(`
          *,
          manual_order_items (
            quantity,
            price,
            products (
              id,
              title
            )
          )
        `)
        .order('created_at', { ascending: false });

      if (searchQuery) {
        query = query.or(`customer_name.ilike.%${searchQuery}%,customer_phone.ilike.%${searchQuery}%`);
      }

      const { data, error } = await query;
      if (error) throw error;

      setOrders(data);
    } catch (error) {
      console.error('Error fetching manual orders:', error);
    } finally {
      setIsLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchOrders();
  }, [searchQuery]);

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
      key={order.id}
      style={styles.orderCard}
      onPress={() => navigation.navigate('manualorderreceipt', { 
        orderDetail: {
          id: order.id,
          created_at: order.created_at,
          customer_name: order.customer_name,
          customer_phone: order.customer_phone,
          total_amount: order.total_amount,
          paid_amount: order.paid_amount,
          remaining_amount: order.remaining_amount,
          items: order.manual_order_items.map(item => ({
            title: item.products.title,
            quantity: item.quantity,
            price: item.price
          }))
        }
      })}
    >
      <View style={styles.orderHeader}>
        <Text style={styles.orderId}>طلب #{order.id.slice(0, 8)}</Text>
        <View style={[styles.statusBadge, { 
          backgroundColor: order.remaining_amount === 0 ? colors.success : colors.warning 
        }]}>
          <Text style={styles.statusText}>
            {order.remaining_amount === 0 ? 'مدفوع' : 'قيد الانتظار'}
          </Text>
        </View>
      </View>

      <View style={styles.customerInfo}>
        <Text style={styles.customerName}>{order.customer_name}</Text>
        {order.customer_phone && (
          <Text style={styles.customerPhone}>{order.customer_phone}</Text>
        )}
      </View>

      <View style={styles.orderFooter}>
        <Text style={styles.dateText}>{formatDate(order.created_at)}</Text>
        <View style={styles.amountInfo}>
          <View style={styles.amountRow}>
            <Text style={styles.amountLabel}>المبلغ الكلي:</Text>
            <Text style={styles.amountValue}>{order.total_amount} د.ج</Text>
          </View>
          <View style={styles.amountRow}>
            <Text style={styles.amountLabel}>المبلغ المدفوع:</Text>
            <Text style={styles.amountValue}>{order.paid_amount} د.ج</Text>
          </View>
          {order.remaining_amount > 0 && (
            <View style={styles.amountRow}>
              <Text style={[styles.amountLabel, { color: colors.danger }]}>المتبقي:</Text>
              <Text style={[styles.amountValue, { color: colors.danger }]}>
                {order.remaining_amount} د.ج
              </Text>
            </View>
          )}
        </View>
      </View>
    </TouchableOpacity>
  );

  return (
    <View style={styles.container}>
      <StatusBar backgroundColor={colors.primary} />
      
      <View style={styles.header}>
        <TouchableOpacity 
          style={styles.createButton}
          onPress={() => navigation.navigate('adminmanualorder')}
        >
          <MaterialCommunityIcons name="plus" size={24} color={colors.white} />
          <Text style={styles.createButtonText}>إنشاء طلب جديد</Text>
        </TouchableOpacity>

        <View style={styles.searchContainer}>
          <TextInput
            style={styles.searchInput}
            placeholder="البحث عن طلب..."
            value={searchQuery}
            onChangeText={setSearchQuery}
            placeholderTextColor={colors.muted}
          />
          <MaterialCommunityIcons name="magnify" size={24} color={colors.muted} />
        </View>
      </View>

      <ScrollView
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={fetchOrders} />
        }
        style={styles.ordersList}
      >
        {orders.map(renderOrderCard)}
      </ScrollView>

      {isLoading && <Loading />}
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
  },
  createButton: {
    backgroundColor: colors.primary,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 12,
    borderRadius: 10,
    marginBottom: 15,
  },
  createButtonText: {
    color: colors.white,
    fontSize: 16,
    fontWeight: 'bold',
    marginLeft: 8,
  },
  searchContainer: {
    flexDirection: 'row-reverse',
    alignItems: 'center',
    backgroundColor: colors.white,
    padding: 10,
    borderRadius: 10,
    elevation: 2,
  },
  searchInput: {
    flex: 1,
    marginRight: 10,
    textAlign: 'right',
    color: colors.dark,
  },
  ordersList: {
    padding: 15,
  },
  orderCard: {
    backgroundColor: colors.white,
    borderRadius: 15,
    padding: 15,
    marginBottom: 15,
    elevation: 3,
  },
  orderHeader: {
    flexDirection: 'row-reverse',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
  },
  orderId: {
    fontSize: 16,
    fontWeight: 'bold',
    color: colors.primary,
  },
  statusBadge: {
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 15,
  },
  statusText: {
    color: colors.white,
    fontSize: 12,
    fontWeight: 'bold',
  },
  customerInfo: {
    marginBottom: 10,
  },
  customerName: {
    fontSize: 16,
    color: colors.dark,
    textAlign: 'right',
  },
  customerPhone: {
    fontSize: 14,
    color: colors.muted,
    textAlign: 'right',
  },
  orderFooter: {
    borderTopWidth: 1,
    borderTopColor: colors.light,
    paddingTop: 10,
  },
  dateText: {
    fontSize: 12,
    color: colors.muted,
    textAlign: 'right',
    marginBottom: 8,
  },
  amountInfo: {
    gap: 5,
  },
  amountRow: {
    flexDirection: 'row-reverse',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  amountLabel: {
    fontSize: 14,
    color: colors.dark,
  },
  amountValue: {
    fontSize: 14,
    fontWeight: 'bold',
    color: colors.primary,
  },
});

export default ViewManualOrdersScreen; 