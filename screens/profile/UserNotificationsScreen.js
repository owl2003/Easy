import React, { useState, useEffect } from 'react';
import {
  StyleSheet,
  View,
  Text,
  FlatList,
  TouchableOpacity,
  StatusBar,
  ActivityIndicator,
  RefreshControl,
  Alert,
  TextInput,
} from 'react-native';
import { Ionicons, MaterialIcons } from '@expo/vector-icons';
import { colors } from '../../constants';
import { supabase } from '../../supabase';
import { LinearGradient } from 'expo-linear-gradient';
import ProductCard from '../../components/ProductCard/ProductCard';
import OrderList from '../../components/OrderList/OrderList';
import * as Animatable from 'react-native-animatable';
import { notificationService } from '../../services/NotificationService';
import NetInfo from "@react-native-community/netinfo";
import { emailService } from '../../services/EmailService';
import { I18nManager } from 'react-native';

I18nManager.allowRTL(false);
I18nManager.forceRTL(false);

// Add this before the UserNotificationsScreen component
const formatDate = (dateString) => {
  const now = new Date();
  const date = new Date(dateString);
  const diffTime = Math.abs(now - date);
  const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));
  const diffHours = Math.floor(diffTime / (1000 * 60 * 60));
  const diffMinutes = Math.floor(diffTime / (1000 * 60));

  if (diffMinutes < 60) {
    return `منذ ${diffMinutes} دقيقة`;
  } else if (diffHours < 24) {
    return `منذ ${diffHours} ساعة`;
  } else if (diffDays < 7) {
    return `منذ ${diffDays} يوم`;
  } else {
    return date.toLocaleDateString('ar-SA', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
  }
};

