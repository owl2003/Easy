import React, { useState, useEffect } from "react";
import {
  StyleSheet,
  Text,
  Image,
  StatusBar,
  View,
  KeyboardAvoidingView,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
} from "react-native";
import { colors } from "../../constants";
import CustomInput from "../../components/CustomInput";
import CustomButton from "../../components/CustomButton";
import { Ionicons, AntDesign } from "@expo/vector-icons";
import CustomAlert from "../../components/CustomAlert/CustomAlert";
import * as ImagePicker from "expo-image-picker";
import DropDownPicker from "react-native-dropdown-picker";
import { supabase } from "../../supabase"; // Import Supabase client
import ProgressDialog from "react-native-progress-dialog";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import { I18nManager } from 'react-native';

I18nManager.allowRTL(false);
I18nManager.forceRTL(false);

const AddProductScreen = ({ navigation, route }) => {
  const { authUser } = route.params;
  const [isLoading, setIsLoading] = useState(false);
  const [title, setTitle] = useState("");
  const [price, setPrice] = useState("");
  const [sku, setSku] = useState("");
  const [image, setImage] = useState(null);
  const [error, setError] = useState("");
  const [quantity, setQuantity] = useState("");
  const [description, setDescription] = useState("");
  const [category, setCategory] = useState(null);
  const [alertType, setAlertType] = useState("error");
  const [open, setOpen] = useState(false);
  const [items, setItems] = useState([]);
  const [brand, setBrand] = useState(null);
  const [maxQuantity, setMaxQuantity] = useState("");
  const [brandOpen, setBrandOpen] = useState(false);
  const [brandItems] = useState([
    { label: 'Bimo', value: 'bimo' },
    { label: 'Palmary', value: 'palmary' },
    { label: 'Bifa', value: 'bifa' },
  ]);

  // Fetch categories from Supabase
  const fetchCategories = async () => {
    setIsLoading(true);
    setError("");

    try {
      const { data, error } = await supabase.from("categories").select("*");

      if (error) {
        setError("حدث خطأ أثناء جلب الفئات");
        console.log("Supabase Error:", error);
        return;
      }

      const categoryItems = data.map((cat) => ({
        label: cat.title,
        value: cat.id,
      }));
      setItems(categoryItems);
    } catch (error) {
      setError("حدث خطأ غير متوقع");
      console.log("Error:", error);
    } finally {
      setIsLoading(false);
    }
  };

  // Upload image to Supabase Storage
  const uploadImage = async (uri) => {
    const formData = new FormData();
    formData.append("file", {
      uri,
      name: "product.png",
      type: "image/png",
    });

    const { data, error } = await supabase.storage
      .from("product-images")
      .upload(`products/${Date.now()}.png`, formData);

    if (error) {
      setError("حدث خطأ أثناء تحميل الصورة");
      console.log("Supabase Storage Error:", error);
      return null;
    }

    return data.path;
  };

  // Request media library permissions
  const requestMediaLibraryPermission = async () => {
    try {
      console.log('Requesting media library permissions...');
      const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
      console.log('Media library permission status:', status);
      if (status !== 'granted') {
        Alert.alert(
          'Permission Needed', 
          'Sorry, we need camera roll permissions to make this work!',
          [{ text: 'OK' }]
        );
        return false;
      }
      return true;
    } catch (error) {
      console.error('Permission request error:', error);
      Alert.alert('Error', 'Failed to request media library permissions');
      return false;
    }
  };

  // Handle image selection
  const pickImage = async () => {
    try {
      console.log('Picking image...');
      console.log('ImagePicker object:', ImagePicker);
      
      // First, request permissions
      const hasPermission = await requestMediaLibraryPermission();
      if (!hasPermission) return;

      // Launch image picker
      let result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        aspect: [1, 1],
        quality: 0.5,
      });

      console.log('Image Picker Result:', result); // Detailed logging

      if (!result.canceled && result.assets && result.assets.length > 0) {
        setImage(result.assets[0].uri);
      } else {
        console.log('No image selected or canceled');
      }
    } catch (error) {
      console.error('Image picker error:', error);
      console.error('Error stack:', error.stack);
      Alert.alert('Error', 'Failed to pick an image');
    }
  };

  // Updated function to generate 5-digit SKU
  const generateSKU = () => {
    // Generate a random 5-digit number
    const number = Math.floor(10000 + Math.random() * 90000);
    return `P${number}`; // P prefix + 5 digits
  };

  // Use effect to set initial SKU when component mounts
  useEffect(() => {
    setSku(generateSKU());
  }, []);

  // Add product to Supabase
  const addProductHandle = async () => {
    setIsLoading(true);
    setError("");

    // Input validation - remove brand from required fields
    if (!title || !price || !sku || !quantity || !category || !image) {
      setError("الرجاء ملء جميع الحقول الإلزامية");
      setIsLoading(false);
      return;
    }

    try {
      const imageUrl = await uploadImage(image);
      if (!imageUrl) {
        setIsLoading(false);
        return;
      }

      // Insert product with optional brand field
      const { data, error } = await supabase.from("products").insert([
        {
          title,
          sku,
          price: parseFloat(price),
          image_url: imageUrl,
          description,
          category_id: category,
          quantity: parseInt(quantity),
          brand: brand || null, // Make brand optional
          max: maxQuantity ? parseInt(maxQuantity) : null,
        },
      ]);

      if (error) {
        setError("حدث خطأ أثناء إضافة المنتج");
        console.log("Supabase Insert Error:", error);
        return;
      }

      setAlertType("success");
      setError("تمت إضافة المنتج بنجاح");
      setTimeout(() => {
        navigation.goBack();
      }, 2000);
    } catch (error) {
      setError("حدث خطأ غير متوقع");
      console.log("Error:", error);
    } finally {
      setIsLoading(false);
    }
  };

  // Fetch categories on initial render
  useEffect(() => {
    fetchCategories();
  }, []);

  return (
    <KeyboardAvoidingView style={styles.container}>
      <StatusBar />
      <ProgressDialog visible={isLoading} label={"جاري الإضافة ..."} />
      <View style={styles.TopBarContainer}>
        <TouchableOpacity onPress={() => navigation.goBack()}>
          <Ionicons
            name="arrow-back-circle-outline"
            size={30}
            color={colors.muted}
          />
        </TouchableOpacity>
      </View>
      <View style={styles.screenNameContainer}>
        <Text style={styles.screenNameText}>إضافة منتج</Text>
        <Text style={styles.screenNameParagraph}>أضف تفاصيل المنتج</Text>
      </View>
      <CustomAlert message={error} type={alertType} />
      <ScrollView
        showsVerticalScrollIndicator={false}
        style={{ flex: 1, width: "100%" }}
      >
        <View style={styles.formContainer}>
          <View style={styles.imageContainer}>
            {image ? (
              <Image source={{ uri: image }} style={{ width: 200, height: 200, borderRadius: 10 }} />
            ) : (
              <View style={styles.imageHolder}>
                <TouchableOpacity onPress={pickImage}>
                  <MaterialCommunityIcons 
                    name="camera-plus" 
                    size={50} 
                    color={colors.muted} 
                  />
                </TouchableOpacity>
              </View>
            )}
          </View>

          <View style={styles.skuContainer}>
            <CustomInput
              value={sku}
              setValue={setSku}
              placeholder={"SKU"}
              placeholderTextColor={colors.muted}
              radius={5}
              style={styles.skuInput}
            />
            <TouchableOpacity 
              style={styles.refreshButton}
              onPress={() => setSku(generateSKU())}
            >
              <MaterialCommunityIcons 
                name="refresh" 
                size={20} 
                color={colors.primary} 
              />
            </TouchableOpacity>
          </View>

          <CustomInput
            value={title}
            setValue={setTitle}
            placeholder={"العنوان"}
            placeholderTextColor={colors.muted}
            radius={5}
          />
          <CustomInput
            value={price}
            setValue={setPrice}
            placeholder={"السعر"}
            keyboardType={"number-pad"}
            placeholderTextColor={colors.muted}
            radius={5}
          />
          <CustomInput
            value={quantity}
            setValue={setQuantity}
            placeholder={"الكمية"}
            keyboardType={"number-pad"}
            placeholderTextColor={colors.muted}
            radius={5}
          />
          <CustomInput
            value={description}
            setValue={setDescription}
            placeholder={"الوصف"}
            placeholderTextColor={colors.muted}
            radius={5}
          />
          <CustomInput
            value={maxQuantity}
            setValue={setMaxQuantity}
            placeholder={"الحد الأقصى للشراء (اختياري)"}
            keyboardType={"number-pad"}
            placeholderTextColor={colors.muted}
            radius={5}
          />
        </View>
      </ScrollView>
      <View style={styles.dropdownWrapper}>
        <DropDownPicker
          placeholder={"اختر العلامة التجارية (اختياري)"}
          open={brandOpen}
          value={brand}
          items={brandItems}
          setOpen={setBrandOpen}
          setValue={setBrand}
          style={styles.dropdown}
          dropDownContainerStyle={styles.dropdownContainer}
          labelStyle={styles.dropdownLabel}
          zIndex={2000}
        />
      </View>
      <View style={styles.dropdownWrapper}>
        <DropDownPicker
          placeholder={"اختر فئة المنتج"}
          open={open}
          value={category}
          items={items}
          setOpen={setOpen}
          setValue={setCategory}
          setItems={setItems}
          style={styles.dropdown}
          dropDownContainerStyle={styles.dropdownContainer}
          labelStyle={styles.dropdownLabel}
          zIndex={1000}
        />
      </View>
      <View style={styles.buttomContainer}>
        <CustomButton text={"إضافة المنتج"} onPress={addProductHandle} />
      </View>
    </KeyboardAvoidingView>
  );
};

