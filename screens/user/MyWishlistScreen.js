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

  // Fetch the wishlist for the authenticated user
  const fetchWishlist = async () => {
    setIsloading(true);
    setError("");

    try {
      // Get the authenticated user from AsyncStorage
      const value = await AsyncStorage.getItem("authUser");
      if (!value) {
        setError("User not authenticated");
        setIsloading(false);
        return;
      }

      const user = JSON.parse(value);

      // Fetch wishlist items for the user
      const { data: wishlistData, error: wishlistError } = await supabase
        .from("wishlist")
        .select("product_id")
        .eq("user_id", user.id);

      if (wishlistError) {
        throw wishlistError;
      }

      // Extract product IDs from the wishlist
      const productIds = wishlistData.map((item) => item.product_id);

      // Fetch product details for the wishlist items
      const { data: productsData, error: productsError } = await supabase
        .from("products")
        .select("*")
        .in("id", productIds);

      if (productsError) {
        throw productsError;
      }

      // Combine wishlist and product data
      const formattedWishlist = wishlistData.map((item) => ({
        _id: item.product_id,
        productId: productsData.find((product) => product.id === item.product_id),
      }));

      setWishlist(formattedWishlist);
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
      // Get the authenticated user from AsyncStorage
      const value = await AsyncStorage.getItem("authUser");
      if (!value) {
        setError("User not authenticated");
        setIsloading(false);
        return;
      }

      const user = JSON.parse(value);

      // Remove the item from the wishlist in Supabase
      const { error: deleteError } = await supabase
        .from("wishlist")
        .delete()
        .eq("user_id", user.id)
        .eq("product_id", id);

      if (deleteError) {
        throw deleteError;
      }

      // Update the local wishlist state
      setWishlist(wishlist.filter((item) => item._id !== id));
      setError("تمت إزالة المنتج من قائمة الرغبات.");
      setAlertType("success");
    } catch (err) {
      console.error("Error removing from wishlist:", err);
      setError("Failed to remove item from wishlist");
      setAlertType("error");
    } finally {
      setIsloading(false);
    }
  };

  // Handle pull-to-refresh
  const handleOnRefresh = () => {
    setRefreshing(true);
    fetchWishlist();
    setRefreshing(false);
  };

  // Fetch the wishlist on initial render
  useEffect(() => {
    fetchWishlist();
  }, []);

  return (
    <View style={styles.container}>
      <StatusBar />
      <ProgressDialog visible={isloading} label={label} />
      <View style={styles.topBarContainer}>
        <TouchableOpacity onPress={() => navigation.goBack()}>
          <Ionicons
            name="arrow-back-circle-outline"
            size={30}
            color={colors.muted}
          />
        </TouchableOpacity>
        <View></View>
        <TouchableOpacity onPress={handleOnRefresh}>
          <Ionicons name="heart-outline" size={30} color={colors.primary} />
        </TouchableOpacity>
      </View>
      <View style={styles.screenNameContainer}>
        <View>
          <Text style={styles.screenNameText}>قائمة الرغبات</Text>
        </View>
        <View>
          <Text style={styles.screenNameParagraph}>
            عرض أو إضافة أو إزالة المنتجات من قائمة الرغبات للشراء لاحقًا
          </Text>
        </View>
      </View>
      <CustomAlert message={error} type={alertType} />
      {wishlist.length === 0 ? (
        <View style={styles.ListContiainerEmpty}>
          <Text style={styles.secondaryTextSmItalic}>
            "لا توجد منتجات في قائمة الرغبات حتى الآن."
          </Text>
        </View>
      ) : (
        <ScrollView
          style={{ flex: 1, width: "100%", padding: 20 }}
          showsVerticalScrollIndicator={false}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={handleOnRefresh} />
          }
        >
          {wishlist.map((list, index) => (
            <WishList
              key={index}
              image={list.productId.image_url} // Use the correct image URL field
              title={list.productId.title}
              description={list.productId.description}
              onPressView={() => navigation.navigate("productdetail", { product: list.productId })}
              onPressRemove={() => handleRemoveFromWishlist(list._id)}
            />
          ))}
          <View style={styles.emptyView}></View>
        </ScrollView>
      )}
    </View>
  );
};

export default MyWishlistScreen;

const styles = StyleSheet.create({
  container: {
    width: "100%",
    flexDirecion: "row",
    backgroundColor: colors.light,
    alignItems: "center",
    justifyContent: "flex-start",
    flex: 1,
  },
  topBarContainer: {
    width: "100%",
    display: "flex",
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    padding: 20,
  },
  screenNameContainer: {
    padding: 20,
    paddingTop: 0,
    paddingBottom: 0,
    width: "100%",
    display: "flex",
    flexDirection: "column",
    justifyContent: "flex-start",
    alignItems: "flex-start",
  },
  screenNameText: {
    fontSize: 30,
    fontWeight: "800",
    color: colors.muted,
  },
  screenNameParagraph: {
    marginTop: 5,
    fontSize: 15,
  },
  emptyView: {
    height: 20,
  },
  ListContiainerEmpty: {
    width: "100%",
    display: "flex",
    justifyContent: "center",
    alignItems: "center",
    flex: 1,
  },
  secondaryTextSmItalic: {
    fontStyle: "italic",
    fontSize: 15,
    color: colors.muted,
  },
});