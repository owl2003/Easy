import {
  StyleSheet,
  Image,
  TouchableOpacity,
  View,
  StatusBar,
  Text,
  ScrollView,
  TextInput,
} from "react-native";
import React, { useState, useEffect } from "react";
import { Ionicons } from "@expo/vector-icons";
import { colors, network } from "../../constants";
import { useSelector, useDispatch } from "react-redux";
import { bindActionCreators } from "redux";
import * as actionCreaters from "../../states/actionCreaters/actionCreaters";
import AsyncStorage from "@react-native-async-storage/async-storage";
import CustomAlert from "../../components/CustomAlert/CustomAlert";
import { supabase } from "../../supabase";
import { LinearGradient } from 'expo-linear-gradient';
import { I18nManager } from 'react-native';

I18nManager.allowRTL(false);
I18nManager.forceRTL(false);

const ProductDetailScreen = ({ navigation, route }) => {
  const { product } = route.params;
  const cartproduct = useSelector((state) => state.product);
  const dispatch = useDispatch();

  const { addCartItem } = bindActionCreators(actionCreaters, dispatch);

  const [onWishlist, setOnWishlist] = useState(false);
  const [avaiableQuantity, setAvaiableQuantity] = useState(0);
  const [quantity, setQuantity] = useState(0);
  const [productImage, SetProductImage] = useState(" ");
  const [wishlistItems, setWishlistItems] = useState([]);
  const [error, setError] = useState("");
  const [isDisable, setIsDisbale] = useState(false);
  const [alertType, setAlertType] = useState("error");
  const [userId, setUserId] = useState(null);
  const [maxPurchase, setMaxPurchase] = useState(null);
  const [isVipUser, setIsVipUser] = useState(false);
  const [isVerified, setIsVerified] = useState(false);

  // Get product image URL from Supabase storage
  const getProductImageUrl = () => {
    if (!product?.image_url) return null;
    
    if (product.image_url.startsWith('http')) {
      return product.image_url;
    }
    
    return supabase.storage
      .from('product-images')
      .getPublicUrl(product.image_url)
      .data?.publicUrl;
  };

  // Fetch user ID from AsyncStorage
  const fetchUserId = async () => {
    try {
      const value = await AsyncStorage.getItem("authUser");
      if (value) {
        const user = JSON.parse(value);
        setUserId(user.id);
        checkWishlistStatus(user.id);
      }
    } catch (error) {
      console.error("Error fetching user ID:", error);
    }
  };

  // Check if product is in user's wishlist
  const checkWishlistStatus = async (uid) => {
    try {
      const { data, error } = await supabase
        .from('wishlist')
        .select('*')
        .eq('user_id', uid)
        .eq('product_id', product.id)
        .single();

      if (error && error.code !== 'PGRST116') { // PGRST116 means no rows returned
        console.error("Error checking wishlist:", error);
        return;
      }

      setOnWishlist(!!data);
    } catch (error) {
      console.error("Error checking wishlist status:", error);
    }
  };

  // Handle wishlist toggle
  const handleWishlistBtn = async () => {
    if (!userId) {
      setError("يرجى تسجيل الدخول لإضافة المنتج إلى قائمة الرغبات");
      setAlertType("error");
      setTimeout(() => {
        setError("");
      }, 2000);
      return;
    }

    setIsDisbale(true);

    try {
      if (onWishlist) {
        // Remove from wishlist
        const { error } = await supabase
          .from('wishlist')
          .delete()
          .eq('user_id', userId)
          .eq('product_id', product.id);

        if (error) throw error;

        setError("تمت إزالة المنتج من قائمة الرغبات");
        setAlertType("success");
        setTimeout(() => {
          setError("");
        }, 2000);
        setOnWishlist(false);
      } else {
        // Add to wishlist
        const { error } = await supabase
          .from('wishlist')
          .insert([
            {
              user_id: userId,
              product_id: product.id
            }
          ]);

        if (error) throw error;

        setError("تمت إضافة المنتج إلى قائمة الرغبات");
        setAlertType("success");
        setTimeout(() => {
          setError("");
        }, 2000);
        setOnWishlist(true);
      }
    } catch (error) {
      console.error("Error toggling wishlist:", error);
      setError("حدث خطأ أثناء تحديث قائمة الرغبات");
      setAlertType("error");
      setTimeout(() => {
        setError("");
      }, 2000);
    } finally {
      setIsDisbale(false);
    }
  };

  // Add function to fetch user VIP status
  const fetchUserVipStatus = async () => {
    if (!userId) return;

    try {
      const { data, error } = await supabase
        .from('users')
        .select('is_vip')
        .eq('id', userId)
        .single();

      if (error) {
        console.error("Error fetching user VIP status:", error);
        return;
      }

      setIsVipUser(data.is_vip);
      
      // Update available quantity based on VIP status
      setAvaiableQuantity(product.vip && !data.is_vip ? 0 : product.quantity);
    } catch (error) {
      console.error("Error:", error);
    }
  };

  // Add function to fetch user verification status
  const fetchUserVerificationStatus = async () => {
    try {
      if (!userId) return;
      
      const { data, error } = await supabase
        .from('users')
        .select('is_verified')
        .eq('id', userId)
        .single();

      if (error) throw error;
      setIsVerified(data?.is_verified || false);
    } catch (error) {
      console.error('Error fetching user verification status:', error);
    }
  };

  //method to add item to cart(redux and supabase)
  const handleAddToCat = async (item) => {
    if (!userId) {
      setError("يرجى تسجيل الدخول لإضافة المنتج إلى السلة");
      setAlertType("error");
      setTimeout(() => {
        setError("");
      }, 2000);
      return;
    }

    if (product.vip && !isVipUser) {
      setError("هذا المنتج متاح فقط لمستخدمي VIP");
      setAlertType("error");
      setTimeout(() => {
        setError("");
      }, 2000);
      return;
    }

    try {
      // Check if product already exists in cart
      const { data: existingCartItem, error: checkError } = await supabase
        .from('cart_products')
        .select('quantity')
        .eq('user_id', userId)
        .eq('product_id', item.id)
        .single();

      if (checkError && checkError.code !== 'PGRST116') {
        console.error("Error checking cart:", checkError);
        setError("حدث خطأ أثناء التحقق من السلة");
        setAlertType("error");
        setTimeout(() => {
          setError("");
        }, 2000);
        return;
      }

      const existingQuantity = existingCartItem?.quantity || 0;
      const newTotalQuantity = existingQuantity + quantity;

      // Check if the new total quantity exceeds the max limit
      if (maxPurchase !== null && newTotalQuantity > maxPurchase) {
        setError(`لا يمكن إضافة أكثر من ${maxPurchase} قطع من هذا المنتج`);
        setAlertType("error");
        setTimeout(() => {
          setError("");
        }, 2000);
        return;
      }

      // Check if the new total quantity exceeds available stock
      if (newTotalQuantity > avaiableQuantity) {
        setError("الكمية المطلوبة غير متوفرة في المخزون");
        setAlertType("error");
        setTimeout(() => {
          setError("");
        }, 2000);
        return;
      }

      if (existingCartItem) {
        // Update existing cart item
        const { error: updateError } = await supabase
          .from('cart_products')
          .update({ quantity: newTotalQuantity })
          .eq('user_id', userId)
          .eq('product_id', item.id);

        if (updateError) {
          console.error("Error updating cart:", updateError);
          setError("حدث خطأ أثناء تحديث السلة");
          setAlertType("error");
          setTimeout(() => {
            setError("");
          }, 2000);
          return;
        }
      } else {
        // Add new cart item
        const { error: insertError } = await supabase
          .from('cart_products')
          .insert([
            {
              user_id: userId,
              product_id: item.id,
              quantity: quantity
            }
          ]);

        if (insertError) {
          console.error("Error adding to cart:", insertError);
          setError("حدث خطأ أثناء الإضافة إلى السلة");
          setAlertType("error");
          setTimeout(() => {
            setError("");
          }, 2000);
          return;
        }
      }

      // Update Redux store
      addCartItem({
        userId: userId,
        productId: item.id,
        quantity: quantity
      });

      // Show success message
      setError("تمت إضافة المنتج إلى السلة");
      setAlertType("success");
      setTimeout(() => {
        setError("");
      }, 2000);

    } catch (error) {
      console.error("Error:", error);
      setError("حدث خطأ أثناء الإضافة إلى السلة");
      setAlertType("error");
      setTimeout(() => {
        setError("");
      }, 2000);
    }
  };

  //method to increase the product quantity
  const handleIncreaseButton = (quantity) => {
    if (avaiableQuantity > quantity) {
      if (maxPurchase === null) {
        setQuantity(quantity + 1);
      } else if (quantity < maxPurchase) {
        setQuantity(quantity + 1);
      } else {
        setError(`لا يمكن شراء أكثر من ${maxPurchase} قطع من هذا المنتج`);
        setAlertType("error");
        setTimeout(() => {
          setError("");
        }, 2000);
      }
    }
  };

  //method to decrease the product quantity
  const handleDecreaseButton = (quantity) => {
    if (quantity > 0) {
      setQuantity(quantity - 1);
    }
  };

  const handleQuantityChange = (text) => {
    const newQuantity = parseInt(text) || 0;
    if (newQuantity >= 0) {
      if (maxPurchase === null || newQuantity <= maxPurchase) {
        if (newQuantity <= avaiableQuantity) {
          setQuantity(newQuantity);
        } else {
          setError("الكمية المطلوبة غير متوفرة");
          setAlertType("error");
          setTimeout(() => {
            setError("");
          }, 2000);
        }
      } else {
        setError(`لا يمكن شراء أكثر من ${maxPurchase} قطع من هذا المنتج`);
        setAlertType("error");
        setTimeout(() => {
          setError("");
        }, 2000);
      }
    }
  };

  //set quantity, avaiableQuantity, product image and fetch wishlist on initial render
  useEffect(() => {
    setQuantity(0);
    setMaxPurchase(product.max);
    SetProductImage(`${network.serverip}/uploads/${product?.image}`);
    fetchUserId();
  }, []);

  // Add new useEffect to fetch VIP status when userId changes
  useEffect(() => {
    if (userId) {
      fetchUserVipStatus();
      fetchUserVerificationStatus();
    }
  }, [userId]);

  //render whenever the value of wishlistItems change
  useEffect(() => {}, [wishlistItems]);

  return (
    <View style={styles.container}>
      <StatusBar backgroundColor={colors.white} barStyle="dark-content" />
      <ScrollView showsVerticalScrollIndicator={false}>
        {/* Header */}
        <LinearGradient
          colors={[colors.white, colors.white]}
          style={styles.header}
        >
          <TouchableOpacity
            style={styles.backButton}
            onPress={() => navigation.goBack()}
          >
            <Ionicons name="arrow-back" size={24} color={colors.dark} />
          </TouchableOpacity>
        </LinearGradient>

        <View style={styles.content}>
          {/* Product Image */}
          <View style={styles.imageContainer}>
            <Image source={{ uri: getProductImageUrl() }} style={styles.productImage} />
            {product.issold && (
              <View style={styles.discountBadge}>
                <Text style={styles.discountText}>
                  -{Math.round(((product.oldprice - product.price) / product.oldprice) * 100)}%
                </Text>
              </View>
            )}
          </View>

          {/* Alert Message */}
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

          {/* Product Info */}
          <View style={styles.infoContainer}>
            <View style={styles.titleRow}>
              <Text style={styles.title}>{product?.title}</Text>
              <TouchableOpacity
                disabled={isDisable}
                style={[
                  styles.wishlistButton,
                  onWishlist && styles.wishlistButtonActive
                ]}
                onPress={handleWishlistBtn}
              >
                <Ionicons 
                  name="heart" 
                  size={22} 
                  color={onWishlist ? colors.white : colors.muted} 
                />
              </TouchableOpacity>
            </View>

            <View style={styles.priceContainer}>
              {isVerified && (
                <>
                  {product.issold && (
                    <Text style={styles.oldPrice}>{product.oldprice} دج</Text>
                  )}
                  <Text style={[styles.price, product.issold && styles.salePrice]}>
                    {product.price} دج
                  </Text>
                </>
              )}
            </View>

            {product.description && (
              <View style={styles.descriptionContainer}>
                <Text style={styles.sectionTitle}>الوصف</Text>
                <Text style={styles.description}>{product.description}</Text>
              </View>
            )}

            {/* Quantity Counter */}
            <View style={styles.quantityContainer}>
              <View style={styles.quantityHeader}>
                <Text style={styles.sectionTitle}>الكمية</Text>
                {maxPurchase !== null && (
                  <Text style={styles.maxLimit}>
                    (الحد الأقصى: {maxPurchase})
                  </Text>
                )}
              </View>
              <View style={styles.counter}>
                <TouchableOpacity
                  style={styles.counterButton}
                  onPress={() => handleDecreaseButton(quantity)}
                >
                  <Ionicons name="remove" size={20} color={colors.white} />
                </TouchableOpacity>
                <TextInput
                  style={styles.quantity}
                  value={quantity.toString()}
                  onChangeText={handleQuantityChange}
                  keyboardType="numeric"
                  maxLength={3}
                />
                <TouchableOpacity
                  style={[
                    styles.counterButton,
                    (maxPurchase !== null && quantity >= maxPurchase) && styles.counterButtonDisabled
                  ]}
                  onPress={() => handleIncreaseButton(quantity)}
                  disabled={maxPurchase !== null && quantity >= maxPurchase}
                >
                  <Ionicons name="add" size={20} color={colors.white} />
                </TouchableOpacity>
              </View>
            </View>
          </View>
        </View>
      </ScrollView>

      {/* Add to Cart Button */}
      <View style={styles.footer}>
        {avaiableQuantity > 0 ? (
          <TouchableOpacity
            style={[
              styles.addToCartButton,
              quantity === 0 && styles.disabledButton
            ]}
            onPress={() => {
              if (quantity === 0) {
                setError("الرجاء تحديد الكمية المطلوبة");
                setAlertType("error");
                setTimeout(() => {
                  setError("");
                }, 2000);
                return;
              }
              handleAddToCat(product);
            }}
            disabled={quantity === 0}
          >
            <Ionicons name="cart-outline" size={24} color={colors.white} />
            <Text style={styles.addToCartText}>
              {quantity === 0 ? "الرجاء تحديد الكمية" : "أضف إلى السلة"}
            </Text>
          </TouchableOpacity>
        ) : (
          <View style={[styles.addToCartButton, styles.disabledButton]}>
            <Ionicons name="close-circle-outline" size={24} color={colors.white} />
            <Text style={styles.addToCartText}>غير متوفر</Text>
          </View>
        )}
      </View>
      <CustomAlert message={error} type={alertType} />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.white,
  },
  header: {
    flexDirection: 'row-reverse',
    alignItems: 'center',
    paddingHorizontal: 15,
    paddingTop: StatusBar.currentHeight + 10,
    paddingBottom: 10,
    elevation: 2,
  },
  backButton: {
    padding: 8,
    transform: [{ scaleX: -1 }],
  },
  content: {
    flex: 1,
  },
  imageContainer: {
    width: '100%',
    height: 300,
    backgroundColor: colors.light,
    position: 'relative',
  },
  productImage: {
    width: '100%',
    height: '100%',
    resizeMode: 'contain',
  },
  discountBadge: {
    position: 'absolute',
    top: 15,
    right: 15,
    backgroundColor: colors.danger,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 15,
  },
  discountText: {
    color: colors.white,
    fontWeight: 'bold',
    fontSize: 14,
  },
  alertContainer: {
    padding: 10,
    alignItems: 'center',
  },
  alertText: {
    fontSize: 14,
    fontWeight: '500',
  },
  infoContainer: {
    flex: 1,
    padding: 20,
  },
  titleRow: {
    flexDirection: 'row-reverse',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 15,
  },
  title: {
    flex: 1,
    fontSize: 24,
    fontWeight: 'bold',
    color: colors.dark,
    marginLeft: 15,
    textAlign: 'right',
  },
  wishlistButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: colors.light,
    justifyContent: 'center',
    alignItems: 'center',
  },
  wishlistButtonActive: {
    backgroundColor: colors.danger,
  },
  priceContainer: {
    flexDirection: 'row-reverse',
    alignItems: 'center',
    marginBottom: 20,
  },
  price: {
    fontSize: 24,
    fontWeight: 'bold',
    color: colors.primary,
  },
  oldPrice: {
    fontSize: 18,
    color: colors.muted,
    textDecorationLine: 'line-through',
    marginLeft: 10,
  },
  descriptionContainer: {
    marginBottom: 20,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: colors.dark,
    marginBottom: 10,
    textAlign: 'right',
  },
  description: {
    fontSize: 14,
    color: colors.muted,
    lineHeight: 20,
    textAlign: 'right',
  },
  quantityContainer: {
    marginBottom: 20,
  },
  quantityHeader: {
    flexDirection: 'row-reverse',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 10,
  },
  maxLimit: {
    fontSize: 14,
    color: colors.muted,
    fontWeight: '500',
  },
  counter: {
    flexDirection: 'row-reverse',
    alignItems: 'center',
    backgroundColor: colors.light,
    borderRadius: 25,
    padding: 5,
    alignSelf: 'flex-start',
  },
  counterButton: {
    width: 35,
    height: 35,
    borderRadius: 17.5,
    backgroundColor: colors.primary_light,
    justifyContent: 'center',
    alignItems: 'center',
  },
  counterButtonDisabled: {
    backgroundColor: colors.muted,
  },
  quantity: {
    fontSize: 18,
    fontWeight: 'bold',
    marginHorizontal: 20,
    minWidth: 30,
    textAlign: 'center',
    backgroundColor: 'transparent',
    color: colors.dark,
  },
  footer: {
    backgroundColor: colors.white,
    padding: 20,
    elevation: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -3 },
    shadowOpacity: 0.1,
    shadowRadius: 5,
  },
  addToCartButton: {
    backgroundColor: colors.primary_light,
    flexDirection: 'row-reverse',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 15,
    borderRadius: 12,
  },
  disabledButton: {
    backgroundColor: colors.muted,
  },
  addToCartText: {
    color: colors.white,
    fontSize: 16,
    fontWeight: '600',
    marginLeft: 8,
  },
});

export default ProductDetailScreen;
