import {
  StyleSheet,
  Text,
  StatusBar,
  View,
  KeyboardAvoidingView,
  ScrollView,
  TouchableOpacity,
  Image,
} from "react-native";
import React, { useState } from "react";
import { colors } from "../../constants";
import CustomInput from "../../components/CustomInput";
import CustomButton from "../../components/CustomButton";
import CustomAlert from "../../components/CustomAlert/CustomAlert";
import ProgressDialog from "react-native-progress-dialog";
import { supabase } from "../../supabase";
import * as ImagePicker from 'expo-image-picker';
import { MaterialCommunityIcons } from "@expo/vector-icons";

const AddCategoryScreen = ({ navigation, route }) => {
  const { authUser } = route.params;
  const [isloading, setIsloading] = useState(false);
  const [title, setTitle] = useState("");
  const [selectedImage, setSelectedImage] = useState(null);
  const [description, setDescription] = useState("");
  const [error, setError] = useState("");
  const [alertType, setAlertType] = useState("error");

  // Updated image picker function
  const pickImage = async () => {
    try {
      // Request permission first
      const permissionResult = await ImagePicker.requestMediaLibraryPermissionsAsync();
      
      if (!permissionResult.granted) {
        setError("يرجى منح إذن الوصول إلى المعرض");
        return;
      }

      // Launch image picker with correct options
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        aspect: [1, 1],
        quality: 0.8,
      });

      if (!result.canceled) { // Handle both new and old API versions
        const imageUri = result.assets ? result.assets[0].uri : result.uri;
        setSelectedImage(imageUri);
      }
    } catch (error) {
      console.error("Error picking image:", error);
      setError("حدث خطأ أثناء اختيار الصورة");
    }
  };

  // Updated upload image function
  const uploadImage = async (uri) => {
    try {
      if (!uri) return null;

      // Create FormData object
      const formData = new FormData();
      formData.append("file", {
        uri,
        name: "category.png",
        type: "image/png",
      });

      // Upload to Supabase
      const { data, error } = await supabase.storage
        .from('category-icon')
        .upload(`icons/${Date.now()}.png`, formData);

      if (error) {
        console.error("Storage error:", error);
        setError("فشل في تحميل الصورة");
        return null;
      }

      return data.path;
    } catch (error) {
      console.error("Upload error:", error);
      setError("حدث خطأ أثناء تحميل الصورة");
      return null;
    }
  };

  const addCategoryHandle = async () => {
    if (isloading) return; // Prevent multiple submissions
    setIsloading(true);
    setError("");

    try {
      // Validation
      if (!title.trim()) {
        setError("الرجاء إدخال عنوان الفئة");
        return;
      }
      if (!description.trim()) {
        setError("الرجاء إدخال وصف الفئة");
        return;
      }
      if (!selectedImage) {
        setError("الرجاء اختيار صورة الفئة");
        return;
      }

      // Upload image
      const imageUrl = await uploadImage(selectedImage);
      if (!imageUrl) {
        return;
      }

      // Add category
      const { error: insertError } = await supabase
        .from("categories")
        .insert([{ 
          title: title.trim(), 
          description: description.trim(), 
          icon: imageUrl 
        }]);

      if (insertError) {
        setError("فشل في إضافة الفئة");
        console.error("Insert error:", insertError);
        return;
      }

      // Success
      setAlertType("success");
      setError("تم إضافة الفئة بنجاح");
      setTimeout(() => {
        navigation.goBack();
      }, 2000);

    } catch (error) {
      console.error("Add category error:", error);
      setError("حدث خطأ غير متوقع");
    } finally {
      setIsloading(false);
    }
  };

  return (
    <KeyboardAvoidingView style={styles.container}>
      <StatusBar />
      <ProgressDialog visible={isloading} label={"جاري الإضافة ..."} />
      <View style={styles.TopBarContainer}>
        <TouchableOpacity onPress={() => navigation.goBack()}>
          <MaterialCommunityIcons
            name="arrow-left-circle-outline"
            size={30}
            color={colors.muted}
          />
        </TouchableOpacity>
      </View>
      <View style={styles.screenNameContainer}>
        <View>
          <Text style={styles.screenNameText}>إضافة فئة</Text>
        </View>
        <View>
          <Text style={styles.screenNameParagraph}>أضف تفاصيل الفئة</Text>
        </View>
      </View>
      <CustomAlert message={error} type={alertType} />
      <ScrollView
        showsVerticalScrollIndicator={false}
        style={{ flex: 1, width: "100%" }}
      >
        <View style={styles.formContainer}>
          <CustomInput
            value={title}
            setValue={setTitle}
            placeholder={"العنوان"}
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

          {/* Image picker button */}
          <TouchableOpacity
            style={styles.iconContainer}
            onPress={pickImage}
          >
            {selectedImage ? (
              <Image 
                source={{ uri: selectedImage }} 
                style={styles.selectedImage} 
                onError={(error) => console.log('Image loading error:', error)}
              />
            ) : (
              <Text style={styles.iconPlaceholderText}>
                اضغط لاختيار صورة الفئة
              </Text>
            )}
          </TouchableOpacity>
        </View>
      </ScrollView>

      <View style={styles.buttomContainer}>
        <CustomButton text={"إضافة الفئة"} onPress={addCategoryHandle} />
      </View>
    </KeyboardAvoidingView>
  );
};

export default AddCategoryScreen;

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.light,
    alignItems: "center",
    justifyContent: "center",
    padding: 20,
  },
  TopBarContainer: {
    width: "100%",
    flexDirection: "row",
    justifyContent: "flex-start",
    alignItems: "center",
  },
  formContainer: {
    flex: 1,
    width: "100%",
    alignItems: "center",
    padding: 5,
  },
  buttomContainer: {
    marginTop: 10,
    width: "100%",
  },
  screenNameContainer: {
    marginTop: 10,
    width: "100%",
    alignItems: "flex-end",
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
  iconContainer: {
    width: "100%",
    height: 200,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: colors.white,
    borderRadius: 10,
    elevation: 5,
    marginTop: 10,
    overflow: 'hidden'
  },
  iconPlaceholderText: {
    color: colors.muted,
    fontSize: 16,
  },
  selectedImage: {
    width: '100%',
    height: '100%',
    resizeMode: 'cover',
  }
});