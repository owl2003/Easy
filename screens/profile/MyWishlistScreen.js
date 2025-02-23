import {
  StyleSheet,
  Text,
  StatusBar,
  View,
  ScrollView,
  TouchableOpacity,
  RefreshControl,
} from "react-native";
import React, { useState, useEffect } from "react";
import { colors } from "../../constants"; // Assuming you have a colors constant file
import { Ionicons } from "@expo/vector-icons";
import CustomAlert from "../../components/CustomAlert/CustomAlert";
import ProgressDialog from "react-native-progress-dialog";
import WishList from "../../components/WishList/WishList";
import { supabase } from "../../supabase"; // Import Supabase client
import AsyncStorage from "@react-native-async-storage/async-storage";
import { I18nManager } from 'react-native';

I18nManager.allowRTL(false);
I18nManager.forceRTL(false);

const MyWishlistScreen = ({ navigation, route }) => {
  const [isloading, setIsloading] = useState(false);
  const [label, setLabel] = useState("يرجى الانتظار...");
  const [refreshing, setRefreshing] = useState(false);
  const [alertType, setAlertType] = useState("error");
  const [error, setError] = useState("");
  const [wishlist, setWishlist] = useState([]);
  const [isVerified, setIsVerified] = useState(false);

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

  // Fetch the wishlist for the authenticated user
  const fetchWishlist = async () => {
    setIsloading(true);
    setError("");

    try {
      const value = await AsyncStorage.getItem("authUser");
      if (!value) {
        setError("User not authenticated");
        setIsloading(false);
        return;
      }

      const user = JSON.parse(value);

      // Check verification status
      const verificationStatus = await checkVerificationStatus(user.id);
      setIsVerified(verificationStatus);

      const { data: wishlistData, error: wishlistError } = await supabase
        .from("wishlist")
        .select(`
          id,
          products (
            id,
            title,
            description,
            price,
            oldprice,
            image_url,
            quantity,
            issold,
            max
          )
        `)
        .eq("user_id", user.id);

      if (wishlistError) {
        throw wishlistError;
      }

      // Process the wishlist data to include proper image URLs
      const processedWishlist = await Promise.all(
        wishlistData.map(async (item) => {
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
            _id: item.id,
            productId: {
              ...item.products,
              image_url: imageUrl,
              // Only show prices if user is verified
              price: verificationStatus ? item.products.price : null,
              oldprice: verificationStatus ? item.products.oldprice : null,
              max: item.products.max
            }
          };
        })
      );

      setWishlist(processedWishlist);
    } catch (err) {
      console.error("Error fetching wishlist:", err);
      setError("Failed to fetch wishlist");
      setAlertType("error");
    } finally {
      setIsloading(false);
    }
  };

  // Remove an item from the wishlist
  const handleRemoveFromWishlist = async (id) => {
    setIsloading(true);
    setError("");

    try {
      const value = await AsyncStorage.getItem("authUser");
      if (!value) {
        setError("User not authenticated");
        setIsloading(false);
        return;
      }

      const { error: deleteError } = await supabase
        .from("wishlist")
        .delete()
        .eq("id", id);

      if (deleteError) {
        throw deleteError;
      }

      setWishlist(wishlist.filter((item) => item._id !== id));
      setError("تمت إزالة المنتج من قائمة الرغبات");
      setAlertType("success");
    } catch (err) {
      console.error("Error removing from wishlist:", err);
      setError("Failed to remove item from wishlist");
      setAlertType("error");
    } finally {
      setIsloading(false);
    }
  };

  const handleOnRefresh = () => {
    setRefreshing(true);
    fetchWishlist();
    setRefreshing(false);
  };

  useEffect(() => {
    fetchWishlist();
  }, []);

  return (
    <View style={styles.container}>
      <StatusBar backgroundColor={colors.white} barStyle="dark-content" />
      <ProgressDialog visible={isloading} label={label} />
      
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity 
          style={styles.backButton} 
          onPress={() => navigation.goBack()}
        >
          <Ionicons
            name="arrow-back-circle-outline"
            size={30}
            color={colors.muted}
          />
        </TouchableOpacity>
        <View style={styles.headerTextContainer}>
          <Text style={styles.headerTitle}>قائمة الرغبات</Text>
          <Text style={styles.headerSubtitle}>
            عرض أو إضافة أو إزالة المنتجات من قائمة الرغبات للشراء لاحقًا
          </Text>
        </View>
        <TouchableOpacity 
          style={styles.refreshButton}
          onPress={handleOnRefresh}
        >
          <Ionicons name="heart-outline" size={30} color={colors.primary} />
        </TouchableOpacity>
      </View>

      <CustomAlert message={error} type={alertType} />

      {wishlist.length === 0 ? (
        <View style={styles.emptyContainer}>
          <Ionicons name="heart-outline" size={80} color={colors.muted} />
          <Text style={styles.emptyText}>
            لا توجد منتجات في قائمة الرغبات حتى الآن
          </Text>
          <TouchableOpacity 
            style={styles.shopNowButton}
            onPress={() => navigation.navigate("home")}
          >
            <Text style={styles.shopNowText}>تسوق الآن</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <ScrollView
          style={styles.scrollView}
          showsVerticalScrollIndicator={false}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={handleOnRefresh} />
          }
        >
          {wishlist.map((list, index) => (
            <WishList
              key={index}
              image={list.productId.image_url}
              title={list.productId.title}
              description={list.productId.description}
              price={list.productId.price}
              oldPrice={list.productId.oldprice}
              onPressView={() => 
                navigation.navigate("productdetail", { product: list.productId })
              }
              onPressRemove={() => handleRemoveFromWishlist(list._id)}
              inStock={list.productId.quantity > 0}
              isSold={list.productId.issold}
              isVerified={isVerified}
              quantity={list.productId.quantity}
              maxLimit={list.productId.max}
            />
          ))}
          <View style={styles.emptyView} />
        </ScrollView>
      )}
    </View>
  );
};

export default MyWishlistScreen;

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.light,
  },
  header: {
    backgroundColor: colors.white,
    padding: 15,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    elevation: 4,
  },
  headerTextContainer: {
    flex: 1,
    alignItems: "center",
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: "bold",
    color: colors.dark,
    marginBottom: 5,
  },
  headerSubtitle: {
    fontSize: 12,
    color: colors.muted,
    textAlign: "center",
  },
  backButton: {
    padding: 5,
  },
  refreshButton: {
    padding: 5,
  },
  emptyContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    padding: 20,
  },
  emptyText: {
    fontSize: 16,
    color: colors.muted,
    marginTop: 10,
    marginBottom: 20,
    textAlign: "center",
  },
  shopNowButton: {
    backgroundColor: colors.primary,
    paddingHorizontal: 30,
    paddingVertical: 12,
    borderRadius: 25,
    elevation: 2,
  },
  shopNowText: {
    color: colors.white,
    fontSize: 16,
    fontWeight: "600",
  },
  scrollView: {
    flex: 1,
    padding: 15,
  },
  emptyView: {
    height: 20,
  },
});