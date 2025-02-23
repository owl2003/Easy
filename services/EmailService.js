import { Resend } from 'resend';

class EmailService {
  constructor() {
    // Hardcoded Resend API key
    this.resendApiKey = 're_YLtH1efr_Pieg4sFZQhqhWQBGPdx3FjE2';
    this.emailFrom = 'confiserie.chetioui@maireche.com';

    // Validate Resend API configuration
    this.validateConfig();

    // Initialize Resend client
    this.resend = new Resend(this.resendApiKey);
  }

  validateConfig() {
    if (!this.resendApiKey) {
      console.error('Missing Resend API key');
      throw new Error('Resend API key is required for email service');
    }
  }

  async sendAdminOrderNotification(admins, orderDetails) {
    try {
      // Log the entire orderDetails for debugging
      console.log('Full Order Details:', JSON.stringify(orderDetails, null, 2));

      // Validate orderDetails
      if (!orderDetails) {
        console.error('No order details provided');
        return [];
      }

      // Destructure all necessary order information with default values
      const { 
        orderData = [], 
        totalCost = 0, 
        city = 'غير محدد', 
        streetAddress = 'غير محدد', 
        country = 'غير محدد', 
        zipcode = 'غير محدد', 
        orderNote = '', 
        userName = 'غير محدد',
        userPhone = 'غير محدد',
        orderId = 'غير محدد'
      } = orderDetails;

      // Log each destructured value
      console.log('Destructured Values:', {
        orderData,
        totalCost,
        city,
        streetAddress,
        country,
        zipcode,
        orderNote,
        userName,
        userPhone,
        orderId
      });

      // Ensure orderData is an array and has valid items
      const safeOrderData = Array.isArray(orderData) 
        ? orderData.filter(item => item && typeof item === 'object')
        : [];

      // Log the safe order data
      console.log('Safe Order Data:', JSON.stringify(safeOrderData, null, 2));

      // Create email promises for each admin
      const emailPromises = admins.map(async (admin) => {
        if (!admin.email) {
          console.warn('No email found for admin');
          return null;
        }

        // Different email template for user messages
        const emailData = {
          from: this.emailFrom,
          to: admin.email,
          subject: orderDetails.isUserMessage ? 
            'رسالة جديدة من المستخدم - Confiserie Chetioui' :
            'طلب جديد - Confiserie Chetioui',
          html: orderDetails.isUserMessage ? 
            `
              <!DOCTYPE html>
              <html dir="rtl" lang="ar">
              <head>
                <meta charset="UTF-8">
                <style>
                  body { 
                    font-family: 'Arial', sans-serif; 
                    line-height: 1.6; 
                    color: #333; 
                    max-width: 600px; 
                    margin: 0 auto; 
                    direction: rtl; 
                    text-align: right; 
                  }
                  .container { 
                    background-color: #f4f4f4; 
                    padding: 20px; 
                    border-radius: 10px; 
                    border: 1px solid #ddd; 
                  }
                  .header { 
                    background-color: #0039C2; 
                    color: white; 
                    padding: 10px; 
                    text-align: center; 
                    border-radius: 5px; 
                    margin-bottom: 20px; 
                  }
                  .section { 
                    background-color: white; 
                    padding: 15px; 
                    border-radius: 5px; 
                    margin-top: 15px; 
                    border: 1px solid #eee; 
                  }
                  .info-grid { 
                    display: grid; 
                    grid-template-columns: 1fr 1fr; 
                    gap: 10px; 
                    text-align: right; 
                  }
                  .message-content { 
                    background-color: #f9f9f9; 
                    padding: 15px; 
                    border-radius: 5px; 
                    border: 1px solid #ddd; 
                    text-align: right; 
                  }
                </style>
              </head>
              <body>
                <div class="container">
                  <div class="header">
                    <h1>رسالة جديدة من المستخدم - Confiserie Chetioui</h1>
                  </div>
                  
                  <div class="section">
                    <h2>معلومات المرسل</h2>
                    <div class="info-grid">
                      <p><strong>الاسم:</strong> ${orderDetails.userName}</p>
                      <p><strong>رقم الهاتف:</strong> ${orderDetails.userPhone}</p>
                    </div>
                  </div>

                  <div class="section">
                    <h2>الرسالة</h2>
                    <div class="message-content">
                      <p>${orderDetails.message}</p>
                    </div>
                  </div>
                </div>
              </body>
              </html>
            ` :
            // Original order notification template
            `
              <!DOCTYPE html>
              <html dir="rtl" lang="ar">
              <head>
                <meta charset="UTF-8">
                <style>
                  body { 
                    font-family: 'Arial', sans-serif; 
                    line-height: 1.6; 
                    color: #333; 
                    max-width: 600px; 
                    margin: 0 auto; 
                    direction: rtl; 
                    text-align: right; 
                  }
                  .container { 
                    background-color: #f4f4f4; 
                    padding: 20px; 
                    border-radius: 10px; 
                    border: 1px solid #ddd; 
                    text-align: right; 
                  }
                  .header { 
                    background-color: #0039C2; 
                    color: white; 
                    padding: 10px; 
                    text-align: center; 
                    border-radius: 5px; 
                    margin-bottom: 20px; 
                  }
                  .section { 
                    background-color: white; 
                    padding: 15px; 
                    border-radius: 5px; 
                    margin-top: 15px; 
                    border: 1px solid #eee; 
                    text-align: right; 
                  }
                  .receipt-table { 
                    width: 100%; 
                    border-collapse: collapse; 
                    margin-top: 10px; 
                    text-align: right; 
                  }
                  .receipt-table th, 
                  .receipt-table td { 
                    border: 1px solid #ddd; 
                    padding: 8px; 
                    text-align: right; 
                    direction: rtl; 
                  }
                  .receipt-table th { 
                    background-color: #f2f2f2; 
                  }
                  .total-row { 
                    font-weight: bold; 
                    background-color: #f9f9f9; 
                  }
                  .info-grid { 
                    display: grid; 
                    grid-template-columns: 1fr 1fr; 
                    gap: 10px; 
                    text-align: right; 
                  }
                  .total { 
                    font-weight: bold; 
                    text-align: right; 
                    margin-top: 15px; 
                    font-size: 1.2em; 
                    color: #0039C2; 
                  }
                  h1, h2, p, td, th { 
                    text-align: right; 
                    direction: rtl; 
                  }
                </style>
              </head>
              <body>
                <div class="container">
                  <div class="header">
                    <h1>إشعار طلب جديد - Confiserie Chetioui</h1>
                  </div>
                  
                  ${userName ? `
                  <div class="section">
                    <h2>معلومات العميل</h2>
                    <div class="info-grid">
                      <p><strong>الاسم:</strong> ${userName}</p>
                    </div>
                  </div>
                  ` : ''}

                  <div class="section">
                    <h2>تفاصيل المنتجات</h2>
                    <table class="receipt-table">
                      <thead>
                        <tr>
                          <th>المنتج</th>
                          <th>الكمية</th>
                          <th>السعر</th>
                          <th>المجموع</th>
                        </tr>
                      </thead>
                      <tbody>
                        ${safeOrderData.map(item => `
                          <tr>
                            <td>${this.sanitizeProductName(item.title)}</td>
                            <td>${item.quantity || 1}</td>
                            <td>${item.price || 0} دج</td>
                            <td>${(item.price * (item.quantity || 1)).toFixed(2)} دج</td>
                          </tr>
                        `).join('')}
                        <tr class="total-row">
                          <td colspan="3">المجموع</td>
                          <td>${totalCost.toFixed(2)} دج</td>
                        </tr>
                      </tbody>
                    </table>
                  </div>

                  <div class="section">
                    <h2>معلومات التوصيل</h2>
                    <div class="info-grid">
                      <p><strong>المدينة:</strong> ${city}</p>
                      <p><strong>العنوان:</strong> ${streetAddress}</p>
                      <p><strong>الرمز البريدي:</strong> ${zipcode}</p>
                    </div>
                  </div>

                  ${orderNote ? `
                  <div class="section">
                    <h2>ملاحظات الطلب</h2>
                    <p>${orderNote}</p>
                  </div>
                  ` : ''}
                </div>
              </body>
              </html>
            `
        };

        try {
          const result = await this.resend.emails.send(emailData);
          console.log(`Email sent to ${admin.email}:`, result);
          return result;
        } catch (error) {
          console.error(`Failed to send email to ${admin.email}:`, error);
          throw error;
        }
      });

      // Wait for all emails to be sent
      const results = await Promise.allSettled(
        emailPromises.filter(promise => promise !== null)
      );

      // Log any failed emails
      const failedEmails = results
        .filter(result => result.status === 'rejected')
        .map(result => result.reason);

      if (failedEmails.length > 0) {
        console.error('Failed to send emails:', failedEmails);
      }

      return results;
    } catch (error) {
      console.error('Critical error in sendAdminOrderNotification:', error);
      throw error;
    }
  }

