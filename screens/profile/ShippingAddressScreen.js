import {
    StyleSheet,
    Text,
    View,
    StatusBar,
    TouchableOpacity,
    TextInput,
    ScrollView,
    Alert,
    ActivityIndicator,
    RefreshControl,
} from "react-native";
import React, { useState, useEffect } from "react";
import { Ionicons } from "@expo/vector-icons";
import { colors } from "../../constants";
import { LinearGradient } from 'expo-linear-gradient';
import { supabase } from "../../supabase";
import { I18nManager } from 'react-native';

I18nManager.allowRTL(false);
I18nManager.forceRTL(false);

const ShippingAddressScreen = ({ navigation, route }) => {
    const [address, setAddress] = useState({
        city: '',
        country: '',
        zip_code: '',
        shipping_address: ''
    });
    const [isEditing, setIsEditing] = useState(false);
    const [hasAddress, setHasAddress] = useState(false);
    const { user } = route.params;
    const [loading, setLoading] = useState(false);
    const [refreshing, setRefreshing] = useState(false);

    useEffect(() => {
        console.log("Component mounted, user:", user); // Debug log
        if (user && user.id) {
            getAddress();
        }
    }, []);

    const getAddress = async () => {
        try {
            setLoading(true);
            console.log("Fetching address for user:", user.id);

            // Get the most recent address for the user
            const { data, error } = await supabase
                .from('shipping_addresses')
                .select('*')
                .eq('user_id', user.id)
                .order('created_at', { ascending: false }) // Order by created_at descending
                .limit(1)  // Get only the most recent one
                .maybeSingle();

            console.log("Fetched address data:", data);

            if (error) {
                console.error('Error fetching address:', error);
                Alert.alert('خطأ', 'حدث خطأ أثناء جلب العنوان');
                return;
            }

            if (data) {
                setAddress({
                    country: data.country,
                    city: data.city,
                    zip_code: data.zip_code || '',
                    shipping_address: data.shipping_address
                });
                setHasAddress(true);
            } else {
                setHasAddress(false);
                setAddress({
                    country: '',
                    city: '',
                    zip_code: '',
                    shipping_address: ''
                });
            }
        } catch (error) {
            console.error('Error:', error);
            Alert.alert('خطأ', 'حدث خطأ أثناء جلب العنوان');
        } finally {
            setLoading(false);
        }
    };

    const handleSave = async () => {
        try {
            setLoading(true);

            if (!address.country || !address.city || !address.shipping_address) {
                Alert.alert('تنبيه', 'الرجاء ملء جميع الحقول المطلوبة');
                return;
            }

            // Get the most recent address
            const { data: existingAddress } = await supabase
                .from('shipping_addresses')
                .select('*')
                .eq('user_id', user.id)
                .order('created_at', { ascending: false })
                .limit(1)
                .maybeSingle();

            let result;
            
            if (existingAddress) {
                // Update the most recent address
                result = await supabase
                    .from('shipping_addresses')
                    .update({
                        country: address.country,
                        city: address.city,
                        zip_code: address.zip_code,
                        shipping_address: address.shipping_address
                    })
                    .eq('id', existingAddress.id) // Use the specific address ID
                    .eq('user_id', user.id);
            } else {
                // Insert new address
                result = await supabase
                    .from('shipping_addresses')
                    .insert({
                        user_id: user.id,
                        country: address.country,
                        city: address.city,
                        zip_code: address.zip_code,
                        shipping_address: address.shipping_address,
                        created_at: new Date().toISOString()
                    });
            }

            if (result.error) throw result.error;

            // Refresh the data
            await getAddress();

            Alert.alert(
                'نجاح', 
                existingAddress ? 'تم تحديث العنوان بنجاح' : 'تم إضافة العنوان بنجاح',
                [{ text: 'حسناً' }]
            );

        } catch (error) {
            console.error('Error details:', error);
            Alert.alert('خطأ', 'حدث خطأ أثناء حفظ العنوان');
        } finally {
            setLoading(false);
        }
    };

    const onRefresh = React.useCallback(async () => {
        setRefreshing(true);
        await getAddress();
        setRefreshing(false);
    }, []);

    const AddressViewMode = () => (
        <View style={styles.addressViewContainer}>
            <View style={styles.addressCard}>
                <View style={styles.addressHeader}>
                    <Ionicons name="location" size={24} color={colors.primary} />
                    <Text style={styles.addressTitle}>عنوان الشحن الحالي</Text>
                </View>
                
                <View style={styles.addressDetail}>
                    <Ionicons name="flag-outline" size={20} color={colors.muted} />
                    <Text style={styles.addressText}>{address.country}</Text>
                </View>
                
                <View style={styles.addressDetail}>
                    <Ionicons name="business-outline" size={20} color={colors.muted} />
                    <Text style={styles.addressText}>{address.city}</Text>
                </View>
                
                {address.zip_code && (
                    <View style={styles.addressDetail}>
                        <Ionicons name="mail-outline" size={20} color={colors.muted} />
                        <Text style={styles.addressText}>{address.zip_code}</Text>
                    </View>
                )}
                
                <View style={styles.addressDetail}>
                    <Ionicons name="location-outline" size={20} color={colors.muted} />
                    <Text style={styles.addressText}>{address.shipping_address}</Text>
                </View>

                <TouchableOpacity 
                    style={styles.editButton}
                    onPress={() => setIsEditing(true)}
                >
                    <Text style={styles.editButtonText}>تعديل العنوان</Text>
                    <Ionicons name="create-outline" size={20} color={colors.white} />
                </TouchableOpacity>
            </View>
        </View>
    );

    return (
        <View style={styles.container}>
            <StatusBar barStyle="light-content" />
            <LinearGradient
                colors={[colors.primary, colors.primary + '80']}
                style={styles.headerGradient}
            >
                <View style={styles.TopBarContainer}>
                    <TouchableOpacity onPress={() => navigation.goBack()}>
                        <Ionicons name="chevron-forward" size={28} color={colors.white} />
                    </TouchableOpacity>
                    <Text style={styles.headerTitle}>عنوان الشحن</Text>
                    <View style={{ width: 28 }} />
                </View>
            </LinearGradient>

            {loading && !refreshing && (
                <View style={styles.loadingContainer}>
                    <ActivityIndicator size="large" color={colors.primary} />
                </View>
            )}

            <ScrollView 
                style={styles.contentContainer}
                refreshControl={
                    <RefreshControl
                        refreshing={refreshing}
                        onRefresh={onRefresh}
                        colors={[colors.primary]}
                    />
                }
            >
                {hasAddress ? (
                    !isEditing ? (
                        <AddressViewMode />
                    ) : (
                        <View style={styles.formContainer}>
                            {/* Country Input */}
                            <View style={styles.inputGroup}>
                                <Text style={styles.label}>الدولة</Text>
                                <View style={styles.inputContainer}>
                                    <Ionicons name="flag-outline" size={20} color={colors.muted} />
                                    <TextInput
                                        style={styles.input}
                                        placeholder="ادخل اسم الدولة"
                                        value={address.country}
                                        onChangeText={(text) => setAddress({ ...address, country: text })}
                                        textAlign="right"
                                    />
                                </View>
                            </View>

                            {/* City Input */}
                            <View style={styles.inputGroup}>
                                <Text style={styles.label}>المدينة</Text>
                                <View style={styles.inputContainer}>
                                    <Ionicons name="business-outline" size={20} color={colors.muted} />
                                    <TextInput
                                        style={styles.input}
                                        placeholder="ادخل اسم المدينة"
                                        value={address.city}
                                        onChangeText={(text) => setAddress({ ...address, city: text })}
                                        textAlign="right"
                                    />
                                </View>
                            </View>

                            {/* Zip Code Input */}
                            <View style={styles.inputGroup}>
                                <Text style={styles.label}>الرمز البريدي</Text>
                                <View style={styles.inputContainer}>
                                    <Ionicons name="mail-outline" size={20} color={colors.muted} />
                                    <TextInput
                                        style={styles.input}
                                        placeholder="ادخل الرمز البريدي"
                                        value={address.zip_code}
                                        onChangeText={(text) => setAddress({ ...address, zip_code: text })}
                                        keyboardType="numeric"
                                        textAlign="right"
                                    />
                                </View>
                            </View>

                            {/* Detailed Address Input */}
                            <View style={styles.inputGroup}>
                                <Text style={styles.label}>العنوان بالتفصيل</Text>
                                <View style={[styles.inputContainer, styles.textAreaContainer]}>
                                    <Ionicons 
                                        name="location-outline" 
                                        size={20} 
                                        color={colors.muted}
                                        style={styles.textAreaIcon}
                                    />
                                    <TextInput
                                        style={[styles.input, styles.textArea]}
                                        placeholder="ادخل العنوان بالتفصيل"
                                        value={address.shipping_address}
                                        onChangeText={(text) => setAddress({ ...address, shipping_address: text })}
                                        multiline={true}
                                        numberOfLines={4}
                                        textAlign="right"
                                        textAlignVertical="top"
                                    />
                                </View>
                            </View>
                        </View>
                    )
                ) : (
                    <View style={styles.formContainer}>
                        {/* Country Input */}
                        <View style={styles.inputGroup}>
                            <Text style={styles.label}>الدولة</Text>
                            <View style={styles.inputContainer}>
                                <Ionicons name="flag-outline" size={20} color={colors.muted} />
                                <TextInput
                                    style={styles.input}
                                    placeholder="ادخل اسم الدولة"
                                    value={address.country}
                                    onChangeText={(text) => setAddress({ ...address, country: text })}
                                    textAlign="right"
                                />
                            </View>
                        </View>

                        {/* City Input */}
                        <View style={styles.inputGroup}>
                            <Text style={styles.label}>المدينة</Text>
                            <View style={styles.inputContainer}>
                                <Ionicons name="business-outline" size={20} color={colors.muted} />
                                <TextInput
                                    style={styles.input}
                                    placeholder="ادخل اسم المدينة"
                                    value={address.city}
                                    onChangeText={(text) => setAddress({ ...address, city: text })}
                                    textAlign="right"
                                />
                            </View>
                        </View>

                        {/* Zip Code Input */}
                        <View style={styles.inputGroup}>
                            <Text style={styles.label}>الرمز البريدي</Text>
                            <View style={styles.inputContainer}>
                                <Ionicons name="mail-outline" size={20} color={colors.muted} />
                                <TextInput
                                    style={styles.input}
                                    placeholder="ادخل الرمز البريدي"
                                    value={address.zip_code}
                                    onChangeText={(text) => setAddress({ ...address, zip_code: text })}
                                    keyboardType="numeric"
                                    textAlign="right"
                                />
                            </View>
                        </View>

                        {/* Detailed Address Input */}
                        <View style={styles.inputGroup}>
                            <Text style={styles.label}>العنوان بالتفصيل</Text>
                            <View style={[styles.inputContainer, styles.textAreaContainer]}>
                                <Ionicons 
                                    name="location-outline" 
                                    size={20} 
                                    color={colors.muted}
                                    style={styles.textAreaIcon}
                                />
                                <TextInput
                                    style={[styles.input, styles.textArea]}
                                    placeholder="ادخل العنوان بالتفصيل"
                                    value={address.shipping_address}
                                    onChangeText={(text) => setAddress({ ...address, shipping_address: text })}
                                    multiline={true}
                                    numberOfLines={4}
                                    textAlign="right"
                                    textAlignVertical="top"
                                />
                            </View>
                        </View>
                    </View>
                )}
            </ScrollView>

            <View style={styles.bottomContainer}>
                {hasAddress ? (
                    isEditing ? (
                        <View style={styles.buttonGroup}>
                            <TouchableOpacity 
                                style={[styles.button, styles.saveButton]} 
                                onPress={handleSave}
                                disabled={loading}
                            >
                                {loading ? (
                                    <ActivityIndicator color={colors.white} />
                                ) : (
                                    <>
                                        <Text style={styles.buttonText}>حفظ التغييرات</Text>
                                        <Ionicons name="checkmark-circle" size={24} color={colors.white} />
                                    </>
                                )}
                            </TouchableOpacity>
                            <TouchableOpacity 
                                style={[styles.button, styles.cancelButton]} 
                                onPress={() => {
                                    setIsEditing(false);
                                    getAddress(); // Reset to original address
                                }}
                                disabled={loading}
                            >
                                <Text style={styles.buttonText}>إلغاء</Text>
                                <Ionicons name="close-circle" size={24} color={colors.white} />
                            </TouchableOpacity>
                        </View>
                    ) : null
                ) : (
                    <TouchableOpacity 
                        style={[styles.button, styles.saveButton]} 
                        onPress={handleSave}
                        disabled={loading}
                    >
                        {loading ? (
                            <ActivityIndicator color={colors.white} />
                        ) : (
                            <>
                                <Text style={styles.buttonText}>إضافة عنوان جديد</Text>
                                <Ionicons name="add-circle" size={24} color={colors.white} />
                            </>
                        )}
                    </TouchableOpacity>
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
    headerGradient: {
        paddingTop: StatusBar.currentHeight,
        paddingBottom: 20,
    },
    TopBarContainer: {
        flexDirection: "row",
        justifyContent: "space-between",
        alignItems: "center",
        paddingHorizontal: 20,
        paddingTop: 10,
    },
    headerTitle: {
        fontSize: 20,
        fontWeight: "600",
        color: colors.white,
    },
    contentContainer: {
        flex: 1,
        backgroundColor: colors.light,
    },
    formContainer: {
        padding: 20,
    },
    inputGroup: {
        marginBottom: 20,
    },
    label: {
        fontSize: 16,
        fontWeight: "600",
        color: colors.dark,
        marginBottom: 8,
        textAlign: 'left',
    },
    inputContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: colors.white,
        borderRadius: 12,
        paddingHorizontal: 15,
        paddingVertical: 4,
        elevation: 2,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.1,
        shadowRadius: 2,
    },
    input: {
        flex: 1,
        height: 45,
        fontSize: 16,
        color: colors.dark,
        marginLeft: 10,
        textAlign: 'right',
    },
    textAreaContainer: {
        alignItems: 'flex-start',
        paddingVertical: 10,
    },
    textArea: {
        height: 100,
        textAlignVertical: 'top',
    },
    textAreaIcon: {
        marginTop: 5,
    },
    bottomContainer: {
        padding: 20,
        backgroundColor: colors.white,
        elevation: 10,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: -3 },
        shadowOpacity: 0.1,
        shadowRadius: 5,
    },
    buttonGroup: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        gap: 10,
    },
    button: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        paddingVertical: 15,
        paddingHorizontal: 20,
        borderRadius: 12,
        flex: 1,
    },
    saveButton: {
        backgroundColor: colors.primary,
    },
    cancelButton: {
        backgroundColor: colors.danger,
    },
    buttonText: {
        color: colors.white,
        fontSize: 16,
        fontWeight: '600',
        marginRight: 8,
    },
    addressViewContainer: {
        padding: 20,
    },
    addressCard: {
        backgroundColor: colors.white,
        borderRadius: 15,
        padding: 20,
        elevation: 3,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 4,
    },
    addressHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: 20,
        borderBottomWidth: 1,
        borderBottomColor: colors.light,
        paddingBottom: 10,
    },
    addressTitle: {
        fontSize: 18,
        fontWeight: '700',
        color: colors.primary,
        marginRight: 10,
    },
    addressDetail: {
        flexDirection: 'row-reverse',
        alignItems: 'center',
        marginBottom: 15,
        paddingHorizontal: 10,
    },
    addressText: {
        fontSize: 16,
        color: colors.dark,
        marginRight: 15,
        flex: 1,
        textAlign: 'right',
    },
    editButton: {
        flexDirection: 'row',
        backgroundColor: colors.primary,
        paddingVertical: 12,
        paddingHorizontal: 20,
        borderRadius: 10,
        justifyContent: 'center',
        alignItems: 'center',
        marginTop: 10,
    },
    editButtonText: {
        color: colors.white,
        fontSize: 16,
        fontWeight: '600',
        marginRight: 8,
    },
    loadingContainer: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        paddingTop: 20,
    },
});

export default ShippingAddressScreen; 