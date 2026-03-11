import { useState, useEffect, useMemo } from 'react';
import { 
  Package, 
  Truck, 
  CheckCircle, 
  Clock, 
  CreditCard, 
  BarChart3, 
  TrendingUp, 
  ArrowUpRight, 
  FileText,
  Activity,
  Zap
} from 'lucide-react';
import { formatCurrency } from '../../lib/utils';
import { useAuth } from '../../context/AuthContext';
import { db } from '../../lib/firebase';
import { collection, query, where, onSnapshot, orderBy } from 'firebase/firestore';
import { motion } from 'framer-motion';

export default function MyOrders() {
  const { user } = useAuth();
  const [orders, setOrders] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) return;

    const q = query(
      collection(db, 'orders'),
      where('userId', '==', user.id),
      orderBy('date', 'desc')
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const fetchedOrders = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));
      setOrders(fetchedOrders);
      setLoading(false);
    }, (error) => {
      console.error("Error fetching orders:", error);
      setLoading(false);
    });

    return () => unsubscribe();
  }, [user]);

  const stats = useMemo(() => {
    const total = orders.reduce((acc, curr) => acc + (curr.total || 0), 0);
    const count = orders.length;
    return { total, count };
  }, [orders]);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-gaming-accent"></div>
      </div>
    );
  }

  if (orders.length === 0) {
    return (
      <div className="bg-gaming-card border border-gaming-border rounded-xl p-12 text-center">
        <Package className="h-12 w-12 text-gaming-muted mx-auto mb-4" />
        <h3 className="text-xl font-bold text-white mb-2">No orders found</h3>
        <p className="text-gaming-muted">You haven't placed any orders yet.</p>
      </div>
    );
  }

  return (
    <div className="space-y-8 pb-20">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div className="space-y-1">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-gaming-accent/10 rounded-lg text-gaming-accent">
              <BarChart3 className="h-5 w-5" />
            </div>
            <h1 className="text-3xl font-black text-white uppercase italic tracking-tighter">Financial <span className="text-gaming-accent">Logs</span></h1>
          </div>
          <p className="text-gaming-muted font-mono text-xs uppercase tracking-widest text-gaming-muted">Transaction_Matrix // Pulse_Normal</p>
        </div>

        <div className="flex items-center gap-4 bg-gaming-card border border-gaming-border p-4 rounded-2xl">
          <div className="text-right">
            <p className="text-[10px] font-mono text-gaming-muted uppercase tracking-widest">Total_Credits_Deployed</p>
            <p className="text-xl font-black text-white italic">{formatCurrency(stats.total)}</p>
          </div>
          <div className="p-3 bg-gaming-accent/10 rounded-xl">
            <TrendingUp className="h-6 w-6 text-gaming-accent" />
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-6">
        {orders.map((order) => (
          <div key={order.id} className="bg-gaming-card border border-gaming-border overflow-hidden transition-all hover:border-gaming-accent/30 group" style={{ borderRadius: 'var(--layout-border-radius, 1.5rem)' }}>
            <div className="bg-gaming-bg/50 p-6 border-b border-gaming-border flex flex-col sm:flex-row justify-between items-start sm:items-center gap-6">
              <div className="flex items-center gap-4">
                <div className="p-3 bg-white/5 rounded-xl border border-white/10 group-hover:border-gaming-accent/50 transition-colors">
                  <Activity className="h-5 w-5 text-gaming-accent" />
                </div>
                <div>
                  <p className="text-[10px] font-mono text-gaming-muted uppercase tracking-widest mb-1">Transaction_Header</p>
                  <p className="text-white font-black italic uppercase tracking-tighter">Payload_ID: {order.id.slice(0, 8)}</p>
                </div>
              </div>
              
              <div className="grid grid-cols-2 sm:flex sm:items-center gap-8 w-full sm:w-auto">
                <div className="space-y-1">
                  <p className="text-[9px] font-mono text-gaming-muted uppercase">Deployment_Date</p>
                  <p className="text-white text-xs font-bold uppercase">{order.date}</p>
                </div>
                <div className="space-y-1">
                  <p className="text-[9px] font-mono text-gaming-muted uppercase">Credit_Volume</p>
                  <p className="text-gaming-accent text-xs font-black italic">{formatCurrency(order.total)}</p>
                </div>
                <div className="col-span-2 sm:col-span-1">
                  <span className={`px-4 py-1.5 rounded-full text-[10px] font-black uppercase tracking-widest flex items-center justify-center gap-2 border ${
                    order.status === 'delivered' 
                      ? 'bg-emerald-500/10 text-emerald-500 border-emerald-500/20' 
                      : 'bg-amber-500/10 text-amber-400 border-amber-500/20'
                  }`}>
                    {order.status === 'delivered' ? <CheckCircle className="h-3 w-3" /> : <Clock className="h-3 w-3 animate-pulse" />}
                    {order.status}
                  </span>
                </div>
              </div>
            </div>

            <div className="p-8 space-y-6">
              {order.items.map((item, index) => (
                <div key={index} className="flex items-center gap-6 p-4 bg-white/[0.02] border border-white/5 rounded-2xl group/item hover:bg-white/[0.04] transition-all">
                  <div className="w-20 h-20 bg-black rounded-xl border border-white/10 p-2 overflow-hidden flex items-center justify-center shrink-0">
                    <img src={item.image} alt={item.name} className="w-full h-full object-contain group-hover/item:scale-110 transition-transform duration-500" />
                  </div>
                  <div className="flex-grow">
                    <h3 className="text-white font-black uppercase italic tracking-tight text-lg">{item.name}</h3>
                    <div className="flex items-center gap-4 mt-2">
                      <p className="text-gaming-accent font-mono text-xs font-bold">{formatCurrency(item.price)}</p>
                      <div className="h-1 w-1 rounded-full bg-gaming-muted" />
                      <p className="text-gaming-muted font-mono text-[10px] uppercase">Asset_Class: Hardware</p>
                    </div>
                  </div>
                  <button className="hidden sm:flex items-center gap-2 px-4 py-2 bg-white/5 border border-white/10 rounded-lg text-[10px] font-black text-white hover:bg-gaming-accent hover:text-black transition-all uppercase tracking-widest">
                    RE_INITIALIZE <ArrowUpRight size={14} />
                  </button>
                </div>
              ))}
            </div>

            <div className="bg-black/40 p-6 border-t border-gaming-border flex flex-col sm:flex-row justify-between items-center gap-6">
              <div className="flex items-center gap-3">
                <div className={`p-2 rounded-lg ${order.status === 'delivered' ? 'bg-emerald-500/10' : 'bg-amber-500/10'}`}>
                  <Truck className={`h-4 w-4 ${order.status === 'delivered' ? 'text-emerald-500' : 'text-amber-500'}`} />
                </div>
                <p className="text-[10px] font-mono text-gaming-muted uppercase tracking-wider">
                  {order.status === 'delivered' ? `Asset_Handover_Complete // ${order.date}` : 'Awaiting_Logistics_Authorization'}
                </p>
              </div>
              <div className="flex items-center gap-4 w-full sm:w-auto">
                <button className="flex-1 sm:flex-initial flex items-center justify-center gap-2 px-6 py-3 bg-white/5 border border-white/10 rounded-xl text-[10px] font-black text-white hover:bg-gaming-accent hover:text-black transition-all uppercase tracking-[0.2em]">
                  <FileText size={14} /> Neural_Invoice
                </button>
                <button className="flex-1 sm:flex-initial flex items-center justify-center gap-2 px-6 py-3 bg-gaming-accent text-black rounded-xl text-[10px] font-black hover:scale-105 transition-all uppercase tracking-[0.2em] shadow-[0_10px_20px_rgba(0,240,255,0.2)]">
                  <Zap size={14} /> Trace_Payload
                </button>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
