import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { useState } from 'react';
import { AuthProvider } from './context/AuthContext';
import { CartProvider } from './context/CartContext';
import { CustomizerProvider } from './context/CustomizerContext';
import MainLayout from './layouts/MainLayout';
import AdminLayout from './layouts/AdminLayout';
import RequireAuth from './components/RequireAuth';
import AuthModal from './components/AuthModal';
import SplashScreen from './components/SplashScreen';

// Pages
import Home from './pages/Home';
import Shop from './pages/Shop';
import ProductDetails from './pages/ProductDetails';
import Rentals from './pages/Rentals';
import Sell from './pages/Sell';
import Repair from './pages/Repair';
import Cart from './pages/Cart';
import Login from './pages/Login';
import RentalBookingPage from './pages/RentalBookingPage';
import BookingConfirmationPage from './pages/BookingConfirmationPage';
import BookPage from './pages/BookPage';
import ComingSoon from './pages/ComingSoon';
import NotFound from './pages/NotFound';

// User Pages
import Register from './pages/user/Register';
import ForgotPassword from './pages/user/ForgotPassword';
import UserDashboard from './pages/user/UserDashboard';
import MyOrders from './pages/user/MyOrders';
import MyRentals from './pages/user/MyRentals';
import MyRepairRequests from './pages/user/MyRepairRequests';
import Wishlist from './pages/user/Wishlist';
import AddressManagement from './pages/user/AddressManagement';
import Notifications from './pages/user/Notifications';
import UserKYC from './pages/user/KYC';
import UserLayout from './layouts/UserLayout';

// Admin Pages
import AdminDashboard from './pages/admin/AdminDashboard';
import AdminProducts from './pages/admin/AdminProducts';
import AdminRentals from './pages/admin/AdminRentals';
import AdminRepairs from './pages/admin/AdminRepairs';
import AdminOrders from './pages/admin/AdminOrders';
import AdminCustomers from './pages/admin/AdminCustomers';
import AdminAnalytics from './pages/admin/AdminAnalytics';
import AdminSettings from './pages/admin/AdminSettings';
import RentalStatus from './pages/admin/RentalStatus';
import RentalSettingsPage from './pages/admin/RentalSettingsPage';
import AdminSellRequests from './pages/admin/AdminSellRequests';
import AdminCoupons from './pages/admin/AdminCoupons';
import AdminContent from './pages/admin/AdminContent';
import KYCPage from './pages/admin/KYC';
import FleetPage from './pages/admin/FleetPage';
import InventoryPage from './pages/admin/InventoryPage';
import AdminControls from './pages/admin/AdminControls';
import AdminUsedConsoles from './pages/admin/AdminUsedConsoles';
import AdminOperations from './pages/admin/AdminOperations';
import AdminAutomation from './pages/admin/AdminAutomation';
import AdminInvoices from './pages/admin/AdminInvoices';
import AdminCustomizer from './pages/admin/AdminCustomizer';

function App() {
  const [isAuthOpen, setIsAuthOpen] = useState(false);

  return (
    <AuthProvider>
      <CustomizerProvider>
        <CartProvider>
          <SplashScreen />
          <Router>
            <Routes>
              {/* Public Routes */}
              <Route path="/" element={<MainLayout onAuthClick={() => setIsAuthOpen(true)} />}>
                <Route index element={<Home />} />
                <Route path="shop" element={<Shop />} />
                <Route path="product/:id" element={<ProductDetails />} />
                <Route path="rentals" element={<Rentals />} />
                <Route path="sell" element={<Sell />} />
                <Route path="repair" element={<Repair />} />
                <Route path="cart" element={<Cart />} />
                <Route path="rental-booking" element={<RentalBookingPage />} />
                <Route path="booking-confirmation" element={<BookingConfirmationPage />} />
                <Route path="book" element={<BookPage />} />
                <Route path="coming-soon" element={<ComingSoon />} />
              </Route>

              {/* User Routes */}
              <Route path="/dashboard" element={
                <RequireAuth onLoginRequired={() => setIsAuthOpen(true)}>
                  <UserLayout />
                </RequireAuth>
              }>
                <Route index element={<UserDashboard />} />
                <Route path="orders" element={<MyOrders />} />
                <Route path="rentals" element={<MyRentals />} />
                <Route path="repairs" element={<MyRepairRequests />} />
                <Route path="wishlist" element={<Wishlist />} />
                <Route path="addresses" element={<AddressManagement />} />
                <Route path="notifications" element={<Notifications />} />
                <Route path="kyc" element={<UserKYC />} />
              </Route>

              {/* Admin Routes */}
              <Route path="/admin" element={
                <RequireAuth onLoginRequired={() => setIsAuthOpen(true)}>
                  <AdminLayout />
                </RequireAuth>
              }>
                <Route index element={<AdminDashboard />} />
                <Route path="products" element={<AdminProducts />} />
                <Route path="rentals" element={<AdminRentals />} />
                <Route path="repairs" element={<AdminRepairs />} />
                <Route path="orders" element={<AdminOrders />} />
                <Route path="customers" element={<AdminCustomers />} />
                <Route path="analytics" element={<AdminAnalytics />} />
                <Route path="settings" element={<AdminSettings />} />
                <Route path="rental-status" element={<RentalStatus />} />
                <Route path="rental-settings" element={<RentalSettingsPage />} />
                <Route path="sell-requests" element={<AdminSellRequests />} />
                <Route path="coupons" element={<AdminCoupons />} />
                <Route path="content" element={<AdminContent />} />
                <Route path="kyc" element={<KYCPage />} />
                <Route path="fleet" element={<FleetPage />} />
                <Route path="inventory" element={<InventoryPage />} />
                <Route path="controls" element={<AdminControls />} />
                <Route path="used-consoles" element={<AdminUsedConsoles />} />
                <Route path="operations" element={<AdminOperations />} />
                <Route path="automation" element={<AdminAutomation />} />
                <Route path="invoices" element={<AdminInvoices />} />
                <Route path="customizer" element={<AdminCustomizer />} />
              </Route>

              {/* Auth Routes */}
              <Route path="/login" element={<Login />} />
              <Route path="/register" element={<Register />} />
              <Route path="/forgot-password" element={<ForgotPassword />} />

              {/* Fallback */}
              <Route path="*" element={<NotFound />} />
            </Routes>
            <AuthModal isOpen={isAuthOpen} onClose={() => setIsAuthOpen(false)} />
          </Router>
        </CartProvider>
      </CustomizerProvider>
    </AuthProvider>
  );
}

export default App;
