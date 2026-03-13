import { useState, useEffect, useRef } from 'react';
import { 
  Search, 
  FileText, 
  Download, 
  Filter, 
  Calendar,
  User,
  Hash,
  ArrowRight,
  RefreshCw,
  Clock,
  Eye,
  Plus,
  X,
  Mail,
  Phone,
  MapPin,
  CreditCard,
  Zap,
  TrendingUp,
  ChevronDown,
  Check,
  Save,
  Package,
  Wrench,
  SearchCode
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { collection, onSnapshot, query, orderBy, addDoc, serverTimestamp, getDocs, where, limit } from 'firebase/firestore';
import { db } from '../../lib/firebase';
import { formatCurrency } from '../../lib/utils';
import { invoiceService, InvoiceData } from '../../services/invoiceService';
import InvoiceModal from '../../components/admin/InvoiceModal';

type ServiceType = 'order' | 'rental' | 'repair' | 'buyback';

interface UnifiedTransaction {
  id: string;
  type: 'order' | 'rental' | 'buyback' | 'manual';
  serviceType?: ServiceType;
  customer: string;
  date: string;
  total: number;
  status: string;
  rawData: any;
}

export default function AdminInvoices() {
  const [transactions, setTransactions] = useState<UnifiedTransaction[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [typeFilter, setTypeFilter] = useState<'all' | 'order' | 'rental' | 'buyback' | 'manual'>('all');
  
  const [previewData, setPreviewData] = useState<InvoiceData | null>(null);
  const [showManualForm, setShowManualForm] = useState(false);
  const [isSaving, setIsSubmitting] = useState(false);
  const [isSearchingCustomer, setIsSearchingCustomer] = useState(false);

  // Selector Data
  const [systemProducts, setSystemProducts] = useState<any[]>([]);
  const [productSearch, setProductSearch] = useState('');
  const [activeProductIdx, setActiveProductIdx] = useState<number | null>(null);

  // Manual Form State
  const [selectedService, setSelectedService] = useState<ServiceType>('order');
  const [manualInvoice, setManualInvoice] = useState<InvoiceData>({
    type: 'Order',
    invoiceNumber: `INV-MAN-${Date.now().toString().slice(-6)}`,
    date: new Date().toISOString().split('T')[0],
    customerName: '',
    customerEmail: '',
    customerPhone: '',
    customerAddress: '',
    items: [{ name: '', description: '', quantity: 1, price: 0, total: 0 }],
    subtotal: 0,
    tax: 0,
    shipping: 0,
    total: 0,
    paymentMethod: 'Custom / Offline'
  });

  useEffect(() => {
    const qOrders = query(collection(db, 'orders'), orderBy('date', 'desc'));
    const qRentals = query(collection(db, 'rentals'), orderBy('startDate', 'desc'));
    const qBuybacks = query(collection(db, 'sell_requests'), orderBy('date', 'desc'));
    const qManual = query(collection(db, 'manual_invoices'), orderBy('createdAt', 'desc'));

    const unsubOrders = onSnapshot(qOrders, (snapshot) => {
      const orders = snapshot.docs.map(doc => {
        const data = doc.data();
        return {
          id: doc.id,
          type: 'order' as const,
          customer: data.customer,
          date: data.date,
          total: data.total,
          status: data.status,
          rawData: { ...data, id: doc.id }
        };
      });
      updateUnifiedTransactions(orders, 'order');
    }, (error) => {
      console.error("Firestore error in unsubOrders:", error);
      setLoading(false);
    });

    const unsubRentals = onSnapshot(qRentals, (snapshot) => {
      const rentals = snapshot.docs.map(doc => {
        const data = doc.data();
        return {
          id: doc.id,
          type: 'rental' as const,
          customer: data.user,
          date: data.startDate,
          total: (data.totalPrice || 0) + (data.deposit || 0),
          status: data.status,
          rawData: { ...data, id: doc.id }
        };
      });
      updateUnifiedTransactions(rentals, 'rental');
    }, (error) => {
      console.error("Firestore error in unsubRentals:", error);
      setLoading(false);
    });

    const unsubBuybacks = onSnapshot(qBuybacks, (snapshot) => {
      const buybacks = snapshot.docs.map(doc => {
        const data = doc.data();
        return {
          id: doc.id,
          type: 'buyback' as const,
          customer: data.customer,
          date: data.date,
          total: data.adminOffer || data.estimatedValue,
          status: data.status,
          rawData: { ...data, id: doc.id }
        };
      });
      updateUnifiedTransactions(buybacks, 'buyback');
    }, (error) => {
      console.error("Firestore error in unsubBuybacks:", error);
      setLoading(false);
    });

    const unsubManual = onSnapshot(qManual, (snapshot) => {
      const manualItems = snapshot.docs.map(doc => {
        const data = doc.data();
        return {
          id: data.invoiceNumber,
          type: 'manual' as const,
          serviceType: data.serviceType,
          customer: data.customerName,
          date: data.date,
          total: data.total,
          status: 'generated',
          rawData: { ...data, id: doc.id }
        };
      });
      updateUnifiedTransactions(manualItems, 'manual');
    }, (error) => {
      console.error("Firestore error in unsubManual:", error);
      setLoading(false);
    });

    // Fetch products for selector
    getDocs(collection(db, 'products')).then(snap => {
      setSystemProducts(snap.docs.map(d => ({ id: d.id, ...d.data() })));
    }).catch(error => {
      console.error("Firestore error fetching products:", error);
    });

    return () => {
      unsubOrders();
      unsubRentals();
      unsubBuybacks();
      unsubManual();
    };
  }, []);

  // Recalculate manual totals
  useEffect(() => {
    const subtotal = manualInvoice.items.reduce((acc, item) => acc + (item.price * item.quantity), 0);
    const total = subtotal + (Number(manualInvoice.shipping) || 0) + (Number(manualInvoice.tax) || 0);
    
    // Determine type from selectedService
    let type: 'Rental' | 'Order' | 'Repair' | 'Buyback' = 'Order';
    if (selectedService === 'rental') type = 'Rental';
    else if (selectedService === 'repair') type = 'Repair';
    else if (selectedService === 'buyback') type = 'Buyback';

    setManualInvoice(prev => ({ ...prev, subtotal, total, type }));
  }, [manualInvoice.items, manualInvoice.shipping, manualInvoice.tax, selectedService]);

  const updateUnifiedTransactions = (newData: UnifiedTransaction[], type: 'order' | 'rental' | 'buyback' | 'manual') => {
    setTransactions(prev => {
      const otherTypeData = prev.filter(t => t.type !== type);
      const combined = [...otherTypeData, ...newData];
      return combined.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
    });
    setLoading(false);
  };

  const lookupCustomerByEmail = async () => {
    if (!manualInvoice.customerEmail) return;
    setIsSearchingCustomer(true);
    try {
      const q = query(
        collection(db, 'users'), 
        where('email', '==', manualInvoice.customerEmail), 
        limit(1)
      );
      const snap = await getDocs(q);
      if (!snap.empty) {
        const userData = snap.docs[0].data();
        setManualInvoice(prev => ({
          ...prev,
          customerName: userData.name || prev.customerName,
          customerPhone: userData.phone || prev.customerPhone,
          customerAddress: userData.address || prev.customerAddress
        }));
      } else {
        alert('Customer profile not found in matrix. Please enter details manually.');
      }
    } catch (error) {
      console.error('Lookup Failure:', error);
    } finally {
      setIsSearchingCustomer(false);
    }
  };

  const handlePreviewInvoice = (transaction: UnifiedTransaction) => {
    let data: InvoiceData;
    if (transaction.type === 'order') data = invoiceService.formatOrderData(transaction.rawData);
    else if (transaction.type === 'rental') data = invoiceService.formatRentalData(transaction.rawData);
    else if (transaction.type === 'buyback') data = invoiceService.formatSellRequestData(transaction.rawData);
    else if (transaction.serviceType === 'repair') data = invoiceService.formatRepairData(transaction.rawData);
    else data = transaction.rawData;
    setPreviewData(data);
  };

  const handleDownloadInvoice = (transaction: UnifiedTransaction) => {
    let data: InvoiceData;
    if (transaction.type === 'order') data = invoiceService.formatOrderData(transaction.rawData);
    else if (transaction.type === 'rental') data = invoiceService.formatRentalData(transaction.rawData);
    else if (transaction.type === 'buyback') data = invoiceService.formatSellRequestData(transaction.rawData);
    else if (transaction.serviceType === 'repair') data = invoiceService.formatRepairData(transaction.rawData);
    else data = transaction.rawData;
    invoiceService.generatePDF(data);
  };

  const handleSaveManualInvoice = async () => {
    if (!manualInvoice.customerName || manualInvoice.items.some(i => !i.name)) {
      alert('Validation Error: Customer name and item names are required.');
      return;
    }

    setIsSubmitting(true);
    try {
      await addDoc(collection(db, 'manual_invoices'), {
        ...manualInvoice,
        serviceType: selectedService,
        createdAt: serverTimestamp()
      });
      alert('Manual Invoice successfully committed to database.');
      setShowManualForm(false);
      resetManualForm();
    } catch (error) {
      console.error('Persistence Failure:', error);
      alert('Error saving invoice to matrix.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const resetManualForm = () => {
    setManualInvoice({
      invoiceNumber: `INV-MAN-${Date.now().toString().slice(-6)}`,
      date: new Date().toISOString().split('T')[0],
      customerName: '',
      customerEmail: '',
      customerPhone: '',
      customerAddress: '',
      items: [{ name: '', description: '', quantity: 1, price: 0, total: 0 }],
      subtotal: 0,
      tax: 0,
      shipping: 0,
      total: 0,
      paymentMethod: 'Custom / Offline',
      type: 'Order'
    });
    setSelectedService('order');
  };

  const addManualItem = () => {
    setManualInvoice(prev => ({
      ...prev,
      items: [...prev.items, { name: '', description: '', quantity: 1, price: 0, total: 0 }]
    }));
  };

  const removeManualItem = (index: number) => {
    if (manualInvoice.items.length === 1) return;
    setManualInvoice(prev => ({
      ...prev,
      items: prev.items.filter((_, i) => i !== index)
    }));
  };

  const updateManualItem = (index: number, field: string, value: any) => {
    const newItems = [...manualInvoice.items];
    newItems[index] = { 
      ...newItems[index], 
      [field]: value,
      total: field === 'price' ? value * newItems[index].quantity : 
             field === 'quantity' ? value * newItems[index].price : 
             newItems[index].total
    };
    setManualInvoice(prev => ({ ...prev, items: newItems }));
  };

  const selectProduct = (idx: number, product: any) => {
    const newItems = [...manualInvoice.items];
    newItems[idx] = {
      name: product.name,
      description: product.description?.substring(0, 50) || product.category,
      quantity: 1,
      price: product.price,
      total: product.price
    };
    setManualInvoice(prev => ({ ...prev, items: newItems }));
    setActiveProductIdx(null);
    setProductSearch('');
  };

  const filteredTransactions = transactions.filter(t => {
    const matchesSearch = 
      t.id.toLowerCase().includes(search.toLowerCase()) ||
      t.customer?.toLowerCase().includes(search.toLowerCase());
    const matchesType = typeFilter === 'all' || t.type === typeFilter;
    return matchesSearch && matchesType;
  });

  const filteredSelectorProducts = systemProducts.filter(p => 
    p.name?.toLowerCase().includes(productSearch.toLowerCase())
  );

  return (
    <div className="space-y-8">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-white tracking-tighter uppercase italic">
            Invoice <span className="text-[#B000FF]">Generator</span>
          </h1>
          <p className="text-gray-500 font-mono text-xs mt-1">Centralized Financial Document Matrix</p>
        </div>
        
        <div className="flex items-center gap-3">
          <button
            onClick={() => setShowManualForm(true)}
            className="flex items-center gap-2 px-6 py-2.5 bg-white/5 border border-white/10 rounded-xl text-white font-bold font-mono text-xs uppercase tracking-widest hover:bg-white/10 transition-all shadow-lg hover:shadow-[#B000FF]/10"
          >
            <Plus className="h-4 w-4 text-[#B000FF]" />
            Manual Invoice
          </button>
          <div className="bg-[#080112] border border-white/10 rounded-xl px-4 py-2 flex items-center gap-3">
            <Clock className="h-4 w-4 text-[#B000FF]" />
            <span className="text-white font-mono text-[10px] uppercase tracking-widest font-bold">System_Time: {new Date().toLocaleTimeString()}</span>
          </div>
        </div>
      </div>

      {/* Controls */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="md:col-span-2 relative">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-500" />
          <input
            type="text"
            placeholder="Search by ID or Customer name..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-12 pr-4 py-3 bg-[#080112] border border-white/10 rounded-2xl text-white font-mono text-sm focus:outline-none focus:border-[#B000FF]/50"
          />
        </div>
        <div className="flex gap-2">
          <select
            value={typeFilter}
            onChange={(e) => setTypeFilter(e.target.value as any)}
            className="flex-1 bg-[#080112] border border-white/10 rounded-2xl px-4 py-3 text-white font-mono text-sm focus:outline-none focus:border-[#B000FF]/50 appearance-none cursor-pointer"
          >
            <option value="all">All Types</option>
            <option value="order">Orders Only</option>
            <option value="rental">Rentals Only</option>
            <option value="buyback">Buybacks Only</option>
            <option value="manual">Manual Documents</option>
          </select>
          <button 
            onClick={() => {setSearch(''); setTypeFilter('all');}}
            className="p-3 bg-[#080112] border border-white/10 rounded-2xl text-gray-500 hover:text-white transition-colors"
          >
            <RefreshCw className="h-5 w-5" />
          </button>
        </div>
      </div>

      {/* Transaction List */}
      <div className="grid grid-cols-1 gap-4">
        {loading ? (
          <div className="flex items-center justify-center py-20">
            <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-[#B000FF]"></div>
          </div>
        ) : filteredTransactions.length > 0 ? (
          filteredTransactions.map((t) => (
            <motion.div
              key={`${t.type}-${t.id}`}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className="bg-[#080112] border border-white/10 rounded-2xl p-6 hover:border-[#B000FF]/30 transition-all group"
            >
              <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
                <div className="flex items-start gap-4">
                  <div className={`p-3 rounded-xl ${
                    t.type === 'order' || t.serviceType === 'order' ? 'bg-blue-500/10 text-blue-500' : 
                    t.type === 'rental' || t.serviceType === 'rental' ? 'bg-emerald-500/10 text-emerald-500' : 
                    t.serviceType === 'repair' ? 'bg-amber-500/10 text-amber-500' :
                    'bg-purple-500/10 text-purple-500'
                  }`}>
                    {t.type === 'buyback' || t.serviceType === 'buyback' ? <TrendingUp className="h-6 w-6" /> : 
                     t.serviceType === 'repair' ? <Wrench className="h-6 w-6" /> :
                     <FileText className="h-6 w-6" />}
                  </div>
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <span className="text-[#B000FF] font-bold font-mono text-sm tracking-tighter">[{t.id}]</span>
                      <span className={`text-[10px] font-bold uppercase px-2 py-0.5 rounded border ${
                        t.type === 'order' || t.serviceType === 'order' ? 'text-blue-400 border-blue-500/20 bg-blue-500/5' : 
                        t.type === 'rental' || t.serviceType === 'rental' ? 'text-emerald-400 border-emerald-500/20 bg-emerald-500/5' :
                        t.serviceType === 'repair' ? 'text-amber-400 border-amber-500/20 bg-amber-500/5' :
                        'text-purple-400 border-purple-500/20 bg-purple-500/5'
                      }`}>
                        {t.type === 'manual' ? `manual:${t.serviceType}` : t.type}
                      </span>
                    </div>
                    <h3 className="text-white font-bold uppercase tracking-tight text-lg">{t.customer}</h3>
                    <div className="flex items-center gap-4 text-gray-500 font-mono text-[10px] uppercase">
                      <span className="flex items-center gap-1"><Calendar className="h-3 w-3" /> {t.date}</span>
                      <span className="flex items-center gap-1"><User className="h-3 w-3" /> {t.customer}</span>
                    </div>
                  </div>
                </div>

                <div className="flex flex-row md:flex-col items-center md:items-end justify-between md:justify-center gap-3">
                  <div className="text-right hidden sm:block">
                    <p className="text-gray-500 text-[9px] font-mono uppercase tracking-widest">Total Valuation</p>
                    <p className="text-xl font-bold text-white tracking-tighter">{formatCurrency(t.total)}</p>
                  </div>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => handlePreviewInvoice(t)}
                      className="flex items-center gap-2 px-4 py-2 bg-white/5 border border-white/10 rounded-xl font-bold font-mono text-[10px] uppercase tracking-widest hover:bg-white/10 text-gray-400 hover:text-white transition-all"
                    >
                      <Eye className="h-3.5 w-3.5" />
                      Preview
                    </button>
                    <button
                      onClick={() => handleDownloadInvoice(t)}
                      className="flex items-center gap-2 px-4 py-2 bg-[#B000FF] text-black rounded-xl font-bold font-mono text-[10px] uppercase tracking-widest hover:bg-[#9333EA] transition-all"
                    >
                      <Download className="h-3.5 w-3.5" />
                      PDF
                    </button>
                  </div>
                </div>
              </div>
            </motion.div>
          ))
        ) : (
          <div className="text-center py-20 bg-[#080112] border border-dashed border-white/10 rounded-3xl">
            <Hash className="h-12 w-12 text-gray-800 mx-auto mb-4" />
            <p className="text-gray-500 font-mono text-sm uppercase tracking-widest">No matching records in the matrix</p>
          </div>
        )}
      </div>

      {/* Manual Invoice Modal Form */}
      <AnimatePresence>
        {showManualForm && (
          <div className="fixed inset-0 z-[110] flex items-center justify-center p-4 bg-black/95 backdrop-blur-xl">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-[#080112] border border-white/10 rounded-3xl w-full max-w-5xl max-h-[] overflow-hidden flex flex-col shadow-[0_0_100px_rgba(168,85,247,0.15)]"
            >
              <div className="p-6 border-b border-white/10 flex justify-between items-center bg-white/[0.02]">
                <div>
                  <h2 className="text-2xl font-bold text-white tracking-tighter uppercase italic">Manual <span className="text-[#B000FF]">Invoice_Protocol</span></h2>
                  <p className="text-gray-500 font-mono text-[10px] uppercase mt-1">Generate and persist custom documentation</p>
                </div>
                <button onClick={() => setShowManualForm(false)} className="p-2 hover:bg-white/5 rounded-full transition-colors text-gray-500 hover:text-white">
                  <X size={24} />
                </button>
              </div>

              <div className="flex-grow overflow-y-auto p-8 space-y-10">
                {/* Service Type Selection */}
                <div className="space-y-4">
                  <h3 className="text-xs font-mono font-bold text-gray-500 uppercase tracking-widest flex items-center">
                    <Zap className="mr-2 h-3 w-3 text-[#B000FF]" /> Select_Service_Context
                  </h3>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    {[
                      { id: 'order', label: 'Sales Order', icon: Package, color: 'text-blue-400' },
                      { id: 'rental', label: 'Rental Service', icon: Calendar, color: 'text-emerald-400' },
                      { id: 'repair', label: 'Repair Job', icon: Wrench, color: 'text-amber-400' },
                      { id: 'buyback', label: 'Buyback Proc.', icon: TrendingUp, color: 'text-purple-400' }
                    ].map((svc) => (
                      <button
                        key={svc.id}
                        onClick={() => setSelectedService(svc.id as ServiceType)}
                        className={`p-4 rounded-2xl border transition-all flex flex-col items-center gap-2 group ${
                          selectedService === svc.id 
                          ? 'bg-[#B000FF]/10 border-[#B000FF]/50 shadow-[0_0_15px_rgba(168,85,247,0.1)]' 
                          : 'bg-white/5 border-white/10 hover:border-white/20'
                        }`}
                      >
                        <svc.icon className={`h-6 w-6 ${selectedService === svc.id ? svc.color : 'text-gray-500'}`} />
                        <span className={`text-[10px] font-mono font-bold uppercase tracking-widest ${selectedService === svc.id ? 'text-white' : 'text-gray-500'}`}>
                          {svc.label}
                        </span>
                      </button>
                    ))}
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-10">
                  {/* Basic Info */}
                  <div className="space-y-4">
                    <h3 className="text-xs font-mono font-bold text-gray-500 uppercase tracking-widest flex items-center">
                      <Hash className="mr-2 h-3 w-3 text-[#B000FF]" /> Document_Meta
                    </h3>
                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-1">
                        <label className="text-[9px] font-mono text-gray-600 uppercase ml-2">Invoice Number</label>
                        <input
                          type="text"
                          value={manualInvoice.invoiceNumber}
                          onChange={(e) => setManualInvoice(prev => ({ ...prev, invoiceNumber: e.target.value }))}
                          className="w-full bg-black border border-white/10 rounded-xl px-4 py-3 text-white font-mono text-xs focus:outline-none focus:border-[#B000FF]"
                        />
                      </div>
                      <div className="space-y-1">
                        <label className="text-[9px] font-mono text-gray-600 uppercase ml-2">Protocol Date</label>
                        <input
                          type="date"
                          value={manualInvoice.date}
                          onChange={(e) => setManualInvoice(prev => ({ ...prev, date: e.target.value }))}
                          className="w-full bg-black border border-white/10 rounded-xl px-4 py-3 text-white font-mono text-xs focus:outline-none focus:border-[#B000FF]"
                        />
                      </div>
                    </div>
                  </div>

                  {/* Customer Info with Email Lookup */}
                  <div className="space-y-4">
                    <h3 className="text-xs font-mono font-bold text-gray-500 uppercase tracking-widest flex items-center justify-between">
                      <span className="flex items-center"><User className="mr-2 h-3 w-3 text-[#B000FF]" /> Customer_Entity</span>
                      <span className="text-[8px] font-mono text-gray-600 uppercase">Auto-fill on Email lookup</span>
                    </h3>
                    
                    <div className="flex gap-2">
                      <div className="relative flex-1">
                        <Mail className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-500" />
                        <input
                          type="email"
                          placeholder="Customer Email Address"
                          value={manualInvoice.customerEmail}
                          onChange={(e) => setManualInvoice(prev => ({ ...prev, customerEmail: e.target.value }))}
                          className="w-full bg-black border border-white/10 rounded-xl pl-12 pr-4 py-3 text-white font-mono text-xs focus:outline-none focus:border-[#B000FF]"
                        />
                      </div>
                      <button 
                        onClick={lookupCustomerByEmail}
                        disabled={isSearchingCustomer}
                        className="px-4 bg-white/5 border border-white/10 rounded-xl hover:bg-white/10 transition-all text-[#B000FF] disabled:opacity-50"
                        title="Lookup Customer details"
                      >
                        {isSearchingCustomer ? <RefreshCw className="h-4 w-4 animate-spin" /> : <SearchCode className="h-4 w-4" />}
                      </button>
                    </div>

                    <input
                      type="text"
                      placeholder="Full Name"
                      value={manualInvoice.customerName}
                      onChange={(e) => setManualInvoice(prev => ({ ...prev, customerName: e.target.value }))}
                      className="w-full bg-black border border-white/10 rounded-xl px-4 py-3 text-white font-mono text-xs focus:outline-none focus:border-[#B000FF]"
                    />

                    <input
                      type="text"
                      maxLength={10}
                      placeholder="Contact Phone (10 Digits)"
                      value={manualInvoice.customerPhone}
                      onChange={(e) => setManualInvoice(prev => ({ ...prev, customerPhone: e.target.value.replace(/\D/g, '') }))}
                      className={`w-full bg-black border rounded-xl px-4 py-3 font-mono text-xs focus:outline-none transition-colors ${
                        (manualInvoice.customerPhone.length === 10) ? 'border-emerald-500/50 text-emerald-500' : 'border-white/10 text-white focus:border-[#B000FF]'
                      }`}
                    />
                    <textarea
                      placeholder="Physical Distribution Address"
                      value={manualInvoice.customerAddress}
                      onChange={(e) => setManualInvoice(prev => ({ ...prev, customerAddress: e.target.value }))}
                      className="w-full bg-black border border-white/10 rounded-xl px-4 py-3 text-white font-mono text-xs focus:outline-none focus:border-[#B000FF] min-h-[80px] resize-none"
                    />
                  </div>
                </div>

                {/* Items Matrix with Product Picker */}
                <div className="space-y-4">
                  <div className="flex justify-between items-center">
                    <h3 className="text-xs font-mono font-bold text-gray-500 uppercase tracking-widest">
                      Payload_Matrix
                    </h3>
                    <button
                      onClick={addManualItem}
                      className="text-[10px] font-mono text-[#B000FF] hover:text-white flex items-center gap-1 uppercase tracking-widest"
                    >
                      <Plus size={12} /> Add_Item_Entry
                    </button>
                  </div>
                  
                  <div className="space-y-4">
                    {manualInvoice.items.map((item, idx) => (
                      <div key={idx} className="relative bg-white/[0.02] p-6 rounded-2xl border border-white/5 space-y-4 group transition-colors hover:bg-white/[0.03]">
                        <div className="grid grid-cols-12 gap-4 items-end">
                          <div className="col-span-5 space-y-1 relative">
                            <label className="text-[9px] font-mono text-gray-600 uppercase ml-2">Asset Name</label>
                            <div className="flex gap-2">
                              <input
                                placeholder="Hardware Asset / Service"
                                value={item.name}
                                onChange={(e) => updateManualItem(idx, 'name', e.target.value)}
                                className="w-full bg-black border border-white/5 rounded-xl px-4 py-2.5 text-white font-mono text-xs focus:outline-none focus:border-[#B000FF]"
                              />
                              <button 
                                onClick={() => setActiveProductIdx(activeProductIdx === idx ? null : idx)}
                                className="p-2.5 bg-white/5 rounded-xl hover:bg-[#B000FF]/20 transition-colors border border-white/5"
                              >
                                <ChevronDown className={`h-4 w-4 text-[#B000FF] transition-transform ${activeProductIdx === idx ? 'rotate-180' : ''}`} />
                              </button>
                            </div>

                            {activeProductIdx === idx && (
                              <div className="absolute top-full mt-2 left-0 right-0 bg-[#0f0f0f] border border-white/10 rounded-2xl shadow-2xl z-50 p-4 space-y-4">
                                <div className="relative">
                                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3 w-3 text-gray-500" />
                                  <input
                                    autoFocus
                                    placeholder="Search inventory..."
                                    value={productSearch}
                                    onChange={(e) => setProductSearch(e.target.value)}
                                    className="w-full bg-black border border-white/5 rounded-xl pl-9 pr-4 py-2 text-xs text-white focus:outline-none focus:border-[#B000FF]/50"
                                  />
                                </div>
                                <div className="max-h-40 overflow-y-auto space-y-1 scrollbar-hide">
                                  {filteredSelectorProducts.map(p => (
                                    <button
                                      key={p.id}
                                      onClick={() => selectProduct(idx, p)}
                                      className="w-full text-left p-2.5 hover:bg-white/5 rounded-xl flex items-center justify-between group transition-colors"
                                    >
                                      <div className="flex items-center gap-3">
                                        <img src={p.image} className="w-8 h-8 rounded border border-white/5" />
                                        <div>
                                          <p className="text-xs font-bold text-white uppercase">{p.name}</p>
                                          <p className="text-[9px] text-gray-500 font-mono">{formatCurrency(p.price)}</p>
                                        </div>
                                      </div>
                                      <Check className="h-3 w-3 text-[#B000FF] opacity-0 group-hover:opacity-100" />
                                    </button>
                                  ))}
                                </div>
                              </div>
                            )}
                          </div>
                          <div className="col-span-3 space-y-1">
                            <label className="text-[9px] font-mono text-gray-600 uppercase ml-2">Description</label>
                            <input
                              placeholder="Condition / Specs"
                              value={item.description}
                              onChange={(e) => updateManualItem(idx, 'description', e.target.value)}
                              className="w-full bg-black border border-white/5 rounded-xl px-4 py-2.5 text-white font-mono text-xs focus:outline-none focus:border-[#B000FF]"
                            />
                          </div>
                          <div className="col-span-1 space-y-1">
                            <label className="text-[9px] font-mono text-gray-600 uppercase text-center block">Qty</label>
                            <input
                              type="number"
                              value={item.quantity}
                              onChange={(e) => updateManualItem(idx, 'quantity', parseInt(e.target.value) || 0)}
                              className="w-full bg-black border border-white/5 rounded-xl px-2 py-2.5 text-white font-mono text-xs text-center focus:outline-none"
                            />
                          </div>
                          <div className="col-span-2 space-y-1">
                            <label className="text-[9px] font-mono text-gray-600 uppercase text-right block mr-2">Price (â‚¹)</label>
                            <input
                              type="number"
                              value={item.price}
                              onChange={(e) => updateManualItem(idx, 'price', parseFloat(e.target.value) || 0)}
                              className="w-full bg-black border border-white/5 rounded-xl px-4 py-2.5 text-white font-mono text-xs text-right focus:outline-none"
                            />
                          </div>
                          <div className="col-span-1 flex justify-center pb-2">
                            <button
                              onClick={() => removeManualItem(idx)}
                              className="p-2 text-gray-600 hover:text-red-500 transition-colors opacity-0 group-hover:opacity-100"
                            >
                              <X size={18} />
                            </button>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Final Totals */}
                <div className="flex flex-col md:flex-row justify-between items-start gap-10">
                  <div className="flex-1 space-y-4 max-w-md w-full">
                    <h3 className="text-xs font-mono font-bold text-gray-500 uppercase tracking-widest flex items-center">
                      <CreditCard className="mr-2 h-3 w-3 text-[#B000FF]" /> Payment_Method
                    </h3>
                    <input
                      type="text"
                      value={manualInvoice.paymentMethod}
                      onChange={(e) => setManualInvoice(prev => ({ ...prev, paymentMethod: e.target.value }))}
                      className="w-full bg-black border border-white/10 rounded-xl px-4 py-3 text-white font-mono text-xs focus:outline-none focus:border-[#B000FF]"
                    />
                    <textarea
                      placeholder="Optional protocol notes / internal references..."
                      value={manualInvoice.notes}
                      onChange={(e) => setManualInvoice(prev => ({ ...prev, notes: e.target.value }))}
                      className="w-full bg-black border border-white/10 rounded-xl px-4 py-3 text-white font-mono text-xs focus:outline-none focus:border-[#B000FF] min-h-[80px] resize-none"
                    />
                  </div>

                  <div className="w-full max-w-xs space-y-4 bg-white/[0.02] p-8 rounded-3xl border border-white/10">
                    <div className="flex justify-between items-center text-[10px] font-mono text-gray-500">
                      <span>BASE_SUBTOTAL</span>
                      <span className="text-white">{formatCurrency(manualInvoice.subtotal)}</span>
                    </div>
                    <div className="flex justify-between items-center gap-4 text-[10px] font-mono text-gray-500">
                      <span>TAX_OVERHEAD (â‚¹)</span>
                      <input
                        type="number"
                        value={manualInvoice.tax}
                        onChange={(e) => setManualInvoice(prev => ({ ...prev, tax: parseFloat(e.target.value) || 0 }))}
                        className="w-24 bg-black border border-white/10 rounded-lg px-3 py-1.5 text-white text-right focus:outline-none focus:border-[#B000FF]"
                      />
                    </div>
                    <div className="flex justify-between items-center gap-4 text-[10px] font-mono text-gray-500">
                      <span>LOGISTICS_FEE (â‚¹)</span>
                      <input
                        type="number"
                        value={manualInvoice.shipping}
                        onChange={(e) => setManualInvoice(prev => ({ ...prev, shipping: parseFloat(e.target.value) || 0 }))}
                        className="w-24 bg-black border border-white/10 rounded-lg px-3 py-1.5 text-white text-right focus:outline-none focus:border-[#B000FF]"
                      />
                    </div>
                    <div className="h-px bg-white/10 my-4"></div>
                    <div className="flex justify-between items-center">
                      <span className="text-xs font-mono text-gray-400 italic font-black uppercase">Final_Valuation</span>
                      <span className="text-2xl font-black text-[#B000FF] tracking-tighter">{formatCurrency(manualInvoice.total)}</span>
                    </div>
                  </div>
                </div>
              </div>

              <div className="p-8 bg-white/[0.02] border-t border-white/10 flex justify-end gap-4">
                <button
                  disabled={isSaving}
                  onClick={() => {setShowManualForm(false); resetManualForm();}}
                  className="px-8 py-3 bg-white/5 text-gray-400 rounded-xl font-mono text-[10px] uppercase tracking-widest hover:bg-white/10 transition-all border border-white/5"
                >
                  Abort_Protocol
                </button>
                <button
                  disabled={isSaving}
                  onClick={() => setPreviewData(manualInvoice)}
                  className="px-8 py-3 bg-white/10 text-white rounded-xl font-bold font-mono text-[10px] uppercase tracking-widest hover:bg-white/20 transition-all flex items-center gap-2 border border-white/10"
                >
                  <Eye size={14} /> Preview_Document
                </button>
                <button
                  disabled={isSaving}
                  onClick={handleSaveManualInvoice}
                  className="px-10 py-3 bg-[#B000FF] text-black rounded-xl font-black font-mono text-[10px] uppercase tracking-widest hover:bg-[#9333EA] transition-all shadow-[0_0_30px_rgba(168,85,247,0.3)] flex items-center gap-2"
                >
                  {isSaving ? <RefreshCw className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
                  Persist & Generate
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Invoice Preview Modal */}
      <AnimatePresence>
        {previewData && (
          <InvoiceModal 
            data={previewData} 
            onClose={() => setPreviewData(null)} 
          />
        )}
      </AnimatePresence>
    </div>
  );
}

