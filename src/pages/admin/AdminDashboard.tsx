import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  LineChart,
  Line,
  PieChart,
  Pie,
  Cell,
  Legend,
  AreaChart,
  Area,
  ComposedChart
} from 'recharts';
import {
  DollarSign,
  Users,
  ShoppingBag,
  Activity,
  ArrowUpRight,
  ArrowDownRight,
  Clock,
  PieChart as PieChartIcon,
  Tag,
  Settings,
  Box,
  Zap,
  Plus,
  ArrowRight,
  ChevronRight,
  ShieldCheck,
  RefreshCw,
  AlertCircle,
  Palette
} from 'lucide-react';
import { Link } from 'react-router-dom';
import { useAdminNotifications } from '../../hooks/useAdminNotifications';
import { motion } from 'framer-motion';

const data = [
  { name: 'Jan', revenue: 4000, rentals: 2400, avgDuration: 3.2 },
  { name: 'Feb', revenue: 3000, rentals: 1398, avgDuration: 3.5 },
  { name: 'Mar', revenue: 2000, rentals: 9800, avgDuration: 4.1 },
  { name: 'Apr', revenue: 2780, rentals: 3908, avgDuration: 3.8 },
  { name: 'May', revenue: 1890, rentals: 4800, avgDuration: 4.5 },
  { name: 'Jun', revenue: 2390, rentals: 3800, avgDuration: 4.2 },
  { name: 'Jul', revenue: 3490, rentals: 4300, avgDuration: 4.8 },
];

const categoryData = [
  { name: 'Games', value: 45, color: '#A855F7' },
  { name: 'Controllers', value: 25, color: '#3B82F6' },
  { name: 'Accessories', value: 20, color: '#10B981' },
  { name: 'VR Gear', value: 10, color: '#F59E0B' },
];

const categoryPerformanceData = [
  { category: 'Games', revenue: 12500, rentals: 450, avgDuration: 4.2 },
  { category: 'Controllers', revenue: 8500, rentals: 250, avgDuration: 3.5 },
  { category: 'Accessories', revenue: 4200, rentals: 180, avgDuration: 2.8 },
  { category: 'VR Gear', revenue: 15600, rentals: 85, avgDuration: 5.5 },
  { category: 'Consoles', revenue: 28400, rentals: 120, avgDuration: 7.2 },
];

const durationDistribution = [
  { duration: '1-2 Days', count: 450 },
  { duration: '3-5 Days', count: 890 },
  { duration: '1 Week', count: 560 },
  { duration: '2 Weeks', count: 230 },
  { duration: '1 Month', count: 110 },
];

const StatCard = ({ title, value, change, icon: Icon, trend, subtitle }: any) => (
  <div className="bg-[#0a0a0a] p-5 rounded-lg border border-white/5 hover:border-[#A855F7]/30 transition-all group relative overflow-hidden">
    <div className="absolute top-0 left-0 w-1 h-full bg-[#A855F7] opacity-0 group-hover:opacity-100 transition-opacity" />
    <div className="flex items-center justify-between mb-4">
      <div className="p-2 bg-[#A855F7]/10 rounded border border-[#A855F7]/20">
        <Icon className="h-5 w-5 text-[#A855F7]" />
      </div>
      <div className="flex flex-col items-end">
        <span className={`flex items-center text-[10px] font-mono uppercase tracking-wider ${trend === 'up' ? 'text-emerald-400' : 'text-red-400'}`}>
          {change}
          {trend === 'up' ? <ArrowUpRight className="h-3 w-3 ml-0.5" /> : <ArrowDownRight className="h-3 w-3 ml-0.5" />}
        </span>
      </div>
    </div>
    <h3 className="text-gray-500 text-[10px] font-mono uppercase tracking-widest">{title}</h3>
    <div className="flex items-baseline space-x-2 mt-1">
      <p className="text-2xl font-bold text-white font-mono tracking-tighter">{value}</p>
      {subtitle && <span className="text-[10px] text-gray-600 font-mono italic">{subtitle}</span>}
    </div>
    <div className="mt-4 h-1 w-full bg-white/5 rounded-full overflow-hidden">
      <div className="h-full bg-[#A855F7]/50 w-2/3 animate-pulse" />
    </div>
  </div>
);

