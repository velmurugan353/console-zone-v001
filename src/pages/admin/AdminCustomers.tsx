import { useState, useEffect } from 'react';
import { 
  Search, 
  Filter, 
  Eye, 
  Mail, 
  Phone, 
  MapPin, 
  XCircle, 
  CheckCircle,
  User,
  ShieldCheck,
  Zap,
  Activity,
  ArrowUpRight,
  TrendingUp,
  CreditCard,
  Package,
  RefreshCw,
  FileCheck
} from 'lucide-react';
import { collection, onSnapshot, query, doc, updateDoc } from 'firebase/firestore';
import { db } from '../../lib/firebase';
import { motion } from 'framer-motion';
import { formatCurrency } from '../../lib/utils';
import { googleAutomationService } from '../../services/googleAutomationService';
import AdminKYCModal from '../../components/admin/AdminKYCModal';
import ViewKYCModal from '../../components/admin/ViewKYCModal';

interface Customer {
  id: string;
  name: string;
  email: string;
  phone: string;
  address: string;
  joinDate: string;
  orders: number;
  totalSpent: number;
  status: 'active' | 'banned';
  tier: 'Novice' | 'Pro' | 'Legendary';
  kyc_status?: 'PENDING' | 'APPROVED' | 'REJECTED' | 'MANUAL_REVIEW';
}

