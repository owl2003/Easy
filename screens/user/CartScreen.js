import React, { useEffect, useState } from "react";
import {
  StyleSheet,
  Image,
  TouchableOpacity,
  View,
  StatusBar,
  Text,
  ScrollView,
} from "react-native";
import { Ionicons, MaterialIcons } from "@expo/vector-icons";
import { colors } from "../../constants"; // Assuming you have a colors constant file
import CartProductList from "../../components/CartProductList/CartProductList";
import { supabase } from "../../supabase"; // Import Supabase client
import AsyncStorage from "@react-native-async-storage/async-storage";
import { useFocusEffect } from '@react-navigation/native';
import { I18nManager } from 'react-native';

I18nManager.allowRTL(false);
I18nManager.forceRTL(false);

const CartScreen = ({ navigation }) => {
  const [cartProducts, setCartProducts] = useState([]); // State to store cart products
  const [totalPrice, setTotalPrice] = useState(0); // State to store total price
  const [userId, setUserId] = useState(null); // State to store the logged-in user's ID
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [alertType, setAlertType] = useState("error");
  const [isVerified, setIsVerified] = useState(false);

  // Fetch the logged-in user's ID from AsyncStorage
  const fetchUserId = async () => {
    const value = await AsyncStorage.getItem("authUser");
    if (value) {
      const user = JSON.parse(value);
      setUserId(user.id);
    }
  };

  // Add verification check function
  const checkVerificationStatus = async (userId) => {
    try {
      const { data, error } = await supabase
        .from('users')
        .select('is_verified')
        .eq('id', userId)
        .single();

      if (error) {
        console.error("Error checking verification status:", error);
        return false;
      }

      return data.is_verified;
    } catch (error) {
      console.error("Error:", error);
      return false;
    }
  };

  // Fetch cart products from Supabase
  const fetchCartProducts = async () => {
    setLoading(true);
    setError("");

    try {
      const value = await AsyncStorage.getItem("authUser");
      if (!value) {
        setError("User not authenticated");
        setLoading(false);
        return;
      }

      const user = JSON.parse(value);

      // Check verification status
      const verificationStatus = await checkVerificationStatus(user.id);
      setIsVerified(verificationStatus);

      const { data: cartData, error: cartError } = await supabase
        .from("cart_products")
        .select(`
          *,
          products (*)
        `)
        .eq("user_id", user.id);

      if (cartError) throw cartError;

      const processedCartItems = await Promise.all(
        cartData.map(async (item) => {
          let imageUrl = null;
          if (item.products.image_url) {
            if (item.products.image_url.startsWith('http')) {
              imageUrl = item.products.image_url;
            } else {
              imageUrl = supabase.storage
                .from('product-images')
                .getPublicUrl(item.products.image_url)
                .data?.publicUrl;
            }
          }

          return {
            ...item,
            products: {
              ...item.products,
              image_url: imageUrl,
              // Only show price if user is verified
              price: verificationStatus ? item.products.price : 0
            }
          };
        })
      );

      setCartProducts(processedCartItems);
      
      // Calculate total only if user is verified
      if (verificationStatus) {
        const total = processedCartItems.reduce((acc, item) => {
          return acc + (item.products.price * item.quantity);
        }, 0);
        setTotalPrice(total);
      } else {
        setTotalPrice(0);
      }

    } catch (err) {
      console.error("Error fetching cart:", err);
      setError("Failed to fetch cart");
    } finally {
      setLoading(false);
    }
  };

  // Update the quantity of a product in the cart
  const updateQuantity = async (productId, newQuantity) => {
    try {
      // Find the product in the cart
      const cartItem = cartProducts.find(item => item.product_id === productId);
      if (!cartItem) return;

      // Check if new quantity exceeds max purchase limit
      if (cartItem.products.max !== null && newQuantity > cartItem.products.max) {
        setError(`لا يمكن شراء أكثر من ${cartItem.products.max} قطع من هذا المنتج`);
        setAlertType("error");
        setTimeout(() => {
          setError("");
        }, 2000);
        return;
      }

      // Check if new quantity exceeds available stock
      if (newQuantity > cartItem.products.quantity) {
        setError("الكمية المطلوبة غير متوفرة في المخزون");
        setAlertType("error");
        setTimeout(() => {
          setError("");
        }, 2000);
        return;
      }

      const { error } = await supabase
        .from('cart_products')
        .update({ quantity: newQuantity })
        .eq('user_id', userId)
        .eq('product_id', productId);

      if (error) {
        console.error("Error updating quantity:", error);
        setError("حدث خطأ أثناء تحديث الكمية");
        setAlertType("error");
        setTimeout(() => {
          setError("");
        }, 2000);
        return;
      }

      // Update local state immediately
      const updatedProducts = cartProducts.map(item => {
        if (item.product_id === productId) {
          return { ...item, quantity: newQuantity };
        }
        return item;
      });
      setCartProducts(updatedProducts);

      // Recalculate total immediately
      if (isVerified) {
        const total = updatedProducts.reduce((acc, item) => {
          return acc + (item.products.price * item.quantity);
        }, 0);
        setTotalPrice(total);
      }

    } catch (error) {
      console.error("Error:", error);
      setError("حدث خطأ أثناء تحديث الكمية");
      setAlertType("error");
      setTimeout(() => {
        setError("");
      }, 2000);
    }
  };

  // Remove a product from the cart
  const removeProduct = async (productId) => {
    try {
      const { error } = await supabase
        .from('cart_products')
        .delete()
        .eq('user_id', userId)
        .eq('product_id', productId);

      if (error) {
        console.error("Error removing product:", error);
        return;
      }

      // Update local state immediately
      const updatedProducts = cartProducts.filter(item => item.product_id !== productId);
      setCartProducts(updatedProducts);

      // Recalculate total immediately
      if (isVerified) {
        const total = updatedProducts.reduce((acc, item) => {
          return acc + (item.products.price * item.quantity);
        }, 0);
        setTotalPrice(total);
      }

    } catch (error) {
      console.error("Error:", error);
    }
  };

  // Replace the existing useEffect for fetching user ID with useFocusEffect
  useFocusEffect(
    React.useCallback(() => {
      const loadData = async () => {
        await fetchUserId();
      };
      loadData();
    }, [])
  );

  // Update the useFocusEffect to include verification check
  useFocusEffect(
    React.useCallback(() => {
      if (userId) {
        fetchCartProducts();
      }
    }, [userId])
  );

  // Update the useEffect for total price to handle changes in quantity
  useEffect(() => {
    if (!isVerified) {
      setTotalPrice(0);
      return;
    }
    
    const total = cartProducts.reduce((acc, item) => {
      return acc + (item.products.price * item.quantity);
    }, 0);
    setTotalPrice(total);
  }, [cartProducts, isVerified]);

  // Add this function to show max limit error
  const showMaxLimitError = (max) => {
    setError(`لا يمكن شراء أكثر من ${max} قطع من هذا المنتج`);
    setAlertType("error");
    // Clear error after 2 seconds
    setTimeout(() => {
      setError("");
    }, 2000);
  };

  const handleQuantityChange = async (productId, value) => {
    try {
      // Convert input to number
      const newQuantity = parseInt(value) || 0;
      
      // Find the product in the cart
      const cartItem = cartProducts.find(item => item.product_id === productId);
      if (!cartItem) return;

      // Validate minimum quantity
      if (newQuantity < 1) {
        setError("الكمية يجب أن تكون 1 على الأقل");
        setAlertType("error");
        setTimeout(() => setError(""), 2000);
        return;
      }

      // Check max purchase limit
      if (cartItem.products.max !== null && newQuantity > cartItem.products.max) {
        setError(`لا يمكن شراء أكثر من ${cartItem.products.max} قطع من هذا المنتج`);
        setAlertType("error");
        setTimeout(() => setError(""), 2000);
        return;
      }

      // Check available stock
      if (newQuantity > cartItem.products.quantity) {
        setError("الكمية المطلوبة غير متوفرة في المخزون");
        setAlertType("error");
        setTimeout(() => setError(""), 2000);
        return;
      }

      // Update quantity in database
      await updateQuantity(productId, newQuantity);

    } catch (error) {
      console.error("Error handling quantity change:", error);
      setError("حدث خطأ أثناء تحديث الكمية");
      setAlertType("error");
      setTimeout(() => setError(""), 2000);
    }
  };

  return (
    <View style={styles.container}>
      <StatusBar backgroundColor={colors.white} barStyle="dark-content" />
      
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity 
          style={styles.backButton}
          onPress={() => navigation.goBack()}
        >
          <Ionicons name="arrow-back" size={24} color={colors.dark} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>سلة التسوق</Text>
        <Text style={styles.itemCount}>{cartProducts.length} منتجات</Text>
      </View>

      {error ? (
        <View style={styles.alertContainer}>
          <Text style={[
            styles.alertText,
            { color: alertType === "success" ? colors.primary : colors.danger }
          ]}>
            {error}
          </Text>
        </View>
      ) : null}

      {cartProducts.length === 0 ? (
        <View style={styles.emptyContainer}>
          <Ionicons name="cart-outline" size={80} color={colors.muted} />
          <Text style={styles.emptyText}>السلة فارغة</Text>
          <TouchableOpacity 
            style={styles.shopButton}
            onPress={() => navigation.navigate("home")}
          >
            <Text style={styles.shopButtonText}>تسوق الآن</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <>
          <ScrollView style={styles.cartList}>
            {cartProducts.map((item, index) => (
              <CartProductList
                key={index}
                image={item.products.image_url}
                title={item.products.title}
                price={isVerified ? item.products.price : 0}
                quantity={item.quantity}
                maxLimit={item.products.max}
                currentQuantity={item.quantity}
                handleDelete={() => removeProduct(item.product_id)}
                onPressDecrement={() => {
                  if (item.quantity > 1) {
                    updateQuantity(item.product_id, item.quantity - 1);
                  }
                }}
                onPressIncrement={() => {
                  if (item.products.max === null || item.quantity < item.products.max) {
                    updateQuantity(item.product_id, item.quantity + 1);
                  } else {
                    showMaxLimitError(item.products.max);
                  }
                }}
                onQuantityChange={(value) => handleQuantityChange(item.product_id, value)}
                isVerified={isVerified}
              />
            ))}
          </ScrollView>

          <View style={styles.footer}>
            <View style={styles.totalContainer}>
              {isVerified ? (
                <>
                  <View style={styles.totalRow}>
                    <Text style={styles.totalLabel}>المجموع الفرعي:</Text>
                    <Text style={styles.totalValue}>{totalPrice} دج</Text>
                  </View>
                 
                  <View style={[styles.totalRow, styles.finalTotal]}>
                    <Text style={styles.totalLabelFinal}>المجموع النهائي:</Text>
                    <Text style={styles.totalValueFinal}>{totalPrice} دج</Text>
                  </View>
                </>
              ) : (
                <Text style={styles.hiddenPriceText}>يرجى تفعيل الحساب لرؤية الأسعار</Text>
              )}
            </View>

            {!isVerified ? (
              <View style={styles.verificationWarning}>
                <Ionicons name="warning-outline" size={24} color={colors.danger} />
                <Text style={styles.verificationWarningText}>
                  يرجى تفعيل حسابك للتمكن من إتمام عملية الشراء
                </Text>
              </View>
            ) : (
              <TouchableOpacity 
                style={styles.checkoutButton}
                onPress={() => navigation.navigate("checkout")}
              >
                <Text style={styles.checkoutButtonText}>متابعة الشراء</Text>
              </TouchableOpacity>
            )}
          </View>
        </>
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
    backgroundColor: colors.white,
    padding: 15,
    paddingTop: StatusBar.currentHeight + 15,
    flexDirection: 'row-reverse',
    alignItems: 'center',
    elevation: 2,
  },
  backButton: {
    padding: 5,
    transform: [{ scaleX: -1 }],
  },
  headerTitle: {
    flex: 1,
    fontSize: 20,
    fontWeight: 'bold',
    color: colors.dark,
    textAlign: 'center',
    marginLeft: 30,
  },
  itemCount: {
    fontSize: 14,
    color: colors.muted,
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
  },
  shopButton: {
    backgroundColor: colors.primary_light,
    paddingHorizontal: 30,
    paddingVertical: 12,
    borderRadius: 25,
  },
  shopButtonText: {
    color: colors.white,
    fontSize: 16,
    fontWeight: '600',
  },
  cartList: {
    flex: 1,
    padding: 15,
  },
  footer: {
    backgroundColor: colors.white,
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    padding: 20,
    elevation: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -3 },
    shadowOpacity: 0.1,
    shadowRadius: 5,
  },
  totalContainer: {
    marginBottom: 20,
  },
  totalRow: {
    flexDirection: 'row-reverse',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
  },
  totalLabel: {
    fontSize: 14,
    color: colors.muted,
    textAlign: 'right',
  },
  totalValue: {
    fontSize: 14,
    color: colors.dark,
    fontWeight: '500',
    textAlign: 'left',
  },
  finalTotal: {
    marginTop: 10,
    paddingTop: 10,
    borderTopWidth: 1,
    borderTopColor: colors.light,
  },
  totalLabelFinal: {
    fontSize: 16,
    fontWeight: 'bold',
    color: colors.dark,
  },
  totalValueFinal: {
    fontSize: 20,
    fontWeight: 'bold',
    color: colors.primary,
  },
  checkoutButton: {
    backgroundColor: colors.primary_light,
    flexDirection: 'row-reverse',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 15,
    borderRadius: 12,
  },
  checkoutButtonText: {
    color: colors.white,
    fontSize: 16,
    fontWeight: '600',
    marginLeft: 5,
  },
  alertContainer: {
    padding: 12,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.white,
    marginHorizontal: 15,
    marginTop: 10,
    borderRadius: 8,
    elevation: 1,
  },
  alertText: {
    fontSize: 14,
    fontWeight: '500',
    textAlign: 'center',
    lineHeight: 20,
  },
  verificationWarning: {
    backgroundColor: colors.danger + '20',
    padding: 15,
    borderRadius: 12,
    flexDirection: 'row-reverse',
    alignItems: 'center',
    justifyContent: 'center',
  },
  verificationWarningText: {
    color: colors.danger,
    fontSize: 14,
    fontWeight: '600',
    marginRight: 8,
    textAlign: 'center',
  },
  hiddenPriceText: {
    color: colors.danger,
    fontSize: 14,
    textAlign: 'center',
    fontStyle: 'italic',
    padding: 10
  },
});

export default CartScreen;