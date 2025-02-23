import { StyleSheet, Image, View, Text, TouchableOpacity } from "react-native";
import React from "react";
import { MaterialIcons } from "@expo/vector-icons";
import { colors } from "../../constants";

const CategoryList = ({
  title,
  icon,
  onPressEdit,
  onPressDelete,
}) => {
  return (
    <View style={styles.container}>
      <View style={styles.contentContainer}>
        <View style={styles.imageContainer}>
          {icon ? (
            <Image 
              source={{ uri: icon }} 
              style={styles.categoryIcon}
              resizeMode="contain"
            />
          ) : (
            <View style={styles.iconPlaceholder}>
              <MaterialIcons name="category" size={24} color={colors.muted} />
            </View>
          )}
        </View>

        <View style={styles.categoryInfo}>
          <Text style={styles.categoryTitle}>{title}</Text>
        </View>

        <View style={styles.actionsContainer}>
          <TouchableOpacity
            style={styles.actionButton}
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
        </View>
      </View>
    </View>
  );
};

export default CategoryList;

const styles = StyleSheet.create({
  container: {
    backgroundColor: colors.white,
    borderRadius: 12,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: colors.light,
    overflow: 'hidden',
  },
  contentContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
  },
  imageContainer: {
    marginRight: 12,
  },
  categoryIcon: {
    width: 45,
    height: 45,
    borderRadius: 8,
    backgroundColor: colors.light,
  },
  iconPlaceholder: {
    width: 45,
    height: 45,
    borderRadius: 8,
    backgroundColor: colors.light,
    justifyContent: 'center',
    alignItems: 'center',
  },
  categoryInfo: {
    flex: 1,
  },
  categoryTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.dark,
  },
  actionsContainer: {
    flexDirection: 'row',
    gap: 8,
  },
  actionButton: {
    width: 36,
    height: 36,
    borderRadius: 8,
    backgroundColor: colors.light,
    justifyContent: 'center',
    alignItems: 'center',
  },
});
