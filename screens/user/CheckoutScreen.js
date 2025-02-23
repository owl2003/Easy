import {
  StyleSheet,
  StatusBar,
  View,
  TouchableOpacity,
  Text,
  ScrollView,
  Modal,
  Image,
  TextInput,
} from "react-native";
import { Ionicons, MaterialCommunityIcons } from "@expo/vector-icons";
import React, { useState, useEffect } from "react";
import { colors } from "../../constants";
import CustomButton from "../../components/CustomButton";
import AsyncStorage from "@react-native-async-storage/async-storage";
import CustomInput from "../../components/CustomInput";
import ProgressDialog from "react-native-progress-dialog";
import { supabase } from "../../supabase";
import { LinearGradient } from 'expo-linear-gradient';
import * as Notifications from 'expo-notifications';
import NetInfo from "@react-native-community/netinfo";
import { emailService } from '../../services/EmailService';
import { sendNotification, sendNewOrderNotification } from '../../utils/notifications';
import { I18nManager } from 'react-native';

I18nManager.allowRTL(false);
I18nManager.forceRTL(false);

const CheckoutScreen = ({ navigation }) => {
  const [modalVisible, setModalVisible] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [cartProducts, setCartProducts] = useState([]);
  const [error, setError] = useState("");

  const [deliveryCost, setDeliveryCost] = useState(0);
  const [totalCost, setTotalCost] = useState(0);
  const [address, setAddress] = useState("");
  const [country, setCountry] = useState("");
  const [city, setCity] = useState("");
  const [streetAddress, setStreetAddress] = useState("");
  const [zipcode, setZipcode] = useState("");
  const [hasExistingAddress, setHasExistingAddress] = useState(false);
  const [orderNote, setOrderNote] = useState("");

  const formatPrice = (price) => {
    return `${price} دج`;
  };

  // Fetch cart products from Supabase
  const fetchCartProducts = async () => {
    setIsLoading(true);
    try {
      const value = await AsyncStorage.getItem("authUser");
      if (!value) return;
      const user = JSON.parse(value);

      const { data, error } = await supabase
        .from("cart_products")
        .select(`
          quantity,
          products (
            id,
            title,
            price,
            image_url,
            description
          )
        `)
        .eq("user_id", user.id);

      if (error) throw error;

      const formattedProducts = data.map((item) => {
        let imageUrl = null;
        if (item.products.image_url) {
          // If it's already a full URL, use it as is
          if (item.products.image_url.startsWith('http')) {
            imageUrl = item.products.image_url;
          } else {
            // Get the public URL from Supabase storage
            imageUrl = supabase.storage
              .from('product-images')
              .getPublicUrl(item.products.image_url)
              .data?.publicUrl;
          }
        }

        return {
          _id: item.products.id,
          title: item.products.title,
          price: item.products.price,
          quantity: item.quantity,
          image_url: imageUrl,
          description: item.products.description
        };
      });

      setCartProducts(formattedProducts);
      calculateTotalCost(formattedProducts);
    } catch (error) {
      console.error("Error fetching cart:", error);
      setError("Failed to load cart items");
    } finally {
      setIsLoading(false);
    }
  };

  const calculateTotalCost = (products) => {
    const total = products.reduce(
      (acc, product) => acc + product.price * product.quantity,
      0
    );
    setTotalCost(total);
  };

  // Add this function to fetch shipping address
  const fetchShippingAddress = async () => {
    try {
      const value = await AsyncStorage.getItem("authUser");
      if (!value) return;
      const user = JSON.parse(value);

      const { data, error } = await supabase
        .from('shipping_addresses')
        .select('*')
        .eq('user_id', user.id)
        .single();

      if (error) throw error;

      if (data) {
        setHasExistingAddress(true);
        setCountry(data.country);
        setCity(data.city);
        setStreetAddress(data.shipping_address);
        setZipcode(data.zip_code);
        setAddress(`${data.shipping_address}, ${data.city}, ${data.country}`);
      }
    } catch (error) {
      console.error("Error fetching shipping address:", error);
    }
  };

  // Add function to save new shipping address
  const saveShippingAddress = async () => {
    try {
      const value = await AsyncStorage.getItem("authUser");
      if (!value) return;
      const user = JSON.parse(value);

      const { error } = await supabase
        .from('shipping_addresses')
        .upsert({
          user_id: user.id,
          country: country,
          city: city,
          zip_code: zipcode,
          shipping_address: streetAddress
        });

      if (error) throw error;
      setHasExistingAddress(true);
      setModalVisible(false);
    } catch (error) {
      console.error("Error saving shipping address:", error);
    }
  };

  // Modify useEffect to fetch shipping address
  useEffect(() => {
    fetchCartProducts();
    fetchShippingAddress();
  }, []);

  useEffect(() => {
    if (streetAddress && city && country) {
      setAddress(`${streetAddress}, ${city}, ${country}`);
    }
  }, [streetAddress, city, country]);

  // Function to send notification to admins
  const sendAdminPushNotification = async (orderDetails) => {
    try {
      // Check network connectivity
      const netInfoState = await NetInfo.fetch();
      if (!netInfoState.isConnected) {
        console.warn('No network connection. Cannot send admin notification.');
        return;
      }

      // Fetch admin users
      const { data: adminUsers, error: adminError } = await supabase
        .from('users')
        .select('id, email')
        .eq('is_admin', true);

      if (adminError || !adminUsers) {
        console.warn('Error fetching admin users:', adminError);
        return;
      }

      // Create notifications for all admins
      const adminNotifications = adminUsers.map(admin => ({
        user_id: admin.id,
        title: 'طلب جديد',
        message: `تم استلام طلب جديد بقيمة ${orderDetails.totalCost} دج في ${orderDetails.streetAddress}`,
        type: 'new_order',
        data: { 
          orderId: orderDetails.orderId,
          totalCost: orderDetails.totalCost,
          streetAddress: orderDetails.streetAddress
        },
        read: false,
        created_at: new Date().toISOString()
      }));

      // Insert notifications into the database
      const { error: notifError } = await supabase
        .from('notifications')
        .insert(adminNotifications);

      if (notifError) {
        console.error('Error creating admin notifications:', notifError);
      }

      // Send email notifications to admins
      const { data: adminEmails, error: emailError } = await supabase
        .from('users')
        .select('email')
        .eq('is_admin', true);

      if (!emailError && adminEmails && adminEmails.length > 0) {
        await emailService.sendAdminOrderNotification(
          adminEmails, 
          orderDetails, 
          orderDetails.totalCost, 
          orderDetails.city
        );
      }
    } catch (error) {
      console.error('Error in sendAdminPushNotification:', error);
    }
  };

  const handleCheckout = async () => {
    setIsLoading(true);
    try {
      const value = await AsyncStorage.getItem("authUser");
      if (!value) throw new Error("User not authenticated");
      const user = JSON.parse(value);

      // Create order with note
      const { data: orderData, error: orderError } = await supabase
        .from('orders')
        .insert([{
          user_id: user.id,
          status: 'pending',
          total_cost: totalCost + deliveryCost,
          shipping_address: streetAddress,
          city: city,
          country: country,
          zipcode: zipcode,
          note: orderNote
        }])
        .select()
        .single();

      if (orderError) throw orderError;

      // Create order items
      const orderItems = cartProducts.map(product => ({
        order_id: orderData.order_id,
        product_id: product._id,
        price: product.price,
        quantity: product.quantity
      }));

      const { error: itemsError } = await supabase
        .from('order_items')
        .insert(orderItems);

      if (itemsError) throw itemsError;

      // Update product quantities and sold counts
      for (const product of cartProducts) {
        const { error: updateError } = await supabase.rpc('update_product_quantities', {
          p_id: product._id,
          ordered_quantity: product.quantity
        });

        if (updateError) throw updateError;
      }

      // Create initial status log
      const { error: logError } = await supabase
        .from('order_status_logs')
        .insert([{
          order_id: orderData.order_id,
          status: 'pending'
        }]);

      if (logError) throw logError;

      // Get admin users for email notifications
      const { data: adminUsers, error: adminError } = await supabase
        .from('users')
        .select('id, email')
        .eq('is_admin', true);

      if (adminError) {
        console.error('Error fetching admin users for email notification:', adminError);
      } else if (adminUsers && adminUsers.length > 0) {
        try {
          // Prepare order details for email
          const orderDetails = {
            orderId: orderData.order_id,
            orderData: cartProducts,
            totalCost: totalCost + deliveryCost,
            city,
            streetAddress,
            country,
            zipcode,
            orderNote,
            userName: user.first_name+ ' ' + user.last_name || 'غير محدد',
            userPhone: user.phone_number || 'غير محدد'
          };

          // Send email notifications to admins
          const emailResult = await emailService.sendAdminOrderNotification(adminUsers, orderDetails);
          console.log('Admin email notifications sent:', emailResult);
        } catch (emailError) {
          console.error('Error sending admin email notifications:', emailError);
          // Don't throw error to allow checkout to complete even if email fails
        }
      } else {
        console.warn('No admin users found for email notification');
      }

      // Send notification to user about successful order
    

      // Send notification to admins about new order
      await sendNewOrderNotification({
        userId: user.id,
        orderId: orderData.order_id,
        totalCost: totalCost + deliveryCost,
        userName: user.first_name+ ' ' + user.last_name || 'مستخدم',
        city: city
      });

      // Clear cart
      const { error: clearCartError } = await supabase
        .from('cart_products')
        .delete()
        .eq('user_id', user.id);

      if (clearCartError) throw clearCartError;

      navigation.replace("orderconfirm", { orderId: orderData.order_id });
    } catch (error) {
      console.error("Checkout error:", error);
      setError("Failed to process checkout");
    } finally {
      setIsLoading(false);
    }
  };

  const renderCartItem = (product) => (
    <View key={product._id} style={styles.productCard}>
      <View style={styles.productImageContainer}>
        {product.image_url ? (
          <Image
            source={{ uri: product.image_url }}
            style={styles.productImage}
            resizeMode="cover"
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
        <Text style={styles.productName} numberOfLines={1}>
          {product.title}
        </Text>
        <View style={styles.productMetaContainer}>
          <View style={styles.quantityContainer}>
            <MaterialCommunityIcons name="package-variant" size={16} color={colors.muted} />
            <Text style={styles.quantityText}>الكمية: {product.quantity}</Text>
          </View>
          <Text style={styles.priceText}>{formatPrice(product.price * product.quantity)}</Text>
        </View>
      </View>
    </View>
  );

  return (
    <View style={styles.container}>
      <StatusBar backgroundColor={colors.primary} />
      <ProgressDialog visible={isLoading} label={"جاري معالجة الطلب..."} />

      <LinearGradient
        colors={[colors.primary, colors.primary_light]}
        style={styles.header}
      >
       
        <Text style={styles.headerTitle}>الدفع</Text>
      </LinearGradient>

      <ScrollView style={styles.content}>
        {/* Products Section */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <MaterialCommunityIcons name="shopping" size={24} color={colors.primary} />
            <Text style={styles.sectionTitle}>المنتجات المطلوبة</Text>
          </View>
          <View style={styles.productsList}>
            {cartProducts.map(renderCartItem)}
          </View>
        </View>

        {/* Address Section */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <MaterialCommunityIcons name="map-marker" size={24} color={colors.primary} />
            <Text style={styles.sectionTitle}>عنوان التوصيل</Text>
            {hasExistingAddress && (
              <TouchableOpacity 
                style={styles.editButton}
                onPress={() => setModalVisible(true)}
              >
                <MaterialCommunityIcons name="pencil" size={20} color={colors.primary} />
              </TouchableOpacity>
            )}
          </View>
          <TouchableOpacity 
            style={styles.addressCard}
            onPress={() => !hasExistingAddress && setModalVisible(true)}
          >
            {address ? (
              <>
                <Text style={styles.address}>{streetAddress}</Text>
                <Text style={styles.addressDetails}>
                  {city}، {country}
                </Text>
                <Text style={styles.zipcode}>الرمز البريدي: {zipcode}</Text>
              </>
            ) : (
              <Text style={styles.addAddressText}>+ إضافة عنوان التوصيل</Text>
            )}
          </TouchableOpacity>
        </View>

        {/* Note Section */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <MaterialCommunityIcons name="note-text" size={24} color={colors.primary} />
            <Text style={styles.sectionTitle}>ملاحظات الطلب</Text>
          </View>
          <View style={styles.noteCard}>
            <TextInput
              style={styles.noteInput}
              placeholder="أضف ملاحظات خاصة بطلبك (اختياري)"
              placeholderTextColor={colors.muted}
              value={orderNote}
              onChangeText={setOrderNote}
              multiline
              numberOfLines={3}
              textAlignVertical="top"
              maxLength={500}
            />
            <Text style={styles.noteCharCount}>
              {orderNote.length}/500
            </Text>
          </View>
        </View>

        {/* Order Summary */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <MaterialCommunityIcons name="receipt" size={24} color={colors.primary} />
            <Text style={styles.sectionTitle}>ملخص الطلب</Text>
          </View>
          <View style={styles.summaryCard}>
            <View style={styles.summaryRow}>
              <Text style={styles.summaryLabel}>المجموع الفرعي</Text>
              <Text style={styles.summaryValue}>{formatPrice(totalCost)}</Text>
            </View>
            
            <View style={[styles.summaryRow, styles.totalRow]}>
              <Text style={styles.totalLabel}>المجموع الكلي</Text>
              <Text style={styles.totalAmount}>{formatPrice(totalCost + deliveryCost)}</Text>
            </View>
          </View>
        </View>
      </ScrollView>

      {/* Bottom Bar */}
      <View style={styles.bottomBar}>
        <View style={styles.totalContainer}>
          <Text style={styles.totalText}>المجموع</Text>
          <Text style={styles.totalPrice}>{formatPrice(totalCost + deliveryCost)}</Text>
        </View>
        <CustomButton
          text="تأكيد الطلب"
          onPress={handleCheckout}
          disabled={!address}
        />
      </View>

      {/* Address Modal */}
      <Modal
        animationType="slide"
        transparent={true}
        visible={modalVisible}
        onRequestClose={() => setModalVisible(false)}
      >
        <View style={styles.modalContainer}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>
              {hasExistingAddress ? 'تعديل العنوان' : 'إضافة عنوان جديد'}
            </Text>
            <CustomInput
              value={country}
              setValue={setCountry}
              placeholder="الدولة"
            />
            <CustomInput
              value={city}
              setValue={setCity}
              placeholder="المدينة"
            />
            <CustomInput
              value={streetAddress}
              setValue={setStreetAddress}
              placeholder="العنوان"
            />
            <CustomInput
              value={zipcode}
              setValue={setZipcode}
              placeholder="الرمز البريدي"
              keyboardType="numeric"
            />
            <View style={styles.modalButtons}>
              <CustomButton
                text={hasExistingAddress ? "تحديث العنوان" : "حفظ العنوان"}
                onPress={saveShippingAddress}
                disabled={!country || !city || !streetAddress || !zipcode}
              />
            </View>
          </View>
        </View>
      </Modal>
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
    paddingTop: 40,
    borderBottomLeftRadius: 30,
    borderBottomRightRadius: 30,
  },
  backButton: {
    marginBottom: 10,
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: colors.white,
    textAlign: 'center',
    writingDirection: 'rtl',
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
    paddingRight: 10,
    width: '100%',
    justifyContent: 'flex-start',
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: colors.primary,
    marginRight: 10,
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
    width: 60,
    height: 60,
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
  },
  productDetails: {
    flex: 1,
    marginRight: 12,
  },
  productName: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 6,
    textAlign: 'right',
    writingDirection: 'rtl',
  },
  productMetaContainer: {
    flexDirection: 'row-reverse',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  quantityContainer: {
    flexDirection: 'row-reverse',
    alignItems: 'center',
  },
  quantityText: {
    marginRight: 5,
    color: colors.muted,
  },
  priceText: {
    fontSize: 16,
    fontWeight: 'bold',
    color: colors.primary,
  },
  addressCard: {
    backgroundColor: colors.white,
    borderRadius: 15,
    padding: 15,
    elevation: 3,
  },
  addAddressText: {
    color: colors.primary,
    fontSize: 16,
    textAlign: 'center',
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
  summaryCard: {
    backgroundColor: colors.white,
    borderRadius: 15,
    padding: 15,
    elevation: 3,
  },
  summaryRow: {
    flexDirection: 'row-reverse',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
  },
  totalRow: {
    borderTopWidth: 1,
    borderTopColor: colors.light,
    paddingTop: 10,
    marginTop: 10,
  },
  summaryLabel: {
    fontSize: 14,
    color: colors.muted,
  },
  summaryValue: {
    fontSize: 14,
    fontWeight: '600',
  },
  totalLabel: {
    fontSize: 16,
    fontWeight: 'bold',
  },
  totalAmount: {
    fontSize: 18,
    fontWeight: 'bold',
    color: colors.primary,
  },
  bottomBar: {
    backgroundColor: colors.white,
    padding: 15,
    elevation: 5,
  },
  totalContainer: {
    flexDirection: 'row-reverse',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
  },
  totalText: {
    fontSize: 16,
    fontWeight: 'bold',
  },
  totalPrice: {
    fontSize: 20,
    fontWeight: 'bold',
    color: colors.primary,
  },
  modalContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(0,0,0,0.5)',
  },
  modalContent: {
    backgroundColor: colors.white,
    borderRadius: 20,
    padding: 20,
    width: '90%',
    elevation: 5,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    marginBottom: 20,
    textAlign: 'center',
    writingDirection: 'rtl',
  },
  modalButtons: {
    marginTop: 20,
  },
  editButton: {
    marginLeft: 'auto',
    padding: 5,
  },
  noteCard: {
    backgroundColor: colors.white,
    borderRadius: 15,
    padding: 15,
    elevation: 3,
  },
  noteInput: {
    minHeight: 80,
    textAlign: 'right',
    color: colors.dark,
    fontSize: 14,
    padding: 10,
    backgroundColor: colors.light + '20',
    borderRadius: 10,
    writingDirection: 'rtl',
  },
  noteCharCount: {
    fontSize: 12,
    color: colors.muted,
    textAlign: 'left',
    marginTop: 5,
  },
});

export default CheckoutScreen;