export default function AdminCustomers() {
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [search, setSearch] = useState('');
  const [syncingId, setSyncingId] = useState<string | null>(null);
  const [selectedCustomer, setSelectedCustomer] = useState<Customer | null>(null);
  const [isKYCModalOpen, setIsKYCModalOpen] = useState(false);
  const [isViewModalOpen, setIsViewModalOpen] = useState(false);

  const handleNeuralSync = async (customer: Customer) => {
    setSyncingId(customer.id);
    await new Promise(resolve => setTimeout(resolve, 1500));
    await googleAutomationService.syncCustomerToSheets(customer);
    await googleAutomationService.createCustomerDriveFolder(customer);
    await googleAutomationService.sendGmailProtocol(customer, 'welcome');
    setSyncingId(null);
    alert(`Neural synchronization complete for ${customer.name}`);
  };
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const q = query(collection(db, 'users'));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const fetchedCustomers: Customer[] = snapshot.docs.map(doc => {
        const data = doc.data();
        return {
          id: doc.id,
          name: data.name || data.email?.split('@')[0] || 'Unknown User',
          email: data.email || 'No email',
          phone: data.phone || 'Not provided',
          address: data.address || 'No address stored',
          joinDate: data.created_at?.toDate ? data.created_at.toDate().toLocaleDateString() : 'Unknown',
          orders: data.orders_count || 0,
          totalSpent: data.total_spent || 0,
          status: data.status || 'active',
          tier: data.tier || 'Novice',
          kyc_status: data.kyc_status
        };
      });
      setCustomers(fetchedCustomers);
      setLoading(false);
    }, (error) => {
      console.error("Firestore error in AdminCustomers:", error);
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  const handleUpdateTier = async (id: string, currentTier: string) => {
    const tiers: Customer['tier'][] = ['Novice', 'Pro', 'Legendary'];
    const currentIndex = tiers.indexOf(currentTier as any);
    const nextTier = tiers[(currentIndex + 1) % tiers.length];
    
    if (confirm(`Promote ${id.substring(0,5)} to ${nextTier} status?`)) {
      await updateDoc(doc(db, 'users', id), { tier: nextTier });
    }
  };

  const handleToggleStatus = async (id: string, currentStatus: string) => {
    const newStatus = currentStatus === 'active' ? 'banned' : 'active';
    const confirmMessage = newStatus === 'banned'
      ? 'Are you sure you want to ban this user?'
      : 'Are you sure you want to unban this user?';

    if (confirm(confirmMessage)) {
      await updateDoc(doc(db, 'users', id), { status: newStatus });
    }
  };

  const openKYCModal = (customer: Customer) => {
    setSelectedCustomer(customer);
    setIsKYCModalOpen(true);
  };

  const openViewModal = (customer: Customer) => {
    setSelectedCustomer(customer);
    setIsViewModalOpen(true);
  };

  const getKYCBadge = (status?: string) => {
    switch (status) {
      case 'APPROVED': return <span className="flex items-center gap-1 text-[8px] font-black text-emerald-500 bg-emerald-500/10 px-1.5 py-0.5 rounded border border-emerald-500/20"><ShieldCheck size={10}/> VERIFIED</span>;
      case 'PENDING': return <span className="flex items-center gap-1 text-[8px] font-black text-amber-500 bg-amber-500/10 px-1.5 py-0.5 rounded border border-amber-500/20"><Activity size={10}/> PENDING</span>;
      case 'MANUAL_REVIEW': return <span className="flex items-center gap-1 text-[8px] font-black text-[#A855F7] bg-[#A855F7]/10 px-1.5 py-0.5 rounded border border-[#A855F7]/20"><Eye size={10}/> REVIEW</span>;
      case 'REJECTED': return <span className="flex items-center gap-1 text-[8px] font-black text-red-500 bg-red-500/10 px-1.5 py-0.5 rounded border border-red-500/20"><XCircle size={10}/> REJECTED</span>;
      default: return <span className="flex items-center gap-1 text-[8px] font-black text-gray-600 bg-white/5 px-1.5 py-0.5 rounded border border-white/5">UNVERIFIED</span>;
    }
  };

  const filteredCustomers = customers.filter(customer =>
    customer.name.toLowerCase().includes(search.toLowerCase()) ||
    customer.email.toLowerCase().includes(search.toLowerCase()) ||
    customer.id.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="space-y-8 pb-20">
      <AdminKYCModal 
        isOpen={isKYCModalOpen}
        onClose={() => setIsKYCModalOpen(false)}
        customer={selectedCustomer || { id: '', name: '', email: '', phone: '', address: '' }}
      />

      <ViewKYCModal 
        isOpen={isViewModalOpen}
        onClose={() => setIsViewModalOpen(false)}
        userId={selectedCustomer?.id || ''}
        userName={selectedCustomer?.name || ''}
      />
      
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 border-b border-white/10 pb-8">
        <div>
          <div className="flex items-center space-x-2 mb-2">
            <User className="h-3 w-3 text-[#A855F7] animate-pulse" />
            <span className="text-[10px] font-mono text-[#A855F7] uppercase tracking-[0.2em]">Identity Management // User Registry</span>
          </div>
          <h1 className="text-4xl font-bold text-white tracking-tighter uppercase italic">Customer <span className="text-[#A855F7]">Matrix</span></h1>
          <p className="text-gray-500 font-mono text-xs mt-1">Personnel Oversight & Credential Verification // Node_Access_Logs</p>
        </div>
        
        <div className="flex items-center gap-4 bg-white/[0.02] border border-white/5 p-4 rounded-2xl">
          <div className="text-right">
            <p className="text-[9px] font-mono text-gray-500 uppercase tracking-widest">Active_Nodes</p>
            <p className="text-xl font-black text-white italic">{customers.filter(c => c.status === 'active').length}</p>
          </div>
          <div className="p-3 bg-emerald-500/10 rounded-xl border border-emerald-500/20 text-emerald-500">
            <Activity className="h-5 w-5" />
          </div>
        </div>
      </div>

      {/* Control Bar */}
      <div className="flex flex-col md:flex-row gap-4 bg-[#0a0a0a] p-4 rounded-2xl border border-white/10">
        <div className="relative flex-grow">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-500" />
          <input
            type="text"
            placeholder="Search identity database (Name, Email, ID)..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-10 pr-4 py-2 bg-black border border-white/10 rounded-xl text-white font-mono text-xs focus:outline-none focus:border-[#A855F7] w-full"
          />
        </div>
        <div className="flex items-center space-x-3">
          <button className="flex items-center space-x-2 px-4 py-2 bg-white/5 hover:bg-white/10 border border-white/10 rounded-xl text-[10px] font-mono font-bold uppercase tracking-widest text-gray-400 transition-all">
            <TrendingUp size={14} />
            <span>Telemetry</span>
          </button>
          <div className="h-8 w-px bg-white/10" />
          <div className="relative">
            <select
              className="appearance-none flex items-center space-x-2 pl-8 pr-8 py-2 bg-white/5 hover:bg-white/10 border border-white/10 rounded-xl text-[10px] font-mono font-bold uppercase tracking-widest text-white transition-all cursor-pointer focus:outline-none focus:border-[#A855F7]"
            >
              <option value="All">All Tiers</option>
              <option value="Novice">Novice</option>
              <option value="Pro">Pro</option>
              <option value="Legendary">Legendary</option>
            </select>
            <Filter size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-white pointer-events-none" />
          </div>
        </div>
      </div>

      {/* Table Matrix */}
      <div className="bg-[#0a0a0a] border border-white/10 rounded-2xl overflow-hidden shadow-2xl">
        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead className="bg-white/[0.02] text-gray-500 text-[10px] font-mono uppercase tracking-widest">
              <tr>
                <th className="px-6 py-4">Personnel</th>
                <th className="px-6 py-4">KYC_Clearance</th>
                <th className="px-6 py-4">Ops_Count</th>
                <th className="px-6 py-4">Credit_Volume</th>
                <th className="px-6 py-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5 text-xs font-mono text-gray-400">
              {filteredCustomers.map((customer) => (
                <tr key={customer.id} className="hover:bg-white/[0.01] transition-colors group">
                  <td className="px-6 py-4">
                    <div className="flex items-center space-x-4">
                      <div className={`h-10 w-10 rounded-xl flex items-center justify-center font-black italic text-lg shadow-2xl border ${
                        customer.status === 'banned' ? 'bg-red-500/10 text-red-500 border-red-500/20' : 'bg-[#A855F7]/10 text-[#A855F7] border-[#A855F7]/20'
                      }`}>
                        {customer.name.charAt(0)}
                      </div>
                      <div>
                        <div className="font-bold text-white flex items-center gap-2 uppercase italic tracking-tight">
                          {customer.name}
                          <button 
                            onClick={() => handleUpdateTier(customer.id, customer.tier)}
                            className={`px-1.5 py-0.5 rounded text-[8px] font-black uppercase border transition-all hover:scale-110 ${
                              customer.tier === 'Legendary' ? 'bg-amber-500/20 text-amber-500 border-amber-500/20' :
                              customer.tier === 'Pro' ? 'bg-blue-500/20 text-blue-500 border-blue-500/20' :
                              'bg-gray-500/20 text-gray-500 border-white/10'
                            }`}
                          >
                            {customer.tier}
                          </button>
                          {customer.status === 'banned' && (
                            <span className="px-1.5 py-0.5 rounded bg-red-500/10 text-red-500 text-[8px] font-black uppercase border border-red-500/20">
                              Terminated
                            </span>
                          )}
                        </div>
                        <div className="text-[9px] text-gray-600 uppercase tracking-widest mt-0.5">Established // {customer.joinDate}</div>
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    {getKYCBadge(customer.kyc_status)}
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-2">
                      <Package size={14} className="text-gray-600" />
                      <span className="text-white font-bold">{customer.orders}</span>
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-2">
                      <CreditCard size={14} className="text-[#A855F7]" />
                      <span className="text-white font-black italic">{formatCurrency(customer.totalSpent)}</span>
                    </div>
                  </td>
                  <td className="px-6 py-4 text-right">
                    <div className="flex justify-end items-center space-x-2 opacity-0 group-hover:opacity-100 transition-opacity">
                      <button 
                        onClick={() => openKYCModal(customer)}
                        className="p-2 bg-[#A855F7]/10 text-[#A855F7] border border-[#A855F7]/20 rounded-lg hover:bg-[#A855F7] hover:text-black transition-all"
                        title="Manual KYC Filling"
                      >
                        <ShieldCheck size={14} />
                      </button>
                      <button 
                        onClick={() => handleNeuralSync(customer)}
                        disabled={syncingId === customer.id}
                        className="p-2 bg-emerald-500/10 text-emerald-500 border border-emerald-500/20 rounded-lg hover:bg-emerald-500 hover:text-black transition-all flex items-center gap-2 group/sync disabled:opacity-50"
                        title="Neural Sync (Sheets/Drive/Gmail)"
                      >
                        <RefreshCw size={14} className={syncingId === customer.id ? 'animate-spin' : 'group-hover/sync:rotate-180 transition-transform duration-500'} />
                      </button>
                      <button 
                        onClick={() => openViewModal(customer)}
                        className="p-2 bg-white/5 hover:bg-white/10 border border-white/10 rounded-lg text-gray-400 hover:text-white transition-all"
                        title="View KYC Dossier"
                      >
                        <Eye className="h-4 w-4" />
                      </button>
                      <button 
                        onClick={() => handleToggleStatus(customer.id, customer.status)}
                        className={`p-2 border rounded-lg transition-all ${
                          customer.status === 'active' 
                            ? 'bg-red-500/10 text-red-500 border-red-500/20 hover:bg-red-500 hover:text-white' 
                            : 'bg-emerald-500/10 text-emerald-500 border-emerald-500/20 hover:bg-emerald-500 hover:text-white'
                        }`}
                      >
                        {customer.status === 'active' ? <XCircle className="h-4 w-4" /> : <CheckCircle className="h-4 w-4" />}
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {filteredCustomers.length === 0 && (
          <div className="text-center py-20 bg-black/20">
            <User size={48} className="mx-auto text-gray-800 mb-4 opacity-20" />
            <p className="text-gray-600 font-mono text-xs uppercase tracking-[0.3em]">No personnel matching query detected</p>
          </div>
        )}
      </div>
    </div>
  );
}
