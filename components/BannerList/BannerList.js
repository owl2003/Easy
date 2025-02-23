import { StyleSheet, Text, View, Image, TouchableOpacity, Dimensions } from "react-native";
import React from "react";
import { colors } from "../../constants";
import { MaterialCommunityIcons } from "@expo/vector-icons";

const { width } = Dimensions.get('window');

const BannerList = ({ image, sku, onPressDelete, onPressEdit }) => {
  return (
    <View style={styles.container}>
      <View style={styles.contentContainer}>
        <View style={styles.imageContainer}>
          {image ? (
            <Image 
              source={{ uri: image }} 
              style={styles.bannerImage}
              resizeMode="cover"
            />
          ) : (
            <View style={styles.imagePlaceholder}>
              <MaterialCommunityIcons name="image-off" size={28} color={colors.muted} />
              <Text style={styles.placeholderText}>لا توجد صورة</Text>
            </View>
          )}
        </View>

        <View style={styles.infoContainer}>
          <View style={styles.skuContainer}>
            <MaterialCommunityIcons name="barcode" size={16} color={colors.muted} />
            <Text style={styles.skuText}>
              {sku ? sku : "بدون منتج"}
            </Text>
          </View>

          <View style={styles.actionsContainer}>
            

            <TouchableOpacity 
              style={styles.actionButton}
              onPress={onPressDelete}
            >
              <MaterialCommunityIcons name="trash-can" size={20} color={colors.muted} />
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </View>
  );
};

export default BannerList;

const styles = StyleSheet.create({
  container: {
    backgroundColor: colors.white,
    borderRadius: 12,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: colors.light,
    overflow: 'hidden',
  },
  contentContainer: {
    width: '100%',
  },
  imageContainer: {
    width: '100%',
    height: width * 0.4,
    backgroundColor: colors.light,
  },
  bannerImage: {
    width: '100%',
    height: '100%',
  },
  imagePlaceholder: {
    width: '100%',
    height: '100%',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 8,
  },
  placeholderText: {
    color: colors.muted,
    fontSize: 14,
    textAlign: 'right',
  },
  infoContainer: {
    flexDirection: 'row-reverse',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 12,
    backgroundColor: colors.white,
  },
  skuContainer: {
    flexDirection: 'row-reverse',
    alignItems: 'center',
    gap: 8,
    padding: 8,
    backgroundColor: colors.light,
    borderRadius: 8,
  },
  skuText: {
    color: colors.dark,
    fontSize: 14,
    fontWeight: '500',
    textAlign: 'right',
  },
  actionsContainer: {
    flexDirection: 'row-reverse',
    gap: 8,
  },
  actionButton: {
    width: 40,
    height: 40,
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: colors.light,
  },
});
