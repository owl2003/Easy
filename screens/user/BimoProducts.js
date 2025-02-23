import React, { useState, useEffect } from 'react';
import {
  StyleSheet,
  View,
  Text,
  Image,
  FlatList,
  TouchableOpacity,
  ActivityIndicator,
  StatusBar,
} from 'react-native';
import { Ionicons } from "@expo/vector-icons";
import { colors } from "../../constants";
import { supabase } from '../../supabase';
import { useDispatch } from 'react-redux';
import { bindActionCreators } from 'redux';
import * as actionCreaters from '../../states/actionCreaters/actionCreaters';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { LinearGradient } from 'expo-linear-gradient';
import { I18nManager } from 'react-native';

I18nManager.allowRTL(false);
I18nManager.forceRTL(false);

const BimoProducts = ({ navigation }) => {
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [isVipUser, setIsVipUser] = useState(false);
  const [isVerified, setIsVerified] = useState(false);

  const dispatch = useDispatch();
  const { addCartItem } = bindActionCreators(actionCreaters, dispatch);

  const fetchUserVipStatus = async (userId) => {
    try {
      const { data, error } = await supabase
        .from('users')
        .select('is_vip')
        .eq('id', userId)
        .single();

      if (error) {
        console.error("Error fetching user VIP status:", error);
        return false;
      }

      return data.is_vip;
    } catch (error) {
      console.error("Error:", error);
      return false;
    }
  };

  const fetchUserVerificationStatus = async () => {
    try {
      const value = await AsyncStorage.getItem("authUser");
      if (!value) return;
      
      const user = JSON.parse(value);
      const { data, error } = await supabase
        .from('users')
        .select('is_verified')
        .eq('id', user.id)
        .single();

      if (error) throw error;
      setIsVerified(data?.is_verified || false);
    } catch (error) {
      console.error('Error fetching user verification status:', error);
    }
  };

  const fetchBimoProducts = async () => {
    try {
      setLoading(true);
      
      // Get user VIP status
      const value = await AsyncStorage.getItem("authUser");
      if (value) {
        const user = JSON.parse(value);
        const vipStatus = await fetchUserVipStatus(user.id);
        setIsVipUser(vipStatus);
      }

      const { data, error } = await supabase
        .from('products')
        .select(`
          *,
          categories:category_id (title)
        `)
        .eq('brand', 'bimo');

      if (error) throw error;

      const productsWithImages = await Promise.all(
        data.map(async (product) => {
          let imageUrl = null;
          if (product.image_url) {
            imageUrl = product.image_url.startsWith('http') 
              ? product.image_url 
              : supabase.storage
                  .from('product-images')
                  .getPublicUrl(product.image_url)
                  .data?.publicUrl;
          }
          return {
            ...product,
            imageUrl,
            category: product.categories?.title || "غير مصنف",
            quantity: product.vip && !isVipUser ? 0 : product.quantity
          };
        })
      );

      setProducts(productsWithImages);
    } catch (error) {
      console.error('Error fetching Bimo products:', error);
      setError('حدث خطأ أثناء جلب المنتجات');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    const value = AsyncStorage.getItem("authUser");
    if (value) {
      fetchUserVerificationStatus();
    }
    fetchBimoProducts();
  }, []);

  const handleAddToCart = async (product) => {
    try {
      // Get user info from AsyncStorage
      const value = await AsyncStorage.getItem("authUser");
      if (!value) {
        setError("يرجى تسجيل الدخول لإضافة المنتجات إلى السلة");
        return;
      }
      const userInfo = JSON.parse(value);

      // Check if product already exists in cart
      const { data: existingCartItem, error: checkError } = await supabase
        .from('cart_products')
        .select('*')
        .eq('user_id', userInfo.id)
        .eq('product_id', product.id)
        .single();

      if (checkError && checkError.code !== 'PGRST116') {
        console.error("Error checking cart:", checkError);
        setError("حدث خطأ أثناء التحقق من السلة");
        return;
      }

      // Check max purchase limit
      if (product.max !== null) {
        const currentQuantity = existingCartItem ? existingCartItem.quantity : 0;
        if (currentQuantity >= product.max) {
          setError(`لا يمكن شراء أكثر من ${product.max} قطع من هذا المنتج`);
          setTimeout(() => {
            setError("");
          }, 2000);
          return;
        }
      }

      if (existingCartItem) {
        // Update quantity if product already exists in cart
        const { error: updateError } = await supabase
          .from('cart_products')
          .update({ 
            quantity: existingCartItem.quantity + 1,
            updated_at: new Date()
          })
          .eq('id', existingCartItem.id);

        if (updateError) {
          console.error("Error updating cart:", updateError);
          setError("حدث خطأ أثناء تحديث السلة");
          return;
        }
      } else {
        // Add new product to cart
        const { error: insertError } = await supabase
          .from('cart_products')
          .insert([
            {
              user_id: userInfo.id,
              product_id: product.id,
              quantity: 1
            }
          ]);

        if (insertError) {
          console.error("Error adding to cart:", insertError);
          setError("حدث خطأ أثناء الإضافة إلى السلة");
          return;
        }
      }

      // Update Redux state
      addCartItem(product);
      
      // Show success message
      setError("تمت الإضافة إلى السلة بنجاح");
      setTimeout(() => {
        setError("");
      }, 2000);

    } catch (error) {
      console.error("Error:", error);
      setError("حدث خطأ أثناء الإضافة إلى السلة");
    }
  };

  const renderProduct = ({ item }) => (
    <TouchableOpacity 
      style={styles.productCard}
      onPress={() => navigation.navigate('productdetail', { product: item })}
    >
      <Image 
        source={{ uri: item.imageUrl }}
        style={styles.productImage}
      />
      {item.issold && (
        <View style={styles.discountBadge}>
          <Text style={styles.discountText}>
            -{Math.round(((item.oldprice - item.price) / item.oldprice) * 100)}%
          </Text>
        </View>
      )}
     
      <View style={styles.productInfo}>
        <Text numberOfLines={2} style={styles.productTitle}>
          {item.title}
        </Text>
        <View style={styles.priceRow}>
          <Text style={styles.price}>{isVerified ? item.price : ''} دج</Text>
          {item.oldprice && (
            <Text style={styles.oldPrice}>{isVerified ? item.oldprice : ''} دج</Text>
          )}
        </View>
        {item.quantity > 0 ? (
          <TouchableOpacity 
            style={[
              styles.addToCartButton,
              item.vip && !isVipUser && styles.disabledButton
            ]}
            onPress={() => handleAddToCart(item)}
            disabled={item.vip && !isVipUser}
          >
            <Ionicons name="cart-outline" size={16} color={colors.white} />
            <Text style={styles.addToCartText}>
              {item.vip && !isVipUser ? 'منتج VIP فقط' : 'أضف للسلة'}
            </Text>
          </TouchableOpacity>
        ) : (
          <View style={[styles.addToCartButton, styles.disabledButton]}>
            <Text style={styles.addToCartText}>نفذت الكمية</Text>
          </View>
        )}
      </View>
    </TouchableOpacity>
  );

  return (
    <View style={styles.container}>
      <StatusBar backgroundColor={colors.white} barStyle="dark-content" />
      
      <LinearGradient
        colors={[colors.white, colors.white]}
        style={styles.header}
      >
        <View style={styles.headerContent}>
          <TouchableOpacity 
            style={styles.backButton}
            onPress={() => navigation.goBack()}
          >
            <Ionicons name="arrow-back" size={24} color={colors.dark} />
          </TouchableOpacity>
          
          <View style={styles.logoContainer}>
            <Image 
              source={require('../../assets/brands/bimo.png')}
              style={styles.brandLogo}
              resizeMode="contain"
            />
          </View>
        </View>

        {error ? (
          <View style={styles.alertContainer}>
            <Text style={styles.alertText}>{error}</Text>
          </View>
        ) : null}
      </LinearGradient>

      {loading ? (
        <View style={styles.centerContainer}>
          <ActivityIndicator size="large" color={colors.primary} />
        </View>
      ) : (
        <FlatList
          data={products}
          renderItem={renderProduct}
          keyExtractor={(item) => item.id.toString()}
          numColumns={2}
          contentContainerStyle={styles.productList}
          showsVerticalScrollIndicator={false}
          ListEmptyComponent={() => (
            <View style={styles.emptyContainer}>
              <Text style={styles.emptyText}>لا توجد منتجات متوفرة حالياً</Text>
            </View>
          )}
        />
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
    paddingTop: StatusBar.currentHeight,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 3,
  },
  headerContent: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 15,
    paddingVertical: 10,
    height: 80,
  },
  backButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.light,
  },
  logoContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 40, // To offset the back button width
  },
  brandLogo: {
    height: 50,
    width: 150,
  },
  alertContainer: {
    backgroundColor: colors.white,
    paddingHorizontal: 15,
    paddingVertical: 10,
    marginHorizontal: 15,
    marginBottom: 10,
    borderRadius: 8,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  alertText: {
    color: colors.primary,
    fontSize: 14,
    textAlign: 'center',
  },
  productList: {
    padding: 10,
  },
  productCard: {
    flex: 1,
    margin: 5,
    backgroundColor: colors.white,
    borderRadius: 12,
    overflow: 'hidden',
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 1,
    },
    shadowOpacity: 0.2,
    shadowRadius: 1.41,
  },
  productImage: {
    width: '100%',
    height: 150,
    resizeMode: 'cover',
  },
  productInfo: {
    padding: 12,
  },
  productTitle: {
    fontSize: 14,
    color: colors.dark,
    marginBottom: 8,
    height: 40,
    lineHeight: 20,
    textAlign: 'right',
    fontWeight: 'bold',
  },
  priceRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 10,
    flexWrap: 'wrap',
  },
  price: {
    fontSize: 16,
    fontWeight: 'bold',
    color: colors.primary,
    marginRight: 8,
  },
  oldPrice: {
    fontSize: 13,
    color: colors.muted,
    textDecorationLine: 'line-through',
  },
  discountBadge: {
    position: 'absolute',
    top: 10,
    right: 10,
    backgroundColor: colors.danger,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 4,
  },
  discountText: {
    color: colors.white,
    fontSize: 12,
    fontWeight: 'bold',
  },
  addToCartButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.primary,
    paddingVertical: 8,
    borderRadius: 8,
  },
  disabledButton: {
    backgroundColor: colors.muted,
  },
  addToCartText: {
    color: colors.white,
    fontSize: 12,
    marginLeft: 5,
    fontWeight: '500',
  },
  centerContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 40,
  },
  emptyText: {
    fontSize: 16,
    color: colors.muted,
    textAlign: 'center',
  },
});

export default BimoProducts; 