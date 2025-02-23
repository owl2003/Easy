import { StyleSheet, Image, View, Text, TouchableOpacity } from "react-native";
import React from "react";
import { MaterialIcons, MaterialCommunityIcons } from "@expo/vector-icons";
import { colors } from "../../constants";

const Badge = ({ text, icon }) => (
  <View style={styles.badge}>
    <MaterialCommunityIcons name={icon} size={14} color={colors.muted} />
    <Text style={styles.badgeText}>{text}</Text>
  </View>
);

const ProductList = ({
  category,
  price,
  oldPrice,
  title,
  image,
  sku,
  vip,
  isSold,
  isNew,
  soldCount,
  onPressView,
  onPressEdit,
  onPressDelete,
  onPressToggleVip,
  onPressToggleDiscount,
  onPressToggleNew,
}) => {
  return (
    <View style={styles.container}>
      <TouchableOpacity style={styles.innerContainer} onPress={onPressView}>
        <View style={styles.imageSection}>
          {image ? (
            <Image source={{ uri: image }} style={styles.productImage} />
          ) : (
            <View style={styles.imagePlaceholder}>
              <MaterialCommunityIcons name="image-off" size={24} color={colors.muted} />
            </View>
          )}
        </View>

        <View style={styles.infoSection}>
          <View style={styles.headerRow}>
            <Text style={styles.productTitle} numberOfLines={2}>{title}</Text>
            <View style={styles.badgesContainer}>
              {isNew && <Badge text="جديد" icon="new-box" />}
              {isSold && <Badge text="خصم" icon="sale" />}
              {vip && <Badge text="VIP" icon="crown" />}
            </View>
          </View>

          <View style={styles.detailsContainer}>
            <View style={styles.detailsRow}>
              <View style={styles.row}>
                <MaterialCommunityIcons name="shape" size={16} color={colors.muted} />
                <Text style={styles.detailText}>{category}</Text>
              </View>
              <View style={styles.row}>
                <MaterialCommunityIcons name="shopping" size={16} color={colors.muted} />
                <Text style={styles.detailText}>{`${soldCount || 0} مبيعات`}</Text>
              </View>
            </View>

            <View style={styles.detailsRow}>
              <View style={styles.row}>
                <MaterialCommunityIcons name="barcode" size={16} color={colors.muted} />
                <Text style={styles.detailText}>{sku}</Text>
              </View>
              <View style={styles.priceContainer}>
                <MaterialCommunityIcons name="currency-usd" size={16} color={colors.muted} />
                {isSold && oldPrice ? (
                  <View style={styles.priceTextContainer}>
                    <Text style={styles.oldPrice}>{oldPrice} د.ج</Text>
                    <Text style={styles.price}>{price} د.ج</Text>
                  </View>
                ) : (
                  <Text style={styles.price}>{price} د.ج</Text>
                )}
              </View>
            </View>
          </View>
        </View>
      </TouchableOpacity>

      <View style={styles.actionsContainer}>
        <TouchableOpacity
          style={[styles.actionButton, styles.primaryButton]}
          onPress={onPressEdit}
        >
          <MaterialIcons name="edit" size={20} color={colors.primary} />
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.actionButton}
          onPress={onPressDelete}
        >
          <MaterialIcons name="delete" size={20} color={colors.muted} />
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.actionButton}
          onPress={onPressToggleVip}
        >
          <MaterialCommunityIcons 
            name="crown" 
            size={20} 
            color={vip ? colors.primary : colors.muted} 
          />
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.actionButton}
          onPress={onPressToggleDiscount}
        >
          <MaterialCommunityIcons 
            name="sale" 
            size={20} 
            color={isSold ? colors.primary : colors.muted} 
          />
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.actionButton}
          onPress={onPressToggleNew}
        >
          <MaterialCommunityIcons 
            name="new-box" 
            size={20} 
            color={isNew ? colors.primary : colors.muted} 
          />
        </TouchableOpacity>
      </View>
    </View>
  );
};

export default ProductList;

const styles = StyleSheet.create({
  container: {
    backgroundColor: colors.white,
    borderRadius: 12,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: colors.light,
  },
  innerContainer: {
    flexDirection: 'row-reverse',
    padding: 16,
  },
  imageSection: {
    marginLeft: 16,
  },
  productImage: {
    height: 100,
    width: 100,
    borderRadius: 8,
    backgroundColor: colors.light,
  },
  imagePlaceholder: {
    height: 100,
    width: 100,
    borderRadius: 8,
    backgroundColor: colors.light,
    justifyContent: 'center',
    alignItems: 'center',
  },
  infoSection: {
    flex: 1,
  },
  headerRow: {
    flexDirection: 'row-reverse',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 12,
  },
  productTitle: {
    fontSize: 16,
    fontWeight: '600',
    flex: 1,
    marginLeft: 8,
    lineHeight: 22,
    color: colors.dark,
    textAlign: 'right',
  },
  badgesContainer: {
    flexDirection: 'row-reverse',
    flexWrap: 'wrap',
    gap: 4,
  },
  badge: {
    flexDirection: 'row-reverse',
    alignItems: 'center',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 4,
    backgroundColor: colors.light,
  },
  badgeText: {
    fontSize: 12,
    fontWeight: '500',
    marginRight: 4,
    color: colors.muted,
  },
  detailsContainer: {
    gap: 8,
  },
  detailsRow: {
    flexDirection: 'row-reverse',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  row: {
    flexDirection: 'row-reverse',
    alignItems: 'center',
    gap: 6,
  },
  detailText: {
    color: colors.muted,
    fontSize: 14,
    textAlign: 'right',
  },
  priceContainer: {
    flexDirection: 'row-reverse',
    alignItems: 'center',
    gap: 6,
  },
  priceTextContainer: {
    flexDirection: 'row-reverse',
    alignItems: 'center',
    gap: 8,
  },
  price: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.dark,
    textAlign: 'right',
  },
  oldPrice: {
    fontSize: 14,
    textDecorationLine: 'line-through',
    color: colors.muted,
  },
  actionsContainer: {
    flexDirection: 'row-reverse',
    justifyContent: 'space-around',
    borderTopWidth: 1,
    borderTopColor: colors.light,
    padding: 12,
  },
  actionButton: {
    width: 40,
    height: 40,
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: colors.light,
  },
  primaryButton: {
    backgroundColor: colors.light,
  },
});
