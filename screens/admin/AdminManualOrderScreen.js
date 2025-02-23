import React, { useState, useEffect } from 'react';
import {
  StyleSheet,
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ScrollView,
  Alert,
  StatusBar,
  Image,
} from 'react-native';
import { Ionicons } from "@expo/vector-icons";
import { colors } from "../../constants";
import { supabase } from "../../supabase";
import { I18nManager } from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';

I18nManager.allowRTL(false);
I18nManager.forceRTL(false);

const AdminManualOrderScreen = ({ navigation }) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState([]);
  const [selectedProducts, setSelectedProducts] = useState([]);
  const [customerName, setCustomerName] = useState('');
  const [customerPhone, setCustomerPhone] = useState('');
  const [paidAmount, setPaidAmount] = useState('');
  const [showSearchResults, setShowSearchResults] = useState(false);

  const handleSearch = async (text) => {
    setSearchQuery(text);
    
    if (text.trim() === '') {
      setSearchResults([]);
      setShowSearchResults(false);
      return;
    }

    try {
      const { data, error } = await supabase
        .from('products')
        .select(`
          *,
          categories:category_id (title)
        `)
        .ilike('title', `%${text}%`)
        .limit(5);

      if (error) throw error;

      // Process each product to get the proper image URL
      const productsWithImages = await Promise.all(
        data.map(async (product) => {
          let imageUrl = null;
          if (product.image_url) {
            // If it's already a full URL, use it as is
            if (product.image_url.startsWith('http')) {
              imageUrl = product.image_url;
            } else {
              // Get the public URL from Supabase storage
              imageUrl = supabase.storage
                .from('product-images')
                .getPublicUrl(product.image_url)
                .data?.publicUrl;
            }
          }
          return {
            ...product,
            imageUrl,
            category: product.categories?.title || "غير مصنف"
          };
        })
      );

      setSearchResults(productsWithImages);
      setShowSearchResults(true);
    } catch (error) {
      console.error('Error searching products:', error);
      Alert.alert('خطأ', 'حدث خطأ أثناء البحث عن المنتجات');
    }
  };

  const addProductToOrder = (product) => {
    const existingProduct = selectedProducts.find(p => p.id === product.id);
    
    if (existingProduct) {
      setSelectedProducts(selectedProducts.map(p => 
        p.id === product.id 
          ? { ...p, quantity: p.quantity + 1 }
          : p
      ));
    } else {
      setSelectedProducts([...selectedProducts, { ...product, quantity: 1 }]);
    }
    
    setSearchQuery('');
    setSearchResults([]);
    setShowSearchResults(false);
  };

  const updateQuantity = (productId, newQuantity) => {
    if (newQuantity < 1) {
      setSelectedProducts(selectedProducts.filter(p => p.id !== productId));
    } else {
      setSelectedProducts(selectedProducts.map(p => 
        p.id === productId ? { ...p, quantity: newQuantity } : p
      ));
    }
  };

  const calculateTotal = () => {
    return selectedProducts.reduce((total, item) => total + (item.price * item.quantity), 0);
  };

  const calculateRemainingAmount = () => {
    const total = calculateTotal();
    const paid = parseFloat(paidAmount) || 0;
    return total - paid;
  };

  const handleCreateOrder = async () => {
    if (!customerName.trim()) {
      Alert.alert('تنبيه', 'يرجى إدخال اسم العميل');
      return;
    }

    if (selectedProducts.length === 0) {
      Alert.alert('تنبيه', 'يرجى إضافة منتجات للطلب');
      return;
    }

    try {
      // Create manual order
      const { data: order, error: orderError } = await supabase
        .from('manual_orders')
        .insert([{
          customer_name: customerName,
          customer_phone: customerPhone,
          total_amount: calculateTotal(),
          paid_amount: parseFloat(paidAmount) || 0,
          remaining_amount: calculateRemainingAmount(),
          status: 'pending'
        }])
        .select()
        .single();

      if (orderError) throw orderError;

      // Create order items with UUID product_id
      const orderItems = selectedProducts.map(product => ({
        order_id: order.id, // This will be a UUID
        product_id: product.id, // This should match the UUID from products table
        quantity: product.quantity,
        price: product.price
      }));

      const { error: itemsError } = await supabase
        .from('manual_order_items')
        .insert(orderItems);

      if (itemsError) throw itemsError;

      // Navigate to receipt screen
      navigation.navigate('manualorderreceipt', { 
        orderDetail: {
          ...order,
          items: selectedProducts,
        }
      });

    } catch (error) {
      console.error('Error creating order:', error);
      Alert.alert('خطأ', 'حدث خطأ أثناء إنشاء الطلب');
    }
  };

  return (
    <View style={styles.container}>
      <StatusBar backgroundColor={colors.primary} />
      
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.headerTitle}>إنشاء طلب يدوي</Text>
      </View>

      <ScrollView style={styles.content}>
        {/* Customer Info */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>معلومات العميل</Text>
          <TextInput
            style={styles.input}
            placeholder="اسم العميل"
            value={customerName}
            onChangeText={setCustomerName}
          />
          <TextInput
            style={styles.input}
            placeholder="رقم الهاتف"
            value={customerPhone}
            onChangeText={setCustomerPhone}
            keyboardType="phone-pad"
          />
        </View>

        {/* Product Search */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>إضافة منتجات</Text>
          <View style={styles.searchContainer}>
            <TextInput
              style={styles.searchInput}
              placeholder="ابحث عن منتج..."
              value={searchQuery}
              onChangeText={handleSearch}
            />
            {showSearchResults && (
              <View style={styles.searchResults}>
                {searchResults.map(product => (
                  <TouchableOpacity
                    key={product.id}
                    style={styles.searchResultItem}
                    onPress={() => addProductToOrder(product)}
                  >
                    <View style={styles.searchResultImageContainer}>
                      {product.imageUrl ? (
                        <Image
                          source={{ uri: product.imageUrl }}
                          style={styles.searchResultImage}
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
                    <View style={styles.searchResultInfo}>
                      <Text style={styles.productTitle} numberOfLines={2}>
                        {product.title}
                      </Text>
                      <Text style={styles.productCategory}>
                        {product.category}
                      </Text>
                      <Text style={styles.productPrice}>
                        {product.price} دج
                      </Text>
                    </View>
                  </TouchableOpacity>
                ))}
              </View>
            )}
          </View>
        </View>

        {/* Selected Products */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>المنتجات المختارة</Text>
          {selectedProducts.map(product => (
            <View key={product.id} style={styles.selectedProduct}>
              <View style={styles.productInfo}>
                <Text style={styles.productTitle}>{product.title}</Text>
                <Text style={styles.productPrice}>{product.price} دج</Text>
              </View>
              <View style={styles.quantityControl}>
                <TouchableOpacity
                  onPress={() => updateQuantity(product.id, product.quantity - 1)}
                >
                  <Ionicons name="remove-circle" size={24} color={colors.primary} />
                </TouchableOpacity>
                <Text style={styles.quantityText}>{product.quantity}</Text>
                <TouchableOpacity
                  onPress={() => updateQuantity(product.id, product.quantity + 1)}
                >
                  <Ionicons name="add-circle" size={24} color={colors.primary} />
                </TouchableOpacity>
              </View>
            </View>
          ))}
        </View>

        {/* Payment Info */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>معلومات الدفع</Text>
          <View style={styles.paymentInfo}>
            <Text style={styles.paymentLabel}>المجموع الكلي:</Text>
            <Text style={styles.paymentValue}>{calculateTotal()} دج</Text>
          </View>
          <TextInput
            style={styles.input}
            placeholder="المبلغ المدفوع"
            value={paidAmount}
            onChangeText={setPaidAmount}
            keyboardType="numeric"
          />
          <View style={styles.paymentInfo}>
            <Text style={styles.paymentLabel}>المبلغ المتبقي:</Text>
            <Text style={styles.paymentValue}>{calculateRemainingAmount()} دج</Text>
          </View>
        </View>

        {/* Create Order Button */}
        <TouchableOpacity
          style={styles.createButton}
          onPress={handleCreateOrder}
        >
          <Text style={styles.createButtonText}>إنشاء الطلب وطباعة الإيصال</Text>
        </TouchableOpacity>
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.light,
  },
  header: {
    backgroundColor: colors.primary,
    padding: 15,
    alignItems: 'center',
  },
  headerTitle: {
    color: colors.white,
    fontSize: 18,
    fontWeight: 'bold',
  },
  content: {
    flex: 1,
    padding: 15,
  },
  section: {
    backgroundColor: colors.white,
    borderRadius: 10,
    padding: 15,
    marginBottom: 15,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: colors.primary,
    marginBottom: 10,
    textAlign: 'right',
  },
  input: {
    backgroundColor: colors.light,
    borderRadius: 8,
    padding: 10,
    marginBottom: 10,
    textAlign: 'right',
  },
  searchContainer: {
    position: 'relative',
  },
  searchInput: {
    backgroundColor: colors.light,
    borderRadius: 8,
    padding: 10,
    textAlign: 'right',
  },
  searchResults: {
    position: 'absolute',
    top: '100%',
    left: 0,
    right: 0,
    backgroundColor: colors.white,
    borderRadius: 8,
    elevation: 4,
    zIndex: 999,
    maxHeight: 300,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
  },
  searchResultItem: {
    flexDirection: 'row-reverse',
    padding: 10,
    borderBottomWidth: 1,
    borderBottomColor: colors.light,
    alignItems: 'center',
  },
  selectedProduct: {
    flexDirection: 'row-reverse',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 10,
    backgroundColor: colors.light,
    borderRadius: 8,
    marginBottom: 10,
  },
  productInfo: {
    flex: 1,
  },
  productTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.dark,
    marginBottom: 4,
    textAlign: 'right',
  },
  productCategory: {
    fontSize: 12,
    color: colors.muted,
    marginBottom: 4,
    textAlign: 'right',
  },
  productPrice: {
    fontSize: 14,
    fontWeight: 'bold',
    color: colors.primary,
    textAlign: 'right',
  },
  quantityControl: {
    flexDirection: 'row-reverse',
    alignItems: 'center',
    marginLeft: 10,
  },
  quantityText: {
    marginHorizontal: 10,
    fontSize: 16,
    fontWeight: 'bold',
  },
  paymentInfo: {
    flexDirection: 'row-reverse',
    justifyContent: 'space-between',
    marginBottom: 10,
  },
  paymentLabel: {
    fontSize: 14,
    color: colors.dark,
  },
  paymentValue: {
    fontSize: 14,
    fontWeight: 'bold',
    color: colors.primary,
  },
  createButton: {
    backgroundColor: colors.primary,
    padding: 15,
    borderRadius: 8,
    alignItems: 'center',
    marginBottom: 20,
  },
  createButtonText: {
    color: colors.white,
    fontSize: 16,
    fontWeight: 'bold',
  },
  searchResultImageContainer: {
    width: 60,
    height: 60,
    borderRadius: 8,
    overflow: 'hidden',
    backgroundColor: colors.light,
  },
  searchResultImage: {
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
  searchResultInfo: {
    flex: 1,
    marginRight: 12,
  },
});

export default AdminManualOrderScreen; 