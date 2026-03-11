import { useState, useEffect } from 'react';
import { formatCurrency } from '../../lib/utils';
import { 
  CheckCircle, 
  XCircle, 
  Search, 
  Filter, 
  AlertTriangle, 
  Activity, 
  Zap, 
  User, 
  DollarSign, 
  TrendingUp, 
  Edit2, 
  Save,
  Printer,
  FileText
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { automationService } from '../../services/automationService';
import { notificationService } from '../../services/notificationService';
import { aiService } from '../../services/aiService';
import { collection, onSnapshot, query, doc, updateDoc, orderBy, addDoc } from 'firebase/firestore';
import { db } from '../../lib/firebase';
import { invoiceService } from '../../services/invoiceService';
import InvoiceModal from '../../components/admin/InvoiceModal';

type SellRequestStatus = 'pending' | 'offered' | 'accepted' | 'rejected' | 'completed';

interface SellRequest {
  id: string;
  customer: string;
  email: string;
  device: string;
  condition: string;
  estimatedValue: number;
  customerOffer?: number;
  adminOffer?: number;
  date: string;
  status: SellRequestStatus;
  images: string[];
}

export default function AdminSellRequests() {
  const [requests, setRequests] = useState<SellRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [filter, setFilter] = useState<string>('all');
  const [selectedRequest, setSelectedRequest] = useState<SellRequest | null>(null);
  const [isEditing, setIsEditing] = useState(false);
  const [editForm, setEditForm] = useState<Partial<SellRequest>>({});
  const [marketAnalysis, setMarketAnalysis] = useState<string | null>(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [isBridging, setIsBridging] = useState(false);
  const [showInvoice, setShowInvoice] = useState(false);

  const handleAIMarketAnalysis = async () => {
    if (!selectedRequest) return;
    setIsAnalyzing(true);
    setMarketAnalysis(null);
    const result = await aiService.getMarketValue(selectedRequest.device, selectedRequest.condition);
    setMarketAnalysis(result);
    setIsAnalyzing(false);
  };

  const handleInventoryBridge = async () => {
    if (!selectedRequest) return;
    setIsBridging(true);
    try {
      const productData = {
        name: `${selectedRequest.device} (Pre-owned)`,
        category: 'console',
        price: (selectedRequest.adminOffer || selectedRequest.estimatedValue) * 1.4,
        image: selectedRequest.images[0],
        rating: 4.5,
        reviews: 0,
        inStock: true,
        stock: 1,
        isRental: false,
        isUsed: true,
        condition: selectedRequest.condition,
        description: `Acquired via buyback matrix. Hardware inspected and certified. Original request ID: ${selectedRequest.id}`,
        deviceType: selectedRequest.device.toLowerCase().includes('playstation') ? 'PlayStation' : 
                    selectedRequest.device.toLowerCase().includes('xbox') ? 'Xbox' : 'Nintendo'
      };

      await addDoc(collection(db, 'products'), productData);
      await handleStatusChange(selectedRequest.id, 'completed');
      alert('INVENTORY BRIDGE SUCCESSFUL: Asset has been de-materialized from Acquisitions and re-materialized in the Shop Matrix.');
      setSelectedRequest(null);
    } catch (error) {
      console.error('Inventory Bridge Failure:', error);
      alert('BRIDGE ERROR: Protocol interrupted. Asset remain in acquisition state.');
    } finally {
      setIsBridging(false);
    }
  };

  useEffect(() => {
    const q = query(collection(db, 'sell_requests'), orderBy('date', 'desc'));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const fetchedRequests = snapshot.docs.map(doc => ({
        ...doc.data(),
        id: doc.id
      })) as SellRequest[];
      setRequests(fetchedRequests);
      setLoading(false);
    });
    return () => unsubscribe();
  }, []);

  const handleEditToggle = async () => {
    if (isEditing) {
      if (selectedRequest) {
        const updatedRequest = { ...selectedRequest, ...editForm } as SellRequest;
        try {
          await updateDoc(doc(db, 'sell_requests', updatedRequest.id), editForm);
          setSelectedRequest(updatedRequest);
        } catch (error) {
          console.error('Failed to update sell request:', error);
          alert('Failed to save changes to database.');
        }
      }
      setIsEditing(false);
    } else {
      setEditForm(selectedRequest || {});
      setIsEditing(true);
    }
  };

  const handleEditChange = (field: keyof SellRequest, value: any) => {
    setEditForm(prev => ({ ...prev, [field]: value }));
  };

  const [completedTasks, setCompletedTasks] = useState<string[]>([]);

  const handleStatusChange = async (id: string, newStatus: SellRequestStatus) => {
    const request = requests.find(r => r.id === id);
    if (!request) return;

    if (newStatus === 'completed') {
      setCompletedTasks(prev => [...prev, id]);
      setTimeout(() => {
        setCompletedTasks(prev => prev.filter(taskId => taskId !== id));
      }, 1000);
    }

    try {
      await updateDoc(doc(db, 'sell_requests', id), { status: newStatus });
    } catch (error) {
      console.error('Failed to update status:', error);
      alert('Failed to update status in database.');
      return;
    }

    if (newStatus === 'offered') {
      await automationService.triggerWorkflow('buyback_quote_sent', {
        requestId: id,
        customerName: request.customer,
        device: request.device,
        offerAmount: request.adminOffer || 0
      });
      notificationService.sendNotification('buyback_offer', request.email, {
        customerName: request.customer,
        requestId: id,
        device: request.device,
        offerAmount: request.adminOffer || 0
      });
    }
  };

  const handleManualNotification = (type: 'quote' | 'update' | 'custom') => {
    if (!selectedRequest) return;

    if (type === 'quote') {
      notificationService.sendNotification('buyback_offer', selectedRequest.email, {
        customerName: selectedRequest.customer,
        requestId: selectedRequest.id,
        device: selectedRequest.device,
        offerAmount: selectedRequest.adminOffer || 0
      });
      alert(`Custom quote sent to ${selectedRequest.customer}`);
    } else if (type === 'update') {
      notificationService.sendNotification('repair_update', selectedRequest.email, {
        customerName: selectedRequest.customer,
        repairId: selectedRequest.id,
        device: selectedRequest.device,
        status: selectedRequest.status
      });
      alert(`Status update sent to ${selectedRequest.customer}`);
    } else {
      alert(`Manual ${type} notification triggered for ${selectedRequest.customer}`);
    }
  };

  const filteredRequests = requests.filter(request => {
    const matchesSearch =
      request.customer.toLowerCase().includes(search.toLowerCase()) ||
      request.device.toLowerCase().includes(search.toLowerCase()) ||
      request.id.toLowerCase().includes(search.toLowerCase());

    const matchesFilter = filter === 'all' || request.status === filter;

    return matchesSearch && matchesFilter;
  });

  const getStatusColor = (status: SellRequestStatus) => {
    switch (status) {
      case 'offered': return 'text-blue-400 bg-blue-500/10 border-blue-500/20';
      case 'accepted': return 'text-emerald-400 bg-emerald-500/10 border-emerald-500/20';
      case 'rejected': return 'text-red-400 bg-red-500/10 border-red-500/20';
      case 'pending': return 'text-amber-400 bg-amber-500/10 border-amber-500/20';
      case 'completed': return 'text-purple-400 bg-purple-500/10 border-purple-500/20';
      default: return 'text-gray-400 bg-gray-500/10 border-gray-500/20';
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-[#A855F7]"></div>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      {/* Detail Modal */}
      <AnimatePresence>
        {selectedRequest && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-md p-4">
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              className="bg-[#0a0a0a] border border-white/10 rounded-2xl w-full max-w-md p-8 shadow-2xl"
            >
              <div className="flex justify-between items-start mb-8">
                <div>
                  <h3 className="text-xs font-mono uppercase tracking-widest text-[#A855F7]">Acquisition_Protocol</h3>
                  <p className="text-2xl font-bold text-white tracking-tighter uppercase italic">Request Details</p>
                </div>
                <div className="flex gap-2">
                  <button
                    onClick={() => setShowInvoice(true)}
                    className="p-2 bg-white/5 rounded-full text-[#A855F7] border border-[#A855F7]/20 hover:bg-white/10 transition-colors"
                    title="Generate Acquisition Invoice"
                  >
                    <FileText size={20} />
                  </button>
                  <button
                    onClick={() => setSelectedRequest(null)}
                    className="p-2 hover:bg-white/5 rounded-full transition-colors text-gray-500 hover:text-white"
                  >
                    <XCircle size={24} />
                  </button>
                </div>
              </div>

              <div className="space-y-6">
                <div className="flex items-center space-x-4 p-4 bg-white/[0.02] border border-white/5 rounded-xl">
                  <img src={selectedRequest.images[0]} alt={selectedRequest.device} className="w-20 h-20 rounded-lg object-cover border border-white/10" />
                  <div>
                    <h4 className="font-bold text-white text-lg uppercase tracking-tight">{selectedRequest.device}</h4>
                    <p className="text-[#A855F7] font-mono text-xs uppercase mt-1">Condition: {selectedRequest.condition}</p>
                    <div className="flex items-center space-x-2 mt-2">
                      <User className="h-3 w-3 text-gray-500" />
                      <span className="text-gray-400 font-mono text-[10px] uppercase">{selectedRequest.customer}</span>
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="bg-white/[0.02] p-4 border border-white/5 rounded-xl flex flex-col justify-center">
                    <span className="text-gray-500 block text-[10px] font-mono uppercase mb-1">Market Value</span>
                    <span className="text-white font-mono text-sm font-bold">{formatCurrency(selectedRequest.estimatedValue)}</span>
                  </div>
                  <div className="bg-white/[0.02] p-4 border border-white/5 rounded-xl">
                    <span className="text-gray-500 block text-[10px] font-mono uppercase mb-1">Status Protocol</span>
                    <div className="flex flex-wrap items-center justify-between w-full">
                      <span className={`px-2 py-0.5 text-[10px] font-bold rounded border uppercase tracking-tighter ${getStatusColor(selectedRequest.status)}`}>
                        {selectedRequest.status}
                      </span>
                    </div>
                  </div>
                </div>

                <div className="flex space-x-2 pt-2">
                  <button
                    onClick={() => handleManualNotification('update')}
                    className="flex-1 py-1.5 bg-blue-500/10 text-blue-500 border border-blue-500/20 hover:bg-blue-500/20 transition-colors rounded-xl flex items-center justify-center gap-2 text-[10px] font-mono uppercase tracking-widest font-bold"
                  >
                    <Activity className="h-3 w-3" /> Push Status
                  </button>
                  <button
                    onClick={() => handleManualNotification('quote')}
                    className="flex-1 py-1.5 bg-emerald-500/10 text-emerald-500 border border-emerald-500/20 hover:bg-emerald-500/20 transition-colors rounded-xl flex items-center justify-center gap-2 text-[10px] font-mono uppercase tracking-widest font-bold"
                  >
                    <DollarSign className="h-3 w-3" /> Send Quote
                  </button>
                </div>

                <div className="bg-white/[0.02] p-4 border border-white/5 rounded-xl">
                  <span className="text-gray-500 block text-[10px] font-mono uppercase mb-1">Admin Offer</span>
                  <div className="flex items-center space-x-2">
                    <DollarSign className="h-4 w-4 text-[#A855F7]" />
                    <input
                      type="number"
                      value={selectedRequest.adminOffer || ''}
                      onChange={async (e) => {
                        const val = parseFloat(e.target.value);
                        try {
                          await updateDoc(doc(db, 'sell_requests', selectedRequest.id), { adminOffer: val });
                          setSelectedRequest({ ...selectedRequest, adminOffer: val });
                        } catch (error) {
                          console.error('Failed to update offer:', error);
                        }
                      }}
                      className="bg-black border border-white/10 rounded px-2 py-1 text-white font-mono text-sm focus:outline-none focus:border-[#A855F7] w-full"
                    />
                  </div>
                </div>

                {/* AI Market Intelligence */}
                <div className="space-y-3 pb-2">
                  <div className="flex items-center justify-between">
                    <h4 className="text-[10px] font-mono font-bold text-gray-500 uppercase tracking-widest">Market_Intelligence_Matrix</h4>
                    <button
                      onClick={handleAIMarketAnalysis}
                      disabled={isAnalyzing}
                      className="text-[9px] font-black text-[#A855F7] hover:text-white transition-colors flex items-center gap-1 uppercase tracking-widest disabled:opacity-50"
                    >
                      <Zap size={10} className={isAnalyzing ? 'animate-pulse' : ''} />
                      {isAnalyzing ? 'Scanning...' : 'Analyze Market'}
                    </button>
                  </div>
                  
                  {marketAnalysis && (
                    <motion.div
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      className="p-4 bg-[#A855F7]/5 border border-[#A855F7]/20 rounded-xl text-[10px] font-mono text-gray-300 leading-relaxed max-h-40 overflow-y-auto whitespace-pre-wrap prose prose-invert"
                    >
                      {marketAnalysis}
                    </motion.div>
                  )}
                </div>

                <div className="pt-6 border-t border-white/10 space-y-3">
                  <h4 className="text-[10px] font-mono font-bold text-gray-500 mb-4 uppercase tracking-[0.3em]">Execution_Protocols</h4>
                  <div className="grid grid-cols-2 gap-3">
                    {selectedRequest.status === 'accepted' && (
                      <button
                        onClick={handleInventoryBridge}
                        disabled={isBridging}
                        className="col-span-2 py-3 bg-emerald-500/10 border border-emerald-500/20 text-emerald-500 font-bold rounded-xl text-xs uppercase tracking-widest hover:bg-emerald-500/20 transition-all flex items-center justify-center gap-2"
                      >
                        <Zap className={`h-4 w-4 ${isBridging ? 'animate-spin' : ''}`} />
                        {isBridging ? 'Bridging Matrix...' : 'Bridge to Inventory'}
                      </button>
                    )}
                    {selectedRequest.status === 'pending' && (
                      <button
                        onClick={() => handleStatusChange(selectedRequest.id, 'offered')}
                        className="col-span-2 py-3 bg-[#A855F7] text-black font-bold rounded-xl text-xs uppercase tracking-widest hover:bg-[#9333EA] transition-all flex items-center justify-center gap-2"
                      >
                        <TrendingUp className="h-4 w-4" /> Send Offer
                      </button>
                    )}
                    {selectedRequest.status === 'accepted' && (
                      <button
                        onClick={() => handleStatusChange(selectedRequest.id, 'completed')}
                        className="col-span-2 py-3 bg-emerald-500/10 border border-emerald-500/20 text-emerald-500 font-bold rounded-xl text-xs uppercase tracking-widest hover:bg-emerald-500/20 transition-all flex items-center justify-center gap-2"
                      >
                        <CheckCircle className="h-4 w-4" /> Complete Acquisition
                      </button>
                    )}
                  </div>
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Stats Matrix */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="bg-[#0a0a0a] border border-white/10 p-6 rounded-2xl relative overflow-hidden group">
          <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:opacity-20 transition-opacity">
            <Activity className="h-12 w-12 text-[#A855F7]" />
          </div>
          <p className="text-gray-500 text-[10px] font-mono uppercase tracking-widest mb-1">Acquisition Rate</p>
          <div className="flex items-end space-x-2">
            <p className="text-3xl font-bold text-white tracking-tighter">72.5%</p>
            <span className="text-emerald-500 text-[10px] font-mono mb-1">+8.4%</span>
          </div>
          <div className="w-full bg-white/5 h-1 rounded-full mt-4 overflow-hidden">
            <motion.div
              initial={{ width: 0 }}
              animate={{ width: '72.5%' }}
              className="bg-[#A855F7] h-full shadow-[0_0_10px_#A855F7]"
            />
          </div>
        </div>
        <div className="bg-[#0a0a0a] border border-white/10 p-6 rounded-2xl">
          <p className="text-gray-500 text-[10px] font-mono uppercase tracking-widest mb-1">Pending Requests</p>
          <p className="text-3xl font-bold text-amber-500 tracking-tighter">{requests.filter(r => r.status === 'pending').length}</p>
          <p className="text-gray-600 text-[10px] font-mono mt-2 uppercase">Awaiting Protocol</p>
        </div>
        <div className="bg-[#0a0a0a] border border-white/10 p-6 rounded-2xl">
          <p className="text-gray-500 text-[10px] font-mono uppercase tracking-widest mb-1">Active Offers</p>
          <p className="text-3xl font-bold text-blue-500 tracking-tighter">{requests.filter(r => r.status === 'offered').length}</p>
          <p className="text-gray-600 text-[10px] font-mono mt-2 uppercase">Negotiation Matrix</p>
        </div>
        <div className="bg-[#0a0a0a] border border-white/10 p-6 rounded-2xl">
          <p className="text-gray-500 text-[10px] font-mono uppercase tracking-widest mb-1">Accepted</p>
          <p className="text-3xl font-bold text-emerald-500 tracking-tighter">{requests.filter(r => r.status === 'accepted').length}</p>
          <p className="text-gray-600 text-[10px] font-mono mt-2 uppercase">Ready for Inbound</p>
        </div>
      </div>

      {/* Control Bar */}
      <div className="flex flex-col md:flex-row gap-4 bg-[#0a0a0a] p-4 rounded-2xl border border-white/10">
        <div className="relative flex-grow">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-500" />
          <input
            type="text"
            placeholder="Search acquisition matrix..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-10 pr-4 py-2 bg-black border border-white/10 rounded-xl text-white font-mono text-xs focus:outline-none focus:border-[#A855F7] w-full"
          />
        </div>
        <div className="flex items-center space-x-3">
          <Filter className="h-4 w-4 text-gray-500" />
          <select
            value={filter}
            onChange={(e) => setFilter(e.target.value)}
            className="bg-black border border-white/10 rounded-xl px-4 py-2 text-white font-mono text-xs focus:outline-none focus:border-[#A855F7]"
          >
            <option value="all">All Status</option>
            <option value="pending">Pending</option>
            <option value="offered">Offered</option>
            <option value="accepted">Accepted</option>
            <option value="completed">Completed</option>
            <option value="rejected">Rejected</option>
          </select>
        </div>
      </div>

      {/* Content Matrix */}
      <div className="bg-[#0a0a0a] border border-white/10 rounded-2xl overflow-hidden shadow-2xl">
        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead className="bg-white/[0.02] text-gray-500 text-[10px] font-mono uppercase tracking-widest">
              <tr>
                <th className="px-6 py-4">Request ID</th>
                <th className="px-6 py-4">Identity / Date</th>
                <th className="px-6 py-4">Hardware Asset</th>
                <th className="px-6 py-4">Condition</th>
                <th className="px-6 py-4">Valuation</th>
                <th className="px-6 py-4">Admin Offer</th>
                <th className="px-6 py-4">Protocol Status</th>
                <th className="px-6 py-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5 text-xs font-mono text-gray-400">
              {filteredRequests.map((request) => (
                <tr
                  key={request.id}
                  className="hover:bg-white/[0.01] transition-colors group"
                >
                  <td className="px-6 py-4 text-[#A855F7] font-bold tracking-tighter">[{request.id}]</td>
                  <td className="px-6 py-4">
                    <div className="text-white uppercase font-bold">{request.customer}</div>
                    <div className="text-[10px] text-gray-600">{request.date}</div>
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex items-center space-x-3">
                      <img src={request.images[0]} alt={request.device} className="w-10 h-10 rounded object-cover border border-white/10" />
                      <span className="text-white uppercase font-bold tracking-tight">{request.device}</span>
                    </div>
                  </td>
                  <td className="px-6 py-4 uppercase">{request.condition}</td>
                  <td className="px-6 py-4 text-gray-400">
                    {formatCurrency(request.estimatedValue)}
                  </td>
                  <td className="px-6 py-4 font-bold text-white">
                    {request.adminOffer ? formatCurrency(request.adminOffer) : '-'}
                  </td>
                  <td className="px-6 py-4">
                    <span className={`px-2 py-0.5 text-[9px] font-bold rounded border uppercase tracking-tighter ${getStatusColor(request.status)}`}>
                      {request.status}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-right">
                    <div className="flex justify-end space-x-2">
                      {request.status === 'pending' && (
                        <button
                          onClick={() => setSelectedRequest(request)}
                          className="p-2 bg-[#A855F7]/10 text-[#A855F7] hover:bg-[#A855F7]/20 border border-[#A855F7]/20 rounded transition-all"
                          title="Review & Offer"
                        >
                          <DollarSign className="h-4 w-4" />
                        </button>
                      )}
                      {request.status === 'accepted' && (
                        <button
                          onClick={() => handleStatusChange(request.id, 'completed')}
                          className="p-2 bg-emerald-500/10 text-emerald-500 hover:bg-emerald-500/20 border border-emerald-500/20 rounded transition-all"
                          title="Complete Acquisition"
                        >
                          <CheckCircle className="h-4 w-4" />
                        </button>
                      )}
                      <button
                        onClick={() => setSelectedRequest(request)}
                        className="p-2 hover:bg-white/5 rounded transition-colors text-gray-600 hover:text-white border border-transparent hover:border-white/10"
                      >
                        <Zap className="h-4 w-4" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {filteredRequests.length === 0 && (
          <div className="text-center py-12 text-gray-600 font-mono text-xs uppercase tracking-widest">
            Acquisition Matrix Empty // No matching records
          </div>
        )}
      </div>

      {/* Invoice Generator Modal */}
      <AnimatePresence>
        {showInvoice && selectedRequest && (
          <InvoiceModal 
            data={invoiceService.formatSellRequestData(selectedRequest)} 
            onClose={() => setShowInvoice(false)} 
          />
        )}
      </AnimatePresence>
    </div>
  );
}
