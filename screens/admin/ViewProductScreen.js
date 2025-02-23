import {
  StyleSheet,
  Text,
  StatusBar,
  View,
  ScrollView,
  TouchableOpacity,
  RefreshControl,
  Alert,
  I18nManager,
  FlatList,
  Modal,
  Dimensions,
} from "react-native";
import React, { useState, useEffect } from "react";
import { colors } from "../../constants";
import { Ionicons } from "@expo/vector-icons";
import { AntDesign } from "@expo/vector-icons";
import ProductList from "../../components/ProductList/ProductList";
import CustomAlert from "../../components/CustomAlert/CustomAlert";
import CustomInput from "../../components/CustomInput/";
import { supabase } from "../../supabase"; 
import { LinearGradient } from 'expo-linear-gradient';
import { MaterialIcons, MaterialCommunityIcons } from "@expo/vector-icons";

I18nManager.allowRTL(false);
I18nManager.forceRTL(false);

// Enable RTL layout
I18nManager.forceRTL(true); // Force RTL layout for Arabic
I18nManager.allowRTL(false);

const { width } = Dimensions.get('window');
const cardSize = width * 0.2;

// Add this new component for product stats
const ProductStatsCard = ({ title, count, icon, color, onPress, isSelected }) => (
  <TouchableOpacity 
    style={[
      styles.statsCard, 
      { width: cardSize, height: cardSize },
      isSelected && { borderColor: color, borderWidth: 2 }
    ]} 
    onPress={onPress}
  >
    <View style={[styles.iconContainer, { backgroundColor: color + '20' }]}>
      <MaterialCommunityIcons name={icon} size={10} color={color} />
    </View>
    <Text style={[styles.statsCount, { color: color }]}>{count}</Text>
    <Text style={styles.statsTitle}>{title}</Text>
  </TouchableOpacity>
);

