import { ReactNode, useEffect, useState } from 'react';
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
  RefreshCw,
  Menu,
  X,
  Cpu,
  FileText,
  Palette
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { cn } from '../lib/utils';
import { useLayoutMach } from '../services/layoutMachService';
import { useAdminNotifications } from '../hooks/useAdminNotifications';
import { format } from 'date-fns';
import { motion, AnimatePresence } from 'framer-motion';
import { Bell } from 'lucide-react';

export default function AdminLayout({ children }: { children: ReactNode }) {
  const location = useLocation();
  const navigate = useNavigate();
  const { logout, user, isAdmin, loading } = useAuth();
  const { mode, protocol } = useLayoutMach();
  const { notifications, unreadCount, markRead } = useAdminNotifications();
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [isNotifOpen, setIsNotifOpen] = useState(false);

  useEffect(() => {
    if (!loading && (!user || !isAdmin)) {
      navigate('/login');
    }
  }, [user, isAdmin, navigate, loading]);

  // Auto-close mobile menu on navigation or mode change
  useEffect(() => {
    setIsMobileMenuOpen(false);
  }, [location.pathname, mode]);

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
        { name: 'Products', path: '/admin/products', icon: Box },
        { name: 'Rental Inventory', path: '/admin/inventory', icon: RefreshCw },
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
        { name: 'Invoices', path: '/admin/invoices', icon: FileText },
        { name: 'KYC', path: '/admin/kyc', icon: ShieldCheck },
        { name: 'Coupons', path: '/admin/coupons', icon: Tag },
      ]
    },
    {
      title: 'System',
      links: [
        { name: 'Customizer', path: '/admin/customizer', icon: Palette },
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
    <div className="min-h-screen flex bg-gaming-bg text-gaming-text font-sans overflow-x-hidden">
      {/* Mobile Mach Header */}
      <div className="md:hidden fixed top-0 left-0 right-0 h-16 bg-gaming-card border-b border-gaming-border z-50 flex items-center justify-between px-6">
        <Link to="/" className="flex items-center space-x-2">
          <Gamepad2 className="h-5 w-5 text-gaming-accent" />
          <span className="text-sm font-bold text-white uppercase tracking-tighter italic">Matrix <span className="text-gaming-accent">Admin</span></span>
        </Link>
        <div className="flex items-center gap-4">
          <button 
            onClick={() => setIsNotifOpen(!isNotifOpen)}
            className="relative p-2 text-gaming-muted hover:text-white transition-colors"
          >
            <Bell size={20} />
            {unreadCount > 0 && (
              <span className="absolute top-1 right-1 w-2 h-2 bg-red-500 rounded-full animate-pulse" />
            )}
          </button>
          <button 
            onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
            className="p-2 text-gaming-muted hover:text-white transition-colors"
          >
            {isMobileMenuOpen ? <X size={24} /> : <Menu size={24} />}
          </button>
        </div>
      </div>

      {/* Sidebar - Desktop & Tablet */}
      <aside className={cn(
        "bg-gaming-card border-r border-gaming-border flex flex-col fixed h-full z-40 transition-all duration-500",
        mode === 'phone' ? (isMobileMenuOpen ? 'w-full translate-x-0' : 'w-full -translate-x-full') : 
        mode === 'tab' ? 'w-20 translate-x-0' : 'w-64 translate-x-0'
      )}>
        <div className={cn(
          "p-6 border-b border-gaming-border shrink-0 flex items-center",
          mode === 'tab' && !isMobileMenuOpen ? 'justify-center' : 'space-x-2'
        )}>
          <Link to="/" className="flex items-center space-x-2">
            <Gamepad2 className="h-6 w-6 text-gaming-accent" />
            {(mode === 'desktop' || isMobileMenuOpen) && (
              <span className="text-xl font-bold text-white tracking-tighter uppercase italic">Matrix <span className="text-gaming-accent">Admin</span></span>
            )}
          </Link>
        </div>

        <nav className="flex-grow p-4 space-y-6 overflow-y-auto mt-16 md:mt-0">
          {sidebarGroups.map((group) => (
            <div key={group.title} className="space-y-1">
              {(mode === 'desktop' || isMobileMenuOpen) && (
                <h3 className="px-4 text-[10px] font-mono font-bold text-gaming-muted uppercase tracking-widest mb-2">
                  {group.title}
                </h3>
              )}
              {group.links.map((link) => (
                <Link
                  key={link.name}
                  to={link.path}
                  title={mode === 'tab' && !isMobileMenuOpen ? link.name : ''}
                  className={cn(
                    "flex items-center rounded-lg text-sm font-medium transition-all duration-300",
                    mode === 'tab' && !isMobileMenuOpen ? "justify-center p-3" : "space-x-3 px-4 py-2.5",
                    isLinkActive(link.path)
                      ? "bg-gaming-accent/10 text-gaming-accent shadow-[0_0_15px_rgba(168,85,247,0.15)]"
                      : "text-gaming-muted hover:bg-gaming-border/50 hover:text-white"
                  )}
                >
                  <link.icon className={cn("shrink-0", mode === 'tab' && !isMobileMenuOpen ? "h-6 w-6" : "h-4 w-4")} />
                  {(mode === 'desktop' || isMobileMenuOpen) && <span>{link.name}</span>}
                </Link>
              ))}
            </div>
          ))}
        </nav>

        {/* Agent Protocol Status */}
        <div className="p-4 border-t border-gaming-border bg-black/20">
          <div className={cn("flex items-center gap-3", mode === 'tab' && !isMobileMenuOpen ? 'justify-center' : '')}>
            <div className="relative">
              <Cpu className="h-5 w-5 text-gaming-accent animate-pulse" />
              <div className="absolute inset-0 bg-gaming-accent/20 blur-lg animate-pulse" />
            </div>
            {(mode === 'desktop' || isMobileMenuOpen) && (
              <div className="flex-1 min-w-0">
                <p className="text-[9px] font-black text-gaming-accent uppercase tracking-widest leading-tight">
                  Protocol: {protocol.agentName}
                </p>
                <p className="text-[8px] text-gaming-muted font-mono truncate uppercase">
                  Viewport Sync Active
                </p>
              </div>
            )}
          </div>
        </div>

        <div className="p-4 border-t border-gaming-border shrink-0">
          <div className={cn("px-4 py-3 mb-2 flex items-center gap-3", mode === 'tab' && !isMobileMenuOpen ? 'justify-center' : '')}>
            <div className="h-8 w-8 rounded-full bg-gaming-bg border border-gaming-border flex items-center justify-center overflow-hidden shrink-0">
              <img src={user.avatar} alt={user.name} className="w-full h-full object-cover" />
            </div>
            {(mode === 'desktop' || isMobileMenuOpen) && (
              <div className="overflow-hidden">
                <p className="text-sm font-medium text-white truncate">{user.name}</p>
                <p className="text-xs text-gaming-muted truncate">Admin</p>
              </div>
            )}
          </div>
          <button
            onClick={() => {
              logout();
              navigate('/login');
            }}
            className={cn(
              "flex items-center w-full rounded-lg text-sm font-medium text-red-500 hover:bg-red-500/10 transition-colors",
              mode === 'tab' && !isMobileMenuOpen ? "justify-center p-3" : "space-x-3 px-4 py-2.5"
            )}
          >
            <LogOut className="h-5 w-5" />
            {(mode === 'desktop' || isMobileMenuOpen) && <span>Logout</span>}
          </button>
        </div>
      </aside>

      {/* Main Content */}
      <main className={cn(
        "flex-grow p-4 md:p-8 transition-all duration-500 min-w-0",
        mode === 'phone' ? 'ml-0 pt-20' : mode === 'tab' ? 'ml-20' : 'ml-64'
      )}>
        {/* Desktop Notification Trigger */}
        <div className="hidden md:flex fixed top-4 right-8 z-50">
          <div className="relative">
            <button 
              onClick={() => setIsNotifOpen(!isNotifOpen)}
              className="group relative p-3 bg-gaming-card border border-gaming-border rounded-xl hover:border-gaming-accent transition-all shadow-xl"
            >
              <Bell size={18} className={cn("transition-colors", unreadCount > 0 ? "text-gaming-accent animate-pulse" : "text-gray-500 group-hover:text-white")} />
              {unreadCount > 0 && (
                <span className="absolute -top-1 -right-1 bg-red-500 text-white text-[8px] font-black w-4 h-4 flex items-center justify-center rounded-full border-2 border-[#0a0a0a]">
                  {unreadCount}
                </span>
              )}
            </button>

            {/* Signal Dropdown */}
            <AnimatePresence>
              {isNotifOpen && (
                <>
                  <div className="fixed inset-0 z-[-1]" onClick={() => setIsNotifOpen(false)} />
                  <motion.div
                    initial={{ opacity: 0, y: 10, scale: 0.95 }}
                    animate={{ opacity: 1, y: 0, scale: 1 }}
                    exit={{ opacity: 0, y: 10, scale: 0.95 }}
                    className="absolute right-0 mt-4 w-80 bg-gaming-card border border-gaming-border rounded-2xl shadow-2xl shadow-black/50 overflow-hidden"
                  >
                    <div className="p-4 bg-black/20 border-b border-gaming-border flex items-center justify-between">
                      <h3 className="text-[10px] font-black text-white uppercase tracking-widest italic">Signal_Inbound_Stream</h3>
                      <span className="text-[8px] font-mono text-gaming-accent bg-gaming-accent/10 px-2 py-0.5 rounded">Live</span>
                    </div>
                    <div className="max-h-96 overflow-y-auto scrollbar-hide">
                      {notifications.length > 0 ? (
                        notifications.slice(0, 5).map((n) => (
                          <div 
                            key={n.id} 
                            onClick={() => {
                              if (!n.read) markRead(n.id!);
                              if (n.actionPath) navigate(n.actionPath);
                              setIsNotifOpen(false);
                            }}
                            className={cn(
                              "p-4 border-b border-white/5 cursor-pointer transition-all hover:bg-white/[0.02]",
                              !n.read ? "bg-gaming-accent/[0.02]" : "opacity-60"
                            )}
                          >
                            <div className="flex justify-between items-start mb-1">
                              <h4 className="text-[10px] font-black text-white uppercase truncate">{n.title}</h4>
                              <span className="text-[8px] font-mono text-gray-500 whitespace-nowrap">
                                {n.timestamp?.toDate ? format(n.timestamp.toDate(), 'HH:mm') : 'NOW'}
                              </span>
                            </div>
                            <p className="text-[10px] text-gaming-muted line-clamp-2 uppercase font-mono">{n.message}</p>
                          </div>
                        ))
                      ) : (
                        <div className="p-8 text-center text-[10px] font-mono text-gaming-muted uppercase tracking-widest">
                          Zero_Signals_Detected
                        </div>
                      )}
                    </div>
                    <Link 
                      to="/admin/operations" 
                      className="block p-3 bg-black/40 text-[9px] font-black text-center text-gaming-muted hover:text-gaming-accent uppercase tracking-[0.2em] transition-colors"
                      onClick={() => setIsNotifOpen(false)}
                    >
                      View_All_Log_Data
                    </Link>
                  </motion.div>
                </>
              )}
            </AnimatePresence>
          </div>
        </div>
        {children}
      </main>
    </div>
  );
}
