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
  import React, { useState, useEffect } from "react";
  import { colors } from "../../constants";
  import CustomInput from "../../components/CustomInput";
  import CustomButton from "../../components/CustomButton";
  import { Ionicons } from "@expo/vector-icons";
  import CustomAlert from "../../components/CustomAlert/CustomAlert";
  import * as ImagePicker from "expo-image-picker";
  import ProgressDialog from "react-native-progress-dialog";
  import { AntDesign } from "@expo/vector-icons";
  import { supabase } from "../../supabase";
  import { decode } from 'base64-arraybuffer';
  import { I18nManager } from 'react-native';

I18nManager.allowRTL(false);
I18nManager.forceRTL(false);
  
  const AddPubScreen = ({ navigation, route }) => {
    const [isloading, setIsloading] = useState(false);
    const [sku, setSku] = useState("");
    const [image, setImage] = useState(null);
    const [error, setError] = useState("");
    const [alertType, setAlertType] = useState("error");
    const [session, setSession] = useState(null);
  
    // Check auth status on mount
    useEffect(() => {
      supabase.auth.getSession().then(({ data: { session } }) => {
        setSession(session);
      });

      const {
        data: { subscription },
      } = supabase.auth.onAuthStateChange((_event, session) => {
        setSession(session);
      });

      return () => subscription.unsubscribe();
    }, []);
  
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
          aspect: [350, 140],
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
  
    const uploadImage = async (uri) => {
      if (!session) {
        setError("يجب تسجيل الدخول أولاً");
        return null;
      }

      const formData = new FormData();
      formData.append("file", {
        uri,
        name: "banner.png",
        type: "image/png",
      });
  
      const fileName = `banner-${Date.now()}.png`;
      
      const { data, error } = await supabase.storage
        .from("banner")
        .upload(fileName, formData, {
          upsert: false,
          cacheControl: '3600',
        });
  
      if (error) {
        console.log("Supabase Storage Error:", error);
        setError("حدث خطأ أثناء تحميل الصورة");
        return null;
      }
  
      const { data: { publicUrl } } = supabase.storage
        .from("banner")
        .getPublicUrl(fileName);
  
      return publicUrl;
    };
  
    const addBannerHandle = async () => {
      setIsloading(true);
      setError("");
  
      try {
        if (!image) {
          setError("الرجاء اختيار صورة");
          setIsloading(false);
          return;
        }
  
        // Upload image
        const imageUrl = await uploadImage(image);
        if (!imageUrl) {
          setIsloading(false);
          return;
        }
  
        // Insert banner record
        const { error: insertError } = await supabase
          .from("banners")
          .insert([{
            image_url: imageUrl,
            sku: sku ? parseInt(sku) : null
          }]);
  
        if (insertError) {
          setError("حدث خطأ أثناء إضافة الإعلان");
          console.log("Supabase Insert Error:", insertError);
          return;
        }
  
        // Success
        setAlertType("success");
        setError("تم إضافة الإعلان بنجاح");
        
        // Clear form
        setSku("");
        setImage(null);
  
        // Navigate back
        setTimeout(() => {
          navigation.goBack();
        }, 2000);
  
      } catch (error) {
        setError("حدث خطأ غير متوقع");
        console.log("Error:", error);
      } finally {
        setIsloading(false);
      }
    };
  
    return (
      <KeyboardAvoidingView style={styles.container}>
        <StatusBar />
        <ProgressDialog visible={isloading} label={"جاري الإضافة..."} />
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
          <View>
            <Text style={styles.screenNameText}>إضافة إعلان</Text>
          </View>
          <View>
            <Text style={styles.screenNameParagraph}>أدخل تفاصيل الإعلان</Text>
          </View>
        </View>
        <CustomAlert message={error} type={alertType} />
        <ScrollView
          showsVerticalScrollIndicator={false}
          style={{ flex: 1, width: "100%" }}
        >
          <View style={styles.formContainer}>
            <View style={styles.imageContainer}>
              {image ? (
                <TouchableOpacity style={styles.imageHolder} onPress={pickImage}>
                  <Image
                    source={{ uri: image }}
                    style={{ width: 200, height: 200, borderRadius: 10 }}
                  />
                </TouchableOpacity>
              ) : (
                <TouchableOpacity style={styles.imageHolder} onPress={pickImage}>
                  <AntDesign name="pluscircle" size={50} color={colors.muted} />
                </TouchableOpacity>
              )}
            </View>
  
            <CustomInput
              value={sku}
              setValue={setSku}
              placeholder={"رقم المنتج (اختياري)"}
              placeholderTextColor={colors.muted}
              radius={5}
              keyboardType="numeric"
            />
          </View>
        </ScrollView>
        
        <View style={styles.buttomContainer}>
          <CustomButton text={'إضافة الإعلان'} onPress={addBannerHandle} />
        </View>
      </KeyboardAvoidingView>
    );
  };
  
  export default AddPubScreen;
  
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
      flex: 2,
      justifyContent: "flex-start",
      alignItems: "center",
      width: "100%",
      padding: 5,
    },
    buttomContainer: {
      width: "100%",
      marginTop: 10,
    },
    screenNameContainer: {
      width: "100%",
      marginTop: 10,
      marginBottom: 20,
    },
    screenNameText: {
      fontSize: 30,
      fontWeight: "800",
      color: colors.muted,
      textAlign: 'right',
    },
    screenNameParagraph: {
      fontSize: 15,
      textAlign: 'right',
    },
    imageContainer: {
      width: "100%",
      height: 200,
      backgroundColor: colors.white,
      borderRadius: 10,
      marginBottom: 20,
      overflow: 'hidden',
      elevation: 3,
    },
    imageHolder: {
      width: "100%",
      height: "100%",
      display: "flex",
      justifyContent: "center",
      alignItems: "center",
      backgroundColor: colors.light,
    },
    previewImage: {
      width: "100%",
      height: "100%",
      resizeMode: "cover",
    },
    uploadText: {
      color: colors.muted,
      fontSize: 16,
      marginTop: 10,
    }
  });
  