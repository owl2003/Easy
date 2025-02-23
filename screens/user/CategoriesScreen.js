import {
  StyleSheet,
  Image,
  TouchableOpacity,
  View,
  StatusBar,
  Text,
  FlatList,
  RefreshControl,
  Dimensions,
  ActivityIndicator,
  ScrollView,
} from "react-native";
import React, { useState, useEffect } from "react";
import { Ionicons } from "@expo/vector-icons";
import { colors } from "../../constants";
import { useSelector, useDispatch } from "react-redux";
import { bindActionCreators } from "redux";
import * as actionCreaters from "../../states/actionCreaters/actionCreaters";
import ProductCard from "../../components/ProductCard/ProductCard";
import CustomInput from "../../components/CustomInput";
import { supabase } from "../../supabase"; // Import from your supabase.js file
import { LinearGradient } from 'expo-linear-gradient';
import { useFocusEffect } from '@react-navigation/native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { I18nManager } from 'react-native';

I18nManager.allowRTL(false);
I18nManager.forceRTL(false);

const CategoriesScreen = ({ navigation, route }) => {
  // Get the source of navigation and category info from route params
  const { categoryID, selectedCategory: initialCategory, source } = route.params || {};
  const scrollViewRef = React.useRef(null);

  const [isLoading, setLoading] = useState(true);
  const [products, setProducts] = useState([]);
  const [refreshing, setRefreshing] = useState(false);
  const [label, setLabel] = useState("Loading...");
  const [error, setError] = useState("");
  const [foundItems, setFoundItems] = useState([]);
  const [filterItem, setFilterItem] = useState("");
  const [categories, setCategories] = useState([]); // State for categories
  const [selectedCategory, setSelectedCategory] = useState(initialCategory || null);

  // Get the dimensions of the active window
  const [windowWidth, setWindowWidth] = useState(Dimensions.get("window").width);
  const windowHeight = Dimensions.get("window").height;

  // Initialize the cartproduct with redux data
  const cartproduct = useSelector((state) => state.product);
  const dispatch = useDispatch();
  const { addCartItem } = bindActionCreators(actionCreaters, dispatch);

  // Add this state to track measurements
  const [categoryLayouts, setCategoryLayouts] = useState({});

  // Add this state to track user information
  const [userInfo, setUserInfo] = useState({});

  // Add this state to track alert type
  const [alertType, setAlertType] = useState("error");

  // Add cartCount state near other states
  const [cartCount, setCartCount] = useState(0);

  // Add these states at the top with other states
  const [page, setPage] = useState(0);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const [hasMore, setHasMore] = useState(true);
  const ITEMS_PER_PAGE = 6;

  // Add this state to track loaded products for each category
  const [categoryProducts, setCategoryProducts] = useState({});

  // Add these states
  const [allProducts, setAllProducts] = useState({}); // Store all products by category
  const [displayedProducts, setDisplayedProducts] = useState([]); // Products currently shown
  const DISPLAY_PER_PAGE = 6;

  // Add this state to track user verification status
  const [isVerified, setIsVerified] = useState(false);

  // Add this function to measure category button positions
  const measureLayout = (event, categoryId) => {
    const { x, width } = event.nativeEvent.layout;
    setCategoryLayouts(prev => ({
      ...prev,
      [categoryId]: { x, width }
    }));
  };

  // Update the scrollToSelectedCategory function with a better approach
  const scrollToSelectedCategory = (category) => {
    if (scrollViewRef.current && category) {
      const layout = categoryLayouts[category.id];
      if (layout) {
        const { width: screenWidth } = Dimensions.get('window');
        const scrollPosition = Math.max(0, layout.x - (screenWidth / 2) + (layout.width / 2));
        
        requestAnimationFrame(() => {
          scrollViewRef.current.scrollTo({
            x: scrollPosition,
            animated: true
          });
        });
      }
    }
  };

  // Update fetchCategories function
  const fetchCategories = async () => {
    try {
      const { data, error } = await supabase
        .from('categories')
        .select('*')
        .order('title');

      if (error) {
        console.error('Error fetching categories:', error);
        return;
      }

      setCategories(data);
      
      // If we have a categoryID from route params, find and select that category
      if (categoryID) {
        const selectedCat = data.find(cat => cat.id === categoryID);
        if (selectedCat) {
          setSelectedCategory(selectedCat);
          // Delay scrolling to ensure the ScrollView is ready
          setTimeout(() => scrollToSelectedCategory(selectedCat), 100);
        }
      }
    } catch (error) {
      console.error('Error in fetchCategories:', error);
    }
  };

  // Update fetchProducts to get all products at once
  const fetchProducts = async (categoryId = null, pageNumber = 0) => {
    try {
      if (pageNumber === 0 && !refreshing) {
        setLoading(true);
      }
      
      let isVipUser = false;
      if (userInfo?.id) {
        const { data: userData, error: userError } = await supabase
          .from('users')
          .select('is_vip')
          .eq('id', userInfo.id)
          .single();

        if (!userError) {
          isVipUser = userData?.is_vip;
        }
      }

      // Fetch all products for the category
      let query = supabase
        .from('products')
        .select(`
          *,
          categories:category_id (title)
        `);
      
      if (categoryId) {
        query = query.eq('category_id', categoryId);
      }

      const { data, error } = await query;
      if (error) throw error;

      const productsWithImages = await Promise.all(
        data.map(async (product) => {
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
            quantity: product.vip && !isVipUser ? 0 : product.quantity
          };
        })
      );

      const categoryKey = categoryId || 'all';
      
      // Store all products
      setAllProducts(prev => ({
        ...prev,
        [categoryKey]: productsWithImages
      }));

      // Display initial batch
      const initialProducts = productsWithImages.slice(0, DISPLAY_PER_PAGE);
      setProducts(initialProducts);
      setFoundItems(initialProducts);
      setHasMore(productsWithImages.length > DISPLAY_PER_PAGE);

    } catch (error) {
      console.error('Error:', error);
      setError('An error occurred while fetching products');
    } finally {
      setLoading(false);
      setIsLoadingMore(false);
    }
  };

  // Method to navigate to product detail screen of specific product
  const handleProductPress = (product) => {
    navigation.navigate("productdetail", { product: product });
  };

  // Add this method to convert user to JSON
  const convertToJSON = (obj) => {
    try {
      setUserInfo(JSON.parse(obj));
    } catch (e) {
      setUserInfo(obj);
    }
  };

  // Add this function to fetch cart count
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

  // Update the handleAddToCat method to check max limit
  const handleAddToCat = async (product) => {
    try {
      if (!userInfo?.id) {
        setError("يرجى تسجيل الدخول لإضافة المنتجات إلى السلة");
        setAlertType("error");
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

  // Method call on pull refresh
  const handleOnRefresh = () => {
    setRefreshing(true);
    if (selectedCategory) {
      fetchProducts(selectedCategory.id).then(() => setRefreshing(false)); // Use `id` instead of `_id`
    }
  };

  // Update search filter to work with all products
  const filter = () => {
    const keyword = filterItem.toLowerCase();
    const categoryKey = selectedCategory?.id || 'all';
    const productsToFilter = allProducts[categoryKey] || [];

    if (keyword !== "") {
      const filtered = productsToFilter.filter((product) => 
        product?.title.toLowerCase().includes(keyword)
      );
      setFoundItems(filtered.slice(0, DISPLAY_PER_PAGE));
      setHasMore(filtered.length > DISPLAY_PER_PAGE);
    } else {
      setFoundItems(productsToFilter.slice(0, DISPLAY_PER_PAGE));
      setHasMore(productsToFilter.length > DISPLAY_PER_PAGE);
    }
  };

  // Render whenever the value of filterItem changes
  useEffect(() => {
    filter();
  }, [filterItem, selectedCategory]);

  // Fetch categories when the component mounts
  useEffect(() => {
    fetchCategories();
  }, [categoryID]);

  // Update useEffect for category changes
  useEffect(() => {
    if (selectedCategory) {
      fetchProducts(selectedCategory.id);
    } else {
      // Fetch all products when no category is selected
      fetchProducts();
    }
  }, [selectedCategory]);

  // Add useEffect to convert user to JSON on initial render
  useEffect(() => {
    if (route.params?.user) {
      convertToJSON(route.params.user);
    }
  }, []);

  // Add useEffect to fetch user verification status
  useEffect(() => {
    if (userInfo?.id) {
      fetchUserVerificationStatus();
    }
  }, [userInfo]);

  // Add function to fetch user verification status
  const fetchUserVerificationStatus = async () => {
    try {
      if (!userInfo?.id) return;
      
      const { data, error } = await supabase
        .from('users')
        .select('is_verified')
        .eq('id', userInfo.id)
        .single();

      if (error) throw error;
      setIsVerified(data?.is_verified || false);
    } catch (error) {
      console.error('Error fetching user verification status:', error);
    }
  };

  // Update useFocusEffect to restore previous products
  useFocusEffect(
    React.useCallback(() => {
      const initializeScreen = async () => {
        try {
          const value = await AsyncStorage.getItem("authUser");
          if (value) {
            const parsedUser = typeof value === 'string' ? JSON.parse(value) : value;
            setUserInfo(parsedUser);
          }

          // Fetch categories if needed
          if (categories.length === 0) {
            await fetchCategories();
          }

          // Restore products for current category
          const categoryKey = selectedCategory?.id || 'all';
          const existingProducts = categoryProducts[categoryKey];
          
          if (existingProducts?.length > 0) {
            // Restore existing products
            setProducts(existingProducts);
            setFoundItems(existingProducts);
          } else {
            // Fetch initial products if none exist
            await fetchProducts(selectedCategory?.id, 0);
          }

          if (userInfo?.id) {
            await fetchCartCount();
          }
        } catch (error) {
          console.error('Error initializing screen:', error);
          setError('حدث خطأ في تحميل البيانات');
        }
      };

      initializeScreen();
    }, [selectedCategory?.id])
  );

  // Update handleLoadMore to display more from cached products
  const handleLoadMore = () => {
    if (!isLoadingMore && hasMore && !isLoading) {
      const categoryKey = selectedCategory?.id || 'all';
      const allCategoryProducts = allProducts[categoryKey] || [];
      const currentLength = foundItems.length;
      
      if (currentLength < allCategoryProducts.length) {
        const nextBatch = allCategoryProducts.slice(
          currentLength,
          currentLength + DISPLAY_PER_PAGE
        );
        
        setProducts(prev => [...prev, ...nextBatch]);
        setFoundItems(prev => [...prev, ...nextBatch]);
        setHasMore(currentLength + DISPLAY_PER_PAGE < allCategoryProducts.length);
      } else {
        setHasMore(false);
      }
    }
  };

  // Update category selection handler
  const handleCategorySelect = (category) => {
    setPage(0);
    setSelectedCategory(category);
    scrollToSelectedCategory(category);
    
    const categoryKey = category?.id || 'all';
    if (allProducts[categoryKey]) {
      // If we already have the products, just display the first batch
      const initialProducts = allProducts[categoryKey].slice(0, DISPLAY_PER_PAGE);
      setProducts(initialProducts);
      setFoundItems(initialProducts);
      setHasMore(allProducts[categoryKey].length > DISPLAY_PER_PAGE);
    } else {
      // If we don't have the products yet, fetch them
      fetchProducts(category?.id, 0);
    }
  };

  return (
    <View style={styles.container}>
      <StatusBar backgroundColor={colors.primary} barStyle="light-content" />
      
      <LinearGradient
        colors={[colors.primary, colors.primary + 'E6']}
        style={styles.header}
      >
        <View style={styles.headerContent}>
         
          
          <Text style={styles.headerTitle}>التصنيفات</Text>
          
          <TouchableOpacity 
            style={styles.headerButton}
            onPress={() => isVerified && navigation.navigate("cart")}
          >
            {cartCount > 0 && (
              <View style={styles.badge}>
                <Text style={styles.badgeText}>{cartCount}</Text>
              </View>
            )}
            <Ionicons 
              name="cart-outline" 
              size={24} 
              color={isVerified ? colors.white : colors.light_grey} 
            />
          </TouchableOpacity>
        </View>

        <View style={styles.searchContainer}>
          <CustomInput
            radius={12}
            placeholder="البحث عن منتج..."
            value={filterItem}
            setValue={setFilterItem}
            leftIcon={<Ionicons name="search" size={20} color={colors.muted} />}
          />
        </View>
      </LinearGradient>

      <View style={styles.categoriesContainer}>
        <ScrollView 
          ref={scrollViewRef}
          horizontal 
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.categoriesList}
        >
          {[...categories].reverse().map((category) => (
            <TouchableOpacity
              key={category.id}
              style={[
                styles.categoryButton,
                selectedCategory?.id === category.id && styles.categoryButtonActive
              ]}
              onPress={() => handleCategorySelect(category)}
              onLayout={(e) => measureLayout(e, category.id)}
            >
              <Text style={[
                styles.categoryButtonText,
                selectedCategory?.id === category.id && styles.categoryButtonTextActive
              ]}>
                {category.title}
              </Text>
            </TouchableOpacity>
          ))}
          
          <TouchableOpacity
            style={[
              styles.categoryButton,
              !selectedCategory && styles.categoryButtonActive
            ]}
            onPress={() => handleCategorySelect(null)}
            onLayout={(e) => measureLayout(e, 'all')}
          >
            <Ionicons 
              name="apps" 
              size={24} 
              color={!selectedCategory ? colors.white : colors.primary} 
            />
            <Text style={[
              styles.categoryButtonText,
              !selectedCategory && styles.categoryButtonTextActive
            ]}>
              الكل
            </Text>
          </TouchableOpacity>
        </ScrollView>
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

      <FlatList
        data={foundItems}
        numColumns={2}
        showsVerticalScrollIndicator={false}
        keyExtractor={(item) => item.id.toString()}
        contentContainerStyle={styles.productsList}
        columnWrapperStyle={styles.productsRow}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={handleOnRefresh} />
        }
        onEndReached={handleLoadMore}
        onEndReachedThreshold={0.5}
        ListEmptyComponent={() => (
          <View style={styles.centerContainer}>
            <Ionicons name="cube-outline" size={80} color={colors.muted} />
            <Text style={styles.emptyText}>لا توجد منتجات في هذا التصنيف</Text>
          </View>
        )}
        ListFooterComponent={() => (
          isLoadingMore ? (
            <View style={styles.footerLoader}>
              <ActivityIndicator size="small" color={colors.primary} />
            </View>
          ) : null
        )}
        renderItem={({ item }) => (
          <View style={styles.productWrapper}>
            <ProductCard
              cardSize="large"
              name={item.title}
              price={isVerified ? item.price : ''}
              oldPrice={isVerified ? item.oldprice : ''}
              image={item.imageUrl}
              quantity={item.quantity}
              isSold={item.issold}
              onPress={() => navigation.navigate("productdetail", { product: item })}
              onPressSecondary={() => handleAddToCat(item)}
            />
          </View>
        )}
      />
    </View>
  );
};

