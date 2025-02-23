import { StyleSheet, Text, View, Image, TouchableOpacity, TextInput } from "react-native";
import React from "react";
import { colors } from "../../constants"; // Assuming you have a colors constant file
import Swipeable from "react-native-gesture-handler/Swipeable";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import { Ionicons } from "@expo/vector-icons";

const CartProductList = ({
  image,
  title,
  price,
  quantity = 1,
  handleDelete,
  onPressDecrement,
  onPressIncrement,
  maxLimit,
  currentQuantity,
  onQuantityChange,
  isVerified,
}) => {
  const rightSwipe = () => {
    return (
      <View style={styles.deleteButtonContainer}>
        <TouchableOpacity onPress={handleDelete}>
          <MaterialCommunityIcons
            name="delete"
            size={25}
            color={colors.primary}
          />
        </TouchableOpacity>
      </View>
    );
  };

  return (
    <GestureHandlerRootView>
      <View style={styles.containerOuter}>
        <Swipeable renderRightActions={rightSwipe}>
          <View style={styles.container}>
            <View style={styles.imageContainer}>
              <Image
                source={{ uri: image || "https://via.placeholder.com/150" }}
                style={styles.productImage}
                onError={(e) => console.log("Failed to load image:", e.nativeEvent.error)}
              />
            </View>
            <View style={styles.productInfoContainer}>
              <Text style={styles.productTitle}>{title}</Text>
              <Text style={styles.productQuantitySm}>x{quantity}</Text>
              <View style={styles.productListBottomContainer}>
                <Text style={styles.productPrice}>{price * quantity} دج</Text>
                <View style={styles.quantityContainer}>
                  <TouchableOpacity
                    style={styles.quantityButton}
                    onPress={onPressDecrement}
                  >
                    <Text style={styles.quantityButtonText}>-</Text>
                  </TouchableOpacity>

                  <TextInput
                    style={styles.quantityInput}
                    value={quantity.toString()}
                    onChangeText={onQuantityChange}
                    keyboardType="numeric"
                    maxLength={3}
                    selectTextOnFocus
                    textAlign="center"
                  />

                  <TouchableOpacity
                    style={styles.quantityButton}
                    onPress={onPressIncrement}
                  >
                    <Text style={styles.quantityButtonText}>+</Text>
                  </TouchableOpacity>
                </View>
              </View>
            </View>
          </View>
        </Swipeable>
      </View>
    </GestureHandlerRootView>
  );
};

export default CartProductList;

const styles = StyleSheet.create({
  container: {
    display: "flex",
    flexDirection: "row-reverse",
    justifyContent: "flex-start",
    alignItems: "center",
    backgroundColor: colors.white,
    height: 120,
    borderRadius: 15,
    width: "100%",
    padding: 10,
    marginBottom: 10,
    elevation: 2,
  },
  containerOuter: {
    backgroundColor: colors.primary_light,
    height: 120,
    borderRadius: 15,
    width: "100%",
    marginBottom: 10,
  },
  productImage: {
    width: 100,
    height: 100,
    borderRadius: 10,
  },
  imageContainer: {
    backgroundColor: colors.light,
    borderRadius: 10,
  },
  productInfoContainer: {
    padding: 10,
    height: "100%",
    display: "flex",
    flexDirection: "column",
    justifyContent: "space-between",
    alignItems: "flex-end",
  },
  productTitle: {
    fontSize: 18,
    fontWeight: "bold",
    color: colors.dark,
    textAlign: 'right',
  },
  productQuantitySm: {
    fontSize: 15,
    fontWeight: "bold",
    color: colors.muted,
    textAlign: 'right',
  },
  productPrice: {
    fontSize: 15,
    color: colors.primary, 
    paddingHorizontal: 10,

  },
  deleteButtonContainer: {
    flexDirection: "row-reverse",
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: colors.primary_light,
    borderTopStartRadius: 15,
    borderBottomLeftRadius: 15,
    marginBottom: 10,
    width: 70,
  },
  productListBottomContainer: {
    width: "auto",
    paddingLeft: 10,
    flexDirection: "row-reverse",
    justifyContent: "space-between",
    alignItems: "center",
  },
  quantityContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#E0E0E0',
    borderRadius: 8,
    overflow: 'hidden',

  },
  quantityButton: {
    padding: 8,
    backgroundColor: '#F5F5F5',
    width: 35,
    alignItems: 'center',
  },
  quantityButtonText: {
    fontSize: 16,
    color: '#333',
  },
  quantityInput: {
    width: 40,
    height: 35,
    backgroundColor: '#FFFFFF',
    fontSize: 16,
    padding: 0,
  },
  maxLimit: {
    fontSize: 12,
    color: colors.muted,
    marginRight: 0,
  },
});