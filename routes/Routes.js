import { NavigationContainer } from "@react-navigation/native";
import LoginScreen from "../screens/auth/LoginScreen";
import SignupScreen from "../screens/auth/SignupScreen";
import { createNativeStackNavigator } from "@react-navigation/native-stack";
import Splash from "../screens/auth/Splash";
import ForgetPasswordScreen from "../screens/auth/ForgetPasswordScreen";
import UpdatePasswordScreen from "../screens/profile/UpdatePasswordScreen";
import MyAccountScreen from "../screens/profile/MyAccountScreen";
import AddProductScreen from "../screens/admin/AddProductScreen";
import DashboardScreen from "../screens/admin/DashboardScreen";
import ViewProductScreen from "../screens/admin/ViewProductScreen";
import Tabs from "./tabs/Tabs";
import CartScreen from "../screens/user/CartScreen";
import CheckoutScreen from "../screens/user/CheckoutScreen.js";
import OrderConfirmScreen from "../screens/user/OrderConfirmScreen";
import ProductDetailScreen from "../screens/user/ProductDetailScreen";
import EditProductScreen from "../screens/admin/EditProductScreen";
import ViewOrdersScreen from "../screens/admin/ViewOrdersScreen";
import ViewOrderDetailScreen from "../screens/admin/ViewOrderDetailScreen";
import MyOrderScreen from "../screens/user/MyOrderScreen";
import MyOrderDetailScreen from "../screens/user/MyOrderDetailScreen";
import ViewCategoryScreen from "../screens/admin/ViewCategoryScreen";
import AddCategoryScreen from "../screens/admin/AddCategoryScreen";
import ViewUsersScreen from "../screens/admin/ViewUsersScreen";
import CategoriesScreen from "../screens/user/CategoriesScreen";
import ShippingAddressScreen from "../screens/profile/ShippingAddressScreen";
import EditCategoryScreen from "../screens/admin/EditCategoryScreen";
import MyWishlistScreen from "../screens/profile/MyWishlistScreen";
import ViewPubScreen from "../screens/admin/ViewPubScreen"
import AddPubScreen from "../screens/admin/AddPubScreen"
import OTPVerificationScreen from "../screens/auth/OTPVerificationScreen"
import PhoneNumberScreen from "../screens/profile/PhoneNumberScreen";
import AdminNotificationsScreen from "../screens/admin/AdminNotificationsScreen";
import UserNotificationsScreen from "../screens/profile/UserNotificationsScreen";
import PalmaryProducts from '../screens/user/PalmaryProducts';
import BifaProducts from '../screens/user/BifaProducts';
import BimoProducts from '../screens/user/BimoProducts';
import NewProductsScreen from '../screens/user/NewProductsScreen';
import BestSellersScreen from '../screens/user/BestSellersScreen';
import DiscountsScreen from '../screens/user/DiscountsScreen';
import AdminManualOrderScreen from "../screens/admin/AdminManualOrderScreen";
import ManualOrderReceiptScreen from "../screens/admin/ManualOrderReceiptScreen";
import ViewManualOrdersScreen from "../screens/admin/ViewManualOrdersScreen";
import OnboardingScreen from "../screens/OnboardingScreen";

const Stack = createNativeStackNavigator();
const Routes = () => {
  return (
    <NavigationContainer>
      <Stack.Navigator
        initialRouteName="splash"
        screenOptions={{ headerShown: false }}
      >
         <Stack.Screen name="onstart" component={OnboardingScreen} />

        <Stack.Screen name="splash" component={Splash} />
        <Stack.Screen name="login" component={LoginScreen} />
        <Stack.Screen name="signup" component={SignupScreen} />
        <Stack.Screen name="forgetpassword" component={ForgetPasswordScreen} />
        <Stack.Screen name="updatepassword" component={UpdatePasswordScreen} />
        <Stack.Screen name="myaccount" component={MyAccountScreen} />
        <Stack.Screen name="mywishlist" component={MyWishlistScreen} />
        <Stack.Screen name="dashboard" component={DashboardScreen} />
        <Stack.Screen name="addproduct" component={AddProductScreen} />
        <Stack.Screen name="viewproduct" component={ViewProductScreen} />
        <Stack.Screen name="editproduct" component={EditProductScreen} />
        <Stack.Screen name="tab" component={Tabs} />
        <Stack.Screen name="cart" component={CartScreen} />
        <Stack.Screen name="checkout" component={CheckoutScreen} />
        <Stack.Screen name="orderconfirm" component={OrderConfirmScreen} />
        <Stack.Screen name="productdetail" component={ProductDetailScreen} />
        <Stack.Screen name="vieworder" component={ViewOrdersScreen} />
        <Stack.Screen
          name="vieworderdetails"
          component={ViewOrderDetailScreen}
        />
        <Stack.Screen name="shippingaddress" component={ShippingAddressScreen} />
        <Stack.Screen name="myorder" component={MyOrderScreen} />
        <Stack.Screen name="myorderdetail" component={MyOrderDetailScreen} />
        <Stack.Screen name="viewcategories" component={ViewCategoryScreen} />
        <Stack.Screen name="addcategories" component={AddCategoryScreen} />
        <Stack.Screen name="editcategories" component={EditCategoryScreen} />
        <Stack.Screen name="viewusers" component={ViewUsersScreen} />
        <Stack.Screen name="categories" component={CategoriesScreen} />
        <Stack.Screen name="pub" component={ViewPubScreen} />
        <Stack.Screen name="addpub" component={AddPubScreen} />
        <Stack.Screen name="otpverification" component={OTPVerificationScreen} />
        <Stack.Screen name="phonenumber" component={PhoneNumberScreen} />
        <Stack.Screen name="adminnotifications" component={AdminNotificationsScreen} />
        <Stack.Screen name="usernotifications" component={UserNotificationsScreen} />
        <Stack.Screen 
          name="PalmaryProducts" 
          component={PalmaryProducts}
          options={{ headerShown: false }}
        />
        <Stack.Screen 
          name="BifaProducts" 
          component={BifaProducts}
          options={{ headerShown: false }}
        />
        <Stack.Screen 
          name="BimoProducts" 
          component={BimoProducts}
          options={{ headerShown: false }}
        />
        <Stack.Screen name="newproducts" component={NewProductsScreen} />
        <Stack.Screen name="bestsellers" component={BestSellersScreen} />
        <Stack.Screen name="discounts" component={DiscountsScreen} />
        <Stack.Screen 
          name="adminmanualorder" 
          component={AdminManualOrderScreen}
          options={{
            headerShown: true,
            title: 'إنشاء طلب يدوي',
            headerStyle: {
              backgroundColor: colors.primary,
            },
            headerTintColor: colors.white,
            headerTitleStyle: {
              fontWeight: 'bold',
            },
          }}
        />
        <Stack.Screen 
          name="manualorderreceipt" 
          component={ManualOrderReceiptScreen}
          options={{
            headerShown: true,
            title: 'إيصال الطلب',
            headerStyle: {
              backgroundColor: colors.primary,
            },
            headerTintColor: colors.white,
            headerTitleStyle: {
              fontWeight: 'bold',
            },
          }}
        />
        <Stack.Screen 
          name="viewmanualorders" 
          component={ViewManualOrdersScreen}
          options={{
            headerShown: true,
            title: 'الطلبات اليدوية',
            headerStyle: {
              backgroundColor: colors.primary,
            },
            headerTintColor: colors.white,
            headerTitleStyle: {
              fontWeight: 'bold',
            },
          }}
        />
      </Stack.Navigator>
    </NavigationContainer>
  );
};

export default Routes;