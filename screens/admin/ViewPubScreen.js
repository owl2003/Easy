import {
    StyleSheet,
    Text,
    StatusBar,
    View,
    ScrollView,
    TouchableOpacity,
    RefreshControl,
    Alert,
    Dimensions,
  } from "react-native";
  import React, { useState, useEffect } from "react";
  import { colors } from "../../constants";
  import { MaterialCommunityIcons } from "@expo/vector-icons";
  import BannerList from "../../components/BannerList/BannerList";
  import ProgressDialog from "react-native-progress-dialog";
  import { supabase } from "../../supabase";
  import { LinearGradient } from 'expo-linear-gradient';
  import { I18nManager } from 'react-native';

I18nManager.allowRTL(false);
I18nManager.forceRTL(false);
  
  const { width } = Dimensions.get('window');
  const cardSize = width * 0.25;
  
  const StatCard = ({ title, count, icon, color }) => (
    <View style={[styles.statCard, { borderLeftColor: color }]}>
      <View style={[styles.iconContainer, { backgroundColor: color + '20' }]}>
        <MaterialCommunityIcons name={icon} size={18} color={color} />
      </View>
      <View style={styles.statInfo}>
        <Text style={styles.statCount}>{count}</Text>
        <Text style={styles.statTitle}>{title}</Text>
      </View>
    </View>
  );
  
  const ViewPubScreen = ({ navigation, route }) => {
    const [isLoading, setIsLoading] = useState(false);
    const [refreshing, setRefreshing] = useState(false);
    const [banners, setBanners] = useState([]);
    const [error, setError] = useState("");
    const [stats, setStats] = useState({
      total: 0,
      withProduct: 0,
    });
  
    const fetchBanners = async () => {
      setIsLoading(true);
      try {
        const { data, error } = await supabase
          .from('banners')
          .select('*');
  
        if (error) {
          setError(error.message);
        } else {
          setBanners(data);
          setStats({
            total: data.length,
            withProduct: data.filter(banner => banner.sku).length,
          });
          setError("");
        }
      } catch (error) {
        setError(error.message);
      } finally {
        setIsLoading(false);
      }
    };
  
    const handleOnRefresh = () => {
      setRefreshing(true);
      fetchBanners();
      setRefreshing(false);
    };
  
    const showConfirmDialog = (id) => {
      return Alert.alert(
        "هل أنت متأكد؟",
        "هل تريد حذف هذا الإعلان؟",
        [
          {
            text: "نعم",
            onPress: () => handleDelete(id),
          },
          { text: "لا" },
        ]
      );
    };
  
    const handleDelete = async (id) => {
      try {
        const { error } = await supabase
          .from('banners')
          .delete()
          .eq('id', id);
  
        if (error) {
          setError(error.message);
        } else {
          fetchBanners();
        }
      } catch (error) {
        setError(error.message);
      }
    };
  
    useEffect(() => {
      fetchBanners();
    }, []);
  
    return (
      <View style={styles.container}>
        <StatusBar backgroundColor={colors.primary} />
        <ProgressDialog visible={isLoading} label="جاري التحميل..." />
  
        <LinearGradient
          colors={[colors.primary, colors.primary_light]}
          style={styles.header}
        >
          <View style={styles.headerTop}>
            <TouchableOpacity onPress={() => navigation.goBack()}>
              <MaterialCommunityIcons 
                name="arrow-right-circle"
                size={32} 
                color={colors.white} 
              />
            </TouchableOpacity>
            <TouchableOpacity 
              onPress={() => navigation.navigate("addpub", { authUser: route.params?.authUser })}
            >
              <MaterialCommunityIcons name="plus-circle" size={32} color={colors.white} />
            </TouchableOpacity>
          </View>
  
          <View style={styles.headerTitle}>
            <Text style={styles.headerText}>الإعلانات</Text>
            <Text style={styles.headerSubText}>إدارة الإعلانات والبانرات</Text>
          </View>
        </LinearGradient>
  
        <View style={styles.content}>
          <View style={styles.statsContainer}>
            <StatCard
              title="إجمالي الإعلانات"
              count={stats.total}
              icon="view-gallery"
              color="#3B82F6"
            />
            <StatCard
              title="مرتبط بمنتج"
              count={stats.withProduct}
              icon="package-variant"
              color="#10B981"
            />
          </View>
  
          <ScrollView
            showsVerticalScrollIndicator={false}
            refreshControl={
              <RefreshControl refreshing={refreshing} onRefresh={handleOnRefresh} />
            }
            contentContainerStyle={styles.scrollContent}
          >
            {banners.length === 0 ? (
              <View style={styles.emptyContainer}>
                <MaterialCommunityIcons name="image-off" size={64} color={colors.muted} />
                <Text style={styles.emptyText}>لا توجد إعلانات متاحة</Text>
              </View>
            ) : (
              banners.map((banner, index) => (
                <BannerList
                  key={index}
                  image={banner.image_url}
                  sku={banner.sku}
                  onPressDelete={() => showConfirmDialog(banner.id)}
                />
              ))
            )}
          </ScrollView>
        </View>
      </View>
    );
  };
  
  export default ViewPubScreen;
  
  const styles = StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: colors.light,
    },
    header: {
      padding: 15,
      paddingTop: 40,
      borderBottomLeftRadius: 30,
      borderBottomRightRadius: 30,
      elevation: 5,
      marginBottom: 15,
    },
    headerTop: {
      flexDirection: 'row-reverse',
      justifyContent: 'space-between',
      alignItems: 'center',
      marginBottom: 15,
    },
    headerTitle: {
      alignItems: 'flex-end',
      marginBottom: 15,
    },
    headerText: {
      fontSize: 24,
      fontWeight: 'bold',
      color: colors.white,
      textAlign: 'right',
    },
    headerSubText: {
      fontSize: 14,
      color: colors.white,
      opacity: 0.8,
      textAlign: 'right',
    },
    content: {
      flex: 1,
      marginTop: -20,
      zIndex: 1,
      paddingTop: 12,
    },
    statsContainer: {
      flexDirection: 'row-reverse',
      paddingHorizontal: 12,
      gap: 8,
      marginBottom: 12,
    },
    statCard: {
      flex: 1,
      backgroundColor: colors.white,
      borderRadius: 8,
      padding: 10,
      elevation: 2,
      borderRightWidth: 2,
      borderRightColor: colors.primary,
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 1 },
      shadowOpacity: 0.1,
      shadowRadius: 2,
    },
    iconContainer: {
      width: 32,
      height: 32,
      borderRadius: 16,
      justifyContent: 'center',
      alignItems: 'center',
      marginBottom: 6,
    },
    statInfo: {
      alignItems: 'flex-end',
    },
    statCount: {
      fontSize: 16,
      fontWeight: 'bold',
      color: colors.dark,
    },
    statTitle: {
      fontSize: 10,
      color: colors.muted,
      marginTop: 1,
    },
    scrollContent: {
      padding: 12,
    },
    emptyContainer: {
      flex: 1,
      justifyContent: 'center',
      alignItems: 'center',
      paddingVertical: 40,
    },
    emptyText: {
      fontSize: 16,
      color: colors.muted,
      marginTop: 10,
      textAlign: 'right',
    },
  });
  