const InventoryRow = ({ id, name, status, health, load, location, lastService, onStatusChange }: any) => (
  <div className="grid grid-cols-7 gap-4 p-4 border-b border-white/5 hover:bg-white/[0.02] transition-colors group cursor-pointer">
    <div className="flex items-center space-x-3">
      <span className="text-[10px] font-mono text-gray-600">[{id}]</span>
      <span className="text-xs font-medium text-gray-300 group-hover:text-white">{name}</span>
    </div>
    <div className="flex items-center">
      <div className="relative">
        <select
          value={status}
          onChange={(e) => onStatusChange?.(id, e.target.value)}
          className="appearance-none bg-white/5 border border-white/10 rounded px-2 py-0.5 text-[9px] font-mono font-bold uppercase text-[#A855F7] focus:outline-none focus:border-[#A855F7] transition-all cursor-pointer hover:bg-white/10 pr-6"
        >
          <option value="Active">Active</option>
          <option value="Maintenance">Maintenance</option>
          <option value="Offline">Offline</option>
          <option value="Rented">Rented</option>
        </select>
        <div className="absolute right-1 top-1/2 -translate-y-1/2 pointer-events-none">
          <ChevronRight size={8} className="rotate-90 text-gray-500" />
        </div>
      </div>
    </div>
    <div className="flex items-center">
      <span className="text-[10px] font-mono text-gray-400 uppercase">{location}</span>
    </div>
    <div className="flex items-center">
      <span className="text-[10px] font-mono text-gray-400 uppercase">{lastService}</span>
    </div>
    <div className="flex items-center space-x-2">
      <div className="flex-grow h-1 bg-white/5 rounded-full overflow-hidden">
        <div className={`h-full rounded-full ${health > 80 ? 'bg-emerald-500' : health > 50 ? 'bg-amber-500' : 'bg-red-500'}`} style={{ width: `${health}%` }} />
      </div>
      <span className="text-[10px] font-mono text-gray-500">{health}%</span>
    </div>
    <div className="flex items-center">
      <span className="text-[10px] font-mono text-gray-400 italic">{load}</span>
    </div>
    <div className="flex items-center justify-end">
      <button className="p-1 hover:bg-white/10 rounded transition-colors">
        <Settings className="h-3 w-3 text-gray-500" />
      </button>
    </div>
  </div>
);

import CommandMatrix from '../../components/admin/CommandMatrix';

