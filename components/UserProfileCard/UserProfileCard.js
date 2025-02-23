import { StyleSheet, Text, View } from "react-native";
import React from "react";
import { colors } from "../../constants";

const UserProfileCard = ({ Icon, firstName, lastName, email, isVip }) => {
  const fullName = `${firstName || ''} ${lastName || ''}`.trim() || "زائر";
  
  console.log('UserProfileCard isVip:', isVip);

  return (
    <View style={styles.Container}>
      <View style={styles.avatarContainer}>
        <View style={[styles.avatarBackground, 
          isVip && { backgroundColor: colors.primary + 'FF' }]}>
          <Icon name="person" size={40} color={colors.white} />
        </View>
        <View style={styles.onlineIndicator} />
      </View>
      
      <View style={styles.infoContainer}>
        <View style={styles.nameContainer}>
          <Text style={styles.usernameText}>{fullName}</Text>
          <View style={styles.verifiedBadge}>
            <Icon name="checkmark-circle" size={16} color={colors.primary} />
          </View>
        </View>
        <Text style={styles.emailText}>{email}</Text>
        
      </View>
    </View>
  );
};

export default UserProfileCard;

const styles = StyleSheet.create({
  Container: {
    flexDirection: "row-reverse",
    alignItems: "center",
  },
  avatarContainer: {
    position: 'relative',
    marginRight: 15,
  },
  avatarBackground: {
    width: 70,
    height: 70,
    borderRadius: 35,
    backgroundColor: colors.primary,
    justifyContent: 'center',
    alignItems: 'center',
    elevation: 5,
    shadowColor: colors.primary,
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.2,
    shadowRadius: 5,
  },
  onlineIndicator: {
    position: 'absolute',
    bottom: 2,
    right: 2,
    width: 14,
    height: 14,
    borderRadius: 7,
    backgroundColor: '#4CAF50',
    borderWidth: 2,
    borderColor: colors.white,
  },
  infoContainer: {
    flex: 1,
  },
  nameContainer: {
    flexDirection: 'row-reverse',
    alignItems: 'center',
    marginBottom: 4,
  },
  usernameText: {
    fontSize: 20,
    fontWeight: "700",
    color: colors.dark,
    marginRight: 5,
    textAlign: 'right',
  },
  verifiedBadge: {
    backgroundColor: colors.primary + '15',
    borderRadius: 10,
    padding: 2,
  },
  emailText: {
    fontSize: 14,
    color: colors.muted,
    marginBottom: 8,
    textAlign: 'right',
  },
  membershipBadge: {
    flexDirection: 'row-reverse',
    alignItems: 'center',
    backgroundColor: colors.primary + '15',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
    alignSelf: 'flex-start',
  },
  membershipText: {
    fontSize: 12,
    color: colors.primary,
    marginRight: 4,
    fontWeight: '600',
  },
});