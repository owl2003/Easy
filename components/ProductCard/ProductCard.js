import { StyleSheet, Text, TouchableOpacity, View, Image } from "react-native";
import React from "react";
import { colors } from "../../constants";
import { Ionicons } from "@expo/vector-icons";
import { LinearGradient } from 'expo-linear-gradient';

const ProductCard = ({
  name,
  price,
  oldPrice,
  image,
  quantity,
  onPress,
  onPressSecondary,
  cardSize,
  isSold,
}) => {
  return (
    <TouchableOpacity
      style={[styles.container, { width: cardSize === "large" ? "100%" : 150 }]}
      onPress={onPress}
      activeOpacity={0.7}
    >
      <View style={styles.imageContainer}>
        <Image source={{ uri: image }} style={styles.productImage} />
        {isSold && (
          <LinearGradient
            colors={[colors.danger + 'CC', colors.danger]}
            style={styles.soldBadge}
          >
            <Text style={styles.soldBadgeText}>تخفيض</Text>
          </LinearGradient>
        )}
      </View>
      
      <View style={styles.infoContainer}>
        <Text style={styles.nameText} numberOfLines={2}>
          {name}
        </Text>
        
        <View style={styles.bottomContainer}>
          <View style={styles.priceContainer}>
            {isSold && (
              <Text style={styles.oldPrice}>{oldPrice} دج</Text>
            )}
            <Text style={[styles.price, isSold && styles.salePrice]}>
              {price} دج
            </Text>
          </View>
          
          {quantity > 0 ? (
            <TouchableOpacity
              style={styles.cartButton}
              onPress={onPressSecondary}
              activeOpacity={0.8}
            >
              <Ionicons name="cart" size={18} color={colors.white} />
            </TouchableOpacity>
          ) : (
            <View style={styles.outOfStock}>
              <Text style={styles.outOfStockText}>نفذت</Text>
            </View>
          )}
        </View>
      </View>
    </TouchableOpacity>
  );
};

export default ProductCard;

const styles = StyleSheet.create({
  container: {
    backgroundColor: colors.white,
    borderRadius: 15,
    overflow: 'hidden',
    elevation: 3,
    shadowColor: colors.dark,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  imageContainer: {
    height: 150,
    width: '100%',
    backgroundColor: colors.light,
  },
  productImage: {
    width: '100%',
    height: '100%',
    resizeMode: 'cover',
  },
  soldBadge: {
    position: 'absolute',
    top: 10,
    right: 10,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 15,
  },
  soldBadgeText: {
    color: colors.white,
    fontSize: 12,
    fontWeight: 'bold',
  },
  infoContainer: {
    padding: 12,
  },
  nameText: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.dark,
    marginBottom: 8,
    textAlign: 'right',
  },
  bottomContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-end',
  },
  priceContainer: {
    flex: 1,
  },
  price: {
    fontSize: 16,
    fontWeight: 'bold',
    color: colors.primary,
  },
  salePrice: {
    color: colors.danger,
  },
  oldPrice: {
    fontSize: 12,
    color: colors.muted,
    textDecorationLine: 'line-through',
    marginBottom: 2,
  },
  cartButton: {
    backgroundColor: colors.primary_light,
    width: 32,
    height: 32,
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
  },
  outOfStock: {
    backgroundColor: colors.muted + '20',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
  },
  outOfStockText: {
    color: colors.muted,
    fontSize: 12,
    fontWeight: '500',
  },
});