  async sendAdminNotification(notificationDetails) {
    try {
      const { 
        adminEmail, 
        title, 
        message, 
        type, 
        data 
      } = notificationDetails;

      const emailData = {
        from: this.emailFrom,
        to: adminEmail,
        subject: title || 'إشعار جديد',
        html: `
          <!DOCTYPE html>
          <html dir="rtl" lang="ar">
          <head>
            <meta charset="UTF-8">
            <style>
              body { 
                font-family: 'Arial', sans-serif; 
                line-height: 1.6; 
                color: #333; 
                max-width: 600px; 
                margin: 0 auto; 
                direction: rtl; 
                text-align: right; 
              }
              .container { 
                background-color: #f4f4f4; 
                padding: 20px; 
                border-radius: 10px; 
                border: 1px solid #ddd; 
              }
              .header { 
                background-color: #0039C2; 
                color: white; 
                padding: 10px; 
                text-align: center; 
                border-radius: 5px; 
                margin-bottom: 20px; 
              }
              .section { 
                background-color: white; 
                padding: 15px; 
                border-radius: 5px; 
                margin-top: 15px; 
                border: 1px solid #eee; 
              }
              .details { 
                display: grid; 
                grid-template-columns: 1fr 1fr; 
                gap: 10px; 
              }
            </style>
          </head>
          <body>
            <div class="container">
              <div class="header">
                <h1>إشعار جديد - Confiserie Chetioui</h1>
              </div>
              
              <div class="section">
                <h2>تفاصيل الإشعار</h2>
                <div class="details">
                  <p><strong>العنوان:</strong> ${title}</p>
                  <p><strong>النوع:</strong>'عام'}</p>
                </div>
                <p>${message}</p>
              </div>

            </div>
          </body>
          </html>
        `
      };

      try {
        const result = await this.resend.emails.send(emailData);
        console.log(`Admin notification email sent to ${adminEmail}:`, result);
        return result;
      } catch (error) {
        console.error(`Failed to send admin notification email to ${adminEmail}:`, error);
        throw error;
      }
    } catch (error) {
      console.error('Critical error in sendAdminNotification:', error);
      throw error;
    }
  }