export default AddProductScreen;

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.light,
    padding: 20,
  },
  TopBarContainer: {
    width: "100%",
    flexDirection: "row",
    justifyContent: "flex-start",
    alignItems: "center",
    marginBottom: 10,
  },
  screenNameContainer: {
    width: "100%",
    marginBottom: 20,
    alignItems: "flex-end",
  },
  screenNameText: {
    fontSize: 30,
    fontWeight: "800",
    color: colors.primary,
    textAlign: "left",
  },
  screenNameParagraph: {
    fontSize: 16,
    color: colors.muted,
    textAlign: "left",
  },
  formContainer: {
    width: "100%",
  },
  imageContainer: {
    width: "100%",
    height: 250,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: colors.white,
    borderRadius: 10,
    marginBottom: 20,
    elevation: 5,
  },
  imageHolder: {
    width: 200,
    height: 200,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: colors.light,
    borderRadius: 10,
    elevation: 5,
  },
  dropdownWrapper: {
    marginBottom: 15,
    zIndex: 1000,
  },
  dropdown: {
    borderColor: colors.white,
    backgroundColor: colors.white,
    borderRadius: 5,
    paddingHorizontal: 10,
  },
  dropdownContainer: {
    borderColor: colors.white,
    backgroundColor: colors.white,
    borderRadius: 5,
  },
  dropdownLabel: {
    color: colors.dark,
    textAlign: 'right',
  },
  buttomContainer: {
    width: "100%",
    marginTop: 10,
  },
  skuContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 10,
  },
  skuInput: {
    flex: 1,
  },
  refreshButton: {
    width: 40,
    height: 40,
    borderRadius: 8,
    backgroundColor: colors.light,
    justifyContent: 'center',
    alignItems: 'center',
  },
});