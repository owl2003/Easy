import React, { useState, useEffect } from 'react';
import {
  StyleSheet,
  View,
  Text,
  FlatList,
  Image,
  TouchableOpacity,
  StatusBar,
  ActivityIndicator,
} from 'react-native';
import { Ionicons } from "@expo/vector-icons";
import { colors } from "../../constants";
import { supabase } from '../../supabase';
import AsyncStorage from '@react-native-async-storage/async-storage';
import ProductCard from '../../components/ProductCard/ProductCard';
import { I18nManager } from 'react-native';

I18nManager.allowRTL(false);
I18nManager.forceRTL(false);

const NewProductsScreen = ({ navigation, route }) => {
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const { user } = route.params;
  const [isVipUser, setIsVipUser] = useState(false);
  const [isVerified, setIsVerified] = useState(false);

  useEffect(() => {
    fetchNewProducts();
  }, []);

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

  useEffect(() => {
    if (user?.id) {
      fetchUserVerificationStatus();
    }
  }, [user]);

  const fetchNewProducts = async () => {
    try {
      // First get user VIP status
      const value = await AsyncStorage.getItem("authUser");
      if (value) {
        const user = JSON.parse(value);
        const vipStatus = await fetchUserVipStatus(user.id);
        setIsVipUser(vipStatus);
      }

      const { data: productsData, error: productsError } = await supabase
        .from('products')
        .select(`
          *,
          categories:category_id (title)
        `)
        .eq('isnew', true)
        .order('created_at', { ascending: false });

      if (productsError) {
        setError('فشل في جلب المنتجات');
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
            quantity: product.vip && !isVipUser ? 0 : product.quantity
          };
        })
      );

      setProducts(productsWithImages);
      setLoading(false);
    } catch (error) {
      console.error('Error:', error);
      setError('حدث خطأ أثناء جلب المنتجات');
      setLoading(false);
    }
  };

  const handleProductPress = (product) => {
    navigation.navigate("productdetail", { product });
  };

  if (loading) {
    return (
      <View style={styles.centerContainer}>
        <ActivityIndicator size="large" color={colors.primary} />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <StatusBar backgroundColor={colors.white} barStyle="dark-content" />
      
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()}>
          <Ionicons name="arrow-back" size={24} color={colors.dark} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>منتجات جديدة</Text>
        <View style={{ width: 24 }} />
      </View>

      <FlatList
        data={products}
        numColumns={2}
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
            />
          </View>
        )}
        keyExtractor={item => item.id.toString()}
        contentContainerStyle={styles.productsList}
        columnWrapperStyle={styles.productsRow}
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
    flexDirection: 'row',
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
  productsList: {
    padding: 15,
  },
  productsRow: {
    justifyContent: 'space-between',
  },
  productWrapper: {
    width: '48%',
    marginBottom: 15,
  },
  centerContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
});

export default NewProductsScreen; 