import {
  StyleSheet,
  Text,
  StatusBar,
  View,
  ScrollView,
  TouchableOpacity,
  RefreshControl,
  Alert,
  I18nManager,
  Dimensions,
} from "react-native";
import React, { useState, useEffect } from "react";
import { colors } from "../../constants";
import CustomInput from "../../components/CustomInput/";
import ProgressDialog from "react-native-progress-dialog";
import UserList from "../../components/UserList/UserList";
import { supabase } from "../../supabase";
import { MaterialIcons, MaterialCommunityIcons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";

// Enable RTL
I18nManager.forceRTL(true);
I18nManager.allowRTL(false);

const { width } = Dimensions.get('window');

const StatCard = ({ title, count, icon, color, onPress, isSelected }) => (
  <TouchableOpacity 
    style={[
      styles.statCard, 
      { borderLeftColor: color },
      isSelected && { borderColor: color, borderWidth: 2 }
    ]} 
    onPress={onPress}
  >
    <View style={[styles.iconContainer, { backgroundColor: color + '20' }]}>
      <MaterialCommunityIcons name={icon} size={24} color={color} />
    </View>
    <View style={styles.statInfo}>
      <Text style={styles.statCount}>{count}</Text>
      <Text style={styles.statTitle}>{title}</Text>
    </View>
  </TouchableOpacity>
);

const ViewUsersScreen = ({ navigation }) => {
  const [allUsers, setAllUsers] = useState([]); // Store all users
  const [filteredUsers, setFilteredUsers] = useState([]); // Store filtered users
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [selectedFilter, setSelectedFilter] = useState('all');
  const [stats, setStats] = useState(null);

  // Separate function to calculate stats
  const calculateStats = (data) => {
    return data.reduce((acc, user) => ({
      total: acc.total + 1,
      verified: acc.verified + (user.is_verified ? 1 : 0),
      vip: acc.vip + (user.is_vip ? 1 : 0)
    }), { total: 0, verified: 0, vip: 0 });
  };

  // Function to handle filtering
  const handleFilter = (filter) => {
    setSelectedFilter(filter);
    
    switch (filter) {
      case 'verified':
        setFilteredUsers(allUsers.filter(user => user.is_verified));
        break;
      case 'vip':
        setFilteredUsers(allUsers.filter(user => user.is_vip));
        break;
      default: // 'all'
        setFilteredUsers(allUsers);
        break;
    }
  };

  // Fetch all users from database
  const fetchUsers = async () => {
    setLoading(true);
    try {
      // First get all users
      const { data: users, error: usersError } = await supabase
        .from('users')
        .select('*')
        .order('created_at', { ascending: false });

      if (usersError) throw usersError;

      // Get last online status for each user
      const usersWithActivity = await Promise.all(users.map(async user => {
        const { data: activity } = await supabase
          .from('user_activity')
          .select('timestamp')
          .eq('user_id', user.id)
          .single();
        
        return {
          ...user,
          last_login: activity?.timestamp
        };
      }));

      setAllUsers(usersWithActivity);
      setFilteredUsers(usersWithActivity);
      setStats(calculateStats(usersWithActivity));
    } catch (error) {
      Alert.alert('خطأ', 'فشل في تحميل المستخدمين');
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchUsers();
  }, []);

  const onRefresh = () => {
    setRefreshing(true);
    fetchUsers().then(() => setRefreshing(false));
  };

  return (
    <View style={styles.container}>
      <StatusBar backgroundColor={colors.primary} />
      
      <LinearGradient
        colors={[colors.primary, colors.primary_light]}
        style={styles.header}
      >
        <View style={styles.headerTop}>
          <TouchableOpacity onPress={() => navigation.goBack()}>
            <MaterialCommunityIcons name="arrow-right-circle" size={32} color={colors.white} />
          </TouchableOpacity>
        </View>

        <View style={styles.headerTitle}>
          <Text style={styles.headerText}>المستخدمين</Text>
          <Text style={styles.headerSubText}>إدارة حسابات المستخدمين</Text>
        </View>
      </LinearGradient>

      <View style={styles.content}>
        <View style={styles.statsCardsContainer}>
          <ScrollView 
            horizontal 
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.statsCardsContent}
          >
            <StatCard
              title="إجمالي المستخدمين"
              count={stats?.total || 0}
              icon="account-group"
              color="#6B7280"
              onPress={() => handleFilter('all')}
              isSelected={selectedFilter === 'all'}
            />
            <StatCard
              title="الحسابات الموثقة"
              count={stats?.verified || 0}
              icon="check-decagram"
              color="#10B981"
              onPress={() => handleFilter('verified')}
              isSelected={selectedFilter === 'verified'}
            />
            <StatCard
              title="مستخدمي VIP"
              count={stats?.vip || 0}
              icon="crown"
              color="#F59E0B"
              onPress={() => handleFilter('vip')}
              isSelected={selectedFilter === 'vip'}
            />
          </ScrollView>
        </View>

        <ScrollView
          style={styles.usersList}
          showsVerticalScrollIndicator={false}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
          }
        >
          {loading ? (
            <ProgressDialog visible={loading} label="جاري التحميل..." />
          ) : filteredUsers.length === 0 ? (
            <View style={styles.emptyContainer}>
              <MaterialCommunityIcons name="account-group" size={64} color={colors.muted} />
              <Text style={styles.emptyText}>لا يوجد مستخدمين</Text>
            </View>
          ) : (
            filteredUsers.map((item, index) => (
              <UserList
                key={index}
                username={`${item.first_name || ''} ${item.last_name || ''}`}
                email={item.email}
                phoneNumber={item.phone_number}
                isVerified={item.is_verified}
                isVip={item.is_vip}
                lastLogin={item.last_login}
                id={item.id}
                onUserUpdate={fetchUsers}
              />
            ))
          )}
        </ScrollView>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.light,
  },
  header: {
    padding: 15,
    paddingTop: 20,
    borderBottomLeftRadius: 30,
    borderBottomRightRadius: 30,
    elevation: 5,
  },
  headerTop: {
    flexDirection: 'row-reverse',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  headerTitle: {
    alignItems: 'flex-end',
    marginBottom: 15,
  },
  headerText: {
    fontSize: 24,
    fontWeight: 'bold',
    color: colors.white,
  },
  headerSubText: {
    fontSize: 14,
    color: colors.white,
    opacity: 0.8,
  },
  content: {
    flex: 1,
    marginTop: -20,
    zIndex: 1,
  },
  statsCardsContainer: {
    height: 120,
    backgroundColor: 'transparent',
  },
  statsCardsContent: {
    paddingHorizontal: 15,
    paddingVertical: 30,
    flexDirection: 'row-reverse',
    justifyContent: 'space-around',
    width: width,
  },
  statCard: {
    backgroundColor: colors.white,
    borderRadius: 12,
    padding: 12,
    width: width * 0.28,
    minHeight: 90,
    elevation: 2,
    borderLeftWidth: 4,
    borderLeftColor: props => props.color,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    justifyContent: 'space-between',
  },
  iconContainer: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 8,
    alignSelf: 'flex-end',
  },
  statInfo: {
    alignItems: 'flex-end',
    width: '100%',
  },
  statCount: {
    fontSize: 18,
    fontWeight: 'bold',
    color: colors.dark,
    marginBottom: 2,
  },
  statTitle: {
    fontSize: 11,
    color: colors.muted,
    textAlign: 'right',
    flexWrap: 'wrap',
    width: '100%',
  },
  usersList: {
    padding: 15,
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 40,
  },
  emptyText: {
    fontSize: 16,
    color: colors.muted,
    marginTop: 10,
    textAlign: 'center',
  },
});

export default ViewUsersScreen;