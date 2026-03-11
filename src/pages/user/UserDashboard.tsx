import { useState, useEffect, useMemo } from 'react';
import {
  ShoppingBag,
  Gamepad2,
  Wrench,
  CreditCard,
  Clock,
  CheckCircle,
  AlertTriangle,
  Package,
  Zap,
  Shield,
  Trophy,
  Activity,
  ArrowRight,
  Terminal,
  Cpu
} from 'lucide-react';
import { formatCurrency } from '../../lib/utils';
import { useAuth } from '../../context/AuthContext';
import { db } from '../../lib/firebase';
import { collection, query, where, onSnapshot } from 'firebase/firestore';
import { motion } from 'framer-motion';
import { Link } from 'react-router-dom';

export default function UserDashboard() {
  const { user } = useAuth();
  const [orders, setOrders] = useState<any[]>([]);
  const [rentals, setRentals] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) return;

    // Listen to orders
    const qOrders = query(collection(db, 'orders'), where('userId', '==', user.id));
    const unsubOrders = onSnapshot(qOrders, (snapshot) => {
      setOrders(snapshot.docs.map(doc => ({ id: doc.id, type: 'order', ...doc.data() })));
    });

    // Listen to rentals
    const qRentals = query(collection(db, 'rentals'), where('email', '==', user.email));
    const unsubRentals = onSnapshot(qRentals, (snapshot) => {
      setRentals(snapshot.docs.map(doc => ({ id: doc.id, type: 'rental', ...doc.data() })));
      setLoading(false);
    });

    return () => {
      unsubOrders();
      unsubRentals();
    };
  }, [user]);

  const stats = useMemo(() => {
    const activeRentals = rentals.filter(r => r.status === 'active').length;
    const pendingOrders = orders.filter(o => o.status === 'pending').length;
    const totalSpent = orders.reduce((acc, o) => acc + (o.total || 0), 0) +
      rentals.reduce((acc, r) => acc + (r.totalPrice || 0), 0);

    return [
      { label: 'Active Rentals', value: activeRentals.toString(), icon: Gamepad2, color: 'text-blue-400', bg: 'bg-blue-400/10' },
      { label: 'Pending Orders', value: pendingOrders.toString(), icon: ShoppingBag, color: 'text-green-400', bg: 'bg-green-400/10' },
      { label: 'Repair Status', value: 'N/A', icon: Wrench, color: 'text-yellow-400', bg: 'bg-yellow-400/10' },
      { label: 'Total Spent', value: formatCurrency(totalSpent), icon: CreditCard, color: 'text-purple-400', bg: 'bg-purple-400/10' },
    ];
  }, [orders, rentals]);

  const recentActivity = useMemo(() => {
    const combined = [
      ...orders.map(o => ({
        id: o.id,
        type: 'order',
        title: `Order #${o.id.slice(0, 8)}`,
        date: o.date || 'Recently',
        status: o.status,
        amount: o.total || 0,
        timestamp: new Date(o.date || 0).getTime()
      })),
      ...rentals.map(r => ({
        id: r.id,
        type: 'rental',
        title: `${r.product} Rental`,
        date: r.startDate || 'Recently',
        status: r.status,
        amount: r.totalPrice || 0,
        timestamp: new Date(r.startDate || 0).getTime()
      }))
    ];

    return combined.sort((a, b) => b.timestamp - a.timestamp).slice(0, 5);
  }, [orders, rentals]);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-gaming-accent"></div>
      </div>
    );
  }

  return (
    <div className="space-y-8 pb-20">
      {/* Header & XP System */}
      <div className="flex flex-col lg:flex-row gap-8 items-start justify-between">
        <div className="space-y-2">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-gaming-accent/10 rounded-lg">
              <Terminal className="h-5 w-5 text-gaming-accent" />
            </div>
            <h1 className="text-3xl font-black text-white uppercase italic tracking-tighter">Command <span className="text-gaming-accent">Matrix</span></h1>
          </div>
          <p className="text-gaming-muted font-mono text-xs uppercase tracking-widest">Operator: {user?.name} // Session_Active</p>
        </div>

        {/* XP Progress Bar */}
        <div className="w-full lg:w-96 bg-gaming-card border border-gaming-border p-6 rounded-2xl relative overflow-hidden group">
          <div className="absolute top-0 right-0 p-4 opacity-5 group-hover:opacity-10 transition-opacity">
            <Trophy size={60} className="text-gaming-accent" />
          </div>
          <div className="flex justify-between items-end mb-4">
            <div>
              <p className="text-[10px] font-mono text-gaming-accent uppercase tracking-[0.2em] mb-1">Gamer Level</p>
              <h3 className="text-xl font-black text-white italic">LEGENDARY_RANK</h3>
            </div>
            <div className="text-right">
              <span className="text-xs font-mono text-gaming-muted">14,200 / 15,000 XP</span>
            </div>
          </div>
          <div className="h-2 w-full bg-white/5 rounded-full overflow-hidden">
            <motion.div 
              initial={{ width: 0 }}
              animate={{ width: '85%' }}
              transition={{ duration: 1.5, ease: "easeOut" }}
              className="h-full bg-gradient-to-r from-gaming-accent to-gaming-secondary" 
            />
          </div>
          <p className="text-[9px] text-gaming-muted mt-3 font-mono">NEXT_UNLOCK: <span className="text-white">FREE_CONTROLLER_RENTAL</span></p>
        </div>
      </div>

      {/* Power Tools Grid */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Live Fleet Monitor */}
        <div className="md:col-span-2 bg-gaming-card border border-gaming-border rounded-3xl p-8 relative overflow-hidden">
          <div className="absolute top-0 right-0 w-64 h-64 bg-gaming-accent/5 blur-[100px] -z-10" />
          
          <div className="flex items-center justify-between mb-8">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-gaming-accent/10 rounded-lg text-gaming-accent">
                <Cpu className="h-5 w-5" />
              </div>
              <h2 className="text-xl font-bold text-white uppercase tracking-tight">Active Fleet Monitor</h2>
            </div>
            <Link to="/dashboard/rentals" className="text-[10px] font-black text-gaming-accent hover:underline uppercase tracking-widest">Access All Assets</Link>
          </div>

          <div className="space-y-6">
            {rentals.filter(r => r.status === 'active').length > 0 ? (
              rentals.filter(r => r.status === 'active').map((rental) => (
                <div key={rental.id} className="flex flex-col sm:flex-row items-center gap-6 p-4 bg-white/[0.02] border border-white/5 rounded-2xl group hover:border-gaming-accent/30 transition-all">
                  <div className="w-20 h-20 rounded-xl bg-black border border-white/10 p-2 shrink-0">
                    <img src={rental.productImage || 'https://via.placeholder.com/150'} alt="" className="w-full h-full object-contain" />
                  </div>
                  <div className="flex-grow space-y-2 text-center sm:text-left">
                    <h4 className="text-white font-bold uppercase tracking-wide italic">{rental.product}</h4>
                    <div className="flex flex-wrap justify-center sm:justify-start gap-4 text-[10px] font-mono text-gaming-muted">
                      <span className="flex items-center gap-1"><Shield size={12} className="text-emerald-500" /> SECURE</span>
                      <span className="flex items-center gap-1"><Activity size={12} className="text-gaming-accent" /> ONLINE</span>
                      <span className="flex items-center gap-1 font-bold text-white">DUE IN: 4 DAYS</span>
                    </div>
                  </div>
                  <button className="px-6 py-2 bg-white/5 border border-white/10 rounded-lg text-[10px] font-black text-white hover:bg-gaming-accent hover:text-black transition-all uppercase tracking-widest">
                    EXTEND MISSION
                  </button>
                </div>
              ))
            ) : (
              <div className="py-12 text-center space-y-4">
                <div className="w-16 h-16 bg-white/5 rounded-full flex items-center justify-center mx-auto">
                  <Gamepad2 className="h-8 w-8 text-gaming-muted" />
                </div>
                <p className="text-gaming-muted font-mono text-sm">NO_ACTIVE_ASSETS_DETECTED</p>
                <Link to="/rentals">
                  <button className="text-gaming-accent text-[10px] font-black uppercase tracking-widest border-b border-gaming-accent/30 hover:border-gaming-accent transition-all">Initialize New Mission</button>
                </Link>
              </div>
            )}
          </div>
        </div>

        {/* Quick Actions Matrix */}
        <div className="bg-gaming-card border border-gaming-border rounded-3xl p-8 space-y-6">
          <h2 className="text-xl font-bold text-white uppercase tracking-tight mb-4">Command Actions</h2>
          <div className="grid grid-cols-1 gap-3">
            {[
              { label: 'Manage Identity (KYC)', icon: Shield, path: '/dashboard/kyc', color: 'text-emerald-400' },
              { label: 'Address Database', icon: Package, path: '/dashboard/addresses', color: 'text-blue-400' },
              { label: 'Financial Logs', icon: CreditCard, path: '/dashboard/orders', color: 'text-purple-400' },
              { label: 'Signal Settings', icon: Zap, path: '/dashboard/notifications', color: 'text-amber-400' }
            ].map((action) => (
              <Link 
                key={action.label} 
                to={action.path}
                className="flex items-center justify-between p-4 bg-white/[0.02] border border-white/5 rounded-xl group hover:border-gaming-accent transition-all"
              >
                <div className="flex items-center gap-3">
                  <action.icon className={`h-4 w-4 ${action.color}`} />
                  <span className="text-[10px] font-black text-gray-400 group-hover:text-white uppercase tracking-widest">{action.label}</span>
                </div>
                <ArrowRight size={14} className="text-gaming-muted group-hover:text-gaming-accent group-hover:translate-x-1 transition-all" />
              </Link>
            ))}
          </div>
        </div>
      </div>

      {/* Recent Activity Grid */}
      <div className="bg-gaming-card border border-gaming-border rounded-3xl p-8">
        <div className="flex items-center justify-between mb-8">
          <h2 className="text-xl font-bold text-white uppercase tracking-tight italic">Mission Log <span className="text-gaming-accent/50">// History</span></h2>
          <div className="flex items-center gap-2">
            <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
            <span className="text-[9px] font-mono text-gaming-muted uppercase">Updates Synchronized</span>
          </div>
        </div>
        
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="text-left border-b border-white/5">
                <th className="pb-4 text-[10px] font-black text-gaming-muted uppercase tracking-[0.2em]">Transaction_ID</th>
                <th className="pb-4 text-[10px] font-black text-gaming-muted uppercase tracking-[0.2em]">Operation_Type</th>
                <th className="pb-4 text-[10px] font-black text-gaming-muted uppercase tracking-[0.2em]">Timestamp</th>
                <th className="pb-4 text-[10px] font-black text-gaming-muted uppercase tracking-[0.2em]">Payload</th>
                <th className="pb-4 text-[10px] font-black text-gaming-muted uppercase tracking-[0.2em] text-right">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5">
              {recentActivity.map((activity) => (
                <tr key={activity.id} className="group hover:bg-white/[0.01] transition-colors">
                  <td className="py-4 text-xs font-mono text-gaming-accent uppercase">#{activity.id.slice(0, 8)}</td>
                  <td className="py-4">
                    <span className={`text-[10px] font-black px-2 py-1 rounded uppercase tracking-tighter ${
                      activity.type === 'order' ? 'bg-emerald-500/10 text-emerald-500' : 'bg-blue-500/10 text-blue-500'
                    }`}>
                      {activity.type}
                    </span>
                  </td>
                  <td className="py-4 text-xs text-gray-500 font-mono uppercase">{activity.date}</td>
                  <td className="py-4 text-sm font-bold text-white uppercase italic">{activity.title}</td>
                  <td className="py-4 text-right">
                    <span className="text-xs font-black text-white italic">{formatCurrency(activity.amount)}</span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
