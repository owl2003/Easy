import {
  StyleSheet,
  Text,
  StatusBar,
  View,
  ScrollView,
  TouchableOpacity,
  Image,
  RefreshControl,
  I18nManager,
  Dimensions,
  TextInput,
} from "react-native";
import React, { useState, useEffect } from "react";
import { colors, network } from "../../constants";
import { Ionicons } from "@expo/vector-icons";
import CustomAlert from "../../components/CustomAlert/CustomAlert";
import ProgressDialog from "react-native-progress-dialog";
import BasicProductList from "../../components/BasicProductList/BasicProductList";
import CustomButton from "../../components/CustomButton";
import DropDownPicker from "react-native-dropdown-picker";
import { supabase } from "../../supabase";
import { LinearGradient } from 'expo-linear-gradient';
import { MaterialCommunityIcons } from "@expo/vector-icons";
import { emailService } from '../../services/EmailService';

I18nManager.allowRTL(false);
I18nManager.forceRTL(false);

// Enable RTL
I18nManager.forceRTL(true);
I18nManager.allowRTL(false);

const { width } = Dimensions.get('window');

const ViewOrderDetailScreen = ({ navigation, route }) => {
  const { orderDetail: initialOrderDetail } = route.params;
  const [orderDetail, setOrderDetail] = useState(initialOrderDetail);
  const [isLoading, setIsLoading] = useState(false);
  const [label, setLabel] = useState("جاري التحميل...");
  const [error, setError] = useState("");
  const [alertType, setAlertType] = useState("error");
  const [totalCost, setTotalCost] = useState(0);
  const [address, setAddress] = useState("");
  const [open, setOpen] = useState(false);
  const [value, setValue] = useState(null);
  const [statusDisable, setStatusDisable] = useState(false);
  const [items, setItems] = useState([
    { label: "قيد الانتظار", value: "pending" },
    { label: "تم الشحن", value: "shipped" },
    { label: "تم التسليم", value: "delivered" },
  ]);
  const [statusLogs, setStatusLogs] = useState([]);
  const [paymentAmount, setPaymentAmount] = useState('0');
  const [dropdownHeight, setDropdownHeight] = useState(0);

  //method to convert the time into AM PM format
  function tConvert(time) {
    time = time
      .toString()
      .match(/^([01]\d|2[0-3])(:)([0-5]\d)(:[0-5]\d)?$/) || [time];
    if (time.length > 1) {
      time = time.slice(1); // Remove full string match value
      time[5] = +time[0] < 12 ? "ص" : "م"; // Set AM/PM
      time[0] = +time[0] % 12 || 12; // Adjust hours
    }
    return time.join("");
  }

  //method to convert the Data into dd-mm-yyyy format
  const dateFormat = (datex) => {
    let t = new Date(datex);
    const date = ("0" + t.getDate()).slice(-2);
    const month = ("0" + (t.getMonth() + 1)).slice(-2);
    const year = t.getFullYear();
    const hours = ("0" + t.getHours()).slice(-2);
    const minutes = ("0" + t.getMinutes()).slice(-2);
    const seconds = ("0" + t.getSeconds()).slice(-2);
    const time = tConvert(`${hours}:${minutes}:${seconds}`);
    const newDate = `${date}-${month}-${year}, ${time}`;

    return newDate;
  };

  //method to update the status using Supabase
  const handleUpdateStatus = async (orderId) => {
    setIsLoading(true);
    setError("");
    setAlertType("error");
    
    try {
      // Get order details first to get user_id
      const { data: orderData, error: orderError } = await supabase
        .from('orders')
        .select(`
          user_id, 
          total_cost,
          shipping_address,
          city,
          country,
          zipcode,
          note,
          order_items (
            quantity,
            price,
            products (
              title
            )
          ),
          users (
            email
          )
        `)
        .eq('order_id', orderId)
        .single();

      if (orderError) throw orderError;

      // Update order status
      const { error: updateError } = await supabase
        .from('orders')
        .update({ status: value })
        .eq('order_id', orderId);

      if (updateError) {
        setError("حدث خطأ أثناء تحديث الحالة");
        setAlertType("error");
        return;
      }

      // Add status log
      const { error: logError } = await supabase
        .from('order_status_logs')
        .insert({
          order_id: orderId,
          status: value
        });

      if (logError) throw logError;

      // Prepare order details for email
      const orderDetails = {
        orderId,
        orderData: orderData.order_items.map(item => ({
          title: item.products.title,
          quantity: item.quantity,
          price: item.price
        })),
        totalCost: orderData.total_cost,
        city: orderData.city,
        streetAddress: orderData.shipping_address,
        country: orderData.country,
        zipcode: orderData.zipcode,
        orderNote: orderData.note,
        userName: orderData.users.firstname + ' ' + orderData.users.lastname || 'غير محدد',
        userPhone: orderData.users.phone_number || 'غير محدد',
        status: value
      };

      // Send email notification to user
      if (orderData.users.email) {
        await emailService.sendOrderStatusUpdate(
          orderData.users.email,
          orderDetails
        );
      }

      // Create notification
      const statusText = 
        value === 'shipped' ? 'تم شحن' :
        value === 'delivered' ? 'تم تسليم' :
        'تم تحديث حالة';

      const { error: notifError } = await supabase
        .from('notifications')
        .insert({
          user_id: orderData.user_id,
          title: 'تحديث حالة الطلب',
          message: `${statusText} طلبك رقم #${orderId}`,
          type: 'order_status',
          data: {
            order_id: orderId,
            new_status: value,
            "is_admin_message": true,
            total: orderData.total_cost
          },
          read: false,
          created_at: new Date().toISOString()
        });

      if (notifError) throw notifError;

      setError(`تم تحديث حالة الطلب بنجاح إلى ${
        value === 'pending' ? 'قيد الانتظار' :
        value === 'shipped' ? 'تم الشحن' :
        value === 'delivered' ? 'تم التسليم' :
        value
      }`);
      setAlertType("success");

      // Refresh order details
      await fetchOrderDetails(orderId);
      
    } catch (error) {
      console.error("Error updating order status:", error);
      setError("حدث خطأ في النظام");
      setAlertType("error");
    } finally {
      setIsLoading(false);
    }
  };

  //method to fetch order details
  const fetchOrderDetails = async (orderId) => {
    setIsLoading(true);
    try {
      // Fetch order with complete product data
      const { data: orderData, error: orderError } = await supabase
        .from('orders')
        .select(`
          *,
          order_items (
            quantity,
            price,
            product_id,
            products (
              id,
              title,
              price,
              image_url
            )
          )
        `)
        .eq('order_id', orderId)
        .single();

      if (orderError) throw orderError;

      console.log('Fetched order details:', orderData);

      // Set order details
      setOrderDetail(orderData);

      // Fetch status logs
      const { data: logsData, error: logsError } = await supabase
        .from('order_status_logs')
        .select('*')
        .eq('order_id', orderId)
        .order('changed_at', { ascending: true });

      if (logsError) throw logsError;

      setStatusLogs(logsData);
      setValue(orderData.status);

      if (orderData) {
        setPaymentAmount(orderData.paid_amount?.toString() || '0');
      }
    } catch (error) {
      console.error("Error fetching order details:", error);
      setError("حدث خطأ في تحميل البيانات");
      setAlertType("error");
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (initialOrderDetail?.order_id) {
      fetchOrderDetails(initialOrderDetail.order_id);
    }
  }, []);

  const renderOrderItem = ({ item }) => {
    const product = item.products; // Get the product data from order_items
    const imageUrl = product?.image_url ? getProductImageUrl(product.image_url) : null;

    console.log('Final image URL:', imageUrl); // Log the final image URL

    return (
      <View style={styles.productCard}>
        <View style={styles.productImageContainer}>
          {imageUrl ? (
            <Image
              source={{ uri: imageUrl }}
              style={styles.productImage}
              resizeMode="cover"
              onError={(error) => console.log('Image loading error:', error)}
              onLoad={() => console.log('Image loaded successfully')}
            />
          ) : (
            <View style={styles.noImageContainer}>
              <MaterialCommunityIcons 
                name="image-off" 
                size={24} 
                color={colors.muted} 
              />
            </View>
          )}
        </View>
        
        <View style={styles.productDetails}>
          <Text style={styles.productName} numberOfLines={2}>
            {product?.title || 'منتج غير متوفر'}
          </Text>
          <Text style={styles.priceText}>
            {item.price} د.ج
          </Text>
          <Text style={styles.quantityText}>
           الكمية : {item.quantity} 
          </Text>
        </View>
      </View>
    );
  };

  const renderStatusTimeline = () => (
    <View style={styles.timelineContainer}>
      {statusLogs.map((log, index) => (
        <View key={log.log_id} style={styles.timelineItem}>
          <View style={[styles.timelineDot, { backgroundColor: getStatusColor(log.status)[0] }]} />
          <View style={styles.timelineContent}>
            <Text style={styles.timelineStatus}>
              {log.status === 'pending' ? 'قيد الانتظار' :
               log.status === 'shipped' ? 'تم الشحن' :
               log.status === 'delivered' ? 'تم التسليم' : log.status}
            </Text>
            <Text style={styles.timelineDate}>{dateFormat(log.changed_at)}</Text>
          </View>
          {index < statusLogs.length - 1 && <View style={styles.timelineLine} />}
        </View>
      ))}
    </View>
  );

  // Add function to calculate remaining amount
  const calculateRemaining = () => {
    const total = orderDetail?.total_cost || 0;
    const paid = parseFloat(paymentAmount) || 0;
    return total - paid;
  };

  // Add this function to handle payment updates
  const handleUpdatePayment = async () => {
    try {
      const { error } = await supabase
        .from('orders')
        .update({ paid_amount: parseFloat(paymentAmount) || 0 })
        .eq('order_id', orderDetail.order_id);

      if (error) throw error;

      // Fetch updated order details to refresh the UI
      const { data: updatedOrder, error: fetchError } = await supabase
        .from('orders')
        .select('*')
        .eq('order_id', orderDetail.order_id)
        .single();

      if (fetchError) throw fetchError;

      setOrderDetail(updatedOrder);
      setPaymentAmount(updatedOrder.paid_amount?.toString() || '0');
      setError('تم تحديث المبلغ المدفوع بنجاح');
      setAlertType('success');
    } catch (error) {
      console.error('Error updating payment:', error);
      setError('حدث خطأ أثناء تحديث المبلغ المدفوع');
      setAlertType('error');
    }
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'pending': return ['#FFA41B', '#FF5151'];
      case 'shipped': return ['#3B82F6', '#1D4ED8'];
      case 'delivered': return ['#22C55E', '#15803D'];
      default: return [colors.primary, colors.primary_dark];
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

  const getProductImageUrl = (imagePath) => {
    if (!imagePath) return null;

    const { data } = supabase.storage
      .from("product-images")
      .getPublicUrl(imagePath);

    console.log('Generated image URL:', data?.publicUrl);
    return data?.publicUrl;
  };

  return (
    <View style={styles.container}>
      <ProgressDialog visible={isLoading} label={label} />
      <StatusBar backgroundColor={colors.primary} />

      {/* Header */}
      <LinearGradient
        colors={getStatusColor(orderDetail?.status)}
        style={styles.header}
      >
        <TouchableOpacity
          onPress={() => navigation.goBack()}
          style={styles.backButton}
        >
          <Ionicons name="chevron-forward" size={32} color={colors.white} />
        </TouchableOpacity>
        <View style={styles.headerContent}>
          <Text style={styles.orderId}>طلب #{orderDetail?.order_id}</Text>
          <View style={styles.statusContainer}>
            <MaterialCommunityIcons 
              name={getStatusIcon(orderDetail?.status)} 
              size={24} 
              color={colors.white} 
            />
            <Text style={styles.statusText}>
              {orderDetail?.status === 'pending' ? 'قيد الانتظار' :
               orderDetail?.status === 'shipped' ? 'تم الشحن' :
               orderDetail?.status === 'delivered' ? 'تم التسليم' : orderDetail?.status}
            </Text>
          </View>
        </View>
      </LinearGradient>

      <CustomAlert message={error} type={alertType} />

      <ScrollView
        style={styles.content}
        refreshControl={
          <RefreshControl refreshing={isLoading} onRefresh={() => fetchOrderDetails(initialOrderDetail.order_id)} />
        }
      >
        {/* Status Timeline */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <MaterialCommunityIcons name="timeline-clock" size={24} color={colors.primary} />
            <Text style={styles.sectionTitle}>سجل الحالة</Text>
          </View>
          {renderStatusTimeline()}
        </View>

        {/* Shipping Address */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <MaterialCommunityIcons name="map-marker" size={24} color={colors.primary} />
            <Text style={styles.sectionTitle}>عنوان الشحن</Text>
          </View>
          <View style={styles.card}>
            <Text style={styles.address}>{orderDetail?.shipping_address}</Text>
            <Text style={styles.addressDetails}>
              {orderDetail?.city}, {orderDetail?.country}
            </Text>
            <Text style={styles.zipcode}>الرمز البريدي: {orderDetail?.zipcode}</Text>
          </View>
        </View>

        {/* Products Section */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <MaterialCommunityIcons name="shopping" size={24} color={colors.primary} />
            <Text style={styles.sectionTitle}>المنتجات</Text>
          </View>
          <View style={styles.productsList}>
            {orderDetail?.order_items?.map((item) => (
              <View key={item.order_item_id}>
                {renderOrderItem({ item })}
              </View>
            ))}
          </View>
          <View style={styles.totalContainer}>
            <Text style={styles.totalLabel}>المجموع الكلي:</Text>
            <Text style={styles.totalAmount}>{orderDetail?.total_cost} د.ج</Text>
          </View>

          {/* Add Payment Section */}
          <View style={styles.paymentDetailsContainer}>
            <View style={styles.paymentRow}>
              <View style={styles.paymentInputWrapper}>
                <Text style={styles.paymentLabel}>المبلغ المدفوع:</Text>
                <TextInput
                  style={styles.paymentInputField}
                  value={paymentAmount}
                  onChangeText={setPaymentAmount}
                  keyboardType="numeric"
                  placeholder="أدخل المبلغ المدفوع"
                  placeholderTextColor={colors.muted}
                />
              </View>
              <TouchableOpacity 
                style={styles.updatePaymentButton}
                onPress={handleUpdatePayment}
              >
                <MaterialCommunityIcons name="check" size={20} color={colors.white} />
                <Text style={styles.updatePaymentText}>تحديث</Text>
              </TouchableOpacity>
            </View>
            <View style={styles.paymentSummary}>
              <View style={styles.paymentSummaryRow}>
                <Text style={styles.paymentSummaryLabel}>المبلغ المتبقي:</Text>
                <Text style={[styles.paymentSummaryValue, { color: colors.danger }]}>
                  {calculateRemaining()} د.ج
                </Text>
              </View>
            </View>
          </View>
        </View>

        {/* Note Section */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <MaterialCommunityIcons name="note-text" size={24} color={colors.primary} />
            <Text style={styles.sectionTitle}>ملاحظات الطلب</Text>
          </View>
          <View style={styles.noteCard}>
            <Text style={styles.noteText}>
              {orderDetail?.note || 'لا توجد ملاحظات'}
            </Text>
          </View>
        </View>
      </ScrollView>

      {/* Print Button */}
      <TouchableOpacity 
        style={[styles.printButton, { bottom: dropdownHeight + 90 }]}
        onPress={() => navigation.navigate('manualorderreceipt', { 
          orderDetail: {
            id: orderDetail?.order_id,
            created_at: orderDetail?.created_at,
            customer_name: orderDetail?.customer_name,
            customer_phone: orderDetail?.phone,
            total_amount: orderDetail?.total_cost,
            paid_amount: parseFloat(paymentAmount) || 0,
            remaining_amount: (orderDetail?.total_cost || 0) - (parseFloat(paymentAmount) || 0),
            items: orderDetail?.order_items?.map(item => ({
              title: item.products.title,
              quantity: item.quantity,
              price: item.price
            })) || [],
            delivery_price: orderDetail?.delivery_price || 0
          }
        })}
      >
        <MaterialCommunityIcons 
          name="printer" 
          size={24} 
          color={colors.white} 
        />
      </TouchableOpacity>

      {/* Bottom Action Bar */}
      <View style={styles.bottomBar}>
        <View style={styles.dropdownContainer}>
          <DropDownPicker
            style={styles.dropdown}
            open={open}
            value={value}
            items={items}
            setOpen={setOpen}
            setValue={setValue}
            setItems={setItems}
            disabled={statusDisable}
            disabledStyle={styles.disabledDropdown}
            labelStyle={styles.dropdownLabel}
            placeholder="اختر الحالة"
            rtl={true}
            onOpen={() => setDropdownHeight(200)} // Adjust height based on your needs
            onClose={() => setDropdownHeight(0)}
          />
        </View>
        <TouchableOpacity
          style={[
            styles.updateButton,
            statusDisable && styles.disabledButton
          ]}
          onPress={() => handleUpdateStatus(orderDetail?.order_id)}
          disabled={statusDisable}
        >
          <Text style={styles.updateButtonText}>تحديث الحالة</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
};

export default ViewOrderDetailScreen;

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.light,
  },
  header: {
    padding: 6,
    paddingTop: 6,
    borderBottomLeftRadius: 30,
    borderBottomRightRadius: 30,
  },
  backButton: {
    marginBottom: 15,
    transform: [{ scaleX: -1 }],
  },
  headerContent: {
    alignItems: 'center',
  },
  orderId: {
    fontSize: 24,
    fontWeight: 'bold',
    color: colors.white,
    marginBottom: 10,
  },
  statusContainer: {
    flexDirection: 'row-reverse',
    alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.2)',
    paddingHorizontal: 15,
    paddingVertical: 8,
    borderRadius: 20,
  },
  statusText: {
    color: colors.white,
    marginRight: 8,
    fontSize: 16,
    fontWeight: '600',
  },
  content: {
    flex: 1,
    padding: 20,
  },
  section: {
    marginBottom: 25,
  },
  sectionHeader: {
    flexDirection: 'row-reverse',
    alignItems: 'center',
    marginBottom: 10,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: colors.primary,
    marginRight: 10,
    textAlign: 'right',
  },
  card: {
    backgroundColor: colors.white,
    borderRadius: 15,
    padding: 15,
    elevation: 3,
  },
  customerName: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 5,
  },
  customerEmail: {
    color: colors.muted,
    fontSize: 14,
  },
  address: {
    fontSize: 16,
    marginBottom: 5,
    textAlign: 'right',
  },
  addressDetails: {
    color: colors.muted,
    marginBottom: 5,
    textAlign: 'right',
  },
  zipcode: {
    color: colors.muted,
    textAlign: 'right',
  },
  productsList: {
    backgroundColor: colors.white,
    borderRadius: 15,
    padding: 15,
    elevation: 3,
  },
  productCard: {
    flexDirection: 'row-reverse',
    backgroundColor: colors.white,
    borderRadius: 12,
    padding: 10,
    marginBottom: 10,
    elevation: 2,
  },
  productImageContainer: {
    width: 80,
    height: 80,
    borderRadius: 8,
    overflow: 'hidden',
    backgroundColor: colors.light,
  },
  productImage: {
    width: '100%',
    height: '100%',
  },
  noImageContainer: {
    width: '100%',
    height: '100%',
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: colors.light,
  },
  productDetails: {
    flex: 1,
    marginRight: 12,
  },
  productName: {
    fontSize: 14,
    fontWeight: '600',
    marginBottom: 6,
    textAlign: 'right',
  },
  productMetaContainer: {
    flexDirection: 'row-reverse',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 6,
  },
  quantityContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  quantityText: {
    fontSize: 13,
    color: colors.muted,
    marginLeft: 4,
  },
  priceText: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.primary,
  },
  subtotalText: {
    fontSize: 13,
    color: colors.muted,
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
  totalLabel: {
    fontSize: 16,
    fontWeight: 'bold',
    textAlign: 'right',
  },
  totalAmount: {
    fontSize: 18,
    fontWeight: 'bold',
    color: colors.primary,
    textAlign: 'left',
  },
  bottomBar: {
    backgroundColor: colors.white,
    padding: 15,
    flexDirection: 'row',
    alignItems: 'center',
    elevation: 5,
  },
  dropdownContainer: {
    flex: 1,
    marginRight: 10,
  },
  dropdown: {
    borderColor: colors.primary,
    borderRadius: 10,
  },
  dropdownLabel: {
    color: colors.primary,
    textAlign: 'right',
  },
  disabledDropdown: {
    backgroundColor: colors.light,
    borderColor: colors.muted,
  },
  updateButton: {
    backgroundColor: colors.primary,
    paddingVertical: 12,
    paddingHorizontal: 20,
    borderRadius: 10,
    elevation: 2,
  },
  disabledButton: {
    backgroundColor: colors.muted,
  },
  updateButtonText: {
    color: colors.white,
    fontSize: 16,
    fontWeight: 'bold',
  },
  timelineContainer: {
    padding: 15,
    backgroundColor: colors.white,
    borderRadius: 15,
    elevation: 3,
  },
  timelineItem: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: 15,
  },
  timelineDot: {
    width: 12,
    height: 12,
    borderRadius: 6,
    marginTop: 5,
  },
  timelineLine: {
    position: 'absolute',
    left: 5,
    top: 20,
    bottom: -15,
    width: 2,
    backgroundColor: colors.light,
  },
  timelineContent: {
    flex: 1,
    alignItems: 'flex-end',
  },
  timelineStatus: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.dark,
    textAlign: 'right',
  },
  timelineDate: {
    fontSize: 14,
    color: colors.muted,
    marginTop: 2,
    textAlign: 'right',
  },
  noteCard: {
    backgroundColor: colors.white,
    borderRadius: 15,
    padding: 15,
    elevation: 3,
  },
  noteText: {
    fontSize: 14,
    color: colors.dark,
    textAlign: 'right',
  },
  paymentDetailsContainer: {
    backgroundColor: colors.white,
    borderRadius: 15,
    padding: 15,
    marginTop: 15,
    elevation: 3,
  },
  paymentRow: {
    flexDirection: 'row-reverse',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 15,
  },
  paymentInputWrapper: {
    flex: 1,
    marginLeft: 10,
  },
  paymentInputField: {
    borderWidth: 1,
    borderColor: colors.light,
    borderRadius: 8,
    padding: 8,
    textAlign: 'right',
    color: colors.dark,
    backgroundColor: colors.white,
  },
  updatePaymentButton: {
    backgroundColor: colors.primary,
    flexDirection: 'row-reverse',
    alignItems: 'center',
    paddingHorizontal: 15,
    paddingVertical: 8,
    borderRadius: 8,
    elevation: 2,
  },
  updatePaymentText: {
    color: colors.white,
    marginRight: 5,
    fontSize: 14,
    fontWeight: 'bold',
  },
  paymentSummary: {
    borderTopWidth: 1,
    borderTopColor: colors.light,
    paddingTop: 15,
  },
  paymentSummaryRow: {
    flexDirection: 'row-reverse',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  paymentSummaryLabel: {
    fontSize: 14,
    color: colors.dark,
    fontWeight: 'bold',
  },
  paymentSummaryValue: {
    fontSize: 16,
    fontWeight: 'bold',
  },
  paymentLabel: {
    fontSize: 14,
    color: colors.primary,
    marginBottom: 5,
    textAlign: 'right',
  },
  printButton: {
    position: 'absolute',
    left: 20,
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: colors.primary,
    justifyContent: 'center',
    alignItems: 'center',
    elevation: 5,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
    zIndex: 1000,
  },
});