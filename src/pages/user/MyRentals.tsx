import { useState, useEffect } from 'react';
import { 
  Calendar, 
  Clock, 
  AlertTriangle, 
  Activity, 
  Zap, 
  Shield, 
  Cpu, 
  Wifi, 
  Terminal,
  Settings,
  RefreshCw,
  Maximize2
} from 'lucide-react';
import { formatCurrency } from '../../lib/utils';
import { useAuth } from '../../context/AuthContext';
import { db } from '../../lib/firebase';
import { collection, query, where, onSnapshot, orderBy } from 'firebase/firestore';
import { differenceInDays, parseISO } from 'date-fns';
import { motion, AnimatePresence } from 'framer-motion';

export default function MyRentals() {
  const { user } = useAuth();
  const [rentals, setRentals] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [expandedAsset, setExpandedAsset] = useState<string | null>(null);

  useEffect(() => {
    if (!user) return;

    const q = query(
      collection(db, 'rentals'),
      where('email', '==', user.email),
      orderBy('startDate', 'desc')
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const fetchedRentals = snapshot.docs.map(doc => {
        const data = doc.data();
        const daysLeft = data.endDate ? differenceInDays(parseISO(data.endDate), new Date()) : 0;
        return {
          id: doc.id,
          ...data,
          daysLeft: Math.max(0, daysLeft)
        };
      });
      setRentals(fetchedRentals);
      setLoading(false);
    }, (error) => {
      console.error("Error fetching rentals:", error);
      setLoading(false);
    });

    return () => unsubscribe();
  }, [user]);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-gaming-accent"></div>
      </div>
    );
  }

  if (rentals.length === 0) {
    return (
      <div className="bg-gaming-card border border-gaming-border rounded-xl p-12 text-center">
        <Calendar className="h-12 w-12 text-gaming-muted mx-auto mb-4" />
        <h3 className="text-xl font-bold text-white mb-2">No rentals found</h3>
        <p className="text-gaming-muted">You haven't rented any equipment yet.</p>
      </div>
    );
  }

  return (
    <div className="space-y-8 pb-20">
      <div className="flex items-center justify-between">
        <div className="space-y-1">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-gaming-accent/10 rounded-lg">
              <Cpu className="h-5 w-5 text-gaming-accent" />
            </div>
            <h1 className="text-3xl font-black text-white uppercase italic tracking-tighter">Active <span className="text-gaming-accent">Fleet</span></h1>
          </div>
          <p className="text-gaming-muted font-mono text-xs uppercase tracking-widest text-gaming-muted">Hardware_Deployment_Status // Root_Access_Granted</p>
        </div>
        
        <div className="flex items-center gap-4 bg-gaming-card border border-gaming-border px-4 py-2 rounded-xl">
          <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
          <span className="text-[10px] font-mono text-gaming-muted uppercase tracking-widest font-bold">Grid_Sync_Active</span>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-8">
        {rentals.map((rental) => (
          <div 
            key={rental.id} 
            className={`bg-gaming-card border transition-all duration-500 overflow-hidden ${
              expandedAsset === rental.id ? 'border-gaming-accent ring-1 ring-gaming-accent/20' : 'border-gaming-border'
            }`}
            style={{ borderRadius: 'var(--layout-border-radius, 2rem)' }}
          >
            <div className="p-6 md:p-8 flex flex-col md:flex-row gap-8">
              {/* Asset Visual */}
              <div className="relative group w-full md:w-64 h-64 shrink-0">
                <div className="absolute inset-0 bg-gradient-to-t from-black to-transparent opacity-60 z-10 rounded-2xl" />
                <img 
                  src={rental.image} 
                  alt={rental.product} 
                  className="w-full h-full object-cover rounded-2xl bg-black border border-white/5 group-hover:scale-105 transition-transform duration-700" 
                />
                <div className="absolute top-4 left-4 z-20">
                  <span className="bg-gaming-accent text-black text-[10px] font-black px-3 py-1 rounded uppercase tracking-widest shadow-xl">
                    Asset_{rental.id.slice(0, 4)}
                  </span>
                </div>
                {rental.status === 'active' && (
                  <div className="absolute bottom-4 left-4 z-20 flex items-center gap-2">
                    <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                    <span className="text-[10px] font-mono font-bold text-white uppercase tracking-tighter">Unit_Online</span>
                  </div>
                )}
              </div>

              {/* Core Info */}
              <div className="flex-1 space-y-6">
                <div className="flex flex-col sm:flex-row justify-between items-start gap-4">
                  <div className="space-y-1">
                    <h3 className="text-2xl font-black text-white italic uppercase tracking-tight">{rental.product}</h3>
                    <p className="text-gaming-accent font-mono text-[10px] uppercase tracking-[0.3em]">Deployment_ID: {rental.id}</p>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className={`px-4 py-1.5 rounded-full text-[10px] font-black uppercase tracking-widest ${
                      rental.status === 'active' ? 'bg-blue-500/10 text-blue-400 border border-blue-500/20' :
                      rental.status === 'pending' ? 'bg-amber-500/10 text-amber-400 border border-amber-500/20' :
                      'bg-emerald-500/10 text-emerald-500 border border-emerald-500/20'
                    }`}>
                      {rental.status}
                    </span>
                    <button 
                      onClick={() => setExpandedAsset(expandedAsset === rental.id ? null : rental.id)}
                      className={`p-2 rounded-lg border transition-all ${
                        expandedAsset === rental.id ? 'bg-gaming-accent border-gaming-accent text-black' : 'bg-white/5 border-white/10 text-gray-400 hover:bg-white/10'
                      }`}
                    >
                      <Maximize2 size={16} />
                    </button>
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                  <div className="bg-black/40 border border-white/5 p-4 rounded-2xl space-y-1">
                    <span className="text-gaming-muted text-[10px] font-mono uppercase block">Deployment_Timeline</span>
                    <div className="flex items-center text-white text-xs font-bold gap-2">
                      <Calendar size={14} className="text-gaming-accent" />
                      {rental.startDate} - {rental.endDate}
                    </div>
                  </div>
                  <div className="bg-black/40 border border-white/5 p-4 rounded-2xl space-y-1">
                    <span className="text-gaming-muted text-[10px] font-mono uppercase block">Credit_Payload</span>
                    <div className="text-white font-black text-sm italic">
                      {formatCurrency(rental.totalPrice || rental.price)}
                    </div>
                  </div>
                  <div className="bg-black/40 border border-white/5 p-4 rounded-2xl space-y-1">
                    <span className="text-gaming-muted text-[10px] font-mono uppercase block">Mission_Duration</span>
                    <div className={`text-sm font-black italic ${rental.daysLeft <= 2 ? 'text-red-500' : 'text-emerald-500'}`}>
                      {rental.daysLeft} DAYS REMAINING
                    </div>
                  </div>
                </div>

                <div className="flex flex-wrap gap-3 pt-2">
                  {rental.status === 'active' ? (
                    <>
                      <button className="px-8 py-4 bg-gaming-accent text-black font-black uppercase text-xs tracking-[0.2em] rounded-xl hover:scale-105 transition-all shadow-[0_10px_30px_rgba(0,240,255,0.2)]">
                        EXTEND_MISSION
                      </button>
                      <button className="px-8 py-4 bg-white/5 border border-white/10 text-white font-black uppercase text-xs tracking-[0.2em] rounded-xl hover:bg-white/10 transition-all">
                        LOGISTICS_DATA
                      </button>
                    </>
                  ) : (
                    <button className="px-8 py-4 bg-white/5 border border-white/10 text-white font-black uppercase text-xs tracking-[0.2em] rounded-xl hover:bg-gaming-accent hover:text-black transition-all">
                      RE_INITIALIZE_HARDWARE
                    </button>
                  )}
                </div>
              </div>
            </div>

            {/* Advanced Hardware Console (Expanded) */}
            <AnimatePresence>
              {expandedAsset === rental.id && (
                <motion.div 
                  initial={{ height: 0, opacity: 0 }}
                  animate={{ height: 'auto', opacity: 1 }}
                  exit={{ height: 0, opacity: 0 }}
                  className="border-t border-white/5 bg-black/40 p-8"
                >
                  <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                    {/* Diagnostic Matrix */}
                    <div className="space-y-6">
                      <div className="flex items-center gap-2 mb-4">
                        <Activity size={16} className="text-gaming-accent" />
                        <h4 className="text-sm font-black text-white uppercase tracking-widest italic">Hardware_Health_Matrix</h4>
                      </div>
                      
                      <div className="space-y-4">
                        {[
                          { label: 'CPU_THERMAL', value: '42°C', percent: '42%', status: 'NOMINAL' },
                          { label: 'GPU_LOAD', value: '18%', percent: '18%', status: 'IDLE' },
                          { label: 'SIGNAL_LATENCY', value: '12ms', percent: '12%', status: 'OPTIMAL' },
                        ].map((stat) => (
                          <div key={stat.label} className="space-y-2">
                            <div className="flex justify-between text-[9px] font-mono">
                              <span className="text-gray-500 uppercase">{stat.label}</span>
                              <span className="text-gaming-accent">{stat.status} [{stat.value}]</span>
                            </div>
                            <div className="h-1 w-full bg-white/5 rounded-full overflow-hidden">
                              <div className="h-full bg-gaming-accent/40 transition-all duration-1000" style={{ width: stat.percent }} />
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>

                    {/* Mission Commands */}
                    <div className="space-y-6">
                      <div className="flex items-center gap-2 mb-4">
                        <Terminal size={16} className="text-gaming-secondary" />
                        <h4 className="text-sm font-black text-white uppercase tracking-widest italic">Remote_Direct_Commands</h4>
                      </div>
                      
                      <div className="grid grid-cols-2 gap-3">
                        {[
                          { label: 'REMOTE_PING', icon: Wifi },
                          { label: 'SYNC_GRID', icon: RefreshCw },
                          { label: 'SECURE_WIPE', icon: Shield },
                          { label: 'CORE_SETTINGS', icon: Settings },
                        ].map((cmd) => (
                          <button key={cmd.label} className="flex flex-col items-center justify-center p-4 bg-white/[0.03] border border-white/5 rounded-2xl hover:border-gaming-accent group transition-all">
                            <cmd.icon size={20} className="text-gray-500 group-hover:text-gaming-accent mb-2" />
                            <span className="text-[8px] font-mono text-gray-500 group-hover:text-white uppercase tracking-tighter">{cmd.label}</span>
                          </button>
                        ))}
                      </div>
                    </div>

                    {/* Threat Shield Status */}
                    <div className="bg-gaming-accent/5 border border-gaming-accent/20 rounded-3xl p-6 flex flex-col justify-between">
                      <div className="space-y-4">
                        <div className="flex items-center gap-2">
                          <Shield size={20} className="text-gaming-accent" />
                          <h4 className="text-sm font-black text-white uppercase tracking-widest italic">Vault_Shield_Active</h4>
                        </div>
                        <p className="text-[10px] text-gaming-muted leading-relaxed font-mono uppercase">
                          Advanced damage protection is active for this unit. All internal circuitry and external casings are covered under Protocol_Delta.
                        </p>
                      </div>
                      <div className="pt-4 flex items-center justify-between">
                        <div className="text-[10px] font-mono text-emerald-500 uppercase tracking-widest font-black">Shield_Stable</div>
                        <Zap size={16} className="text-gaming-accent animate-pulse" />
                      </div>
                    </div>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        ))}
      </div>
    </div>
  );
}