const ViewProductScreen = ({ navigation, route }) => {
  const { authUser } = route.params;
  const [isloading, setIsloading] = useState(false);
  const [refeshing, setRefreshing] = useState(false);
  const [alertType, setAlertType] = useState("error");

  const [label, setLabel] = useState("جاري التحميل...");
  const [error, setError] = useState("");
  const [products, setProducts] = useState([]);
  const [foundItems, setFoundItems] = useState([]);
  const [filterItem, setFilterItem] = useState("");
  const [showDiscountModal, setShowDiscountModal] = useState(false);
  const [selectedProduct, setSelectedProduct] = useState(null);
  const [discountPrice, setDiscountPrice] = useState("");
  const [productStats, setProductStats] = useState({
    all: 0,
    vip: 0,
    new: 0,
    discount: 0
  });
  const [selectedStatus, setSelectedStatus] = useState('all');

  // Method call on pull refresh
  const handleOnRefresh = () => {
    setRefreshing(true);
    fetchProduct();
    setRefreshing(false);
  };

  // Method to show delete confirmation
  const showConfirmDialog = (id) => {
    return Alert.alert(
      "تأكيد الحذف",
      "سيتم حذف المنتج وصورته نهائياً. هل أنت متأكد؟",
      [
        {
          text: "نعم، احذف",
          onPress: () => {
            handleDelete(id);
          },
          style: "destructive"
        },
        {
          text: "إلغاء",
          style: "cancel"
        },
      ]
    );
  };

  // Method to delete a product
  const handleDelete = async (id) => {
    setIsloading(true);
    try {
      // First get the product to get its image_url
      const { data: product, error: fetchError } = await supabase
        .from("products")
        .select("image_url")
        .eq("id", id)
        .single();

      if (fetchError) {
        setIsloading(false);
        return setError("فشل في جلب بيانات المنتج");
      }

      // If there's an image, delete it from storage
      if (product.image_url) {
        // Extract the file path from the full URL or path
        let imagePath = product.image_url;
        
        // If it's a full URL, extract just the path part
        if (imagePath.includes('product-images/')) {
          imagePath = 'products/' + imagePath.split('product-images/')[1];
        }

        console.log("Deleting image:", imagePath); // For debugging

        const { error: storageError } = await supabase.storage
          .from("product-images")
          .remove([imagePath]);

        if (storageError) {
          console.error("Storage error:", storageError); // For debugging
          setIsloading(false);
          return setError("فشل في حذف صورة المنتج");
        }
      }

      // Then delete the product from the database
      const { error: deleteError } = await supabase
        .from("products")
        .delete()
        .eq("id", id);

      if (deleteError) {
        setIsloading(false);
        return setError("فشل في حذف المنتج");
      }

      // If everything succeeded, refresh the product list
      fetchProduct();
      setError("تم حذف المنتج وصورته بنجاح");
      setAlertType("success");
    } catch (error) {
      console.error("Delete error:", error); // For debugging
      setIsloading(false);
      setError("حدث خطأ أثناء حذف المنتج");
    } finally {
      setIsloading(false);
    }
  };

  // Method to toggle VIP status
  const toggleVip = async (productId, currentVipStatus) => {
    setIsloading(true);
    try {
      const { error } = await supabase
        .from("products")
        .update({ vip: !currentVipStatus })
        .eq("id", productId);

      if (error) {
        setIsloading(false);
        return setError("فشل في تغيير حالة VIP");
      }

      fetchProduct();
    } catch (error) {
      setIsloading(false);
      setError("حدث خطأ أثناء تغيير حالة VIP");
    }
  };

  // Method to toggle discount status
  const toggleDiscount = async (productId, currentDiscountStatus) => {
    if (!currentDiscountStatus) {
      // If adding a discount, show the discount modal
      const product = products.find(p => p.id === productId);
      setSelectedProduct(product);
      setShowDiscountModal(true);
    } else {
      // If removing discount
      setIsloading(true);
      try {
        const product = products.find(p => p.id === productId);
        const { error } = await supabase
          .from("products")
          .update({ 
            issold: false,
            oldprice: null,
            price: product.oldprice // Restore original price
          })
          .eq("id", productId);

        if (error) {
          setIsloading(false);
          return setError("فشل في إلغاء الخصم");
        }

        fetchProduct();
      } catch (error) {
        setIsloading(false);
        setError("حدث خطأ أثناء إلغاء الخصم");
      }
    }
  };

  // Add method to toggle New status
  const toggleNew = async (productId, currentNewStatus) => {
    setIsloading(true);
    try {
      const { error } = await supabase
        .from("products")
        .update({ isnew: !currentNewStatus })
        .eq("id", productId);

      if (error) {
        setIsloading(false);
        return setError("فشل في تغيير حالة المنتج الجديد");
      }

      fetchProduct();
    } catch (error) {
      setIsloading(false);
      setError("حدث خطأ أثناء تغيير حالة المنتج الجديد");
    }
  };

  // Method to fetch products from Supabase
  const fetchProduct = async () => {
    setIsloading(true);
    try {
      const { data: productsData, error: productsError } = await supabase
        .from("products")
        .select(`
          *,
          categories:category_id (title)
        `);

      if (productsError) {
        setIsloading(false);
        return setError("فشل في جلب المنتجات");
      }

      const productsWithImages = await Promise.all(
        productsData.map(async (product) => {
          const imageUrl = product.image_url ? 
            supabase.storage.from("product-images").getPublicUrl(product.image_url).data?.publicUrl 
            : null;

          return {
            ...product,
            imageUrl,
            category: product.categories?.title || "غير مصنف",
          };
        })
      );

      // Calculate product statistics
      const stats = productsWithImages.reduce((acc, product) => {
        acc.all++;
        if (product.vip) acc.vip++;
        if (product.isnew) acc.new++;
        if (product.issold) acc.discount++;
        return acc;
      }, { all: 0, vip: 0, new: 0, discount: 0 });

      setProductStats(stats);
      setProducts(productsWithImages);
      setFoundItems(productsWithImages);
      setError("");
    } catch (error) {
      setIsloading(false);
      setError("حدث خطأ أثناء جلب المنتجات");
    } finally {
      setIsloading(false);
    }
  };

  // Update filter method to handle different filter types
  const filter = () => {
    let results = products;

    if (filterItem) {
      // If there's text in search bar, search across multiple fields
      const searchTerm = filterItem.toLowerCase();
      results = results.filter(product => 
        product.title?.toLowerCase().includes(searchTerm) ||
        product.sku?.toLowerCase().includes(searchTerm) ||
        product.category?.toLowerCase().includes(searchTerm) ||
        product.description?.toLowerCase().includes(searchTerm)
      );
    }

    // Filter based on selected status card
    switch (selectedStatus) {
      case 'vip':
        results = results.filter(product => product.vip);
        break;
      case 'new':
        results = results.filter(product => product.isnew);
        break;
      case 'discount':
        results = results.filter(product => product.issold);
        break;
      // 'all' case doesn't need filtering
      default:
        break;
    }

    setFoundItems(results);
  };

  // Filter the data whenever filterItem value changes
  useEffect(() => {
    filter();
  }, [filterItem, selectedStatus]);

  // Fetch the products on initial render
  useEffect(() => {
    fetchProduct();
  }, []);

  // Add this method to handle discount submission
  const handleDiscountSubmit = async () => {
    if (!discountPrice || parseFloat(discountPrice) <= 0) {
      setError("الرجاء إدخال سعر الخصم");
      return;
    }

    if (parseFloat(discountPrice) >= parseFloat(selectedProduct.price)) {
      setError("يجب أن يكون سعر الخصم أقل من السعر الأصلي");
      return;
    }

    setIsloading(true);
    try {
      const { error } = await supabase
        .from("products")
        .update({ 
          issold: true,
          oldprice: selectedProduct.price,
          price: parseFloat(discountPrice)
        })
        .eq("id", selectedProduct.id);

      if (error) {
        setIsloading(false);
        return setError("فشل في تطبيق الخصم");
      }

      setShowDiscountModal(false);
      setDiscountPrice("");
      setSelectedProduct(null);
      fetchProduct();
    } catch (error) {
      setIsloading(false);
      setError("حدث خطأ أثناء تطبيق الخصم");
    }
  };

  const renderProduct = ({ item: product }) => (
    <ProductList
      image={product.imageUrl}
      title={product?.title}
      category={product?.category}
      price={product?.price}
      oldPrice={product?.oldprice}
      sku={product?.sku}
      vip={product?.vip}
      isSold={product?.issold}
      isNew={product?.isnew}
      soldCount={product?.sold_count}
      onPressView={() => {
        navigation.navigate("editproduct", {
          product: product,
          authUser: authUser,
          viewOnly: true
        });
      }}
      onPressEdit={() => {
        navigation.navigate("editproduct", {
          product: product,
          authUser: authUser,
        });
      }}
      onPressDelete={() => {
        showConfirmDialog(product.id);
      }}
      onPressToggleVip={() => toggleVip(product.id, product.vip)}
      onPressToggleDiscount={() => toggleDiscount(product.id, product.issold)}
      onPressToggleNew={() => toggleNew(product.id, product.isnew)}
    />
  );

  const ListEmptyComponent = () => (
    <Text>{`لا توجد منتجات تطابق البحث: "${filterItem}"`}</Text>
  );

  return (
    <View style={styles.container}>
      <StatusBar backgroundColor={colors.primary} />
      
      <LinearGradient
        colors={[colors.primary, colors.primary_light]}
        style={styles.header}
      >
        <View style={styles.headerTop}>
          <TouchableOpacity onPress={() => navigation.goBack()}>
            <Ionicons name="chevron-forward" size={32} color={colors.white} />
          </TouchableOpacity>
          <TouchableOpacity
            onPress={() => navigation.navigate("addproduct", { authUser: authUser })}
          >
            <AntDesign name="plussquare" size={30} color={colors.white} />
          </TouchableOpacity>
        </View>

        <View style={styles.headerTitle}>
          <Text style={styles.headerText}>المنتجات</Text>
          <Text style={styles.headerSubText}>إدارة المنتجات والمخزون</Text>
        </View>

        <View style={styles.searchContainer}>
          <CustomInput
            radius={25}
            placeholder={"ابحث عن منتج..."}
            value={filterItem}
            setValue={setFilterItem}
            rightIcon={
              <MaterialIcons name="search" size={24} color={colors.muted} />
            }
          />
        </View>
      </LinearGradient>

      <View style={styles.contentContainer}>
        <ScrollView 
          horizontal 
          showsHorizontalScrollIndicator={false}
          style={styles.statsCardsContainer}
          contentContainerStyle={styles.statsCardsContent}
        >
          <ProductStatsCard
            title="الكل"
            count={productStats.all}
            icon="package-variant"
            color="#6B7280"
            onPress={() => setSelectedStatus('all')}
            isSelected={selectedStatus === 'all'}
          />
          <ProductStatsCard
            title="VIP"
            count={productStats.vip}
            icon="crown"
            color="#F59E0B"
            onPress={() => setSelectedStatus('vip')}
            isSelected={selectedStatus === 'vip'}
          />
          <ProductStatsCard
            title="جديد"
            count={productStats.new}
            icon="new-box"
            color="#3B82F6"
            onPress={() => setSelectedStatus('new')}
            isSelected={selectedStatus === 'new'}
          />
          <ProductStatsCard
            title="خصم"
            count={productStats.discount}
            icon="sale"
            color="#10B981"
            onPress={() => setSelectedStatus('discount')}
            isSelected={selectedStatus === 'discount'}
          />
        </ScrollView>

        <CustomAlert message={error} type={alertType} />

        <FlatList
          data={foundItems}
          renderItem={renderProduct}
          keyExtractor={(item) => item.id.toString()}
          showsVerticalScrollIndicator={false}
          contentContainerStyle={styles.productsList}
          ListEmptyComponent={() => (
            <View style={styles.emptyContainer}>
              <MaterialCommunityIcons name="package-variant-remove" size={64} color={colors.muted} />
              <Text style={styles.emptyText}>لا توجد منتجات مطابقة للبحث</Text>
            </View>
          )}
          refreshControl={
            <RefreshControl refreshing={refeshing} onRefresh={handleOnRefresh} />
          }
        />
      </View>

      <Modal
        animationType="slide"
        transparent={true}
        visible={showDiscountModal}
        onRequestClose={() => setShowDiscountModal(false)}
      >
        <View style={styles.modalBackground}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>إضافة خصم</Text>
            {selectedProduct && (
              <>
                <Text style={styles.productTitle}>{selectedProduct.title}</Text>
                <Text style={styles.originalPrice}>
                  السعر الأصلي: {selectedProduct.price} د.ج
                </Text>
              </>
            )}
            <CustomInput
              value={discountPrice}
              setValue={setDiscountPrice}
              placeholder="سعر الخصم"
              keyboardType="numeric"
              style={styles.discountInput}
            />
            <View style={styles.modalButtons}>
              <TouchableOpacity
                style={[styles.modalButton, styles.confirmButton]}
                onPress={handleDiscountSubmit}
              >
                <Text style={styles.buttonText}>تأكيد</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.modalButton, styles.cancelButton]}
                onPress={() => {
                  setShowDiscountModal(false);
                  setSelectedProduct(null);
                  setDiscountPrice("");
                }}
              >
                <Text style={styles.buttonText}>إلغاء</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
};