export default CategoriesScreen;

// Styles
const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.light,
  },
  header: {
    paddingTop: StatusBar.currentHeight + 10,
    borderBottomLeftRadius: 25,
    borderBottomRightRadius: 25,
    elevation: 5,
    shadowColor: colors.dark,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 5,
  },
  headerContent: {
    flexDirection: 'row-reverse',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 15,
    marginBottom: 15,
  },
  headerButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(255,255,255,0.2)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: colors.white,
  },
  badge: {
    position: 'absolute',
    top: -5,
    right: -5,
    backgroundColor: colors.danger,
    borderRadius: 10,
    minWidth: 20,
    height: 20,
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 1,
  },
  badgeText: {
    color: colors.white,
    fontSize: 12,
    fontWeight: 'bold',
    paddingHorizontal: 5,
  },
  searchContainer: {
    paddingHorizontal: 15,
    paddingBottom: 15,
  },
  categoriesContainer: {
    marginVertical: 10,
    height: 60,
  },
  categoriesList: {
    paddingHorizontal: 15,
    alignItems: 'center',
  },
  categoryButton: {
    flexDirection: 'row-reverse',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 8,
    marginLeft: 10,
    borderRadius: 20,
    backgroundColor: colors.white,
    elevation: 2,
    shadowColor: colors.dark,
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.2,
    shadowRadius: 2,
    borderWidth: 1,
    borderColor: 'rgba(0,0,0,0.1)',
    height: 40,
    minWidth: 100,
    justifyContent: 'center',
  },
  categoryButtonActive: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
  },
  categoryIcon: {
    width: 24,
    height: 24,
    resizeMode: 'contain',
    tintColor: colors.primary,
    marginLeft: 8,
  },
  categoryIconActive: {
    tintColor: colors.white,
  },
  categoryButtonText: {
    color: colors.primary,
    fontWeight: '600',
    fontSize: 14,
  },
  categoryButtonTextActive: {
    color: colors.white,
  },
  centerContainer: {
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
  productsList: {
    padding: 15,
  },
  productsRow: {
    justifyContent: 'space-between',
    paddingHorizontal: 15,
    flexDirection: 'row-reverse',
  },
  productWrapper: {
    width: '48%',
    marginBottom: 15,
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
  footerLoader: {
    paddingVertical: 20,
    alignItems: 'center',
  },
});