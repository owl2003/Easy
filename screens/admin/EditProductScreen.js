import {
  StyleSheet,
  Text,
  Image,
  StatusBar,
  View,
  KeyboardAvoidingView,
  ScrollView,
  TouchableOpacity,
} from "react-native";
import React, { useEffect, useState } from "react";
import { colors } from "../../constants";
import CustomInput from "../../components/CustomInput";
import CustomButton from "../../components/CustomButton";
import { Ionicons, AntDesign } from "@expo/vector-icons";
import CustomAlert from "../../components/CustomAlert/CustomAlert";
import * as ImagePicker from "expo-image-picker";
import ProgressDialog from "react-native-progress-dialog";
import { supabase } from "../../supabase"; // Import Supabase client
import DropDownPicker from "react-native-dropdown-picker";
import { I18nManager } from 'react-native';

I18nManager.allowRTL(false);
I18nManager.forceRTL(false);

const EditProductScreen = ({ navigation, route }) => {
  const { product, authUser } = route.params;
  const [isloading, setIsloading] = useState(false);
  const [label, setLabel] = useState("جاري التحديث...");
  const [title, setTitle] = useState("");
  const [price, setPrice] = useState("");
  const [sku, setSku] = useState("");
  const [image, setImage] = useState("");
  const [error, setError] = useState("");
  const [quantity, setQuantity] = useState("");
  const [description, setDescription] = useState("");
  const [category, setCategory] = useState(null);
  const [alertType, setAlertType] = useState("error");
  const [open, setOpen] = useState(false);
  const [categories, setCategories] = useState([]);
  const [items, setItems] = useState([]);
  const [brand, setBrand] = useState(null);
  const [maxQuantity, setMaxQuantity] = useState("");
  const [brandOpen, setBrandOpen] = useState(false);
  const [brandItems] = useState([
    { label: 'Bimo', value: 'bimo' },
    { label: 'Palmary', value: 'palmary' },
    { label: 'Bifa', value: 'bifa' },
  ]);

  // جلب الفئات من Supabase
  const fetchCategories = async () => {
    setIsloading(true);
    setError("");

    try {
      const { data, error } = await supabase.from("categories").select("*");

      if (error) {
        setError("فشل في جلب الفئات");
        console.log("خطأ Supabase:", error);
        return;
      }

      const categoryItems = data.map((cat) => ({
        label: cat.title,
        value: cat.id,
      }));
      setCategories(data);
      setItems(categoryItems);
    } catch (error) {
      setError("حدث خطأ غير متوقع");
      console.log("خطأ:", error);
    } finally {
      setIsloading(false);
    }
  };

  // تحديث المنتج
  const editProductHandle = async () => {
    setIsloading(true);
    setError("");

    // Input validation
    if (!title || !price || !quantity || !category) {
      setError("الرجاء إدخال الحقول الإلزامية");
      setIsloading(false);
      return;
    }

    try {
      const { error } = await supabase
        .from("products")
        .update({
          title,
          sku,
          price: parseFloat(price),
          description,
          category_id: category,
          quantity: parseInt(quantity),
          brand: brand || null, // Optional brand
          max: maxQuantity ? parseInt(maxQuantity) : null, // Optional max quantity
        })
        .eq("id", product.id);

      if (error) {
        setIsloading(false);
        return setError("فشل في تحديث المنتج");
      }

      setIsloading(false);
      setError("تم تحديث المنتج بنجاح");
      setAlertType("success");
      navigation.goBack();
    } catch (error) {
      setIsloading(false);
      setError("حدث خطأ أثناء تحديث المنتج");
    }
  };

  // Set all the input fields and image on initial render
  useEffect(() => {
    if (product.image_url) {
      const { data: imageData } = supabase
        .storage
        .from("product-images")
        .getPublicUrl(product.image_url);

      setImage(imageData?.publicUrl || "");
    }
    setTitle(product.title);
    setSku(product.sku);
    setQuantity(product.quantity.toString());
    setPrice(product.price.toString());
    setDescription(product.description);
    setCategory(product.category_id);
    setBrand(product.brand); // Set brand from product data
    setMaxQuantity(product.max ? product.max.toString() : ""); // Set max quantity if exists
    fetchCategories();
  }, []);

  return (
    <KeyboardAvoidingView style={styles.container}>
      <StatusBar />
      <ProgressDialog visible={isloading} label={label} />
      <View style={styles.TopBarContainer}>
        <TouchableOpacity 
          onPress={() => navigation.goBack()}
          accessibilityLabel="رجوع"
        >
          <Ionicons
            name="arrow-back-circle-outline"
            size={30}
            color={colors.muted}
          />
        </TouchableOpacity>
      </View>
      <View style={styles.screenNameContainer}>
        <View>
          <Text style={styles.screenNameText}>تعديل المنتج</Text>
        </View>
        <View>
          <Text style={styles.screenNameParagraph}>تعديل تفاصيل المنتج</Text>
        </View>
      </View>
      <CustomAlert message={error} type={alertType} />
      <ScrollView style={{ flex: 1, width: "100%" }}>
        <View style={styles.formContainer}>
          <View style={styles.imageContainer}>
            <View style={styles.imageHolder}>
              {image ? (
                <Image
                  source={{ uri: image }}
                  style={{ width: 200, height: 200, borderRadius: 10 }}
                />
              ) : (
                <AntDesign name="picture" size={50} color={colors.muted} />
              )}
            </View>
          </View>
          <CustomInput
            value={sku}
            setValue={setSku}
            placeholder={"الكود"}
            placeholderTextColor={colors.muted}
            radius={5}
          />
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
        </View>
      </ScrollView>
      <View style={styles.buttomContainer}>
        <CustomButton text={"تحديث المنتج"} onPress={editProductHandle} />
      </View>
    </KeyboardAvoidingView>
  );
};

export default EditProductScreen;

const styles = StyleSheet.create({
  container: {
    flexDirecion: "row",
    backgroundColor: colors.light,
    alignItems: "center",
    justifyContent: "center",
    padding: 20,
    flex: 1,
  },
  TopBarContainer: {
    width: "100%",
    display: "flex",
    flexDirection: "row",
    justifyContent: "flex-start",
    alignItems: "center",
  },
  formContainer: {
    flex: 2,
    justifyContent: "flex-start",
    alignItems: "center",
    display: "flex",
    width: "100%",
    flexDirecion: "row",
    padding: 5,
  },
  buttomContainer: {
    width: "100%",
  },
  bottomContainer: {
    marginTop: 10,
    display: "flex",
    flexDirection: "row",
    justifyContent: "center",
  },
  screenNameContainer: {
    marginTop: 10,
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
    textAlign: "right",
  },
  screenNameParagraph: {
    marginTop: 5,
    fontSize: 15,
    textAlign: "right",
  },
  imageContainer: {
    display: "flex",
    justifyContent: "space-evenly",
    alignItems: "center",
    width: "100%",
    height: 250,
    backgroundColor: colors.white,
    borderRadius: 10,
    elevation: 5,
    paddingLeft: 20,
    paddingRight: 20,
  },
  imageHolder: {
    height: 200,
    width: 200,
    display: "flex",
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: colors.light,
    borderRadius: 10,
    elevation: 5,
  },
  dropdownWrapper: {
    marginBottom: 15,
    zIndex: 1000,
    width: '100%',
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
});