export default ViewProductScreen;

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.light,
  },
  header: {
    padding: 15,
    paddingTop: 40,
    borderBottomLeftRadius: 30,
    borderBottomRightRadius: 30,
    elevation: 5,
  },
  headerTop: {
    flexDirection: 'row-reverse',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 15,
  },
  headerTitle: {
    alignItems: 'flex-end',
    marginBottom: 4,
  },
  headerText: {
    fontSize: 24,
    fontWeight: 'bold',
    color: colors.white,
    textAlign: 'right',
  },
  headerSubText: {
    fontSize: 14,
    color: colors.white,
    opacity: 0.8,
    textAlign: 'right',
  },
  searchContainer: {
    marginBottom: -22,
    zIndex: 1,
  },
  contentContainer: {
    flex: 1,
  },
  statsCardsContainer: {
    maxHeight: cardSize + 30,
    minHeight: cardSize + 30,
  },
  statsCardsContent: {
    paddingHorizontal: 15,
    paddingTop: 15,
    paddingBottom: 5,
  },
  statsCard: {
    backgroundColor: colors.white,
    borderRadius: 12,
    padding: 8,
    marginRight: 8,
    alignItems: 'center',
    justifyContent: 'center',
    elevation: 3,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
  },
  iconContainer: {
    padding: 6,
    borderRadius: 8,
    marginBottom: 6,
  },
  statsCount: {
    fontSize: 16,
    fontWeight: 'bold',
    marginBottom: 2,
  },
  statsTitle: {
    fontSize: 10,
    color: colors.muted,
    textAlign: 'center',
    fontWeight: '600',
  },
  productsList: {
    padding: 15,
  },
  emptyContainer: {
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
  modalBackground: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContent: {
    backgroundColor: colors.white,
    borderRadius: 10,
    padding: 20,
    width: '80%',
    alignItems: 'center',
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    marginBottom: 15,
    color: colors.primary,
    textAlign: 'right',
  },
  productTitle: {
    fontSize: 16,
    marginBottom: 10,
    textAlign: 'right',
  },
  originalPrice: {
    fontSize: 14,
    color: colors.muted,
    marginBottom: 15,
    textAlign: 'right',
  },
  discountInput: {
    width: '100%',
    marginBottom: 15,
  },
  modalButtons: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    width: '100%',
  },
  modalButton: {
    padding: 10,
    borderRadius: 5,
    width: '40%',
    alignItems: 'center',
  },
  confirmButton: {
    backgroundColor: colors.primary,
  },
  cancelButton: {
    backgroundColor: colors.danger,
  },
  buttonText: {
    color: colors.white,
    fontWeight: 'bold',
  },
  backButton: {
    transform: [{ scaleX: -1 }],
  },
});