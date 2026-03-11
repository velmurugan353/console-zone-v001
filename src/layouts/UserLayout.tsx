import { Link, useLocation, Outlet } from 'react-router-dom';
import { 
  LayoutDashboard, 
  ShoppingBag, 
  Gamepad2, 
  Wrench, 
  Heart, 
  MapPin, 
  CreditCard, 
  Bell, 
  LogOut,
  User,
  ShieldCheck
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';

export default function UserLayout() {
  const location = useLocation();
  const { logout } = useAuth();

  const navigation = [
    { name: 'Dashboard', href: '/dashboard', icon: LayoutDashboard },
    { name: 'My Orders', href: '/dashboard/orders', icon: ShoppingBag },
    { name: 'My Rentals', href: '/dashboard/rentals', icon: Gamepad2 },
    { name: 'Repair Requests', href: '/dashboard/repairs', icon: Wrench },
    { name: 'Wishlist', href: '/dashboard/wishlist', icon: Heart },
    { name: 'Addresses', href: '/dashboard/addresses', icon: MapPin },
    { name: 'Notifications', href: '/dashboard/notifications', icon: Bell },
    { name: 'KYC Verification', href: '/dashboard/kyc', icon: ShieldCheck },
  ];

  return (
    <div className="min-h-screen bg-gaming-bg pt-24 pb-12">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
          {/* Sidebar Navigation */}
          <div className="lg:col-span-1">
            <div className="bg-gaming-card border border-gaming-border rounded-xl p-6 sticky top-24">
              <div className="flex items-center space-x-4 mb-8 pb-8 border-b border-gaming-border">
                <div className="w-12 h-12 rounded-full bg-gaming-accent/20 flex items-center justify-center text-gaming-accent">
                  <User className="h-6 w-6" />
                </div>
                <div>
                  <h3 className="text-white font-bold">User Account</h3>
                  <p className="text-gaming-muted text-sm">user@gamevault.com</p>
                </div>
              </div>
              
              <nav className="space-y-2">
                {navigation.map((item) => {
                  const isActive = location.pathname === item.href;
                  return (
                    <Link
                      key={item.name}
                      to={item.href}
                      className={`flex items-center space-x-3 px-4 py-3 rounded-lg transition-colors ${
                        isActive 
                          ? 'bg-gaming-accent text-black font-medium' 
                          : 'text-gaming-muted hover:bg-gaming-border hover:text-white'
                      }`}
                    >
                      <item.icon className={`h-5 w-5 ${isActive ? 'text-black' : ''}`} />
                      <span>{item.name}</span>
                    </Link>
                  );
                })}
                
                <button
                  onClick={logout}
                  className="w-full flex items-center space-x-3 px-4 py-3 rounded-lg text-red-400 hover:bg-red-400/10 transition-colors mt-8"
                >
                  <LogOut className="h-5 w-5" />
                  <span>Sign Out</span>
                </button>
              </nav>
            </div>
          </div>

          {/* Main Content */}
          <div className="lg:col-span-3">
            <Outlet />
          </div>
        </div>
      </div>
    </div>
  );
}
