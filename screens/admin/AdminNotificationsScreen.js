import React, { useState, useEffect, useRef } from 'react';
import {
  StyleSheet,
  View,
  Text,
  TouchableOpacity,
  FlatList,
  TextInput,
  ActivityIndicator,
  StatusBar,
  ScrollView,
} from 'react-native';
import { Ionicons, MaterialIcons } from '@expo/vector-icons';
import { colors } from '../../constants';
import { supabase } from '../../supabase';
import { LinearGradient } from 'expo-linear-gradient';
import ProductCard from '../../components/ProductCard/ProductCard';
import OrderList from '../../components/OrderList/OrderList';
import * as Animatable from 'react-native-animatable';
import { sendAdminNotification, sendBulkAdminNotifications } from '../../utils/notifications';
import { emailService } from '../../services/EmailService';
import { I18nManager } from 'react-native';

I18nManager.allowRTL(false);
I18nManager.forceRTL(false);

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

const AdminNotificationsScreen = ({ navigation, route }) => {
  const { authUser } = route.params;
  
  // Move refs inside component
  const searchTimeoutRef = useRef(null);
  const orderSearchTimeoutRef = useRef(null);

  const [activeTab, setActiveTab] = useState('send');
  const [users, setUsers] = useState([]);
  const [selectedUser, setSelectedUser] = useState(null);
  const [isSendToAll, setIsSendToAll] = useState(false);
  const [message, setMessage] = useState('');
  const [messageType, setMessageType] = useState('text');
  const [loading, setLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [messages, setMessages] = useState([]);
  const [notifications, setNotifications] = useState([]);
  const [refreshing, setRefreshing] = useState(false);
  const [referenceId, setReferenceId] = useState('');
  const [productPreview, setProductPreview] = useState(null);
  const [orderPreview, setOrderPreview] = useState(null);
  const [skuSuggestions, setSkuSuggestions] = useState([]);
  const [searchingSKU, setSearchingSKU] = useState(false);

  // Fetch messages and notifications
  const fetchMessages = async () => {
    try {
      const { data, error } = await supabase
        .from('notifications')
        .select(`
          *,
          sender:sender_id(
            id,
            first_name,
            last_name,
            email,
            phone_number
          )
        `)
        .or('data->is_admin_message.eq.true,data->is_admin_message.eq.false')
        .order('created_at', { ascending: false });

      if (error) throw error;

      setMessages(data || []);
    } catch (error) {
      console.error('Error fetching messages:', error);
      alert('حدث خطأ في جلب الرسائل');
    }
  };

  // Fetch users
  const fetchUsers = async () => {
    try {
      const { data, error } = await supabase
        .from('users')
        .select('*')
        .neq('id', authUser.id) // Exclude the admin user
        .order('created_at', { ascending: false });

      if (error) throw error;

      setUsers(data || []);
    } catch (error) {
      console.error('Error fetching users:', error);
      alert('حدث خطأ في جلب المستخدمين');
    }
  };

  // Send notification
  const sendNotification = async () => {
    if (!isSendToAll && !selectedUser) {
      alert('الرجاء اختيار مستخدم');
      return;
    }

    if (messageType === 'text' && !message.trim()) {
      alert('الرجاء كتابة رسالة');
      return;
    }

    if (messageType === 'product' && !productPreview) {
      alert('الرجاء إدخال رمز منتج صحيح');
      return;
    }

    if (messageType === 'order' && !orderPreview) {
      alert('الرجاء إدخال رقم طلب صحيح');
      return;
    }

    setLoading(true);
    try {
      const referenceId = messageType === 'text' ? null : 
        messageType === 'product' ? productPreview.sku : 
        orderPreview.order_id;

      // Get target users
      const targetUsers = isSendToAll ? users : [selectedUser];

      // Send notifications and emails
      for (const user of targetUsers) {
        try {
          // Send in-app notification
          await sendAdminNotification({
            userId: user.id,
            adminId: authUser.id,
            message: message.trim(),
            type: messageType,
            referenceId
          });

          // Send email notification
          if (user.email) {
            const emailDetails = {
              userName: `${user.first_name} ${user.last_name}`,
              message: 'لديك إشعار جديد في صندوق الرسائل الخاص بك',
              isUserMessage: true
            };

            try {
              await emailService.sendAdminOrderNotification(
                [{ email: user.email }],
                emailDetails
              );
            } catch (emailError) {
              console.error('Error sending email to user:', emailError);
              // Continue with other users even if email fails
            }
          }
        } catch (error) {
          console.error('Error processing user:', user.id, error);
          // Continue with other users even if one fails
        }
      }

      // Reset form
      setMessage('');
      setSelectedUser(null);
      setIsSendToAll(false);
      setMessageType('text');
      setReferenceId('');
      setProductPreview(null);
      setOrderPreview(null);

      alert(isSendToAll ? 
        'تم إرسال الإشعار لجميع المستخدمين بنجاح' : 
        'تم إرسال الإشعار بنجاح'
      );
    } catch (error) {
      console.error('Error sending notification:', error);
      alert('حدث خطأ أثناء إرسال الإشعار');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (activeTab === 'send') {
      fetchUsers();
    } else if (activeTab === 'messages') {
      fetchMessages();
    }
  }, [activeTab]);

  // Fetch product by SKU with debounce
  const searchProductBySKU = async (sku) => {
    if (!sku.trim()) {
      setProductPreview(null);
      return;
    }

    setSearchingSKU(true);
    try {
      const { data, error } = await supabase
        .from('products')
        .select('*')
        .ilike('sku', `%${sku}%`)
        .limit(5);

      if (error) throw error;
      
      if (data && data.length > 0) {
        // Get the first match and fetch its image URL
        const product = data[0];
        
        // Get public URL for the image
        const imageUrl = product.image_url ? 
          supabase.storage.from("product-images").getPublicUrl(product.image_url).data?.publicUrl 
          : null;

        // Set product preview with the image URL
        setProductPreview({
          ...product,
          image_url: imageUrl
        });

        // If there are more matches, show them in suggestions
        if (data.length > 1) {
          // Map through all products to add image URLs
          const productsWithImages = await Promise.all(
            data.map(async (prod) => ({
              ...prod,
              image_url: prod.image_url ? 
                supabase.storage.from("product-images").getPublicUrl(prod.image_url).data?.publicUrl 
                : null
            }))
          );
          setSkuSuggestions(productsWithImages);
        } else {
          setSkuSuggestions([]);
        }
      } else {
        setProductPreview(null);
        setSkuSuggestions([]);
      }
    } catch (error) {
      console.error('Error searching product:', error);
      setProductPreview(null);
      setSkuSuggestions([]);
    } finally {
      setSearchingSKU(false);
    }
  };

  // Debounced search
  const debouncedSearch = (sku) => {
    if (searchTimeoutRef.current) {
      clearTimeout(searchTimeoutRef.current);
    }
    searchTimeoutRef.current = setTimeout(() => {
      searchProductBySKU(sku);
    }, 500);
  };

  // Handle SKU input change
  const handleSkuChange = (text) => {
    setReferenceId(text);
    debouncedSearch(text);
  };

  // Clean up timeout on unmount
  useEffect(() => {
    return () => {
      if (searchTimeoutRef.current) {
        clearTimeout(searchTimeoutRef.current);
      }
      if (orderSearchTimeoutRef.current) {
        clearTimeout(orderSearchTimeoutRef.current);
      }
    };
  }, []);

  // Fetch order by ID
  const fetchOrderById = async (orderId) => {
    try {
      const { data, error } = await supabase
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
        .eq('order_id', orderId)
        .single();

      if (error) throw error;

      if (data) {
        // Calculate totals
        const totalPrice = data.items.reduce(
          (sum, item) => sum + (item.price * item.quantity), 
          0
        );
        const totalItems = data.items.reduce(
          (sum, item) => sum + item.quantity, 
          0
        );

        // Get product images
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

        setOrderPreview(orderWithImages);
      } else {
        setOrderPreview(null);
        alert('الطلب غير موجود');
      }
    } catch (error) {
      console.error('Error fetching order:', error);
      alert('حدث خطأ في جلب الطلب');
      setOrderPreview(null);
    }
  };

  // Render header with tabs
  const renderHeader = () => (
    <LinearGradient
      colors={[colors.primary, colors.primary + 'E6']}
      style={styles.header}
    >
      <View style={styles.headerTop}>
        <TouchableOpacity onPress={() => navigation.goBack()}>
          <Ionicons name="arrow-back-circle" size={32} color={colors.white} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>الإشعارات</Text>
        <View style={{ width: 32 }} />
      </View>

      <View style={styles.tabs}>
        <TouchableOpacity
          style={[styles.tab, activeTab === 'send' && styles.activeTab]}
          onPress={() => setActiveTab('send')}
        >
          <Ionicons 
            name="paper-plane" 
            size={20} 
            color={activeTab === 'send' ? colors.primary : colors.white} 
          />
          <Text style={[styles.tabText, activeTab === 'send' && styles.activeTabText]}>
            إرسال
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.tab, activeTab === 'messages' && styles.activeTab]}
          onPress={() => setActiveTab('messages')}
        >
          <Ionicons 
            name="chatbubble-ellipses" 
            size={20} 
            color={activeTab === 'messages' ? colors.primary : colors.white} 
          />
          <Text style={[styles.tabText, activeTab === 'messages' && styles.activeTabText]}>
            الرسائل
          </Text>
        </TouchableOpacity>
      </View>
    </LinearGradient>
  );

  // Render message item
  const renderMessageItem = ({ item }) => {
    const isUserMessage = item.data?.is_admin_message;
    const isAdminMessage = item.data?.is_admin_message;
    
    // Determine icon and style based on message type
    let icon = isAdminMessage ?   "admin-panel-settings" : "person";
    let backgroundColor = isAdminMessage ?  colors.white:colors.light ;
    
    const senderName = isAdminMessage ? 
      (item.sender?.first_name ? `${item.sender.first_name} ${item.sender.last_name || ''}` : 'الإدارة') :
      'مستخدم';
    
    return (
      <View style={[
        styles.messageItem,
        { backgroundColor: backgroundColor }
      ]}>
        <View style={styles.messageHeader}>
          <MaterialIcons 
            name={icon}
            size={24} 
            color={colors.primary} 
          />
          <Text style={styles.senderName}>{senderName}</Text>
          <Text style={styles.messageTime}>
            {formatDate(item.created_at)}
          </Text>
        </View>
        <Text style={styles.messageText}>{item.message}</Text>
        {isUserMessage && (
          <TouchableOpacity
            style={styles.replyButton}
            onPress={() => {
              setSelectedUser(item.sender);
              setMessage(`رداً على: ${item.message}\n\n`);
              setActiveTab('send');
            }}
          >
          
          </TouchableOpacity>
        )}
      </View>
    );
  };

  // Filter users based on search query
  const filteredUsers = users.filter(user => {
    const searchLower = searchQuery.toLowerCase();
    return (
      user.email?.toLowerCase().includes(searchLower) ||
      user.first_name?.toLowerCase().includes(searchLower) ||
      user.last_name?.toLowerCase().includes(searchLower) ||
      user.phone_number?.includes(searchQuery)
    );
  });

  const renderUserItem = ({ item }) => (
    <TouchableOpacity
      style={[
        styles.userItem,
        selectedUser?.id === item.id && styles.selectedUserItem
      ]}
      onPress={() => setSelectedUser(item)}
    >
      <View style={styles.userInfo}>
        <Text style={styles.userName}>
          {item.first_name || 'مستخدم'} {item.last_name || ''}
        </Text>
        <Text style={styles.userEmail}>{item.email || item.phone_number}</Text>
      </View>
      {selectedUser?.id === item.id && (
        <View style={styles.checkmark}>
          <Ionicons name="checkmark-circle" size={24} color={colors.primary} />
        </View>
      )}
    </TouchableOpacity>
  );

  const renderSendForm = () => (
    <View>
      {/* Search */}
      <View style={styles.searchContainer}>
        <Ionicons name="search" size={20} color={colors.muted} />
        <TextInput
          style={styles.searchInput}
          placeholder="البحث عن مستخدم..."
          value={searchQuery}
          onChangeText={setSearchQuery}
        />
      </View>

      {/* Send to All Users */}
      <View style={styles.sendToAllContainer}>
        <TouchableOpacity
          style={[styles.sendToAllButton, isSendToAll && styles.sendToAllButtonActive]}
          onPress={() => {
            setIsSendToAll(!isSendToAll);
            setSelectedUser(null);
          }}
        >
          <Ionicons 
            name={isSendToAll ? "checkbox" : "square-outline"} 
            size={24} 
            color={isSendToAll ? colors.primary : colors.muted} 
          />
          <Text style={[
            styles.sendToAllText,
            isSendToAll && styles.sendToAllTextActive
          ]}>
            إرسال لجميع المستخدمين
          </Text>
        </TouchableOpacity>
      </View>

      {/* Users List */}
      <View style={styles.usersContainer}>
        <Text style={styles.sectionTitle}>
          المستخدمين ({filteredUsers.length})
        </Text>
        <FlatList
          data={filteredUsers}
          renderItem={renderUserItem}
          keyExtractor={item => item.id}
          showsVerticalScrollIndicator={false}
          ListEmptyComponent={
            <Text style={styles.emptyText}>لا يوجد مستخدمين</Text>
          }
        />
      </View>

      {/* Message Type Selector */}
      <View style={styles.messageTypeContainer}>
        <TouchableOpacity
          style={[styles.typeButton, messageType === 'text' && styles.selectedType]}
          onPress={() => setMessageType('text')}
        >
          <Text style={styles.typeText}>رسالة نصية</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.typeButton, messageType === 'product' && styles.selectedType]}
          onPress={() => setMessageType('product')}
        >
          <Text style={styles.typeText}>منتج</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.typeButton, messageType === 'order' && styles.selectedType]}
          onPress={() => setMessageType('order')}
        >
          <Text style={styles.typeText}>طلب</Text>
        </TouchableOpacity>
      </View>

      {/* Reference ID Input with Live Search */}
      {messageType === 'product' && (
        <View style={styles.referenceContainer}>
          <View style={styles.searchInputContainer}>
            <TextInput
              style={styles.referenceInput}
              placeholder="ابحث عن منتج برمز SKU..."
              value={referenceId}
              onChangeText={handleSkuChange}
            />
            {searchingSKU && (
              <ActivityIndicator 
                size="small" 
                color={colors.primary}
                style={styles.searchIndicator}
              />
            )}
          </View>

          {/* Product Preview */}
          {productPreview ? (
            <View style={styles.previewContainer}>
              <View style={styles.previewHeader}>
                <Text style={styles.previewTitle}>معاينة المنتج</Text>
                <TouchableOpacity 
                  style={styles.clearButton}
                  onPress={() => {
                    setProductPreview(null);
                    setReferenceId('');
                  }}
                >
                  <Ionicons name="close-circle" size={24} color={colors.muted} />
                </TouchableOpacity>
              </View>
              <ProductCard
                name={productPreview.title}
                price={productPreview.price}
                oldPrice={productPreview.oldprice}
                image={productPreview.image_url}
                quantity={productPreview.quantity}
                isSold={productPreview.issold}
                cardSize="large"
              />
            </View>
          ) : referenceId.trim() && !searchingSKU ? (
            <View style={styles.noResultsContainer}>
              <Text style={styles.noResultsText}>لم يتم العثور على منتج بهذا الرمز</Text>
            </View>
          ) : null}
        </View>
      )}

      {/* Preview */}
      {messageType === 'order' && (
        <View style={styles.referenceContainer}>
          <View style={styles.searchInputContainer}>
            <TextInput
              style={styles.referenceInput}
              placeholder="أدخل رقم الطلب..."
              value={referenceId}
              onChangeText={(text) => {
                setReferenceId(text);
                if (text.trim()) {
                  fetchOrderById(text);
                } else {
                  setOrderPreview(null);
                }
              }}
              keyboardType="numeric"
            />
          </View>

          {/* Order Preview */}
          {orderPreview ? (
            <View style={styles.previewContainer}>
              <View style={styles.previewHeader}>
                <Text style={styles.previewTitle}>معاينة الطلب</Text>
                <TouchableOpacity 
                  style={styles.clearButton}
                  onPress={() => {
                    setOrderPreview(null);
                    setReferenceId('');
                  }}
                >
                  <Ionicons name="close-circle" size={24} color={colors.muted} />
                </TouchableOpacity>
              </View>
              <OrderList item={orderPreview} />
            </View>
          ) : referenceId.trim() ? (
            <View style={styles.noResultsContainer}>
              <Text style={styles.noResultsText}>لم يتم العثور على طلب بهذا الرقم</Text>
            </View>
          ) : null}
        </View>
      )}

      {/* Message Input (optional for product/order) */}
      <View style={styles.messageContainer}>
        <TextInput
          style={styles.messageInput}
          placeholder="اكتب رسالة إضافية (اختياري)..."
          value={message}
          onChangeText={setMessage}
          multiline
          numberOfLines={3}
        />
      </View>

      {/* Send Button */}
      <TouchableOpacity
        style={[styles.sendButton, loading && styles.sendButtonDisabled]}
        onPress={sendNotification}
        disabled={loading}
      >
        {loading ? (
          <ActivityIndicator color={colors.white} size="small" />
        ) : (
          <Text style={styles.sendButtonText}>إرسال</Text>
        )}
      </TouchableOpacity>
    </View>
  );

  if (loading && users.length === 0) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={colors.primary} />
        <Text style={styles.loadingText}>جاري تحميل المستخدمين...</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <StatusBar backgroundColor={colors.primary} />
      {renderHeader()}
      {activeTab === 'send' ? (
        <ScrollView style={styles.content}>
          {renderSendForm()}
        </ScrollView>
      ) : activeTab === 'messages' ? (
        <View style={styles.content}>
          <FlatList
            data={messages}
            renderItem={renderMessageItem}
            keyExtractor={item => item.id}
            contentContainerStyle={styles.listContainer}
            showsVerticalScrollIndicator={false}
            refreshing={refreshing}
            onRefresh={() => {
              setRefreshing(true);
              fetchMessages().finally(() => setRefreshing(false));
            }}
            ListEmptyComponent={
              <View style={styles.emptyContainer}>
                <Ionicons name="chatbubble-ellipses" size={48} color={colors.muted} />
                <Text style={styles.emptyText}>لا توجد رسائل</Text>
              </View>
            }
          />
        </View>
      ) : null}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.white,
  },
  header: {
    backgroundColor: colors.primary,
    paddingTop: StatusBar.currentHeight + 16,
    paddingBottom: 16,
    borderBottomLeftRadius: 24,
    borderBottomRightRadius: 24,
    elevation: 4,
    shadowColor: colors.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
  },
  headerTop: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 15,
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: colors.white,
    textAlign: 'right',
  },
  content: {
    flex: 1,
    padding: 16,
  },
  searchContainer: {
    flexDirection: 'row-reverse',
    alignItems: 'center',
    backgroundColor: colors.white,
    borderRadius: 8,
    padding: 10,
    marginBottom: 15,
  },
  searchInput: {
    flex: 1,
    marginRight: 10,
    textAlign: 'right',
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 12,
    color: colors.dark,
  },
  usersContainer: {
    flex: 1,
  },
  userItem: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.white,
    padding: 16,
    borderRadius: 12,
    marginBottom: 12,
    elevation: 2,
    shadowColor: colors.dark,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  selectedUserItem: {
    borderColor: colors.primary,
    borderWidth: 2,
    backgroundColor: colors.primary + '05',
  },
  userInfo: {
    flexDirection: 'row-reverse',
    alignItems: 'center',
    gap: 10,
  },
  userName: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.dark,
    textAlign: 'right',
  },
  userEmail: {
    fontSize: 12,
    color: colors.muted,
    textAlign: 'right',
  },
  messageContainer: {
    marginTop: 16,
  },
  messageInput: {
    backgroundColor: colors.light + '80',
    borderRadius: 12,
    padding: 16,
    minHeight: 100,
    textAlign: 'right',
    marginBottom: 16,
    borderWidth: 1,
    borderColor: colors.light,
  },
  sendButton: {
    backgroundColor: colors.primary,
    borderRadius: 12,
    padding: 16,
    alignItems: 'center',
    elevation: 4,
    shadowColor: colors.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
  },
  sendButtonDisabled: {
    backgroundColor: colors.muted,
  },
  sendButtonText: {
    color: colors.white,
    fontWeight: '600',
    fontSize: 16,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: colors.white,
  },
  loadingText: {
    marginTop: 10,
    color: colors.muted,
    fontSize: 16,
  },
  emptyText: {
    textAlign: 'center',
    color: colors.muted,
    marginTop: 20,
    fontSize: 16,
  },
  checkmark: {
    marginLeft: 10,
  },
  messageTypeContainer: {
    flexDirection: 'row',
    backgroundColor: colors.light + '80',
    borderRadius: 12,
    padding: 4,
    marginBottom: 20,
  },
  typeButton: {
    flex: 1,
    padding: 12,
    borderRadius: 8,
    marginHorizontal: 4,
    alignItems: 'center',
  },
  selectedType: {
    backgroundColor: colors.white,
    elevation: 2,
    shadowColor: colors.dark,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  typeText: {
    fontWeight: '600',
    fontSize: 14,
  },
  referenceContainer: {
    marginBottom: 16,
  },
  searchInputContainer: {
    backgroundColor: colors.white,
    borderRadius: 12,
    marginHorizontal: 16,
    marginTop: 12,
    padding: 4,
    flexDirection: 'row',
    alignItems: 'center',
    elevation: 2,
    shadowColor: colors.dark,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  referenceInput: {
    flex: 1,
    paddingVertical: 12,
    textAlign: 'right',
    fontSize: 16,
  },
  searchIndicator: {
    marginLeft: 8,
  },
  previewContainer: {
    backgroundColor: colors.white,
    borderRadius: 16,
    padding: 16,
    marginVertical: 16,
    elevation: 3,
    shadowColor: colors.dark,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
  },
  previewHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  previewTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.primary,
  },
  clearButton: {
    padding: 4,
  },
  noResultsContainer: {
    marginTop: 12,
    padding: 16,
    backgroundColor: colors.light,
    borderRadius: 8,
    alignItems: 'center',
  },
  noResultsText: {
    color: colors.muted,
    fontSize: 14,
  },
  tabs: {
    flexDirection: 'row',
    marginTop: 16,
    paddingHorizontal: 16,
  },
  tab: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    marginHorizontal: 4,
    borderRadius: 12,
    backgroundColor: 'rgba(255,255,255,0.2)',
  },
  activeTab: {
    backgroundColor: colors.white,
  },
  tabText: {
    marginLeft: 8,
    color: colors.white,
    fontWeight: '600',
  },
  activeTabText: {
    color: colors.primary,
  },
  sendToAllContainer: {
    marginBottom: 16,
    paddingHorizontal: 16,
  },
  sendToAllButton: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    backgroundColor: colors.light + '50',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.light,
  },
  sendToAllButtonActive: {
    backgroundColor: colors.primary + '10',
    borderColor: colors.primary,
  },
  sendToAllText: {
    marginLeft: 12,
    fontSize: 16,
    color: colors.muted,
    fontWeight: '500',
  },
  sendToAllTextActive: {
    color: colors.primary,
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  userAvatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: colors.primary + '15',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  userInitials: {
    fontSize: 16,
    fontWeight: 'bold',
    color: colors.primary,
  },
  messageItem: {
    marginHorizontal: 16,
    marginBottom: 16,
    borderRadius: 16,
    padding: 16,
    backgroundColor: colors.white,
    elevation: 3,
    shadowColor: colors.dark,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
  },
  messageHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 10,
    justifyContent: 'flex-end',
    gap: 8,
  },
  senderName: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.dark,
    marginRight: 8,
  },
  messageTime: {
    fontSize: 12,
    color: colors.muted,
    marginLeft: 'auto',
  },
  messageText: {
    fontSize: 14,
    color: colors.dark,
    marginVertical: 10,
    textAlign: 'right',
    lineHeight: 20,
  },
  replyButton: {
    alignSelf: 'flex-end',
    backgroundColor: colors.primary,
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 8,
    marginTop: 8,
  },
  replyButtonText: {
    color: colors.white,
    fontSize: 14,
    fontWeight: '500',
  }
});

export default AdminNotificationsScreen;