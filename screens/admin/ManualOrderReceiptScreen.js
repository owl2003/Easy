import React, { useState } from 'react';
import {
  StyleSheet,
  Text,
  Image,
  StatusBar,
  View,
  ScrollView,
  TouchableOpacity,
  Alert,
  TextInput,
} from "react-native";
import { colors } from "../../constants";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import * as Print from 'expo-print';
import * as Sharing from 'expo-sharing';
import { Asset } from 'expo-asset';
import * as FileSystem from 'expo-file-system';
import { I18nManager } from 'react-native';

I18nManager.allowRTL(false);
I18nManager.forceRTL(false);

const ManualOrderReceiptScreen = ({ route }) => {
  const { orderDetail } = route.params;
  const [deliveryPrice, setDeliveryPrice] = useState(orderDetail?.delivery_price || 0);

  if (!orderDetail || !orderDetail.items) {
    return (
      <View style={styles.container}>
        <Text style={styles.errorText}>بيانات الطلب غير متوفرة</Text>
      </View>
    );
  }

  const formatDate = (dateString) => {
    const options = { 
      year: 'numeric', 
      month: 'long', 
      day: 'numeric',
      hour: 'numeric',
      minute: 'numeric'
    };
    return new Date(dateString).toLocaleDateString('fr-FR', options);
  };

  const getLogoBase64 = async () => {
    try {
      const asset = Asset.fromModule(require('../../assets/logo/mehdi(1).png'));
      await asset.downloadAsync();
      
      const base64 = await FileSystem.readAsStringAsync(asset.localUri, {
        encoding: FileSystem.EncodingType.Base64,
      });
      
      return `data:image/png;base64,${base64}`;
    } catch (error) {
      console.error('Error loading logo:', error);
      return null;
    }
  };

  const handleDeliveryPriceChange = (newPrice) => {
    const price = parseFloat(newPrice) || 0;
    setDeliveryPrice(price);
  };

  const calculateTotal = () => {
    return (orderDetail.total_amount || 0) + parseFloat(deliveryPrice || 0);
  };

  const calculateRemaining = () => {
    return calculateTotal() - (orderDetail.paid_amount || 0);
  };

  const handlePrint = async () => {
    try {
      const logoBase64 = await getLogoBase64();
      
      const html = `
        <html dir="rtl">
          <head>
            <meta charset="utf-8">
            <link href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.0.0/css/all.min.css" rel="stylesheet">
            <style>
              body {
                font-family: 'Arial', sans-serif;
                padding: 20px;
                max-width: 800px;
                margin: 0 auto;
              }
              .header {
                text-align: center;
                margin-bottom: 20px;
              }
              .store-name {
                font-size: 24px;
                font-weight: bold;
                color: ${colors.primary};
                margin-bottom: 10px;
              }
              .store-info {
                margin-bottom: 20px;
                text-align: center;
              }
              .order-info {
                margin-bottom: 5px;
                border-bottom: 2px dashed #eee;
                padding-bottom: 5px;
                    flexDirection: 'row-reverse',
                    gap:2px;
              }
              table {
                width: 100%;
                border-collapse: collapse;
                margin: 20px 0;
              }
              th, td {
                padding: 10px;
                text-align: right;
                border-bottom: 1px solid #eee;
              }
              th {
                background-color: ${colors.primary};
                color: white;
              }
              .total-section {
                margin-top: 20px;
                border-top: 2px solid ${colors.primary};
                padding-top: 10px;
              }
              .total-row {
                display: flex;
                justify-content: space-between;
                margin: 5px 0;
                font-size: 16px;
              }
              .footer {
                margin-top: 30px;
                text-align: center;
                color: #666;
                font-size: 14px;
              }
              .store-icon {
                color: ${colors.primary};
                margin-bottom: 10px;
                display: block;
                margin: 0 auto;
              }
              .store-logo {
                width: 290px;
                height: 53px;
                display: block;
                margin: 0 auto;
                margin-top: 10px;
              }
              .store-phone {
                color: ${colors.muted};
                font-size: 14px;
                margin-top: 4px;
                text-align: center;
              }
            </style>
          </head>
          <body>
            <div class="header">
              <svg class="store-icon" width="24" height="24" viewBox="0 0 24 24" fill="${colors.primary}">
                <path d="M5.06 3C4.63 3 4.22 3.2 4 3.56L2.3 6.43C2.11 6.78 2 7.19 2 7.5V8C2 9.1 2.9 10 4 10V19C4 20.1 4.9 21 6 21H18C19.1 21 20 20.1 20 19V10C21.1 10 22 9.1 22 8V7.5C22 7.19 21.89 6.78 21.7 6.43L20 3.56C19.78 3.2 19.37 3 18.94 3H5.06M5.06 5H18.94L20.3 7.5H3.7L5.06 5M6 10H18V19H6V10M8 12V17H10V12H8M12 12V17H14V12H12M16 12V17H18V12H16Z"/>
              </svg>
               <img src="${logoBase64}" alt="Store Logo" class="store-logo" />
              <p class="store-phone">هاتف: 0655042803</p>
            </div>

            <div class="order-info">
              <p><strong>رقم الطلب:</strong>#${orderDetail.id}</p>
              <p><strong>التاريخ:</strong> ${formatDate(orderDetail.created_at)}</p>
              <p><strong>اسم العميل:</strong> ${orderDetail.customer_name}</p>
              ${orderDetail.customer_phone ? `<p><strong>رقم الهاتف:</strong> ${orderDetail.customer_phone}</p>` : ''}
            </div>

            <table>
              <thead>
                <tr>
                  <th>المنتج</th>
                  <th>الكمية</th>
                  <th>السعر</th>
                  <th>المجموع</th>
                </tr>
              </thead>
              <tbody>
                ${orderDetail.items.map(item => `
                  <tr>
                    <td>${item.title}</td>
                    <td>${item.quantity}</td>
                    <td>${item.price} دج</td>
                    <td>${item.price * item.quantity} دج</td>
                  </tr>
                `).join('')}
              </tbody>
            </table>

            <div class="total-section">
              <div class="total-row">
                <strong>المجموع الفرعي:</strong>
                <span>${orderDetail.total_amount || 0} دج</span>
              </div>
              <div class="total-row">
                <strong>سعر التوصيل:</strong>
                <span>${deliveryPrice} دج</span>
              </div>
              <div class="total-row">
                <strong>المجموع الكلي:</strong>
                <span>${calculateTotal()} دج</span>
              </div>
              <div class="total-row">
                <strong>المبلغ المدفوع:</strong>
                <span>${orderDetail.paid_amount || 0} دج</span>
              </div>
              <div class="total-row">
                <strong>المبلغ المتبقي:</strong>
                <span style="color: red;">${calculateRemaining()} دج</span>
              </div>
            </div>

            <div class="footer">
              <p>شكراً لتسوقكم من متجر شتيوي </p>
              <p>نتمنى لكم يوماً سعيداً</p>
            </div>
          </body>
        </html>
      `;

      // Generate PDF
      const { uri } = await Print.printToFileAsync({
        html,
        base64: false
      });

      // Share the PDF
      await Sharing.shareAsync(uri, {
        mimeType: 'application/pdf',
        dialogTitle: 'طباعة أو مشاركة الإيصال'
      });

    } catch (error) {
      console.error('Error printing receipt:', error);
      Alert.alert('خطأ', 'حدث خطأ أثناء إنشاء الإيصال');
    }
  };

  return (
    <View style={styles.container}>
      <StatusBar backgroundColor={colors.primary} />
      <ScrollView style={styles.content}>
        <View style={styles.receiptContainer}>
          {/* Store Logo & Info */}
          <View style={styles.storeHeader}>
            <MaterialCommunityIcons name="store" size={24} color={colors.primary} />
            <Image 
              source={require('../../assets/logo/mehdi(1).png')} 
              style={styles.storeLogo} 
            />
            <Text style={styles.storePhone}>هاتف: 0655042803</Text>
          </View>

          {/* Order Info */}
          <View style={styles.orderInfo}>
            <View style={styles.orderInfoRow}>
              <Text style={styles.orderInfoLabel}>رقم الطلب:</Text>
            </View>
            <View style={styles.orderInfoRow}>
              <Text style={styles.orderInfoValue}>#{orderDetail.id}</Text>
            </View>
            <View style={styles.orderInfoRow}>
              <Text style={styles.orderInfoLabel}>التاريخ:</Text>
              <Text style={styles.orderInfoValue}>{formatDate(orderDetail.created_at)}</Text>
            </View>
          </View>

          <View style={styles.divider} />

          {/* Customer Info */}
          <View style={styles.customerInfo}>
            <Text style={styles.sectionTitle}>معلومات العميل</Text>
            <Text style={styles.customerName}>{orderDetail.customer_name}</Text>
            {orderDetail.customer_phone && (
              <Text style={styles.customerPhone}>{orderDetail.customer_phone}</Text>
            )}
          </View>

          {/* Products List */}
          <View style={styles.productsSection}>
            <Text style={styles.sectionTitle}>المنتجات</Text>
            
            <View style={styles.tableHeader}>
              <Text style={[styles.tableHeaderText, { flex: 2 }]}>المنتج</Text>
              <Text style={[styles.tableHeaderText, { flex: 1 }]}>الكمية</Text>
              <Text style={[styles.tableHeaderText, { flex: 1 }]}>السعر</Text>
            </View>

            {orderDetail.items.map((item, index) => (
              <View key={index} style={styles.tableRow}>
                <Text style={[styles.tableCell, { flex: 2 }]} numberOfLines={1}>
                  {item.title}
                </Text>
                <Text style={[styles.tableCell, { flex: 1 }]}>{item.quantity}</Text>
                <Text style={[styles.tableCell, { flex: 1 }]}>{item.price} دج</Text>
              </View>
            ))}
          </View>

          {/* Delivery Section */}
          <View style={styles.deliverySection}>
            <Text style={styles.sectionTitle}>سعر التوصيل</Text>
            <View style={styles.deliveryInputContainer}>
              <TextInput
                style={styles.deliveryInput}
                keyboardType="numeric"
                value={deliveryPrice.toString()}
                onChangeText={handleDeliveryPriceChange}
                placeholder="أدخل سعر التوصيل"
                placeholderTextColor={colors.muted}
              />
              <Text style={styles.currencyText}>دج</Text>
            </View>
          </View>

          {/* Payment Info */}
          <View style={styles.totalSection}>
            <View style={styles.totalRow}>
              <Text style={styles.totalLabel}>المجموع الفرعي</Text>
              <Text style={styles.totalValue}>{orderDetail.total_amount || 0} دج</Text>
            </View>
            <View style={styles.totalRow}>
              <Text style={styles.totalLabel}>سعر التوصيل</Text>
              <Text style={styles.totalValue}>{deliveryPrice} دج</Text>
            </View>
            <View style={styles.totalRow}>
              <Text style={styles.totalLabel}>المجموع الكلي</Text>
              <Text style={styles.totalValue}>
                {calculateTotal()} دج
              </Text>
            </View>
            <View style={styles.totalRow}>
              <Text style={styles.totalLabel}>المبلغ المدفوع</Text>
              <Text style={styles.totalValue}>{orderDetail.paid_amount || 0} دج</Text>
            </View>
            <View style={styles.totalRow}>
              <Text style={styles.totalLabel}>المبلغ المتبقي</Text>
              <Text style={[styles.totalValue, { color: colors.danger }]}>
                {calculateRemaining()} دج
              </Text>
            </View>
          </View>

          {/* Add Print Button */}
          <TouchableOpacity
            style={styles.printButton}
            onPress={handlePrint}
          >
            <MaterialCommunityIcons name="printer" size={24} color={colors.white} />
            <Text style={styles.printButtonText}>طباعة الإيصال</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.light,
  },
  content: {
    flex: 1,
  },
  receiptContainer: {
    backgroundColor: colors.white,
    margin: 15,
    borderRadius: 10,
    padding: 20,
    elevation: 2,
  },
  storeHeader: {
    alignItems: 'center',
    marginBottom: 20,
  },
  storeLogo: {
    width: 290,
    height: 53,
    marginTop: 10,
  },
  storePhone: {
    fontSize: 14,
    color: colors.muted,
    marginTop: 4,
  },
  orderInfo: {
    marginBottom: 15,
  },
  orderInfoRow: {
    flexDirection: 'row-reverse',
    justifyContent: 'space-between',
    marginBottom: 4,
  },
  orderInfoLabel: {
    fontSize: 14,
    color: colors.muted,
    paddingBottom: 4,
  },
  orderInfoValue: {
    fontSize: 14,
    color: colors.dark,
    textAlign: 'right',
    marginBottom: 8,
  },
  divider: {
    height: 1,
    backgroundColor: colors.light,
    marginVertical: 15,
    borderStyle: 'dashed',
    borderWidth: 1,
  },
  customerInfo: {
    marginBottom: 20,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: colors.primary,
    marginBottom: 10,
    textAlign: 'right',
  },
  customerName: {
    fontSize: 16,
    color: colors.dark,
    textAlign: 'right',
  },
  customerPhone: {
    fontSize: 14,
    color: colors.muted,
    textAlign: 'right',
  },
  productsSection: {
    marginBottom: 20,
  },
  tableHeader: {
    flexDirection: 'row-reverse',
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: colors.light,
  },
  tableHeaderText: {
    fontSize: 14,
    fontWeight: 'bold',
    color: colors.primary,
    textAlign: 'right',
  },
  tableRow: {
    flexDirection: 'row-reverse',
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: colors.light,
  },
  tableCell: {
    fontSize: 14,
    color: colors.dark,
    textAlign: 'right',
  },
  totalSection: {
    marginTop: 20,
    paddingTop: 15,
    borderTopWidth: 1,
    borderTopColor: colors.primary,
  },
  totalRow: {
    flexDirection: 'row-reverse',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  totalLabel: {
    fontSize: 16,
    fontWeight: 'bold',
    color: colors.primary,
  },
  totalValue: {
    fontSize: 18,
    fontWeight: 'bold',
    color: colors.primary,
  },
  printButton: {
    backgroundColor: colors.primary,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 15,
    borderRadius: 8,
    marginTop: 20,
  },
  printButtonText: {
    color: colors.white,
    fontSize: 16,
    fontWeight: 'bold',
    marginRight: 8,
  },
  deliverySection: {
    marginTop: 20,
    marginBottom: 15,
    padding: 15,
    backgroundColor: colors.light,
    borderRadius: 8,
  },
  deliveryInputContainer: {
    flexDirection: 'row-reverse',
    alignItems: 'center',
    backgroundColor: colors.white,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: colors.light,
    paddingHorizontal: 12,
    marginTop: 8,
  },
  deliveryInput: {
    flex: 1,
    height: 45,
    fontSize: 16,
    color: colors.dark,
    textAlign: 'right',
    paddingRight: 8,
  },
  currencyText: {
    fontSize: 16,
    color: colors.muted,
    marginLeft: 8,
  },
  errorText: {
    fontSize: 16,
    color: colors.danger,
    textAlign: 'center',
    marginTop: 20,
  },
});

export default ManualOrderReceiptScreen; 