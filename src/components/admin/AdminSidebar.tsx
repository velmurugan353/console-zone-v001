import { Link, useLocation } from 'react-router-dom';
import { 
  LayoutDashboard, 
  Package, 
  Gamepad2, 
  Wrench, 
  ShoppingBag, 
  Users, 
  Settings, 
  LogOut,
  BarChart3,
  RefreshCw,
  Box,
  ShieldCheck,
  Zap,
  Activity,
  FileText,
  User
} from 'lucide-react';
import { cn } from '../../lib/utils';
import { motion } from 'framer-motion';

const sidebarItems = [
  { name: 'Dashboard', icon: LayoutDashboard, path: '/admin' },
  { name: 'Control Center', icon: Zap, path: '/admin/controls' },
  { name: 'Operations Matrix', icon: Activity, path: '/admin/operations' },
  { name: 'Automation Matrix', icon: Zap, path: '/admin/automation' },
  { name: 'Products', icon: Package, path: '/admin/products' },
  { name: 'Fleet Inventory', icon: Box, path: '/admin/fleet' },
  { name: 'Used Consoles', icon: RefreshCw, path: '/admin/used-consoles' },
  { name: 'Customers', icon: Users, path: '/admin/customers' },
  { name: 'Analytics', icon: BarChart3, path: '/admin/analytics' },
  { name: 'Invoices', icon: FileText, path: '/admin/invoices' },
  { name: 'KYC Review', icon: ShieldCheck, path: '/admin/kyc' },
  { name: 'Settings', icon: Settings, path: '/admin/settings' },
  { name: 'Customer View', icon: User, path: '/dashboard' },
];

export default function AdminSidebar() {
  const location = useLocation();

  return (
    <div className="w-64 bg-[#111] border-r border-white/10 h-screen fixed left-0 top-0 flex flex-col">
      <div className="p-6 border-b border-white/10">
        <Link to="/" className="flex items-center space-x-2">
          <div className="p-2 bg-[#A855F7]/10 rounded-lg">
            <Gamepad2 className="h-6 w-6 text-[#A855F7]" />
          </div>
          <span className="text-xl font-bold tracking-tight text-white">
            Game<span className="text-[#A855F7]">Vault</span>
            <span className="text-xs ml-1 text-gray-500 font-normal">Admin</span>
          </span>
        </Link>
      </div>

      <nav className="flex-1 overflow-y-auto py-4 px-3 space-y-1">
        {sidebarItems.map((item) => {
          const isActive = location.pathname === item.path;
          return (
            <Link
              key={item.path}
              to={item.path}
              className={cn(
                "flex items-center space-x-3 px-3 py-2.5 rounded-lg transition-all duration-200 group relative overflow-hidden",
                isActive 
                  ? "bg-[#A855F7]/10 text-[#A855F7]" 
                  : "text-gray-400 hover:text-white hover:bg-white/5"
              )}
            >
              {isActive && (
                <motion.div
                  layoutId="activeTab"
                  className="absolute left-0 top-0 bottom-0 w-1 bg-[#A855F7] rounded-r-full"
                />
              )}
              <item.icon className={cn("h-5 w-5", isActive ? "text-[#A855F7]" : "text-gray-500 group-hover:text-white")} />
              <span className="font-medium">{item.name}</span>
            </Link>
          );
        })}
      </nav>

      <div className="p-4 border-t border-white/10">
        <button className="flex items-center space-x-3 px-3 py-2.5 w-full rounded-lg text-gray-400 hover:text-red-400 hover:bg-red-500/10 transition-colors">
          <LogOut className="h-5 w-5" />
          <span className="font-medium">Logout</span>
        </button>
      </div>
    </div>
  );
}
