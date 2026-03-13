import React, { useState, useEffect } from 'react';
import { formatCurrency } from '../../lib/utils';
import {
  Calendar as CalendarIcon,
  CheckCircle,
  AlertTriangle,
  Clock,
  XCircle,
  Search,
  Filter,
  List,
  ChevronLeft,
  ChevronRight,
  ChevronUp,
  ChevronDown,
  Activity,
  Zap,
  Download,
  MoreHorizontal,
  User,
  ShieldCheck,
  ExternalLink,
  ClipboardList,
  Package,
  Plus,
  RefreshCw,
  DollarSign,
  Mail,
  Edit2,
  Save,
  History,
  MapPin,
  Printer
} from 'lucide-react';
import {
  format,
  startOfMonth,
  endOfMonth,
  isSameDay,
  isWithinInterval,
  parseISO,
  addMonths,
  subMonths,
  startOfWeek,
  endOfWeek,
  differenceInDays,
  isSameMonth
} from 'date-fns';
import { motion, AnimatePresence } from 'framer-motion';
import { automationService } from '../../services/automationService';
import { notificationService } from '../../services/notificationService';
import { collection, onSnapshot, query, doc, updateDoc, orderBy, setDoc } from 'firebase/firestore';
import { db } from '../../lib/firebase';
import { invoiceService } from '../../services/invoiceService';
import InvoiceModal from '../../components/admin/InvoiceModal';
import { rentalService } from '../../services/rentalService';
import { 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  LineChart,
  Line,
  AreaChart,
  Area
} from 'recharts';

type RentalStatus = 'active' | 'completed' | 'late' | 'pending';

interface RentalTimeline {
  status: RentalStatus | 'extended' | 'maintenance';
  timestamp: string;
  note: string;
}

interface TransactionRecord {
  id: string;
  type: 'payment' | 'refund' | 'deposit' | 'fee';
  amount: number;
  date: string;
  status: 'completed' | 'pending' | 'failed';
}

interface Rental {
  id: string;
  user: string;
  email: string;
  phone: string;
  product: string;
  productId: string;
  unitId?: string; // specific unit link
  image: string;
  startDate: string;
  endDate: string;
  totalPrice: number;
  deposit: number;
  lateFees: number;
  status: RentalStatus;
  timeline: RentalTimeline[];
  transactions: TransactionRecord[];
  internalNotes?: string;
}