  // Helper method to sanitize product names
  sanitizeProductName(name) {
    // If name is undefined or empty, return a default message
    if (!name || name.trim() === '') {
      return 'منتج غير محدد';
    }
    
    // Truncate very long names
    return name.length > 50 
      ? name.substring(0, 50) + '...' 
      : name;
  }

  async sendOrderStatusUpdate(userEmail, orderDetails) {
    try {
      if (!userEmail) {
        console.warn('No email provided for status update');
        return null;
      }

      const statusText = 
        orderDetails.status === 'shipped' ? 'تم شحن' :
        orderDetails.status === 'delivered' ? 'تم تسليم' :
        orderDetails.status === 'pending' ? 'قيد الانتظار' :
        'تم تحديث حالة';

      const emailData = {
        from: this.emailFrom,
        to: userEmail,
        subject: `تحديث حالة الطلب - ${statusText} الطلب`,
        html: `
          <!DOCTYPE html>
          <html dir="rtl" lang="ar">
          <head>
            <meta charset="UTF-8">
            <style>
              body { 
                font-family: 'Arial', sans-serif; 
                line-height: 1.6; 
                color: #333; 
                max-width: 600px; 
                margin: 0 auto; 
                direction: rtl; 
                text-align: right; 
              }
              .container { 
                background-color: #f4f4f4; 
                padding: 20px; 
                border-radius: 10px; 
                border: 1px solid #ddd; 
              }
              .header { 
                background-color: #0039C2; 
                color: white; 
                padding: 10px; 
                text-align: center; 
                border-radius: 5px; 
                margin-bottom: 20px; 
              }
              .section { 
                background-color: white; 
                padding: 15px; 
                border-radius: 5px; 
                margin-top: 15px; 
                border: 1px solid #eee; 
              }
              .status-badge {
                display: inline-block;
                padding: 8px 16px;
                border-radius: 20px;
                color: white;
                font-weight: bold;
                background-color: ${
                  orderDetails.status === 'shipped' ? '#3B82F6' :
                  orderDetails.status === 'delivered' ? '#22C55E' :
                  orderDetails.status === 'pending' ? '#FFA41B' : '#0039C2'
                };
              }
              .receipt-table { 
                width: 100%; 
                border-collapse: collapse; 
                margin-top: 10px; 
              }
              .receipt-table th, 
              .receipt-table td { 
                border: 1px solid #ddd; 
                padding: 8px; 
                text-align: right; 
              }
              .receipt-table th { 
                background-color: #f2f2f2; 
              }
              .total-row { 
                font-weight: bold; 
                background-color: #f9f9f9; 
              }
            </style>
          </head>
          <body>
            <div class="container">
              <div class="header">
                <h1>تحديث حالة الطلب - Confiserie Chetioui</h1>
              </div>
              
              <div class="section">
                <h2>حالة الطلب</h2>
                <p>تم تحديث حالة طلبك رقم #${orderDetails.orderId} إلى:</p>
                <p class="status-badge">${statusText}</p>
              </div>

              <div class="section">
                <h2>تفاصيل المنتجات</h2>
                <table class="receipt-table">
                  <thead>
                    <tr>
                      <th>المنتج</th>
                      <th>الكمية</th>
                      <th>السعر</th>
                      <th>المجموع</th>
                    </tr>
                  </thead>
                  <tbody>
                    ${orderDetails.orderData.map(item => `
                      <tr>
                        <td>${this.sanitizeProductName(item.title)}</td>
                        <td>${item.quantity || 1}</td>
                        <td>${item.price || 0} دج</td>
                        <td>${(item.price * (item.quantity || 1)).toFixed(2)} دج</td>
                      </tr>
                    `).join('')}
                    <tr class="total-row">
                      <td colspan="3">المجموع</td>
                      <td>${orderDetails.totalCost.toFixed(2)} دج</td>
                    </tr>
                  </tbody>
                </table>
              </div>

              <div class="section">
                <h2>معلومات التوصيل</h2>
                <p><strong>العنوان:</strong> ${orderDetails.streetAddress}</p>
                <p><strong>المدينة:</strong> ${orderDetails.city}</p>
                <p><strong>الرمز البريدي:</strong> ${orderDetails.zipcode}</p>
              </div>

              ${orderDetails.orderNote ? `
              <div class="section">
                <h2>ملاحظات الطلب</h2>
                <p>${orderDetails.orderNote}</p>
              </div>
              ` : ''}
            </div>
          </body>
          </html>
        `
      };

      try {
        const result = await this.resend.emails.send(emailData);
        console.log(`Status update email sent to ${userEmail}:`, result);
        return result;
      } catch (error) {
        console.error(`Failed to send status update email to ${userEmail}:`, error);
        throw error;
      }
    } catch (error) {
      console.error('Error in sendOrderStatusUpdate:', error);
      throw error;
    }
  }
}

export const emailService = new EmailService();