export default function AdminDashboard() {
  const { notifications } = useAdminNotifications();
  const criticalLogs = notifications.filter(n => !n.read && (n.priority === 'critical' || n.priority === 'high'));

  return (
    <div className="space-y-8 pb-20">
      {/* System Anomalies Alert Bar */}
      {criticalLogs.length > 0 && (
        <motion.div 
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-red-500/10 border border-red-500/20 rounded-2xl p-4 flex items-center justify-between group overflow-hidden relative mb-8"
        >
          <div className="absolute inset-0 bg-red-500/[0.02] animate-pulse" />
          <div className="flex items-center gap-4 relative z-10">
            <div className="p-2 bg-red-500/20 rounded-lg text-red-500 shrink-0">
              <AlertCircle size={20} />
            </div>
            <div className="min-w-0">
              <p className="text-[10px] font-mono text-red-500/70 uppercase tracking-widest">System_Anomaly_Detected</p>
              <p className="text-sm font-bold text-white uppercase italic truncate">
                {criticalLogs[0].title}: {criticalLogs[0].message}
              </p>
            </div>
          </div>
          <Link 
            to="/admin/operations" 
            className="flex items-center gap-2 px-4 py-2 bg-red-500/20 rounded-lg text-[10px] font-black text-red-500 hover:bg-red-500 hover:text-white transition-all uppercase tracking-widest relative z-10 shrink-0"
          >
            Resolve_Now <ArrowRight size={14} />
          </Link>
        </motion.div>
      )}

      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 border-b border-white/10 pb-8">
        <div>
          <div className="flex items-center space-x-2 mb-2">
            <div className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse" />
            <span className="text-[10px] font-mono text-emerald-500 uppercase tracking-[0.2em]">System Online // Matrix v4.0.2</span>
          </div>
          <h1 className="text-4xl font-bold text-white tracking-tighter uppercase italic">Hardware <span className="text-[#A855F7]">Matrix</span></h1>
          <p className="text-gray-500 font-mono text-xs mt-1">Deep Inventory & Identity Protocols // Active Session: Admin_Root</p>
        </div>
        <div className="flex items-center space-x-3">
          <div className="text-right hidden md:block">
            <p className="text-[10px] font-mono text-gray-500 uppercase">Last Sync</p>
            <p className="text-xs font-mono text-white">2026.03.08 03:03:42</p>
          </div>
          <button className="px-4 py-2 bg-white/5 border border-white/10 rounded text-xs font-mono text-white hover:bg-white/10 transition-all flex items-center space-x-2">
            <RefreshCw className="h-3 w-3" />
            <span>Force Re-Index</span>
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          title="Net Liquidity"
          value="₹142,509.22"
          change="+14.2%"
          trend="up"
          icon={DollarSign}
          subtitle="Real-time Flow"
        />
        <StatCard
          title="Identity Verified"
          value="98.2%"
          change="+2.1%"
          trend="up"
          icon={ShieldCheck}
          subtitle="KYC Protocol"
        />
        <StatCard
          title="Hardware Load"
          value="42.5%"
          change="-5.4%"
          trend="down"
          icon={Activity}
          subtitle="Fleet Avg"
        />
        <StatCard
          title="Active Nodes"
          value="1,284"
          change="+12"
          trend="up"
          icon={Box}
          subtitle="Inventory Units"
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="lg:col-span-2 space-y-8 overflow-x-auto lg:overflow-x-visible">
          {/* Deep Inventory Protocol */}
          <div className="bg-[#0a0a0a] rounded-lg border border-white/10 overflow-hidden min-w-[800px] lg:min-w-0">
            <div className="p-4 bg-white/[0.02] border-b border-white/10 flex justify-between items-center">
              <div className="flex items-center space-x-2">
                <Box className="h-4 w-4 text-[#A855F7]" />
                <h3 className="text-xs font-mono uppercase tracking-widest text-white">Deep Inventory Protocol</h3>
              </div>
              <span className="text-[9px] font-mono text-gray-500 italic">Scanning 4,821 assets...</span>
            </div>
            <div className="p-0">
              <div className="grid grid-cols-7 gap-4 p-4 bg-white/[0.01] border-b border-white/5 text-[10px] font-mono uppercase tracking-tighter text-gray-500">
                <span>Asset ID / Name</span>
                <span>Status</span>
                <span>Location</span>
                <span>Last Service</span>
                <span>Health Index</span>
                <span>Current Load</span>
                <span className="text-right">Actions</span>
              </div>
              <div className="divide-y divide-white/5">
                <InventoryRow id="PS5-001" name="PlayStation 5 Pro // Unit 01" status="Active" health={98} load="4.2 GB/s" location="Rack A-12" lastService="2024.02.15" />
                <InventoryRow id="XBS-042" name="Xbox Series X // Unit 42" status="Maintenance" health={45} load="0.0 GB/s" location="Service Bay" lastService="2024.03.01" />
                <InventoryRow id="NSW-112" name="Nintendo Switch OLED // Unit 112" status="Active" health={82} load="1.1 GB/s" location="Rack B-04" lastService="2024.01.15" />
                <InventoryRow id="VRG-009" name="Meta Quest 3 // Unit 09" status="Active" health={91} load="2.8 GB/s" location="Rack C-01" lastService="2024.02.20" />
                <InventoryRow id="PS5-002" name="PlayStation 5 Pro // Unit 02" status="Offline" health={12} load="N/A" location="Storage" lastService="2023.11.10" />
              </div>
              <div className="p-4 bg-white/[0.01] flex justify-center">
                <button className="text-[10px] font-mono uppercase tracking-widest text-[#A855F7] hover:text-white transition-colors">Load Full Matrix View</button>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            <div className="bg-[#0a0a0a] p-6 rounded-lg border border-white/10">
              <h3 className="text-xs font-mono uppercase tracking-widest text-white mb-6">Identity Protocols</h3>
              <div className="space-y-4">
                {[
                  { label: 'KYC Verification Rate', value: '94%', color: 'bg-[#A855F7]' },
                  { label: 'Auth Success Rate', value: '99.8%', color: 'bg-emerald-500' },
                  { label: 'Security Breaches', value: '0', color: 'bg-emerald-500' },
                  { label: 'Pending Reviews', value: '12', color: 'bg-amber-500' },
                ].map((item) => (
                  <div key={item.label} className="space-y-2">
                    <div className="flex justify-between text-[10px] font-mono">
                      <span className="text-gray-500">{item.label}</span>
                      <span className="text-white">{item.value}</span>
                    </div>
                    <div className="h-1 w-full bg-white/5 rounded-full overflow-hidden">
                      <div className={`h-full ${item.color}`} style={{ width: item.value.includes('%') ? item.value : '100%' }} />
                    </div>
                  </div>
                ))}
              </div>
              <button className="w-full mt-6 py-2 bg-white/5 border border-white/10 rounded text-[10px] font-mono uppercase tracking-widest text-white hover:bg-white/10 transition-all">
                Access Identity Vault
              </button>
            </div>

            <div className="bg-[#0a0a0a] p-6 rounded-lg border border-white/10">
              <h3 className="text-xs font-mono uppercase tracking-widest text-white mb-6">System Controls</h3>
              <div className="grid grid-cols-3 gap-3">
                {[
                  { name: 'Control Center', path: '/admin/controls', icon: Zap },
                  { name: 'Customizer', path: '/admin/customizer', icon: Palette },
                  { name: 'Rental Status', path: '/admin/rental-status', icon: Activity },
                  { name: 'KYC Review', path: '/admin/kyc', icon: ShieldCheck },
                  { name: 'Rental Inventory', path: '/admin/inventory', icon: Box },
                ].map((action) => (
                  <Link
                    key={action.name}
                    to={action.path}
                    className="flex flex-col items-center justify-center p-4 bg-white/[0.02] border border-white/5 rounded hover:border-[#A855F7]/50 hover:bg-[#A855F7]/5 transition-all group"
                  >
                    <action.icon className="h-5 w-5 text-gray-500 group-hover:text-[#A855F7] mb-2" />
                    <span className="text-[9px] font-mono uppercase tracking-tighter text-gray-400 group-hover:text-white text-center">{action.name}</span>
                  </Link>
                ))}
              </div>
            </div>
          </div>
        </div>

        <div className="space-y-8">
          {/* Real-time Command Feed */}
          <CommandMatrix />

          {/* Revenue Matrix */}
          <div className="bg-[#0a0a0a] p-6 rounded-lg border border-white/10">
            <h3 className="text-xs font-mono uppercase tracking-widest text-white mb-6">Revenue Matrix</h3>
            <div className="h-[250px]">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={data}>
                  <defs>
                    <linearGradient id="colorRevenue" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#A855F7" stopOpacity={0.3} />
                      <stop offset="95%" stopColor="#A855F7" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="#222" vertical={false} />
                  <XAxis dataKey="name" stroke="#444" fontSize={10} tickLine={false} axisLine={false} />
                  <YAxis stroke="#444" fontSize={10} tickLine={false} axisLine={false} />
                  <Tooltip
                    contentStyle={{ backgroundColor: '#0a0a0a', border: '1px solid #222', borderRadius: '4px', fontSize: '10px', fontFamily: 'monospace' }}
                    itemStyle={{ color: '#A855F7' }}
                  />
                  <Area type="monotone" dataKey="revenue" stroke="#A855F7" fillOpacity={1} fill="url(#colorRevenue)" strokeWidth={2} />
                </AreaChart>
              </ResponsiveContainer>
            </div>
            <div className="mt-4 grid grid-cols-2 gap-4">
              <div className="p-3 bg-white/[0.02] border border-white/5 rounded">
                <p className="text-[9px] font-mono text-gray-500 uppercase">Projected</p>
                <p className="text-sm font-mono text-white">₹52.4K</p>
              </div>
              <div className="p-3 bg-white/[0.02] border border-white/5 rounded">
                <p className="text-[9px] font-mono text-gray-500 uppercase">Variance</p>
                <p className="text-sm font-mono text-emerald-500">+4.2%</p>
              </div>
            </div>
          </div>

          <div className="bg-[#0a0a0a] p-6 rounded-lg border border-white/10">
            <h3 className="text-xs font-mono uppercase tracking-widest text-white mb-6">Distribution Matrix</h3>
            <div className="h-[250px]">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={categoryData}
                    cx="50%"
                    cy="50%"
                    innerRadius={60}
                    outerRadius={80}
                    paddingAngle={5}
                    dataKey="value"
                  >
                    {categoryData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip
                    contentStyle={{ backgroundColor: '#0a0a0a', border: '1px solid #222', borderRadius: '4px', fontSize: '10px', fontFamily: 'monospace' }}
                  />
                </PieChart>
              </ResponsiveContainer>
            </div>
            <div className="mt-4 space-y-2">
              {categoryData.map((item) => (
                <div key={item.name} className="flex items-center justify-between text-[10px] font-mono">
                  <div className="flex items-center space-x-2">
                    <div className="h-2 w-2 rounded-full" style={{ backgroundColor: item.color }} />
                    <span className="text-gray-400 uppercase">{item.name}</span>
                  </div>
                  <span className="text-white">{item.value}%</span>
                </div>
              ))}
            </div>
          </div>

          <div className="bg-gradient-to-br from-[#A855F7]/20 to-transparent p-6 rounded-lg border border-[#A855F7]/30">
            <h3 className="text-sm font-bold text-white mb-2 uppercase italic tracking-tighter">Emergency Override</h3>
            <p className="text-[10px] font-mono text-gray-400 mb-4">Manual system suspension and global inventory freeze protocols.</p>
            <button className="w-full py-2 bg-red-500/10 border border-red-500/20 rounded text-[10px] font-mono uppercase tracking-widest text-red-500 hover:bg-red-500/20 transition-all">
              Initiate System Lockdown
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