export default function AdminRentals() {
  const [rentals, setRentals] = useState<Rental[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [filter, setFilter] = useState<string>('all');
  const [viewMode, setViewMode] = useState<'list' | 'calendar'>('list');
  const [currentDate, setCurrentDate] = useState(new Date());
  const [selectedRental, setSelectedRental] = useState<Rental | null>(null);
  const [isEditing, setIsEditing] = useState(false);
  const [editForm, setEditForm] = useState<Partial<Rental>>({});
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [sortConfig, setSortConfig] = useState<{ key: keyof Rental; direction: 'asc' | 'desc' } | null>(null);
  const [isManualBookingOpen, setIsManualBookingOpen] = useState(false);
  const [manualForm, setManualForm] = useState<Partial<Rental>>({
    status: 'pending',
    timeline: [],
    transactions: [],
    deposit: 0,
    totalPrice: 0,
    lateFees: 0
  });

  const [showInvoice, setShowInvoice] = useState(false);
  const [showReturnModal, setShowReturnModal] = useState(false);
  const [returnProcessing, setReturnProcessing] = useState(false);

  useEffect(() => {
    const q = query(collection(db, 'rentals'), orderBy('startDate', 'desc'));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const fetchedRentals = snapshot.docs.map(doc => ({
        ...doc.data(),
        id: doc.id
      })) as Rental[];
      setRentals(fetchedRentals);
      setLoading(false);
    }, (error) => {
      console.error("Firestore error in AdminRentals:", error);
      setLoading(false);
    });
    return () => unsubscribe();
  }, []);

  const handleReturnAction = async (condition: 'good' | 'minor' | 'major', repairCost: number) => {
    if (!selectedRental) return;
    setReturnProcessing(true);
    try {
      const unitId = selectedRental.unitId;
      if (!unitId) throw new Error("Asset Node ID not found for this rental.");

      await rentalService.processReturn(selectedRental.id, unitId, condition, repairCost);
      alert(`Asset Cleared. Final Refund: ${formatCurrency(selectedRental.deposit - repairCost)} committed to ledger.`);
      setShowReturnModal(false);
      setSelectedRental(null);
    } catch (error: any) {
      console.error(error);
      alert(`Protocol Failed: ${error.message}`);
    } finally {
      setReturnProcessing(false);
    }
  };

  const handleEditToggle = async () => {
    if (isEditing) {
      if (selectedRental) {
        const updatedRental = { ...selectedRental, ...editForm } as Rental;
        try {
          await updateDoc(doc(db, 'rentals', updatedRental.id), editForm);
          setSelectedRental(updatedRental);
        } catch (error) {
          console.error('Failed to update rental:', error);
          alert('Failed to save changes to database.');
        }
      }
      setIsEditing(false);
    } else {
      setEditForm(selectedRental || {});
      setIsEditing(true);
    }
  };

  const handleEditChange = (field: keyof Rental, value: any) => {
    setEditForm(prev => ({ ...prev, [field]: value }));
  };

  const handleManualBooking = async (e: React.FormEvent) => {
    e.preventDefault();
    const rentalId = `R-${Date.now().toString().slice(-4)}`;
    const newRental: Rental = {
      ...manualForm,
      id: rentalId,
      timeline: [
        { status: 'pending', timestamp: new Date().toLocaleString(), note: 'Manual entry protocol initialized' }
      ]
    } as Rental;

    try {
      await setDoc(doc(db, 'rentals', rentalId), newRental);
      setIsManualBookingOpen(false);
      setManualForm({
        status: 'pending',
        timeline: [],
        transactions: [],
        deposit: 0,
        totalPrice: 0,
        lateFees: 0
      });
      alert('Manual booking successfully committed to matrix.');
    } catch (error) {
      console.error('Manual booking failed:', error);
      alert('Validation Error: Could not commit manual entry.');
    }
  };

  const closeRentalModal = () => {
    setSelectedRental(null);
    setIsEditing(false);
    setShowReturnModal(false);
  };

  const handleStatusChange = async (id: string, newStatus: RentalStatus) => {
    const rental = rentals.find(r => r.id === id);
    if (!rental) return;

    const newTimelineEntry: RentalTimeline = {
      status: newStatus,
      timestamp: new Date().toLocaleString(),
      note: `Protocol updated to ${newStatus} by admin`
    };

    const updatedRentalData = {
      status: newStatus,
      timeline: [...rental.timeline, newTimelineEntry]
    };

    try {
      await updateDoc(doc(db, 'rentals', id), updatedRentalData);
      if (selectedRental && selectedRental.id === id) {
        setSelectedRental({ ...rental, ...updatedRentalData });
      }
    } catch (error) {
      console.error('Failed to update status:', error);
      alert('Failed to update status in database.');
    }
  };

  const handleManualNotification = (type: 'reminder' | 'penalty' | 'custom') => {
    if (!selectedRental) return;
    notificationService.sendNotification('rental_reminder', selectedRental.email, {
      customerName: selectedRental.user,
      rentalId: selectedRental.id,
      endDate: selectedRental.endDate
    });
    alert(`Manual notification triggered for ${selectedRental.user}`);
  };

  const handleAutoLateScan = async () => {
    const today = new Date();
    const overdueRentals = rentals.filter(r => r.status === 'active' && new Date(r.endDate) < today);
    if (overdueRentals.length === 0) {
      alert('Scanning Complete: No overdue rentals detected.');
      return;
    }
    if (confirm(`Detected ${overdueRentals.length} overdue rentals. Update all?`)) {
      for (const rental of overdueRentals) {
        await handleStatusChange(rental.id, 'late');
      }
      alert('Fleet status updated.');
    }
  };

  const toggleSelection = (id: string) => {
    setSelectedIds(prev => prev.includes(id) ? prev.filter(i => i !== id) : [...prev, id]);
  };

  const toggleAll = () => {
    if (selectedIds.length === filteredRentals.length) {
      setSelectedIds([]);
    } else {
      setSelectedIds(filteredRentals.map(r => r.id));
    }
  };

  const bulkUpdateStatus = (status: RentalStatus) => {
    selectedIds.forEach(id => handleStatusChange(id, status));
    setSelectedIds([]);
  };

  const handleExportReport = () => {
    alert("Report generation initialized...");
  };

  const filteredRentals = rentals.filter(rental => {
    const matchesSearch = rental.user.toLowerCase().includes(search.toLowerCase()) ||
      rental.product.toLowerCase().includes(search.toLowerCase()) ||
      rental.id.toLowerCase().includes(search.toLowerCase());
    const matchesFilter = filter === 'all' || rental.status === filter;
    return matchesSearch && matchesFilter;
  });

  const sortedRentals = [...filteredRentals].sort((a, b) => {
    if (!sortConfig) return 0;
    const aValue = a[sortConfig.key];
    const bValue = b[sortConfig.key];
    if (aValue! < bValue!) return sortConfig.direction === 'asc' ? -1 : 1;
    if (aValue! > bValue!) return sortConfig.direction === 'asc' ? 1 : -1;
    return 0;
  });

  const requestSort = (key: keyof Rental) => {
    let direction: 'asc' | 'desc' = 'asc';
    if (sortConfig && sortConfig.key === key && sortConfig.direction === 'asc') direction = 'desc';
    setSortConfig({ key, direction });
  };

  const renderSortIcon = (key: keyof Rental) => {
    if (sortConfig?.key !== key) return <ChevronDown className="h-3 w-3 opacity-0 group-hover:opacity-50 transition-opacity" />;
    return sortConfig.direction === 'asc' ? <ChevronUp className="h-3 w-3 text-[#B000FF]" /> : <ChevronDown className="h-3 w-3 text-[#B000FF]" />;
  };

  const getStatusColor = (status: RentalStatus) => {
    switch (status) {
      case 'active': return 'text-blue-400 bg-blue-500/10 border-blue-500/20';
      case 'completed': return 'text-emerald-400 bg-emerald-500/10 border-emerald-500/20';
      case 'late': return 'text-red-400 bg-red-500/10 border-red-500/20';
      case 'pending': return 'text-amber-400 bg-amber-500/10 border-amber-500/20';
      default: return 'text-gray-400 bg-gray-500/10 border-gray-500/20';
    }
  };

  const nextMonth = () => setCurrentDate(addMonths(currentDate, 1));
  const prevMonth = () => setCurrentDate(subMonths(currentDate, 1));

  const renderCalendar = () => {
    const monthStart = startOfMonth(currentDate);
    const monthEnd = endOfMonth(monthStart);
    const startDate = startOfWeek(monthStart);
    const endDate = endOfWeek(monthEnd);
    let day = startDate;
    const rows = [];
    const weekDays = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

    while (day <= endDate) {
      const days = [];
      for (let i = 0; i < 7; i++) {
        const cloneDay = new Date(day);
        const dayRentals = filteredRentals.filter(rental => {
          const start = parseISO(rental.startDate);
          const end = parseISO(rental.endDate);
          return isWithinInterval(cloneDay, { start, end });
        });
        days.push(
          <div key={day.toString()} className={`min-h-[100px] border border-white/5 p-2 ${!isSameMonth(day, monthStart) ? "bg-white/[0.01] opacity-30" : "bg-white/[0.02]"}`}>
            <div className="text-right text-[9px] font-mono text-gray-600">{format(day, "d")}</div>
            <div className="space-y-1 mt-1">
              {dayRentals.map(r => (
                <div key={r.id} className={`text-[8px] px-1 py-0.5 rounded truncate ${getStatusColor(r.status)}`}>{r.user.split(' ')[0]}</div>
              ))}
            </div>
          </div>
        );
        day = new Date(day.setDate(day.getDate() + 1));
      }
      rows.push(<div className="grid grid-cols-7" key={day.toString()}>{days}</div>);
    }

    return (
      <div className="bg-[#080112] border border-white/10 rounded-2xl p-6">
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-xl font-bold text-white uppercase italic">{format(currentDate, "MMMM yyyy")}</h2>
          <div className="flex space-x-2">
            <button onClick={prevMonth} className="p-2 bg-white/5 rounded-lg text-gray-400 hover:text-white"><ChevronLeft size={16}/></button>
            <button onClick={nextMonth} className="p-2 bg-white/5 rounded-lg text-gray-400 hover:text-white"><ChevronRight size={16}/></button>
          </div>
        </div>
        <div className="grid grid-cols-7 mb-2 border-b border-white/5 pb-2">
          {weekDays.map(d => <div key={d} className="text-center text-[10px] font-mono text-gray-500 uppercase">{d}</div>)}
        </div>
        {rows}
      </div>
    );
  };

  return (
    <div className="space-y-8">
      {/* Metrics Row */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        {[
          { label: 'Utilized_Nodes', val: '88.4%', icon: Activity, color: 'text-[#B000FF]' },
          { label: 'Deployed_Fleet', val: rentals.filter(r => r.status === 'active').length, icon: Package, color: 'text-blue-500' },
          { label: 'Signal_Late', val: rentals.filter(r => r.status === 'late').length, icon: Clock, color: 'text-red-500' },
          { label: 'Scheduled_Matrix', val: rentals.filter(r => r.status === 'pending').length, icon: CalendarIcon, color: 'text-amber-500' },
        ].map((stat, i) => (
          <div key={i} className="bg-[#080112] border border-white/10 p-6 rounded-2xl">
            <div className="flex items-center justify-between mb-2">
              <span className="text-[10px] font-mono text-gray-500 uppercase tracking-widest">{stat.label}</span>
              <stat.icon size={14} className={stat.color} />
            </div>
            <p className="text-3xl font-bold text-white tracking-tighter italic">{stat.val}</p>
          </div>
        ))}
      </div>

      <div className="flex flex-col md:flex-row gap-4 bg-[#080112] p-4 rounded-2xl border border-white/10">
        <div className="relative flex-grow">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-500" />
          <input type="text" placeholder="Search operational database..." value={search} onChange={e => setSearch(e.target.value)} className="pl-10 pr-4 py-2 bg-black border border-white/10 rounded-xl text-white font-mono text-xs focus:border-[#B000FF] w-full" />
        </div>
        <div className="flex items-center gap-2">
          <div className="flex bg-black rounded-xl p-1 border border-white/10">
            <button onClick={() => setViewMode('list')} className={`p-2 rounded-lg ${viewMode === 'list' ? 'bg-[#B000FF] text-black' : 'text-gray-500'}`}><List size={16}/></button>
            <button onClick={() => setViewMode('calendar')} className={`p-2 rounded-lg ${viewMode === 'calendar' ? 'bg-[#B000FF] text-black' : 'text-gray-500'}`}><CalendarIcon size={16}/></button>
          </div>
          <button onClick={handleAutoLateScan} className="px-4 py-2 bg-red-500/10 border border-red-500/20 text-red-500 rounded-xl text-[10px] font-black uppercase tracking-widest">Late Scan</button>
          <button onClick={() => setIsManualBookingOpen(true)} className="px-4 py-2 bg-emerald-500 text-black rounded-xl text-[10px] font-black uppercase tracking-widest">Manual Entry</button>
        </div>
      </div>

      {viewMode === 'list' ? (
        <div className="bg-[#080112] border border-white/10 rounded-2xl overflow-hidden shadow-2xl">
          <table className="w-full text-left">
            <thead className="bg-white/[0.02] text-gray-500 text-[10px] font-mono uppercase tracking-widest border-b border-white/5">
              <tr>
                <th className="px-6 py-4">Node_ID</th>
                <th className="px-6 py-4">Hardware</th>
                <th className="px-6 py-4">Identity</th>
                <th className="px-6 py-4">Temporal_Window</th>
                <th className="px-6 py-4">Status</th>
                <th className="px-6 py-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5 text-xs font-mono text-gray-400">
              {sortedRentals.map(rental => (
                <tr key={rental.id} className="hover:bg-white/[0.01] transition-colors group">
                  <td className="px-6 py-4 text-[#B000FF] font-bold">[{rental.id}]</td>
                  <td className="px-6 py-4 text-white font-bold">{rental.product}</td>
                  <td className="px-6 py-4">
                    <div className="font-bold text-gray-300">{rental.user}</div>
                    <div className="text-[9px] text-gray-600">{rental.email}</div>
                  </td>
                  <td className="px-6 py-4">
                    <div>{rental.startDate}</div>
                    <div className="text-[9px] text-gray-600">{rental.endDate}</div>
                  </td>
                  <td className="px-6 py-4">
                    <span className={`px-2 py-0.5 text-[9px] font-bold rounded border uppercase ${getStatusColor(rental.status)}`}>{rental.status}</span>
                  </td>
                  <td className="px-6 py-4 text-right">
                    <div className="flex justify-end space-x-2">
                      {rental.status === 'pending' && <button onClick={() => handleStatusChange(rental.id, 'active')} className="p-2 bg-[#B000FF]/10 text-[#B000FF] border border-[#B000FF]/20 rounded transition-all"><CheckCircle size={14}/></button>}
                      {rental.status === 'active' && (
                        <>
                          <button onClick={() => { setSelectedRental(rental); setShowReturnModal(true); }} className="p-2 bg-emerald-500/10 text-emerald-500 border border-emerald-500/20 rounded transition-all"><RefreshCw size={14}/></button>
                          <button onClick={() => handleStatusChange(rental.id, 'late')} className="p-2 bg-red-500/10 text-red-500 border border-red-500/20 rounded transition-all"><Clock size={14}/></button>
                        </>
                      )}
                      <button onClick={() => setSelectedRental(rental)} className="p-2 hover:bg-white/5 text-gray-600 hover:text-white border border-transparent hover:border-white/10 rounded transition-all"><Zap size={14}/></button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : renderCalendar()}

      {/* Manual Entry Modal - Simplified for brevity */}
      {isManualBookingOpen && <div className="fixed inset-0 z-50 bg-black/90 flex items-center justify-center p-4"><div className="bg-[#080112] border border-white/10 rounded-3xl p-8 max-w-lg w-full text-center space-y-4"><h3 className="text-white font-black italic text-2xl uppercase">Manual Protocol Initiation</h3><p className="text-gray-500 text-xs">Injecting manual booking into the secure ledger.</p><button onClick={() => setIsManualBookingOpen(false)} className="px-8 py-3 bg-[#B000FF] text-black font-black uppercase rounded-xl">Terminate Session</button></div></div>}

      {/* Return Assessment Modal */}
      <AnimatePresence>
        {showReturnModal && selectedRental && (
          <div className="fixed inset-0 z-[70] flex items-center justify-center bg-black/95 backdrop-blur-xl p-4">
            <motion.div initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.9 }} className="bg-[#080112] border border-white/10 rounded-[2.5rem] w-full max-w-lg overflow-hidden shadow-2xl">
              <div className="p-8 border-b border-white/5 bg-white/[0.01]">
                <h3 className="text-xl font-black text-white uppercase italic tracking-tighter">Asset Return Protocol</h3>
                <p className="text-[10px] font-mono text-gray-500 uppercase mt-1">Condition Assessment // Node: {selectedRental.id}</p>
              </div>
              <div className="p-8 space-y-6">
                <div className="grid grid-cols-3 gap-3">
                  <button onClick={() => handleReturnAction('good', 0)} disabled={returnProcessing} className="flex flex-col items-center gap-3 p-4 bg-emerald-500/5 border border-emerald-500/20 rounded-2xl hover:bg-emerald-500 hover:text-black transition-all group"><CheckCircle size={24} className="text-emerald-500 group-hover:text-black"/><span className="text-[9px] font-black uppercase tracking-widest text-center">Good<br/>Condition</span></button>
                  <button onClick={() => handleReturnAction('minor', 500)} disabled={returnProcessing} className="flex flex-col items-center gap-3 p-4 bg-amber-500/5 border border-amber-500/20 rounded-2xl hover:bg-amber-500 hover:text-black transition-all group"><AlertTriangle size={24} className="text-amber-500 group-hover:text-black"/><span className="text-[9px] font-black uppercase tracking-widest text-center">Minor<br/>Damage</span></button>
                  <button onClick={() => handleReturnAction('major', 2000)} disabled={returnProcessing} className="flex flex-col items-center gap-3 p-4 bg-red-500/5 border border-red-500/20 rounded-2xl hover:bg-red-500 hover:text-black transition-all group"><XCircle size={24} className="text-red-500 group-hover:text-black"/><span className="text-[9px] font-black uppercase tracking-widest text-center">Major<br/>Damage</span></button>
                </div>
                <div className="p-4 bg-white/5 rounded-xl border border-white/5 text-center"><span className="text-[10px] font-mono uppercase text-gray-500 block mb-1">Collateral Locked</span><span className="text-white font-black text-lg italic">{formatCurrency(selectedRental.deposit)}</span></div>
              </div>
              <div className="p-6 bg-white/[0.01] flex justify-end"><button onClick={() => setShowReturnModal(false)} className="px-6 py-2 text-[10px] font-black text-gray-500 uppercase tracking-widest hover:text-white transition-colors">Abort</button></div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Invoice Generator Modal */}
      <AnimatePresence>
        {showInvoice && selectedRental && (
          <InvoiceModal data={invoiceService.formatRentalData(selectedRental)} onClose={() => setShowInvoice(false)} />
        )}
      </AnimatePresence>
    </div>
  );
}