const UserNotificationsScreen = ({ navigation, route }) => {
  const { user } = route.params;
  const [notifications, setNotifications] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [filter, setFilter] = useState('all'); // 'all' or 'unread'
  const [replyMessage, setReplyMessage] = useState('');
  const [showReply, setShowReply] = useState(false);
  const [referenceDataMap, setReferenceDataMap] = useState({});

  // Fetch referenced product or order
  const fetchReference = async (type, referenceId) => {
    try {
      if (type === 'product') {
        const { data } = await supabase
          .from('products')
          .select('*')
          .eq('sku', referenceId)
          .single();

        if (data) {
          const imageUrl = data.image_url ? 
            supabase.storage.from("product-images").getPublicUrl(data.image_url).data?.publicUrl 
            : null;

          return {
            ...data,
            image_url: imageUrl
          };
        }
        return null;
      } else if (type === 'order') {
        const { data } = await supabase
          .from('orders')
          .select(`
            *,
            user:users!orders_user_id_fkey (
              id,
              email,
              first_name,
              last_name
            ),
            items:order_items!order_items_order_id_fkey (
              order_item_id,
              quantity,
              price,
              product:products!order_items_product_id_fkey (
                id,
                title,
                price,
                image_url,
                sku
              )
            )
          `)
          .eq('order_id', referenceId)
          .single();

        if (data) {
          const totalPrice = data.items.reduce(
            (sum, item) => sum + (item.price * item.quantity), 
            0
          );
          const totalItems = data.items.reduce(
            (sum, item) => sum + item.quantity, 
            0
          );

          const orderWithImages = {
            ...data,
            order_items: await Promise.all(
              data.items.map(async (item) => ({
                ...item,
                id: item.order_item_id,
                product: {
                  ...item.product,
                  image_url: item.product.image_url ? 
                    supabase.storage.from("product-images").getPublicUrl(item.product.image_url).data?.publicUrl 
                    : null
                }
              }))
            ),
            total_price: totalPrice,
            total_items: totalItems
          };

          return orderWithImages;
        }
        return null;
      }
    } catch (error) {
      console.error('Error fetching reference:', error);
      return null;
    }
  };

  // Fetch notifications and their references
  const fetchNotifications = async (markAsSeen = true) => {
    try {
      const { data: notifications, error } = await supabase
        .from('notifications')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false });

      if (error) {
        console.error('Error fetching notifications:', error);
        return;
      }

      // Format notifications
      const formattedNotifications = notifications.map(n => ({
        id: n.id,
        user_id: n.user_id,
        title: n.title,
        message: n.message,
        type: n.type,
        reference_id: n.data?.reference_id || null,
        is_seen: n.read,
        created_at: n.created_at,
        is_admin_message: n.data?.is_admin_message || false
      }));

      setNotifications(formattedNotifications);

      // Mark unseen notifications as read
      if (markAsSeen) {
        const unseenNotifs = notifications.filter(n => !n.read);
        if (unseenNotifs.length > 0) {
          const { error: updateError } = await supabase
            .from('notifications')
            .update({ read: true })
            .in('id', unseenNotifs.map(n => n.id));

          if (updateError) {
            console.error('Error marking notifications as read:', updateError);
          }
        }
      }

      // Fetch reference data for all notifications
      const referenceData = {};
      await Promise.all(
        formattedNotifications.map(async (notification) => {
          if (notification.type !== 'text' && notification.reference_id) {
            const refData = await fetchReference(
              notification.type === 'new_order' ? 'order' : notification.type,
              notification.reference_id
            );
            if (refData) {
              referenceData[notification.id] = refData;
            }
          }
        })
      );

      setReferenceDataMap(referenceData);
    } catch (error) {
      console.error('Error in fetchNotifications:', error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchNotifications();
  }, []);

  const onRefresh = async () => {
    setRefreshing(true);
    await fetchNotifications(false); // Don't mark as seen on refresh
  };

  const deleteNotification = async (notificationId) => {
    Alert.alert(
      "حذف الإشعار",
      "هل أنت متأكد من حذف هذا الإشعار؟",
      [
        {
          text: "إلغاء",
          style: "cancel"
        },
        {
          text: "حذف",
          style: "destructive",
          onPress: async () => {
            try {
              const { error } = await supabase
                .from('notifications')
                .delete()
                .eq('id', notificationId);

              if (error) throw error;
              
              // Update local state
              setNotifications(prev => 
                prev.filter(notification => notification.id !== notificationId)
              );
            } catch (error) {
              console.error('Error deleting notification:', error);
              Alert.alert("خطأ", "حدث خطأ أثناء حذف الإشعار");
            }
          }
        }
      ]
    );
  };

  const filteredNotifications = filter === 'all' 
    ? notifications 
    : notifications.filter(n => !n.is_seen);

  // Send reply to admin
  const sendReply = async () => {
    if (!replyMessage.trim()) {
      Alert.alert('خطأ', 'لا يمكن إرسال رسالة فارغة');
      return;
    }

    try {
      // Check network connectivity
      const netInfo = await NetInfo.fetch();
      if (!netInfo.isConnected) {
        Alert.alert('خطأ', 'تحقق من اتصال الإنترنت');
        return;
      }

      // Get all admin users
      const { data: adminUsers, error: adminError } = await supabase
        .from('users')
        .select('id, email')
        .eq('is_admin', true);

      if (adminError) {
        console.error('Error fetching admin users:', adminError);
        Alert.alert('خطأ', 'حدث خطأ أثناء إرسال الرسالة');
        return;
      }

      // Insert message into notifications table
      const { data: messageData, error: insertError } = await supabase
        .from('notifications')
        .insert({
          user_id: user.id,  // Send to first admin
          title: 'رسالة جديدة من المستخدم',
          message: replyMessage,
          type: 'text',
          data: {
            sender_name: user.first_name + ' ' + user.last_name,
            sender_id: user.id,
            is_admin_message: false
          },
          read: false,
          created_at: new Date().toISOString()
        })
        .select()
        .single();

      if (insertError) {
        Alert.alert('خطأ', 'حدث خطأ أثناء حفظ الرسالة');
        return;
      }

      // Send email to all admin users
      if (adminUsers && adminUsers.length > 0) {
        try {
          const emailDetails = {
            orderId: null, // Not order related
            orderData: [], // No order items
            totalCost: 0,
            userName: user.first_name + ' ' + user.last_name,
            userPhone: user.phone_number || 'غير محدد',
            message: replyMessage,
            isUserMessage: true // Add this flag to identify user messages
          };

          const emailResult = await emailService.sendAdminOrderNotification(
            adminUsers,
            emailDetails
          );
          console.log('Admin notification emails sent:', emailResult);
        } catch (emailError) {
          console.error('Error sending admin notification emails:', emailError);
          // Don't block the message sending if email fails
        }
      }

      // Clear reply message and hide reply input
      setReplyMessage('');
      setShowReply(false);

      // Show success message
      Alert.alert('نجاح', 'تم إرسال رسالتك بنجاح');
    } catch (error) {
      console.error('Error sending message:', error);
      Alert.alert('خطأ', 'حدث خطأ غير متوقع');
    }
  };

  const renderNotification = ({ item }) => {
    if (!item) return null; // Safety check for invalid items
    
    const referenceData = referenceDataMap[item.id];
    const messageText = item.message || ''; // Ensure message is never undefined
    const createdDate = item.created_at ? formatDate(item.created_at) : ''; // Handle date safely

    const renderReferenceContent = () => {
      if (!referenceData || !item.type) return null;

      if (item.type === 'product') {
        return (
          <ProductCard
            name={referenceData.title ?? ''} 
            price={referenceData.price ?? 0}
            oldPrice={referenceData.oldprice}
            image={referenceData.image_url}
            quantity={referenceData.quantity ?? 0}
            isSold={!!referenceData.issold}
            cardSize="large"
            onPress={() => {
              if (referenceData) {
                navigation.navigate('productdetails', { product: referenceData });
              }
            }}
          />
        );
      }

      if (item.type === 'order') {
        return (
          <OrderList
            item={referenceData}
            onPress={() => {
              if (referenceData) {
                navigation.navigate('myorderdetails', { order: referenceData });
              }
            }}
          />
        );
      }

      return null;
    };

    return (
      <Animatable.View
        animation="fadeIn"
        duration={500}
      >
        <TouchableOpacity
          style={[
            styles.notificationItem,
            !item.is_seen && styles.unreadNotification
          ]}
          onLongPress={() => deleteNotification(item.id)}
          activeOpacity={0.7}
        >
          <LinearGradient
            colors={[colors.white, colors.white]}
            style={styles.notificationContent}
          >
            {/* Header Section */}
            <View style={styles.notificationHeader}>
              <View style={styles.senderInfo}>
                <View style={styles.avatarContainer}>
                  <MaterialIcons 
                    name={item.is_admin_message ? "admin-panel-settings" : "person"} 
                    size={24} 
                    color={colors.primary} 
                  />
                </View>
                <View>
                  <Text style={styles.senderName}>
                    {item.is_admin_message ? 'الإدارة' : 'أنت'}
                  </Text>
                  <Text style={styles.timestamp}>{createdDate}</Text>
                </View>
              </View>
              {!item.is_seen && (
                <View style={styles.unreadIndicator}>
                  <Text style={styles.unreadText}>جديد</Text>
                </View>
              )}
            </View>

            {/* Message Section */}
            {messageText.length > 0 && (
              <View style={styles.messageContainer}>
                <Text style={styles.message}>{messageText}</Text>
              </View>
            )}

            {/* Reference Content Section */}
            {item.type !== 'text' && (
              <View style={styles.referenceContent}>
                {renderReferenceContent()}
              </View>
            )}
          </LinearGradient>
        </TouchableOpacity>
      </Animatable.View>
    );
  };

  return (
    <View style={styles.container}>
      <StatusBar backgroundColor={colors.primary} />
      
      <LinearGradient
        colors={[colors.primary, colors.primary + 'E6']}
        style={styles.header}
      >
        <View style={styles.headerContent}>
          <TouchableOpacity 
            style={styles.headerButton}
            onPress={() => navigation.goBack()}
          >
            <Ionicons name="chevron-back" size={24} color={colors.white} />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>الإشعارات</Text>
          <TouchableOpacity 
            style={styles.headerButton}
            onPress={() => setFilter(prev => prev === 'all' ? 'unread' : 'all')}
          >
            <Ionicons 
              name={filter === 'all' ? "funnel-outline" : "funnel"} 
              size={24} 
              color={colors.white} 
            />
          </TouchableOpacity>
        </View>
      </LinearGradient>

      <FlatList
        data={filteredNotifications || []} // Add fallback empty array
        renderItem={renderNotification}
        keyExtractor={item => item?.id?.toString() || Math.random().toString()}
        contentContainerStyle={styles.listContainer}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            colors={[colors.primary]}
          />
        }
        ListHeaderComponent={
          notifications.length > 0 ? (
            <View style={styles.filterInfo}>
              <Text style={styles.filterText}>
                {filter === 'all' ? 'كل الإشعارات' : 'الإشعارات الجديدة'}
                {' '}({filteredNotifications?.length || 0})
              </Text>
              <Text style={styles.filterHint}>
                اضغط مطولاً على الإشعار لحذفه
              </Text>
            </View>
          ) : null
        }
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            <Ionicons name="notifications-off-outline" size={60} color={colors.muted} />
            <Text style={styles.emptyText}>لا توجد إشعارات</Text>
          </View>
        }
      />

      {/* Reply Section */}
      <View style={styles.replyContainer}>
        <TouchableOpacity
          style={styles.replyButton}
          onPress={() => setShowReply(!showReply)}
        >
          <Ionicons name="chatbox-outline" size={24} color={colors.primary} />
          <Text style={styles.replyButtonText}>رسالة جديدة للإدارة</Text>
        </TouchableOpacity>

        {showReply && (
          <View style={styles.replyInputContainer}>
            <TextInput
              style={styles.replyInput}
              placeholder="اكتب رسالتك هنا..."
              value={replyMessage}
              onChangeText={setReplyMessage}
              multiline
            />
            <TouchableOpacity
              style={styles.sendReplyButton}
              onPress={sendReply}
            >
              <Text style={styles.sendReplyText}>إرسال</Text>
            </TouchableOpacity>
          </View>
        )}
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
    paddingTop: StatusBar.currentHeight,
    borderBottomLeftRadius: 20,
    borderBottomRightRadius: 20,
  },
  headerContent: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 16,
  },
  headerButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(255,255,255,0.2)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: colors.white,
  },
  filterInfo: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingBottom: 12,
    marginBottom: 8,
    borderBottomWidth: 1,
    borderBottomColor: colors.light,
  },
  filterText: {
    fontSize: 14,
    color: colors.primary,
    fontWeight: '600',
  },
  filterHint: {
    fontSize: 12,
    color: colors.muted,
    fontStyle: 'italic',
  },
  listContainer: {
    padding: 16,
    flexGrow: 1,
  },
  notificationItem: {
    backgroundColor: colors.white,
    borderRadius: 16,
    marginBottom: 16,
    overflow: 'hidden',
    elevation: 3,
    shadowColor: colors.dark,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
  },
  notificationContent: {
    padding: 16,
  },
  unreadNotification: {
    backgroundColor: colors.primary + '05',
    borderLeftWidth: 4,
    borderLeftColor: colors.primary,
  },
  notificationHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  senderInfo: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  avatarContainer: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: colors.primary + '15',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  senderName: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.dark,
    marginBottom: 2,
  },
  timestamp: {
    fontSize: 12,
    color: colors.muted,
  },
  unreadIndicator: {
    backgroundColor: colors.primary + '20',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 12,
    marginRight: 8,
  },
  unreadText: {
    fontSize: 10,
    color: colors.primary,
    fontWeight: '600',
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 40,
  },
  emptyText: {
    marginTop: 12,
    fontSize: 16,
    color: colors.muted,
    textAlign: 'center',
  },
  referenceContent: {
    marginTop: 12,
    marginBottom: 8,
  },
  replyContainer: {
    padding: 16,
    borderTopWidth: 1,
    borderTopColor: colors.light,
    backgroundColor: colors.white,
  },
  replyButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 16,
    borderRadius: 12,
    backgroundColor: colors.primary + '10',
    borderWidth: 1,
    borderColor: colors.primary + '20',
  },
  replyButtonText: {
    marginLeft: 8,
    color: colors.primary,
    fontWeight: '600',
  },
  replyInputContainer: {
    marginTop: 12,
  },
  replyInput: {
    backgroundColor: colors.light + '80',
    borderRadius: 12,
    padding: 16,
    minHeight: 100,
    textAlign: 'right',
    marginBottom: 12,
    borderWidth: 1,
    borderColor: colors.light,
  },
  sendReplyButton: {
    backgroundColor: colors.primary,
    padding: 16,
    borderRadius: 12,
    alignItems: 'center',
    shadowColor: colors.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 4,
  },
  sendReplyText: {
    color: colors.white,
    fontWeight: '600',
  },
  messageContainer: {
    backgroundColor: colors.light + '50',
    padding: 12,
    borderRadius: 12,
    marginBottom: 12,
  },
  message: {
    fontSize: 15,
    color: colors.dark,
    textAlign: 'right',
    lineHeight: 24,
  },
});

export default UserNotificationsScreen;