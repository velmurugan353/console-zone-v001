import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { useState } from 'react';
import { AuthProvider } from './context/AuthContext';
import { CartProvider } from './context/CartContext';
import MainLayout from './layouts/MainLayout';
import AdminLayout from './layouts/AdminLayout';
import RequireAuth from './components/RequireAuth';
import AuthModal from './components/AuthModal';

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

function App() {
  const [isAuthOpen, setIsAuthOpen] = useState(false);

  return (
    <AuthProvider>
      <CartProvider>
        <Router>
          <Routes>
            {/* Public Routes */}
            <Route path="/" element={<MainLayout onAuthClick={() => setIsAuthOpen(true)}><Home /></MainLayout>} />
            <Route path="/shop" element={<RequireAuth onLoginRequired={() => setIsAuthOpen(true)}><MainLayout onAuthClick={() => setIsAuthOpen(true)}><Shop /></MainLayout></RequireAuth>} />
            <Route path="/product/:id" element={<RequireAuth onLoginRequired={() => setIsAuthOpen(true)}><MainLayout onAuthClick={() => setIsAuthOpen(true)}><ProductDetails /></MainLayout></RequireAuth>} />
            <Route path="/rentals" element={<RequireAuth onLoginRequired={() => setIsAuthOpen(true)}><MainLayout onAuthClick={() => setIsAuthOpen(true)}><Rentals /></MainLayout></RequireAuth>} />
            <Route path="/sell" element={<RequireAuth onLoginRequired={() => setIsAuthOpen(true)}><MainLayout onAuthClick={() => setIsAuthOpen(true)}><Sell /></MainLayout></RequireAuth>} />
            <Route path="/repair" element={<RequireAuth onLoginRequired={() => setIsAuthOpen(true)}><MainLayout onAuthClick={() => setIsAuthOpen(true)}><Repair /></MainLayout></RequireAuth>} />
            <Route path="/cart" element={<RequireAuth onLoginRequired={() => setIsAuthOpen(true)}><MainLayout onAuthClick={() => setIsAuthOpen(true)}><Cart /></MainLayout></RequireAuth>} />
            <Route path="/book" element={<RequireAuth onLoginRequired={() => setIsAuthOpen(true)}><MainLayout onAuthClick={() => setIsAuthOpen(true)}><BookPage /></MainLayout></RequireAuth>} />
            <Route path="/rentals/:slug/book" element={<RequireAuth onLoginRequired={() => setIsAuthOpen(true)}><MainLayout onAuthClick={() => setIsAuthOpen(true)}><RentalBookingPage /></MainLayout></RequireAuth>} />
            <Route path="/rentals/:slug/book/confirm" element={<RequireAuth onLoginRequired={() => setIsAuthOpen(true)}><MainLayout onAuthClick={() => setIsAuthOpen(true)}><BookingConfirmationPage /></MainLayout></RequireAuth>} />
            <Route path="/login" element={<Login />} />
            <Route path="/register" element={<Register />} />
            <Route path="/forgot-password" element={<ForgotPassword />} />

            {/* User Routes */}
            <Route path="/dashboard" element={<MainLayout><UserLayout /></MainLayout>}>
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
            <Route path="/admin" element={<AdminLayout><AdminDashboard /></AdminLayout>} />
            <Route path="/admin/products" element={<AdminLayout><AdminProducts /></AdminLayout>} />
            <Route path="/admin/rentals" element={<Navigate to="/admin/operations?tab=rentals" replace />} />
            <Route path="/admin/rental-status" element={<AdminLayout><RentalStatus /></AdminLayout>} />
            <Route path="/admin/repairs" element={<Navigate to="/admin/operations?tab=repairs" replace />} />
            <Route path="/admin/orders" element={<Navigate to="/admin/operations?tab=orders" replace />} />
            <Route path="/admin/customers" element={<AdminLayout><AdminCustomers /></AdminLayout>} />
            <Route path="/admin/analytics" element={<AdminLayout><AdminAnalytics /></AdminLayout>} />
            <Route path="/admin/settings" element={<AdminLayout><AdminSettings /></AdminLayout>} />
            <Route path="/admin/rental-settings" element={<AdminLayout><RentalSettingsPage /></AdminLayout>} />
            <Route path="/admin/sell-requests" element={<Navigate to="/admin/operations?tab=sell-requests" replace />} />
            <Route path="/admin/coupons" element={<AdminLayout><AdminCoupons /></AdminLayout>} />
            <Route path="/admin/content" element={<AdminLayout><AdminContent /></AdminLayout>} />
            <Route path="/admin/kyc" element={<AdminLayout><KYCPage /></AdminLayout>} />
            <Route path="/admin/inventory" element={<AdminLayout><InventoryPage /></AdminLayout>} />
            <Route path="/admin/fleet" element={<AdminLayout><InventoryPage /></AdminLayout>} />
            <Route path="/admin/controls" element={<AdminLayout><AdminControls /></AdminLayout>} />
            <Route path="/admin/used-consoles" element={<AdminLayout><AdminUsedConsoles /></AdminLayout>} />
            <Route path="/admin/operations" element={<AdminLayout><AdminOperations /></AdminLayout>} />
            <Route path="/admin/automation" element={<AdminLayout><AdminAutomation /></AdminLayout>} />

            {/* Fallback */}
            <Route path="/404" element={<NotFound />} />
            <Route path="*" element={<Navigate to="/404" replace />} />
          </Routes>
        </Router>
        <AuthModal isOpen={isAuthOpen} onClose={() => setIsAuthOpen(false)} />
      </CartProvider>
    </AuthProvider>
  );
}

export default App;
