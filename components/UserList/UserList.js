import React from "react";
import {
  StyleSheet,
  Text,
  View,
  TouchableOpacity,
  Alert,
} from "react-native";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import { colors } from "../../constants";
import { supabase } from "../../supabase";
import moment from "moment";

const Badge = ({ text, color, icon }) => (
  <View style={[styles.badge, { backgroundColor: color + '20' }]}>
    <Text style={[styles.badgeText, { color: color, marginRight: 2 }]}>{text}</Text>
    <MaterialCommunityIcons name={icon} size={12} color={color} />
  </View>
);

const UserList = ({
  username,
  email,
  phoneNumber,
  isVerified,
  isVip,
  lastLogin,
  id,
  onUserUpdate,
}) => {
  const handleDelete = async () => {
    Alert.alert(
      "تأكيد الحذف",
      `هل أنت متأكد من حذف حساب ${username}؟`,
      [
        {
          text: "نعم، احذف",
          onPress: async () => {
            const { error } = await supabase.from("users").delete().eq("id", id);
            if (error) {
              Alert.alert("خطأ", "فشل في حذف المستخدم");
            } else {
              Alert.alert("نجاح", "تم حذف المستخدم بنجاح");
              onUserUpdate();
            }
          },
          style: "destructive"
        },
        {
          text: "إلغاء",
          style: "cancel"
        },
      ]
    );
  };

  const toggleStatus = async (field, currentValue, successMessage) => {
    const { error } = await supabase
      .from("users")
      .update({ [field]: !currentValue })
      .eq("id", id);

    if (error) {
      Alert.alert("خطأ", `فشل في تحديث حالة ${field}`);
    } else {
      onUserUpdate();
      Alert.alert("نجاح", successMessage);
    }
  };

  const formatLastSeen = (timestamp) => {
    if (!timestamp) return 'لم يسجل دخول بعد';
    const now = moment();
    const loginTime = moment(timestamp);
    
    const diffMinutes = now.diff(loginTime, 'minutes');
    const diffHours = now.diff(loginTime, 'hours');
    const diffDays = now.diff(loginTime, 'days');

    if (diffMinutes < 60) {
      return `منذ ${diffMinutes} دقيقة`;
    } else if (diffHours < 24) {
      return `منذ ${diffHours} ساعة`;
    } else if (diffDays < 30) {
      return `منذ ${diffDays} يوم`;
    } else {
      return loginTime.format('DD/MM/YYYY HH:mm');
    }
  };

  return (
    <View style={styles.container}>
      <View style={styles.contentContainer}>
        <View style={styles.headerRow}>
          <MaterialCommunityIcons 
            name="account-circle" 
            size={50} 
            color={colors.primary}
          />
          <View style={styles.nameAndBadges}>
            <Text style={styles.username} numberOfLines={1}>{username}</Text>
            <View style={styles.badgesContainer}>
              {isVip && <Badge text="VIP" color={colors.warning} icon="crown" />}
              {isVerified && <Badge text="موثق" color={colors.success} icon="check-decagram" />}
            </View>
          </View>
        </View>

        <View style={styles.infoRows}>
          <View style={styles.row}>
            <MaterialCommunityIcons name="email" size={16} color={colors.muted} />
            <Text style={styles.emailText}>{email}</Text>
          </View>

          {phoneNumber && (
            <View style={styles.row}>
              <MaterialCommunityIcons name="phone" size={16} color={colors.muted} />
              <Text style={styles.emailText}>{phoneNumber}</Text>
            </View>
          )}

          <View style={styles.row}>
            <MaterialCommunityIcons name="clock-outline" size={16} color={colors.muted} />
            <Text style={styles.lastLoginText}>
              آخر ظهور: {formatLastSeen(lastLogin)}
            </Text>
          </View>
        </View>

        <View style={styles.actionsContainer}>
          <TouchableOpacity
            style={[styles.actionButton, { backgroundColor: colors.danger }]}
            onPress={handleDelete}
          >
            <MaterialCommunityIcons name="trash-can" size={20} color={colors.white} />
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.actionButton, { backgroundColor: isVip ? colors.warning : colors.muted }]}
            onPress={() => toggleStatus('is_vip', isVip, 'تم تحديث حالة VIP')}
          >
            <MaterialCommunityIcons name="crown" size={20} color={colors.white} />
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.actionButton, { backgroundColor: colors.primary }]}
            onPress={() => toggleStatus('is_verified', isVerified, 'تم تحديث حالة التوثيق')}
          >
            <MaterialCommunityIcons 
              name={isVerified ? "check-decagram" : "decagram-outline"} 
              size={20} 
              color={colors.white} 
            />
          </TouchableOpacity>
        </View>
      </View>
    </View>
  );
};

export default UserList;

const styles = StyleSheet.create({
  container: {
    backgroundColor: colors.white,
    borderRadius: 12,
    marginBottom: 10,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  contentContainer: {
    padding: 12,
  },
  headerRow: {
    flexDirection: 'row-reverse',
    alignItems: 'center',
    marginBottom: 12,
    gap: 12,
  },
  nameAndBadges: {
    flex: 1,
    flexDirection: 'row-reverse',
    alignItems: 'center',
    gap: 4,
  },
  username: {
    fontSize: 16,
    fontWeight: '600',
    textAlign: 'right',
  },
  badgesContainer: {
    flexDirection: 'row-reverse',
    gap: 2,
  },
  infoRows: {
    gap: 6,
  },
  row: {
    flexDirection: 'row-reverse',
    alignItems: 'center',
    gap: 6,
  },
  emailText: {
    color: colors.muted,
    fontSize: 13,
    textAlign: 'right',
  },
  lastLoginText: {
    color: colors.muted,
    fontSize: 13,
    textAlign: 'right',
  },
  actionsContainer: {
    flexDirection: 'row-reverse',
    justifyContent: 'flex-start',
    gap: 8,
    marginTop: 12,
    borderTopWidth: 1,
    borderTopColor: colors.light,
    paddingTop: 12,
  },
  actionButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    justifyContent: 'center',
    alignItems: 'center',
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.2,
    shadowRadius: 2,
  },
  badge: {
    flexDirection: 'row-reverse',
    alignItems: 'center',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  badgeText: {
    fontSize: 10,
    fontWeight: '500',
    marginRight: 2,
  },
});