import React, { useState, useEffect } from 'react';
import {
  StyleSheet,
  View,
  Text,
  FlatList,
  Image,
  TouchableOpacity,
  StatusBar,
} from 'react-native';
import { Ionicons } from "@expo/vector-icons";
import { colors } from "../../constants";
import { supabase } from '../../supabase';
import { I18nManager } from 'react-native';

I18nManager.allowRTL(false);
I18nManager.forceRTL(false);

const DiscountsScreen = ({ navigation, route }) => {
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [isVerified, setIsVerified] = useState(false);
  const { user } = route.params;

  useEffect(() => {
    fetchDiscountedProducts();
    if (user?.id) {
      fetchUserVerificationStatus();
    }
  }, [user]);

  const fetchDiscountedProducts = async () => {
    try {
      const { data, error } = await supabase
        .from('products')
        .select(`
          *,
          categories:category_id (title)
        `)
        .eq('issold', true)
        .order('created_at', { ascending: false });

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
            discountPercentage: Math.round(((product.oldprice - product.price) / product.oldprice) * 100)
          };
        })
      );

      // Sort by discount percentage
      const sortedProducts = productsWithImages.sort((a, b) => 
        b.discountPercentage - a.discountPercentage
      );

      setProducts(sortedProducts);
    } catch (error) {
      console.error('Error fetching discounted products:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchUserVerificationStatus = async () => {
    try {
      if (!user?.id) return;
      
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

  const handleProductPress = (product) => {
    navigation.navigate("productdetail", { product });
  };

  const renderProduct = ({ item }) => (
    <TouchableOpacity 
      style={styles.productCard}
      onPress={() => handleProductPress(item)}
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
        <Text style={styles.brandText}>{item.brand}</Text>
        <Text numberOfLines={2} style={styles.productTitle}>
          {item.title}
        </Text>
        <View style={styles.priceRow}>
          <Text style={styles.price}>{isVerified ? item.price : ''} دج</Text>
          {item.oldprice && (
            <Text style={styles.oldPrice}>{isVerified ? item.oldprice : ''} دج</Text>
          )}
        </View>
      </View>
    </TouchableOpacity>
  );

  return (
    <View style={styles.container}>
      <StatusBar backgroundColor={colors.white} barStyle="dark-content" />
      
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()}>
          <Ionicons name="chevron-forward" size={24} color={colors.dark} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>خصومات</Text>
        <View style={{ width: 24 }} />
      </View>

      <FlatList
        data={products}
        renderItem={renderProduct}
        keyExtractor={(item) => item.id}
        numColumns={2}
        contentContainerStyle={styles.productList}
        showsVerticalScrollIndicator={false}
        ListEmptyComponent={
          !loading && (
            <View style={styles.emptyContainer}>
              <Text style={styles.emptyText}>لا توجد منتجات جديدة</Text>
            </View>
          )
        }
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.light,
  },
  header: {
    flexDirection: 'row-reverse',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 15,
    backgroundColor: colors.white,
    borderBottomWidth: 1,
    borderBottomColor: colors.light,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: colors.dark,
  },
  productList: {
    padding: 10,
  },
  productCard: {
    flex: 1,
    margin: 5,
    backgroundColor: colors.white,
    borderRadius: 10,
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
  discountBadge: {
    position: 'absolute',
    top: 10,
    left: 10,
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
    padding: 10,
    alignItems: 'flex-end',
  },
  brandText: {
    color: colors.muted,
    fontSize: 12,
    marginBottom: 4,
    textAlign: 'right',
  },
  productTitle: {
    fontSize: 14,
    color: colors.dark,
    marginBottom: 5,
    height: 40,
    textAlign: 'right',
  },
  priceRow: {
    flexDirection: 'row-reverse',
    alignItems: 'center',
    marginTop: 5,
  },
  price: {
    fontSize: 16,
    fontWeight: 'bold',
    color: colors.primary,
  },
  oldPrice: {
    fontSize: 14,
    color: colors.muted,
    textDecorationLine: 'line-through',
    marginRight: 8,
  },
  emptyContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingTop: 50,
  },
  emptyText: {
    fontSize: 16,
    color: colors.muted,
  },
});

export default DiscountsScreen; 