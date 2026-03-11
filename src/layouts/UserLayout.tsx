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
import { useState, useEffect } from 'react';
import { notificationService } from '../services/notificationService';

export default function UserLayout() {
  const location = useLocation();
  const { logout, user } = useAuth();
  const [unreadCount, setUnreadCount] = useState(0);

  useEffect(() => {
    if (!user) return;
    const unsub = notificationService.subscribe(user.id, (notifications) => {
      setUnreadCount(notifications.filter(n => !n.read).length);
    });
    return () => unsub();
  }, [user]);

  const navigation = [
    { name: 'Command Matrix', href: '/dashboard', icon: LayoutDashboard },
    { name: 'Financial Logs', href: '/dashboard/orders', icon: ShoppingBag },
    { name: 'Active Fleet', href: '/dashboard/rentals', icon: Gamepad2 },
    { name: 'Tech Support', href: '/dashboard/repairs', icon: Wrench },
    { name: 'Saved Assets', href: '/dashboard/wishlist', icon: Heart },
    { name: 'Logistics Database', href: '/dashboard/addresses', icon: MapPin },
    { name: 'Signal Comms', href: '/dashboard/notifications', icon: Bell },
    { name: 'Identity Matrix (KYC)', href: '/dashboard/kyc', icon: ShieldCheck },
  ];

  return (
    <div className="min-h-screen bg-gaming-bg pt-24 pb-12">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
          {/* Sidebar Navigation */}
          <div className="lg:col-span-1">
            <div className="bg-gaming-card border border-gaming-border rounded-xl p-6 sticky top-24">
              <div className="flex items-center space-x-4 mb-8 pb-8 border-b border-gaming-border">
                <div className="w-12 h-12 rounded-full bg-gaming-accent/20 flex items-center justify-center text-gaming-accent overflow-hidden">
                  {user?.avatar ? <img src={user.avatar} alt={user.name} className="w-full h-full object-cover" /> : <User className="h-6 w-6" />}
                </div>
                <div className="overflow-hidden">
                  <h3 className="text-white font-bold truncate">{user?.name || 'User Account'}</h3>
                  <p className="text-gaming-muted text-sm truncate">{user?.email || 'user@gamevault.com'}</p>
                </div>
              </div>
              
              <nav className="space-y-2">
                {navigation.map((item) => {
                  const isActive = location.pathname === item.href;
                  return (
                    <Link
                      key={item.name}
                      to={item.href}
                      className={`flex items-center justify-between px-4 py-3 rounded-lg transition-colors ${
                        isActive 
                          ? 'bg-gaming-accent text-black font-medium' 
                          : 'text-gaming-muted hover:bg-gaming-border hover:text-white'
                      }`}
                    >
                      <div className="flex items-center space-x-3">
                        <item.icon className={`h-5 w-5 ${isActive ? 'text-black' : ''}`} />
                        <span>{item.name}</span>
                      </div>
                      {item.name === 'Signal Comms' && unreadCount > 0 && (
                        <span className={`px-2 py-0.5 rounded-full text-[10px] font-black animate-pulse ${isActive ? 'bg-black text-gaming-accent' : 'bg-gaming-accent text-black'}`}>
                          {unreadCount}
                        </span>
                      )}
                    </Link>
                  );
                })}
                
                <button
                  onClick={logout}
                  className="w-full flex items-center space-x-3 px-4 py-3 rounded-lg text-red-400 hover:bg-red-500/10 transition-colors mt-8"
                >
                  <LogOut className="h-5 w-5" />
                  <span>Terminate Session</span>
                </button>
              </nav>

              {/* System Diagnostics */}
              <div className="mt-8 pt-8 border-t border-gaming-border space-y-4">
                <div className="flex items-center justify-between text-[10px] font-mono text-gaming-muted uppercase tracking-widest">
                  <span>Neural Link</span>
                  <span className="text-emerald-500 animate-pulse">Stable</span>
                </div>
                <div className="space-y-2">
                  <div className="flex justify-between text-[9px] font-mono text-gray-500 uppercase">
                    <span>CPU Core</span>
                    <span>42%</span>
                  </div>
                  <div className="h-1 w-full bg-white/5 rounded-full overflow-hidden">
                    <div className="h-full bg-gaming-accent/40 w-[42%]" />
                  </div>
                </div>
                <div className="space-y-2">
                  <div className="flex justify-between text-[9px] font-mono text-gray-500 uppercase">
                    <span>Memory Link</span>
                    <span>89%</span>
                  </div>
                  <div className="h-1 w-full bg-white/5 rounded-full overflow-hidden">
                    <div className="h-full bg-gaming-secondary/40 w-[89%]" />
                  </div>
                </div>
              </div>
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
