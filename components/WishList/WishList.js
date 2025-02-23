import { StyleSheet, Image, View, Text, TouchableOpacity } from "react-native";
import React, { useState } from "react";
import { Ionicons } from "@expo/vector-icons";
import { colors } from "../../constants";

const WishList = ({
  image = "",
  title = "",
  description = "",
  price = 0,
  oldPrice = 0,
  onPressRemove,
  onPressView,
  inStock = true,
  isSold = false,
  isVerified = false,
  quantity = 0,
  maxLimit = null
}) => {
  const [onWishlist, setOnWishlist] = useState(true);

  const handleChangeState = () => {
    onPressRemove();
    setOnWishlist(!onWishlist);
  };

  const discount = oldPrice > 0 ? Math.round(((oldPrice - price) / oldPrice) * 100) : 0;

  return (
    <TouchableOpacity style={styles.container} onPress={onPressView}>
      <View style={styles.imageContainer}>
        <Image source={{ uri: image }} style={styles.image} />
        {isVerified && isSold && discount > 0 && (
          <View style={styles.discountBadge}>
            <Text style={styles.discountText}>-{discount}%</Text>
          </View>
        )}
      </View>
      
      <View style={styles.contentContainer}>
        <View style={styles.textContainer}>
          <Text style={styles.title} numberOfLines={1}>{title}</Text>
          <Text style={styles.description} numberOfLines={2}>
            {description}
          </Text>
          {isVerified ? (
            <>
              <View style={styles.priceContainer}>
                <Text style={styles.price}>{price} دج</Text>
                {oldPrice > 0 && (
                  <Text style={styles.oldPrice}>{oldPrice} دج</Text>
                )}
              </View>
             
            </>
          ) : (
            <Text style={styles.verificationText}>
              يرجى تفعيل الحساب لرؤية السعر
            </Text>
          )}
          {!inStock && (
            <Text style={styles.outOfStock}>نفذت الكمية</Text>
          )}
        </View>
        
        <View style={styles.actionsContainer}>
          <TouchableOpacity
            style={[styles.actionButton, styles.removeButton]}
            onPress={handleChangeState}
          >
            <Ionicons name="trash-outline" size={20} color={colors.danger} />
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.actionButton, styles.viewButton]}
            onPress={onPressView}
          >
            <Ionicons name="eye-outline" size={20} color={colors.primary} />
          </TouchableOpacity>
        </View>
      </View>
    </TouchableOpacity>
  );
};

export default WishList;

const styles = StyleSheet.create({
  container: {
    flexDirection: "row-reverse",
    backgroundColor: colors.white,
    borderRadius: 10,
    marginBottom: 10,
    overflow: "hidden",
    elevation: 3,
  },
  imageContainer: {
    width: 120,
    height: 120,
    position: "relative",
  },
  image: {
    width: "100%",
    height: "100%",
    resizeMode: "cover",
  },
  discountBadge: {
    position: "absolute",
    top: 8,
    right: 8,
    backgroundColor: colors.danger,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 4,
  },
  discountText: {
    color: colors.white,
    fontSize: 12,
    fontWeight: "bold",
  },
  contentContainer: {
    flex: 1,
    padding: 10,
    flexDirection: "row-reverse",
  },
  textContainer: {
    flex: 1,
    marginRight: '10%',
  },
  title: {
    fontSize: 16,
    fontWeight: "600",
    color: colors.dark,
    marginBottom: 4,
    textAlign: 'right',
  },
  description: {
    fontSize: 12,
    color: colors.muted,
    marginBottom: 8,
    textAlign: 'right',

  },
  priceContainer: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 4,
    
  },
  price: {
    fontSize: 16,
    fontWeight: "bold",
    color: colors.primary,
    marginRight: 8,
  },
  oldPrice: {
    fontSize: 14,
    color: colors.muted,
    textDecorationLine: "line-through",
  },
  outOfStock: {
    fontSize: 12,
    color: colors.danger,
    fontWeight: "500",
  },
  actionsContainer: {
    justifyContent: "space-between",
  },
  actionButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 8,
  },
  removeButton: {
    backgroundColor: colors.danger + "15",
  },
  viewButton: {
    backgroundColor: colors.primary + "15",
  },
  verificationText: {
    color: colors.danger,
    fontSize: 12,
    fontStyle: 'italic',
    textAlign: 'right',
    marginBottom: 4,
  },
  stockInfo: {
    marginTop: 4,
    paddingTop: 4,
    borderTopWidth: 1,
    borderTopColor: colors.light,
  },
  quantityText: {
    fontSize: 12,
    color: colors.muted,
    textAlign: 'right',
    marginBottom: 2,
  },
  maxLimitText: {
    fontSize: 12,
    color: colors.muted,
    textAlign: 'right',
  },
});