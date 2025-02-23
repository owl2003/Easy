import {
  StyleSheet,
  Text,
  View,
  StatusBar,
  TouchableOpacity,
  Alert,
  ActivityIndicator,
} from "react-native";
import React, { useState } from "react";
import UserProfileCard from "../../components/UserProfileCard/UserProfileCard";
import { Ionicons, MaterialIcons } from "@expo/vector-icons";
import OptionList from "../../components/OptionList/OptionList";
import { colors } from "../../constants";
import { supabase } from "../../supabase"; // Import Supabase client
import { I18nManager } from 'react-native';

I18nManager.allowRTL(false);
I18nManager.forceRTL(false);

const MyAccountScreen = ({ navigation, route }) => {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const { user } = route.params;

  // Method to delete the account using Supabase
  const deleteAccountHandle = async () => {
    setLoading(true);
    setError("");

    try {
      // Delete the user from Supabase Auth
      const { error: authError } = await supabase.auth.admin.deleteUser(user.id);

      if (authError) {
        setError("حدث خطأ أثناء حذف الحساب");
        console.log("Supabase Auth Error:", authError);
        return;
      }

      // Delete the user from the `users` table
      const { error: dbError } = await supabase
        .from("users")
        .delete()
        .eq("id", user.id);

      if (dbError) {
        setError("حدث خطأ أثناء حذف بيانات المستخدم");
        console.log("Supabase DB Error:", dbError);
        return;
      }

      // Navigate to the login screen after successful deletion
      navigation.replace("login");
    } catch (error) {
      setError("حدث خطأ غير متوقع");
      console.log("Error:", error);
    } finally {
      setLoading(false);
    }
  };

  // Method to show a confirmation dialog for account deletion
  const showConfirmDialog = () => {
    return Alert.alert(
      "هل أنت متأكد؟",
      "هل أنت متأكد أنك تريد حذف حسابك؟",
      [
        {
          text: "نعم",
          onPress: deleteAccountHandle,
        },
        {
          text: "لا",
        },
      ]
    );
  };

  return (
    <View style={styles.container}>
      <StatusBar style="auto" />
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
        <Text style={styles.screenNameText}>حسابي</Text>
      </View>
      <View style={styles.UserProfileCardContianer}>
        <UserProfileCard
          Icon={Ionicons}
          name={user.first_name+ ' ' + user.last_name || "مستخدم"}
          email={user.email}
        />
      </View>
      <View style={styles.OptionsContainer}>
        <OptionList
          text={"تغيير كلمة المرور"}
          Icon={Ionicons}
          iconName={"key-sharp"}
          onPress={() =>
            navigation.navigate("updatepassword", {
              userID: user.id,
            })
          }
        />
        <OptionList
          text={"حذف حسابي"}
          Icon={MaterialIcons}
          iconName={"delete"}
          type={"danger"}
          onPress={showConfirmDialog}
        />
      </View>
      {loading && (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={colors.primary} />
        </View>
      )}
      {error && (
        <View style={styles.errorContainer}>
          <Text style={styles.errorText}>{error}</Text>
        </View>
      )}
    </View>
  );
};

export default MyAccountScreen;

const styles = StyleSheet.create({
  container: {
    width: "100%",
    flexDirecion: "row",
    backgroundColor: colors.light,
    alignItems: "center",
    justifyContent: "flex-start",
    padding: 20,
    flex: 1,
  },
  TopBarContainer: {
    width: "100%",
    display: "flex",
    flexDirection: "row",
    justifyContent: "flex-start",
    alignItems: "center",
    marginBottom: 10,
  },
  UserProfileCardContianer: {
    width: "100%",
    height: "25%",
    marginBottom: 20,
  },
  screenNameContainer: {
    width: "100%",
    display: "flex",
    flexDirection: "row",
    justifyContent: "flex-start",
    alignItems: "center",
    marginBottom: 20,
  },
  screenNameText: {
    fontSize: 30,
    fontWeight: "800",
    color: colors.primary,
    textAlign: "right", // Align text to the right for Arabic
  },
  OptionsContainer: {
    width: "100%",
  },
  loadingContainer: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "rgba(255, 255, 255, 0.8)",
  },
  errorContainer: {
    width: "100%",
    padding: 10,
    backgroundColor: colors.danger_light,
    borderRadius: 5,
    marginTop: 10,
  },
  errorText: {
    fontSize: 14,
    color: colors.danger,
    textAlign: "center",
  },
});