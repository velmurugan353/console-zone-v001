import { ReactNode, useEffect } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import {
  LayoutDashboard,
  ShoppingBag,
  Calendar,
  Users,
  Settings,
  LogOut,
  Gamepad2,
  Wrench,
  DollarSign,
  Activity,
  Tag,
  ShieldCheck,
  Zap,
  Box,
  RefreshCw
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { cn } from '../lib/utils';

export default function AdminLayout({ children }: { children: ReactNode }) {
  const location = useLocation();
  const navigate = useNavigate();
  const { logout, user, isAdmin, loading } = useAuth();

  useEffect(() => {
    if (!loading && (!user || !isAdmin)) {
      navigate('/login');
    }
  }, [user, isAdmin, navigate, loading]);

  if (loading) {
    return (
      <div className="min-h-screen bg-gaming-bg flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-gaming-accent"></div>
      </div>
    );
  }

  if (!user || !isAdmin) return null;

  const sidebarGroups = [
    {
      title: 'Dashboard',
      links: [
        { name: 'Overview', path: '/admin', icon: LayoutDashboard },
        { name: 'Control Center', path: '/admin/controls', icon: Zap },
        { name: 'Analytics', path: '/admin/analytics', icon: Activity },
      ]
    },
    {
      title: 'Catalog',
      links: [
        { name: 'Products', path: '/admin/products', icon: ShoppingBag },
        { name: 'Rental Inventory', path: '/admin/inventory', icon: Box },
        { name: 'Used Consoles', path: '/admin/used-consoles', icon: RefreshCw },
      ]
    },
    {
      title: 'Operations',
      links: [
        { name: 'Orders', path: '/admin/operations?tab=orders', icon: ShoppingBag },
        { name: 'Rentals', path: '/admin/operations?tab=rentals', icon: Calendar },
        { name: 'Repairs', path: '/admin/operations?tab=repairs', icon: Wrench },
        { name: 'Sell Requests', path: '/admin/operations?tab=sell-requests', icon: DollarSign },
      ]
    },
    {
      title: 'Users & Finance',
      links: [
        { name: 'Customers', path: '/admin/customers', icon: Users },
        { name: 'KYC', path: '/admin/kyc', icon: ShieldCheck },
        { name: 'Payments', path: '/admin/payments', icon: DollarSign },
        { name: 'Coupons', path: '/admin/coupons', icon: Tag },
      ]
    },
    {
      title: 'System',
      links: [
        { name: 'Content', path: '/admin/content', icon: LayoutDashboard },
        { name: 'Settings', path: '/admin/settings', icon: Settings },
      ]
    }
  ];

  const isLinkActive = (path: string) => {
    if (path.includes('?')) {
      const [pathname, search] = path.split('?');
      return location.pathname === pathname && location.search.includes(search);
    }
    return location.pathname === path;
  };

  return (
    <div className="min-h-screen flex bg-gaming-bg text-gaming-text font-sans">
      {/* Sidebar */}
      <aside className="w-64 bg-gaming-card border-r border-gaming-border hidden md:flex flex-col fixed h-full">
        <div className="p-6 border-b border-gaming-border shrink-0">
          <Link to="/" className="flex items-center space-x-2">
            <Gamepad2 className="h-6 w-6 text-gaming-accent" />
            <span className="text-xl font-bold text-white">ConsoleZone <span className="text-gaming-accent">Admin</span></span>
          </Link>
        </div>

        <nav className="flex-grow p-4 space-y-6 overflow-y-auto">
          {sidebarGroups.map((group) => (
            <div key={group.title} className="space-y-1">
              <h3 className="px-4 text-[10px] font-mono font-bold text-gaming-muted uppercase tracking-widest mb-2">
                {group.title}
              </h3>
              {group.links.map((link) => (
                <Link
                  key={link.name}
                  to={link.path}
                  className={cn(
                    "flex items-center space-x-3 px-4 py-2.5 rounded-lg text-sm font-medium transition-colors",
                    isLinkActive(link.path)
                      ? "bg-gaming-accent/10 text-gaming-accent"
                      : "text-gaming-muted hover:bg-gaming-border/50 hover:text-white"
                  )}
                >
                  <link.icon className="h-4 w-4" />
                  <span>{link.name}</span>
                </Link>
              ))}
            </div>
          ))}
        </nav>

        <div className="p-4 border-t border-gaming-border shrink-0">
          <div className="px-4 py-3 mb-2 flex items-center space-x-3">
            <div className="h-8 w-8 rounded-full bg-gaming-bg border border-gaming-border flex items-center justify-center overflow-hidden">
              <img src={user.avatar} alt={user.name} className="w-full h-full object-cover" />
            </div>
            <div className="overflow-hidden">
              <p className="text-sm font-medium text-white truncate">{user.name}</p>
              <p className="text-xs text-gaming-muted truncate">Admin</p>
            </div>
          </div>
          <button
            onClick={() => {
              logout();
              navigate('/login');
            }}
            className="flex items-center space-x-3 px-4 py-3 w-full rounded-lg text-sm font-medium text-red-500 hover:bg-red-500/10 transition-colors"
          >
            <LogOut className="h-5 w-5" />
            <span>Logout</span>
          </button>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-grow md:ml-64 p-8">
        {children}
      </main>
    </div>
  );
}
