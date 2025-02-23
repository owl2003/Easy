import {
  StyleSheet,
  StatusBar,
  View,
  TouchableOpacity,
  Text,
  Image,
  FlatList,
  RefreshControl,
  ScrollView,
  TextInput,
  Dimensions,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import React, { useEffect, useState } from "react";
import easybuylogo from "../../assets/logo/mehdi(1).png";
import { colors } from "../../constants";
import { useSelector, useDispatch } from "react-redux";
import { bindActionCreators } from "redux";
import * as actionCreaters from "../../states/actionCreaters/actionCreaters";
import { SliderBox } from 'react-native-image-slider-box';

import { supabase } from '../../supabase';
import { LinearGradient } from 'expo-linear-gradient';
import { useFocusEffect } from '@react-navigation/native';
import { Portal, Provider } from 'react-native-paper';
import { I18nManager } from 'react-native';

I18nManager.allowRTL(false);
I18nManager.forceRTL(false);

const HomeScreen = ({ navigation, route }) => {
  const cartproduct = useSelector((state) => state.product);
  const dispatch = useDispatch();

  const { addCartItem } = bindActionCreators(actionCreaters, dispatch);

  const { user } = route.params;
  const [products, setProducts] = useState([]);
  const [categories, setCategories] = useState([]); // State for categories
  const [refeshing, setRefreshing] = useState(false);
  const [error, setError] = useState("");
  const [userInfo, setUserInfo] = useState({});
  const [searchItems, setSearchItems] = useState([]);
  const [banners, setBanners] = useState([]); // State for banners
  const [productStats, setProductStats] = useState({});
  const [foundItems, setFoundItems] = useState([]);
  const [alertType, setAlertType] = useState("error");
  const [cartCount, setCartCount] = useState(0);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState([]);
  const [showSearchResults, setShowSearchResults] = useState(false);
  const [isVerified, setIsVerified] = useState(false);
  const [isVipUser, setIsVipUser] = useState(false);

  // Fetch categories from Supabase
  const fetchCategories = async () => {
    try {
      const { data, error } = await supabase
        .from('categories')
        .select('*');

      if (error) {
        console.error('Error fetching categories:', error);
        return;
      }

      // Process each category to get the proper image URL
      const categoriesWithIcons = await Promise.all(
        data.map(async (category) => {
          let iconUrl = null;
          if (category.icon) {
            // If it's already a full URL, use it as is
            if (category.icon.startsWith('http')) {
              iconUrl = category.icon;
            } else {
              // Get the public URL from Supabase storage
              iconUrl = supabase.storage
                .from('category-icon')
                .getPublicUrl(category.icon)
                .data?.publicUrl;
            }
          }
          return {
            ...category,
            iconUrl
          };
        })
      );

      setCategories(categoriesWithIcons);
    } catch (error) {
      console.error('Error:', error);
    }
  };

  // Fetch banners from Supabase
  const fetchBanners = async () => {
    try {
      const { data, error } = await supabase
        .from('banners')
        .select('*'); // Fetch all columns including sku

      if (error) {
        console.error('Error fetching banners:', error);
        return;
      }

      setBanners(data); // Store the full banner objects instead of just URLs
    } catch (error) {
      console.error('Error:', error);
    }
  };

  // Update the initialization useEffect
  useEffect(() => {
    const initialize = async () => {
      try {
        // First convert and set user info
        if (user) {
          if (typeof user === 'string') {
            setUserInfo(JSON.parse(user));
          } else {
            setUserInfo(user);
          }
        }
      } catch (error) {
        console.error('Error converting user:', error);
      }
    };

    initialize();
  }, [user]); // Depend on user prop

  // Add new useEffect to fetch data after userInfo is set
  useEffect(() => {
    const fetchData = async () => {
      if (!userInfo?.id) return; // Wait for userInfo to be set

      try {
        await Promise.all([
          fetchCategories(),
          fetchBanners(),
          fetchNewProducts()
        ]);
      } catch (error) {
        console.error('Error fetching initial data:', error);
      }
    };

    fetchData();
  }, [userInfo]); // This will run whenever userInfo changes

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

  // Update fetchNewProducts function
  const fetchNewProducts = async () => {
    try {
      if (!userInfo?.id) return;

      // First get user VIP status and verification status
      const { data: userData, error: userError } = await supabase
        .from('users')
        .select('is_vip, is_verified')
        .eq('id', userInfo.id)
        .single();

      if (userError) {
        console.error("Error fetching user status:", userError);
        return;
      }

      setIsVipUser(userData?.is_vip || false);
      setIsVerified(userData?.is_verified || false);

      const { data: productsData, error: productsError } = await supabase
        .from('products')
        .select(`
          *,
          categories:category_id (title)
        `)
        .eq('isnew', true)
        .order('created_at', { ascending: false });

      if (productsError) {
        console.error('Error fetching new products:', productsError);
        return;
      }

      const productsWithImages = await Promise.all(
        productsData.map(async (product) => {
          let imageUrl = null;
          if (product.image_url) {
            if (product.image_url.startsWith('http')) {
              imageUrl = product.image_url;
            } else {
              imageUrl = supabase.storage
                .from('product-images')
                .getPublicUrl(product.image_url)
                .data?.publicUrl;
            }
          }

          return {
            ...product,
            imageUrl,
            category: product.categories?.title || "غير مصنف",
            quantity: product.vip && !userData?.is_vip ? 0 : product.quantity,
            price: userData?.is_verified ? product.price : null,
            oldprice: userData?.is_verified ? product.oldprice : null,
            isVipProduct: product.vip || false
          };
        })
      );

      setProducts(productsWithImages);
      setFoundItems(productsWithImages);
    } catch (error) {
      console.error('Error fetching new products:', error);
    }
  };

  //method to convert the authUser to json object
  const convertToJSON = (obj) => {
    try {
      setUserInfo(JSON.parse(obj));
    } catch (e) {
      setUserInfo(obj);
    }
  };

  //method to navigate to product detail screen of a specific product
  const handleProductPress = (product) => {
    navigation.navigate("productdetail", { product: product });
  };

  //method to add to cart (redux)
  const handleAddToCat = async (product) => {
    try {
      if (!userInfo?.id) {
        setError("يرجى تسجيل الدخول لإضافة المنتجات إلى السلة");
        setAlertType("error");
        return;
      }

      // Check if user is verified and VIP status
      const { data: userData, error: userError } = await supabase
        .from('users')
        .select('is_verified, is_vip')
        .eq('id', userInfo.id)
        .single();

      if (userError) {
        console.error("Error checking user status:", userError);
        return;
      }

      if (!userData.is_verified) {
        setError("يرجى تفعيل حسابك أولاً للتمكن من الشراء");
        setAlertType("error");
        setTimeout(() => {
          setError("");
        }, 2000);
        return;
      }

      // Check VIP product access
      if (product.vip && !userData.is_vip) {
        setError("هذا المنتج متاح فقط لأعضاء VIP");
        setAlertType("error");
        setTimeout(() => {
          setError("");
        }, 2000);
        return;
      }

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
        setAlertType("error");
        return;
      }

      // Check max purchase limit
      if (product.max !== null) {
        const currentQuantity = existingCartItem ? existingCartItem.quantity : 0;
        if (currentQuantity >= product.max) {
          setError(`لا يمكن شراء أكثر من ${product.max} قطع من هذا المنتج`);
          setAlertType("error");
          setTimeout(() => {
            setError("");
          }, 2000);
          return;
        }
      }

      if (existingCartItem) {
        // Check if adding one more would exceed the max
        if (product.max !== null && existingCartItem.quantity >= product.max) {
          setError(`لا يمكن شراء أكثر من ${product.max} قطع من هذا المنتج`);
          setAlertType("error");
          setTimeout(() => {
            setError("");
          }, 2000);
          return;
        }

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
          setAlertType("error");
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
          setAlertType("error");
          return;
        }
      }

      // Update Redux state
      addCartItem(product);
      fetchCartCount();
      
      // Show success message temporarily
      setError("تمت الإضافة إلى السلة بنجاح");
      setAlertType("success");
      setTimeout(() => {
        setError("");
        setAlertType("error");
      }, 2000);

    } catch (error) {
      console.error("Error:", error);
      setError("حدث خطأ أثناء الإضافة إلى السلة");
      setAlertType("error");
    }
  };

  //method call on pull refresh
  const handleOnRefresh = () => {
    setRefreshing(true);
    fetchNewProducts();
    setRefreshing(false);
  };

  // Add this useEffect at the top level of your component
  useEffect(() => {
    // Function to update last online status
    const updateOnlineStatus = async () => {
      const timestamp = new Date().toISOString();
      
      const { error } = await supabase
        .from('user_activity')
        .upsert(
          { 
            user_id: user.id,
            activity_type: 'home_visit',
            timestamp: timestamp
          },
          { 
            onConflict: 'user_id',  // This ensures one record per user
            update: { timestamp: timestamp }  // Only update the timestamp
          }
        );

      if (error) {
        console.error('Error updating online status:', error);
      }
    };

    // Call it when component mounts
    updateOnlineStatus();

    // Set up interval to update status every 5 minutes
    const interval = setInterval(updateOnlineStatus, 5 * 60 * 1000);

    // Cleanup on unmount
    return () => clearInterval(interval);
  }, [user.id]);

  // Add function to handle banner click
  const handleBannerClick = async (banner) => {
    if (banner.sku) {
      try {
        // Fetch product by SKU
        const { data: product, error } = await supabase
          .from('products')
          .select('*')
          .eq('sku', banner.sku)
          .single();

        if (error) {
          console.error('Error fetching product:', error);
          return;
        }

        if (product) {
          navigation.navigate("productdetail", { product: product });
        }
      } catch (error) {
        console.error('Error handling banner click:', error);
      }
    }
  };

  // Add this new function to fetch cart count
  const fetchCartCount = async () => {
    if (!userInfo?.id) return;

    try {
      const { data, error } = await supabase
        .from('cart_products')
        .select('id')
        .eq('user_id', userInfo.id);

      if (error) {
        console.error('Error fetching cart count:', error);
        return;
      }

      setCartCount(data.length);
    } catch (error) {
      console.error('Error:', error);
    }
  };

  // Add this useFocusEffect to update cart count when screen is focused
  useFocusEffect(
    React.useCallback(() => {
      fetchCartCount();
    }, [userInfo?.id])
  );

  // Add this new function to handle search
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

      if (error) {
        console.error('Error searching products:', error);
        return;
      }

      const resultsWithImages = await Promise.all(
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
            imageUrl
          };
        })
      );

      setSearchResults(resultsWithImages);
      setShowSearchResults(true);
    } catch (error) {
      console.error('Error:', error);
    }
  };

  // Update the search bar component
  const renderSearchBar = () => (
    <View style={styles.searchContainer}>
      <View style={styles.searchBar}>
        <View style={styles.searchLeft}>
          <Ionicons name="search" size={20} color={colors.muted} />
          <TextInput
            style={styles.searchInput}
            placeholder="ابحث عن منتجات..."
            placeholderTextColor={colors.muted}
            value={searchQuery}
            onChangeText={handleSearch}
          />
        </View>
        {searchQuery.length > 0 && (
          <TouchableOpacity 
            onPress={() => {
              setSearchQuery('');
              setSearchResults([]);
              setShowSearchResults(false);
            }}
            style={styles.clearButton}
          >
            <Ionicons name="close-circle" size={20} color={colors.muted} />
          </TouchableOpacity>
        )}
      </View>

      {/* Search Results Dropdown */}
      {showSearchResults && searchResults.length > 0 && (
        <View style={styles.searchResults}>
          {searchResults.map((result) => (
            <TouchableOpacity
              key={result.id}
              style={styles.searchResultItem}
              onPress={() => {
                navigation.navigate("productdetail", { product: result });
                setSearchQuery('');
                setSearchResults([]);
                setShowSearchResults(false);
              }}
            >
              <Image 
                source={{ uri: result.imageUrl }}
                style={styles.searchResultImage}
              />
              <View style={styles.searchResultInfo}>
                <Text style={styles.searchResultTitle} numberOfLines={2}>
                  {result.title}
                </Text>
                <Text style={styles.searchResultPrice}>
                  {result.isVipProduct && !isVipUser ? 'منتج VIP' : result.price ? `${result.price} دج` : ''}
                </Text>
              </View>
            </TouchableOpacity>
          ))}
        </View>
      )}
    </View>
  );

  return (
    <Provider>
      <View style={styles.container}>
        <StatusBar backgroundColor={colors.white} barStyle="dark-content" />
        
        {/* Header */}
        <View style={styles.header}>
          {/* Top Bar */}
          <View style={styles.topBar}>
            <TouchableOpacity 
              style={styles.cartButton} 
              onPress={() => navigation.navigate("cart")}
            >
              {cartCount > 0 && (
                <View style={styles.badge}>
                  <Text style={styles.badgeText}>{cartCount}</Text>
                </View>
              )}
              <Ionicons name="cart-outline" size={24} color={colors.dark} />
            </TouchableOpacity>
            
            <Image source={easybuylogo} style={styles.logo} />
            
            <TouchableOpacity 
              onPress={() => navigation.navigate("user", { user: userInfo })}
            >
              <Ionicons name="person-outline" size={24} color={colors.dark} />
            </TouchableOpacity>
          </View>

          {/* Search Bar */}
          {renderSearchBar()}

          {/* Quick Links */}
          <ScrollView 
            horizontal 
            showsHorizontalScrollIndicator={false}
            style={styles.quickLinks}
          >
             {[
              { 
                label: "خصومات", 
                icon: "pricetag-outline",
                onPress: () => navigation.navigate("discounts", { user })
              },
              { 
                label: "الأكثر مبيعاً", 
                icon: "trending-up-outline",
                onPress: () => navigation.navigate("bestsellers", { user })
              },
              { 
                label: "جديد", 
                icon: "star-outline",
                onPress: () => navigation.navigate("newproducts", { user })
              },
              { 
                label: "الكل", 
                icon: "grid-outline",
               
              },
              
             
            ].map((item, index) => (
              <TouchableOpacity 
                key={index} 
                style={[
                  styles.quickLink,
                  index === 3 && styles.activeQuickLink
                ]}
                onPress={item.onPress}
              >
                <Ionicons 
                  name={item.icon} 
                  size={16} 
                  color={index === 3 ? colors.primary : colors.dark}
                />
                <Text style={[
                  styles.quickLinkText,
                  index === 3 && styles.activeQuickLinkText
                ]}>
                  {item.label}
                </Text>
              </TouchableOpacity>
            ))}
          </ScrollView>
        </View>

        <ScrollView 
          refreshControl={
            <RefreshControl refreshing={refeshing} onRefresh={handleOnRefresh} />
          }
          showsVerticalScrollIndicator={false}
        >
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

          {/* Banner Slider */}
          <View style={styles.sliderContainer}>
            <SliderBox
              images={banners.map(banner => banner.image_url)}
              sliderBoxHeight={140}
              dotColor={colors.primary}
              inactiveDotColor={colors.muted}
              autoplay
              circleLoop
              resizeMode="cover"
              dotStyle={styles.sliderDot}
              ImageComponentStyle={styles.sliderImage}
              onCurrentImagePressed={(index) => handleBannerClick(banners[index])}
              parentWidth={Dimensions.get('window').width}
              disableOnPress={false}
              autoplayInterval={6000}
              paginationBoxStyle={{
                alignItems: "center",
                alignSelf: "center",
                justifyContent: "center",
                marginTop: -20
              }}
            />
          </View>

          {/* Brand Logos */}
          <View style={styles.brandsContainer}>
            <LinearGradient
              colors={['rgba(255,255,255,0.9)', 'rgba(255,255,255,0.95)', 'rgba(255,255,255,0.9)']}
              style={styles.brandsGradient}
            >
              {[
                { 
                  name: 'Palmary', 
                  logo: require('../../assets/brands/palmary.png'),
                  backgroundColor: '#FFE8E8',
                  route: 'PalmaryProducts'
                },
                { 
                  name: 'Bifa', 
                  logo: require('../../assets/brands/bifa.png'),
                  backgroundColor: '#E8F4FF',
                  route: 'BifaProducts'
                },
                { 
                  name: 'Bimo', 
                  logo: require('../../assets/brands/bimo.png'),
                  backgroundColor: '#FFF0E8',
                  route: 'BimoProducts'
                },
              ].map((brand, index) => (
                <TouchableOpacity 
                  key={index} 
                  style={[styles.brandItem, { backgroundColor: brand.backgroundColor }]}
                  onPress={() => navigation.navigate(brand.route, { user: user })}
                >
                  <Image 
                    source={brand.logo}
                    style={styles.brandLogo}
                    resizeMode="contain"
                  />
                  <View style={styles.brandShine} />
                </TouchableOpacity>
              ))}
            </LinearGradient>
          </View>

          {/* Categories */}
          <View style={styles.section}>
            <View style={styles.sectionHeader}>
              <TouchableOpacity 
                onPress={() => navigation.navigate("categories", { 
                  user: userInfo,
                  source: 'categoryList'
                })}
              >
                <Text style={styles.seeAll}>عرض الكل</Text>
              </TouchableOpacity>
              <Text style={styles.sectionTitle}>الأصناف</Text>
            </View>
            
            <ScrollView 
              horizontal 
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.categoriesContainer}
            >
              {categories.map((category, index) => (
                <TouchableOpacity 
                  key={index}
                  style={styles.categoryCard}
                  onPress={() => navigation.navigate("categories", {
                    user: userInfo,
                    categoryID: category.id,
                    selectedCategory: category,
                    source: 'categoryList'
                  })}
                >
                  <Image 
                    source={{ uri: category.iconUrl }}
                    style={styles.categoryImage}
                    resizeMode="contain"
                  />
                  <Text style={styles.categoryTitle}>{category.title}</Text>
                </TouchableOpacity>
              ))}
            </ScrollView>
          </View>

          {/* New Products */}
          <View style={styles.section}>
            <View style={styles.sectionHeader}>
              <TouchableOpacity 
                onPress={() => navigation.navigate("newproducts", { 
                  user: userInfo,
                  title: "منتجات جديدة"
                })}
              >
                <Text style={styles.seeAll}>عرض الكل</Text>
              </TouchableOpacity>
              <Text style={styles.sectionTitle}>منتجات جديدة</Text>
            </View>

            <View style={styles.productsGrid}>
              {products.map((product) => (
                <TouchableOpacity 
                  key={product._id}
                  style={styles.productCard}
                  onPress={() => handleProductPress(product)}
                >
                  <Image 
                    source={{ uri: product.imageUrl }}
                    style={styles.productImage}
                  />
                  {isVerified && product.issold && (
                    <View style={styles.discountBadge}>
                      <Text style={styles.discountText}>
                        -{Math.round(((product.oldprice - product.price) / product.oldprice) * 100)}%
                      </Text>
                    </View>
                  )}
                  <View style={styles.productInfo}>
                    <Text numberOfLines={2} style={styles.productTitle}>
                      {product.title}
                    </Text>
                    {isVerified ? (
                      <View style={styles.priceRow}>
                        {product.oldprice && (
                          <Text style={styles.oldPrice}>{product.oldprice} دج</Text>
                        )}
                        <Text style={styles.price}>{product.price} دج</Text>
                      </View>
                    ) : (
                      <Text style={styles.verificationText}>
                        يرجى تفعيل الحساب لرؤية السعر
                      </Text>
                    )}
                    {product.quantity > 0 ? (
                      <TouchableOpacity 
                        style={[
                          styles.addToCartButton,
                          (!isVerified || (product.isVipProduct && !isVipUser)) && styles.disabledButton
                        ]}
                        onPress={() => handleAddToCat(product)}
                        disabled={!isVerified || (product.isVipProduct && !isVipUser)}
                      >
                        <Ionicons name="cart-outline" size={16} color={colors.white} />
                        <Text style={styles.addToCartText}>
                          {!isVerified ? 'يرجى تفعيل الحساب' :
                           product.isVipProduct && !isVipUser ? 'منتج VIP فقط' : 
                           'أضف للسلة'}
                        </Text>
                      </TouchableOpacity>
                    ) : (
                      <View style={styles.outOfStockButton}>
                        <Text style={styles.outOfStockText}>نفذت الكمية</Text>
                      </View>
                    )}
                  </View>
                </TouchableOpacity>
              ))}
            </View>
          </View>
        </ScrollView>
      </View>
    </Provider>
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
    borderBottomWidth: 1,
    borderBottomColor: colors.light,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 3,
    zIndex: 9999,
    position: 'relative',
  },
  topBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 15,
    paddingVertical: 0,
  },
  logo: {
    height: 70,
    width: 200,
    resizeMode: 'contain',
  },
  cartButton: {
    position: 'relative',
  },
  badge: {
    position: 'absolute',
    top: -8,
    right: -8,
    backgroundColor: colors.primary,
    borderRadius: 10,
    minWidth: 18,
    height: 18,
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 1,
    borderWidth: 1.5,
    borderColor: colors.white,
  },
  badgeText: {
    color: colors.white,
    fontSize: 10,
    fontWeight: 'bold',
  },
  searchContainer: {
    position: 'relative',
    zIndex: 1000,
  },
  searchBar: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.white,
    borderRadius: 12,
    paddingHorizontal: 15,
    paddingVertical: 8,
    marginHorizontal: 15,
    marginVertical: 10,
    elevation: 2,
  },
  searchLeft: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
  },
  searchInput: {
    flex: 1,
    marginLeft: 8,
    fontSize: 14,
    color: colors.dark,
    textAlign: 'right',
  },
  searchResults: {
    position: 'absolute',
    top: '100%',
    left: 15,
    right: 15,
    backgroundColor: colors.white,
    borderRadius: 12,
    paddingVertical: 5,
    elevation: 4,
    maxHeight: 300,
    zIndex: 1000,
  },
  searchResultItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 10,
    borderBottomWidth: 1,
    borderBottomColor: colors.light,
  },
  searchResultImage: {
    width: 50,
    height: 50,
    borderRadius: 8,
    marginRight: 10,
  },
  searchResultInfo: {
    flex: 1,
  },
  searchResultTitle: {
    fontSize: 14,
    color: colors.dark,
    marginBottom: 4,
    textAlign: 'right',
  },
  searchResultPrice: {
    fontSize: 12,
    color: colors.primary,
    fontWeight: 'bold',
    textAlign: 'right',
  },
  clearButton: {
    padding: 5,
  },
  quickLinks: {
    paddingHorizontal: 10,
    paddingBottom: 10,
  },
  quickLink: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: colors.light,
    marginRight: 12,
    marginVertical: 5,
    elevation: 1,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 1,
    },
    shadowOpacity: 0.1,
    shadowRadius: 1,
  },
  activeQuickLink: {
    backgroundColor: colors.primary + '20', // 20% opacity
  },
  quickLinkText: {
    marginLeft: 5,
    fontSize: 12,
    color: colors.dark,
  },
  activeQuickLinkText: {
    color: colors.primary,
    fontWeight: '600',
  },
  sliderContainer: {
    marginTop: 10,
    width: '100%',
  },
  sliderImage: {
    borderRadius: 10,
    width: '94%',
    marginHorizontal: '3%',
  },
  sliderDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    marginHorizontal: 3,
  },
  quickActions: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    padding: 15,
    backgroundColor: colors.white,
    marginVertical: 10,
  },
  quickActionItem: {
    alignItems: 'center',
  },
  quickActionIcon: {
    width: 50,
    height: 50,
    borderRadius: 25,
    backgroundColor: colors.light,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 5,
  },
  quickActionLabel: {
    fontSize: 12,
    color: colors.dark,
  },
  section: {
    padding: 15,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 15,
    paddingHorizontal: 5,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: colors.dark,
    letterSpacing: 0.5,
  },
  seeAll: {
    color: colors.primary,
    fontSize: 14,
  },
  categoriesContainer: {
    paddingVertical: 10,
    paddingHorizontal: 15,
  },
  categoryCard: {
    alignItems: 'center',
    marginRight: 20,
    backgroundColor: colors.white,
    padding: 12,
    borderRadius: 14,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 3,
    minWidth: 80,
  },
  categoryImage: {
    width: 55,
    height: 55,
    marginBottom: 8,
    backgroundColor: colors.light,
    borderRadius: 28,
    padding: 5,
  },
  categoryTitle: {
    fontSize: 12,
    color: colors.dark,
    textAlign: 'center',
    fontWeight: '500',
  },
  productsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
  },
  productCard: {
    width: '48%',
    backgroundColor: colors.white,
    borderRadius: 12,
    marginBottom: 15,
    overflow: 'hidden',
    elevation: 3,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 3,
  },
  productImage: {
    width: '100%',
    height: 160,
    resizeMode: 'cover',
    backgroundColor: colors.light,
  },
  discountBadge: {
    position: 'absolute',
    top: 8,
    left: 8,
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
  productInfo: {
    padding: 12,
  },
  productTitle: {
    fontSize: 14,
    color: colors.dark,
    marginBottom: 8,
    textAlign: 'right',
  },
  priceRow: {
    flexDirection: 'row-reverse',
    alignItems: 'center',
    justifyContent: 'flex-start',
    marginBottom: 8,
  },
  price: {
    fontSize: 16,
    fontWeight: 'bold',
    color: colors.primary,
  },
  oldPrice: {
    fontSize: 13,
    color: colors.muted,
    textDecorationLine: 'line-through',
    marginLeft: 8,
  },
  addToCartButton: {
    flexDirection: 'row-reverse',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.primary,
    paddingVertical: 8,
    borderRadius: 8,
    marginTop: 5,
  },
  addToCartText: {
    color: colors.white,
    fontSize: 12,
    marginRight: 5,
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
  brandsContainer: {
    marginHorizontal: 15,
    marginVertical: 20,
    borderRadius: 15,
    overflow: 'hidden',
    elevation: 3,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 3.84,
  },
  brandsGradient: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    alignItems: 'center',
    padding: 15,
  },
  brandItem: {
    alignItems: 'center',
    justifyContent: 'center',
    width: '28%',
    aspectRatio: 1,
    borderRadius: 12,
    padding: 10,
    position: 'relative',
    overflow: 'hidden',
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 1,
    },
    shadowOpacity: 0.1,
    shadowRadius: 2,
  },
  brandLogo: {
    width: '85%',
    height: '85%',
    transform: [{ scale: 0.9 }],
  },
  brandShine: {
    position: 'absolute',
    top: -50,
    left: -50,
    width: 100,
    height: 100,
    backgroundColor: 'rgba(255,255,255,0.3)',
    transform: [{ rotate: '45deg' }],
    borderRadius: 50,
    opacity: 0.5,
  },
  outOfStockButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.muted + '20',
    paddingVertical: 8,
    borderRadius: 8,
    marginTop: 5,
  },
  outOfStockText: {
    color: colors.muted,
    fontSize: 12,
    fontWeight: '500',
  },
  verificationText: {
    color: colors.danger,
    fontSize: 12,
    textAlign: 'center',
    fontStyle: 'italic',
    marginVertical: 8,
  },
  disabledButton: {
    backgroundColor: colors.muted,
    opacity: 0.8,
  },
});

export default HomeScreen;