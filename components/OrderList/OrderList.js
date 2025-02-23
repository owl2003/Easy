import { StyleSheet, Text, TouchableOpacity, View } from "react-native";
import React, { useState, useEffect } from "react";
import { colors } from "../../constants";
import { MaterialCommunityIcons } from "@expo/vector-icons";

const getStatusColor = (status) => {
  switch (status) {
    case 'pending': return '#F59E0B';
    case 'shipped': return '#3B82F6';
    case 'delivered': return '#10B981';
    default: return colors.muted;
  }
};

const getStatusIcon = (status) => {
  switch (status) {
    case 'pending': return 'clock-time-four';
    case 'shipped': return 'truck-delivery';
    case 'delivered': return 'check-circle';
    default: return 'help-circle';
  }
};

const OrderList = ({ item, onPress }) => {
  const [quantity, setQuantity] = useState(0);

  useEffect(() => {
    if (item?.order_items) {
      setQuantity(item.order_items.length);
    }
  }, [item]);

  const formatDate = (date) => {
    const options = { 
      year: 'numeric', 
      month: 'short', 
      day: 'numeric',
      hour: '2-digit', 
      minute: '2-digit'
    };
    return new Date(date).toLocaleDateString('ar-SA', options);
  };

  return (
    <TouchableOpacity 
      style={styles.container}
      onPress={onPress}
      activeOpacity={0.7}
    >
      {/* Order Header */}
      <View style={styles.headerContainer}>
        <View style={styles.orderIdContainer}>
          <Text style={styles.orderIdText}>
            طلب #{item?.order_id}
          </Text>
          <Text style={styles.dateText}>
            {formatDate(item?.created_at)}
          </Text>
        </View>
        <View style={[
          styles.statusBadge, 
          { backgroundColor: getStatusColor(item?.status) + '20' }
        ]}>
          <MaterialCommunityIcons 
            name={getStatusIcon(item?.status)} 
            size={16} 
            color={getStatusColor(item?.status)} 
          />
          <Text style={[
            styles.statusText,
            { color: getStatusColor(item?.status) }
          ]}>
            {item?.status === 'pending' ? 'قيد الانتظار' :
             item?.status === 'shipped' ? 'تم الشحن' :
             item?.status === 'delivered' ? 'تم التسليم' : item?.status}
          </Text>
        </View>
      </View>

      {/* Customer Info */}
      <View style={styles.customerContainer}>
        <MaterialCommunityIcons 
          name="account" 
          size={18} 
          color={colors.muted} 
          style={styles.icon}
        />
        <View style={styles.customerInfo}>
          <Text style={styles.customerName}>
            {`${item?.user?.first_name || ''} ${item?.user?.last_name || ''}`}
          </Text>
          <View style={styles.contactInfo}>
            <Text style={styles.customerEmail}>{item?.user?.email}</Text>
            {item?.user?.phone_number && (
              <Text style={styles.customerPhone}>
                • {item.user.phone_number}
              </Text>
            )}
          </View>
        </View>
      </View>

      {/* Order Summary */}
      <View style={styles.summaryContainer}>
        <View style={styles.summaryItem}>
          <MaterialCommunityIcons 
            name="package-variant" 
            size={18} 
            color={colors.muted}
          />
          <Text style={styles.summaryText}>
            {quantity} منتجات
          </Text>
        </View>
        <View style={styles.summaryItem}>
          <MaterialCommunityIcons 
            name="cash" 
            size={18} 
            color={colors.muted}
          />
          <Text style={styles.totalText}>
            {item.total_cost} د.ج
          </Text>
        </View>
      </View>

      {/* View Details Button */}
      <View style={styles.detailsContainer}>
        <MaterialCommunityIcons 
          name="chevron-right" 
          size={20} 
          color={colors.primary}
        />
        <Text style={styles.detailsText}>عرض التفاصيل</Text>
      </View>
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  container: {
    backgroundColor: colors.white,
    borderRadius: 15,
    padding: 15,
    marginBottom: 10,
    elevation: 3,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 3.84,
  },
  headerContainer: {
    flexDirection: 'row-reverse',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  orderIdContainer: {
    flex: 1,
    alignItems: 'flex-end',
  },
  orderIdText: {
    fontSize: 16,
    fontWeight: 'bold',
    color: colors.primary,
    marginBottom: 2,
    textAlign: 'right',
  },
  dateText: {
    fontSize: 12,
    color: colors.muted,
    textAlign: 'right',
  },
  statusBadge: {
    flexDirection: 'row-reverse',
    alignItems: 'center',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 12,
  },
  statusText: {
    fontSize: 12,
    fontWeight: '600',
    marginRight: 4,
  },
  customerContainer: {
    flexDirection: 'row-reverse',
    alignItems: 'center',
    marginBottom: 12,
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: colors.light,
  },
  icon: {
    marginLeft: 8,
  },
  customerInfo: {
    flex: 1,
    alignItems: 'flex-end',
  },
  customerName: {
    fontSize: 14,
    fontWeight: '600',
    marginBottom: 2,
    textAlign: 'right',
  },
  contactInfo: {
    flexDirection: 'row-reverse',
    alignItems: 'center',
    flexWrap: 'wrap',
  },
  customerEmail: {
    fontSize: 12,
    color: colors.muted,
    textAlign: 'right',
  },
  customerPhone: {
    fontSize: 12,
    color: colors.muted,
    marginRight: 4,
  },
  summaryContainer: {
    flexDirection: 'row-reverse',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  summaryItem: {
    flexDirection: 'row-reverse',
    alignItems: 'center',
  },
  summaryText: {
    marginRight: 6,
    fontSize: 13,
    color: colors.muted,
    fontWeight: '500',
  },
  totalText: {
    marginRight: 6,
    fontSize: 14,
    color: colors.primary,
    fontWeight: 'bold',
  },
  detailsContainer: {
    flexDirection: 'row',
    justifyContent: 'flex-start',
    alignItems: 'center',
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: colors.light,
  },
  detailsText: {
    fontSize: 13,
    color: colors.primary,
    fontWeight: '600',
    marginLeft: 4,
  },
});

export default OrderList;
