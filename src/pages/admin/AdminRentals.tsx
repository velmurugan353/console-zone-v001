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
  MapPin
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
  differenceInDays
} from 'date-fns';
import { motion, AnimatePresence } from 'framer-motion';
import { automationService } from '../../services/automationService';
import { notificationService } from '../../services/notificationService';
import { collection, onSnapshot, query, doc, updateDoc, orderBy, setDoc } from 'firebase/firestore';
import { db } from '../../lib/firebase';

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

const MOCK_RENTALS: Rental[] = [
  {
    id: 'R-1001',
    user: 'Alex Gamer',
    email: 'alex@example.com',
    phone: '+1 234 567 8901',
    product: 'PlayStation 5 Pro',
    productId: 'P5-PRO-001',
    image: 'https://images.unsplash.com/photo-1606144042614-b2417e99c4e3?auto=format&fit=crop&q=80&w=200',
    startDate: '2023-10-25',
    endDate: '2023-10-28',
    totalPrice: 75.00,
    deposit: 200.00,
    lateFees: 0,
    status: 'active',
    timeline: [
      { status: 'pending', timestamp: '2023-10-24 02:00 PM', note: 'Booking initialized' },
      { status: 'active', timestamp: '2023-10-25 10:00 AM', note: 'Hardware deployed to customer' }
    ],
    transactions: [
      { id: 'TXN-1001-A', type: 'payment', amount: 75.00, date: '2023-10-24', status: 'completed' },
      { id: 'TXN-1001-B', type: 'deposit', amount: 200.00, date: '2023-10-24', status: 'completed' }
    ]
  },
  {
    id: 'R-1002',
    user: 'Sarah Smith',
    email: 'sarah@example.com',
    phone: '+1 987 654 3210',
    product: 'Nintendo Switch OLED',
    productId: 'NSW-OLED-001',
    image: 'https://images.unsplash.com/photo-1578303512597-81e6cc155b3e?auto=format&fit=crop&q=80&w=200',
    startDate: '2023-10-20',
    endDate: '2023-10-27',
    totalPrice: 105.00,
    deposit: 150.00,
    lateFees: 20.00,
    status: 'late',
    timeline: [
      { status: 'pending', timestamp: '2023-10-19 11:00 AM', note: 'Booking initialized' },
      { status: 'active', timestamp: '2023-10-20 09:00 AM', note: 'Hardware deployed' },
      { status: 'late', timestamp: '2023-10-28 12:00 AM', note: 'Return window exceeded' }
    ],
    transactions: [
      { id: 'TXN-1002-A', type: 'payment', amount: 105.00, date: '2023-10-19', status: 'completed' },
      { id: 'TXN-1002-B', type: 'deposit', amount: 150.00, date: '2023-10-19', status: 'completed' },
      { id: 'TXN-1002-C', type: 'fee', amount: 20.00, date: '2023-10-28', status: 'pending' }
    ]
  },
  {
    id: 'R-1003',
    user: 'Mike Johnson',
    email: 'mike@example.com',
    phone: '+1 555 012 3456',
    product: 'Xbox Series X',
    productId: 'XSX-001',
    image: 'https://images.unsplash.com/photo-1621259182902-3b836c824e22?auto=format&fit=crop&q=80&w=200',
    startDate: '2023-10-15',
    endDate: '2023-10-18',
    totalPrice: 60.00,
    deposit: 200.00,
    lateFees: 0,
    status: 'completed',
    timeline: [
      { status: 'pending', timestamp: '2023-10-14 04:00 PM', note: 'Booking initialized' },
      { status: 'active', timestamp: '2023-10-15 01:00 PM', note: 'Hardware deployed' },
      { status: 'completed', timestamp: '2023-10-18 05:00 PM', note: 'Hardware returned and inspected' }
    ],
    transactions: [
      { id: 'TXN-1003-A', type: 'payment', amount: 60.00, date: '2023-10-14', status: 'completed' },
      { id: 'TXN-1003-B', type: 'deposit', amount: 200.00, date: '2023-10-14', status: 'completed' },
      { id: 'TXN-1003-C', type: 'refund', amount: 200.00, date: '2023-10-18', status: 'completed' }
    ]
  }
];

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

  useEffect(() => {
    const q = query(collection(db, 'rentals'), orderBy('startDate', 'desc'));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const fetchedRentals = snapshot.docs.map(doc => ({
        ...doc.data(),
        id: doc.id
      })) as Rental[];
      setRentals(fetchedRentals);
      setLoading(false);
    });
    return () => unsubscribe();
  }, []);

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
  };

  const [completedTasks, setCompletedTasks] = useState<string[]>([]);

  const handleStatusChange = async (id: string, newStatus: RentalStatus) => {
    const rental = rentals.find(r => r.id === id);
    if (!rental) return;

    if (newStatus === 'completed') {
      setCompletedTasks(prev => [...prev, id]);
      setTimeout(() => {
        setCompletedTasks(prev => prev.filter(taskId => taskId !== id));
      }, 1000);
    }

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
      return;
    }

    // Trigger Automations
    if (newStatus === 'active') {
      await automationService.triggerWorkflow('rental_confirmed', {
        rentalId: id,
        customerName: rental.user,
        productName: rental.product,
        startDate: rental.startDate,
        endDate: rental.endDate,
        email: rental.email,
        phone: rental.phone
      });
      notificationService.sendNotification('rental_confirmation', rental.email, {
        customerName: rental.user,
        rentalId: id,
        productName: rental.product,
        startDate: rental.startDate,
        endDate: rental.endDate
      });
    } else if (newStatus === 'late') {
      await automationService.triggerWorkflow('rental_late', {
        rentalId: id,
        customerName: rental.user,
        productName: rental.product,
        daysLate: differenceInDays(new Date(), parseISO(rental.endDate))
      });
    } else if (newStatus === 'completed') {
      notificationService.sendNotification('rental_return_confirmation', rental.email, {
        customerName: rental.user,
        rentalId: id,
        productName: rental.product
      });
    }
  };

  const handleManualNotification = (type: 'reminder' | 'penalty' | 'custom') => {
    if (!selectedRental) return;

    if (type === 'reminder') {
      notificationService.sendNotification('rental_reminder', selectedRental.email, {
        customerName: selectedRental.user,
        rentalId: selectedRental.id,
        endDate: selectedRental.endDate
      });
      alert(`Return reminder sent to ${selectedRental.user}`);
    } else if (type === 'penalty') {
      notificationService.sendNotification('rental_late', selectedRental.email, {
        customerName: selectedRental.user,
        rentalId: selectedRental.id,
        daysLate: differenceInDays(new Date(), parseISO(selectedRental.endDate))
      });
      alert(`Penalty notification sent to ${selectedRental.user}`);
    } else {
      alert(`Manual ${type} notification triggered for ${selectedRental.user}`);
    }
  };

  const handleAutoLateScan = async () => {
    const today = new Date();
    const overdueRentals = rentals.filter(r => 
      r.status === 'active' && 
      new Date(r.endDate) < today
    );

    if (overdueRentals.length === 0) {
      alert('Scanning Complete: No overdue rentals detected in current fleet.');
      return;
    }

    if (confirm(`Detected ${overdueRentals.length} overdue rentals. Initialize Late Protocol and notify customers?`)) {
      setLoading(true);
      for (const rental of overdueRentals) {
        await handleStatusChange(rental.id, 'late');
      }
      setLoading(false);
      alert(`Protocol Executed: ${overdueRentals.length} rentals updated to LATE status.`);
    }
  };

  const toggleSelection = (id: string) => {
    setSelectedIds(prev =>
      prev.includes(id) ? prev.filter(i => i !== id) : [...prev, id]
    );
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
    const csvHeader = 'Rental ID,Customer,Product,Start Date,End Date,Status,Total Price,Deposit,Late Fees\n';
    const csvContent = rentals.map(r =>
      `${r.id},${r.user},${r.product},${r.startDate},${r.endDate},${r.status},${r.totalPrice},${r.deposit},${r.lateFees}`
    ).join('\n');

    // Create a blob and simulate a download (purely visual for UI demonstration)
    const blob = new Blob([csvHeader + csvContent], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `Rental_Export_${new Date().toISOString().split('T')[0]}.csv`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const filteredRentals = rentals.filter(rental => {
    const matchesSearch =
      rental.user.toLowerCase().includes(search.toLowerCase()) ||
      rental.product.toLowerCase().includes(search.toLowerCase()) ||
      rental.id.toLowerCase().includes(search.toLowerCase());

    const matchesFilter = filter === 'all' || rental.status === filter;

    return matchesSearch && matchesFilter;
  });

  const sortedRentals = [...filteredRentals].sort((a, b) => {
    if (!sortConfig) return 0;

    const aValue = a[sortConfig.key];
    const bValue = b[sortConfig.key];

    if (aValue < bValue) return sortConfig.direction === 'asc' ? -1 : 1;
    if (aValue > bValue) return sortConfig.direction === 'asc' ? 1 : -1;
    return 0;
  });

  const requestSort = (key: keyof Rental) => {
    let direction: 'asc' | 'desc' = 'asc';
    if (sortConfig && sortConfig.key === key && sortConfig.direction === 'asc') {
      direction = 'desc';
    }
    setSortConfig({ key, direction });
  };

  const renderSortIcon = (key: keyof Rental) => {
    if (sortConfig?.key !== key) return <ChevronDown className="h-3 w-3 opacity-0 group-hover:opacity-50 transition-opacity" />;
    return sortConfig.direction === 'asc' ? <ChevronUp className="h-3 w-3 text-[#A855F7]" /> : <ChevronDown className="h-3 w-3 text-[#A855F7]" />;
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

    const dateFormat = "d";
    const rows = [];
    let days = [];
    let day = startDate;
    let formattedDate = "";

    const weekDays = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

    const header = (
      <div className="grid grid-cols-7 mb-2 border-b border-white/5 pb-2">
        {weekDays.map((d, i) => (
          <div key={i} className="text-center text-[10px] font-mono text-gray-500 uppercase tracking-widest">
            {d}
          </div>
        ))}
      </div>
    );

    while (day <= endDate) {
      for (let i = 0; i < 7; i++) {
        formattedDate = format(day, dateFormat);
        const cloneDay = day;

        const dayRentals = filteredRentals.filter(rental => {
          const start = parseISO(rental.startDate);
          const end = parseISO(rental.endDate);
          return isWithinInterval(cloneDay, { start, end });
        });

        days.push(
          <div
            key={day.toString()}
            className={`min-h-[120px] border border-white/5 p-2 transition-colors ${!isSameDay(day, monthStart) && !isWithinInterval(day, { start: monthStart, end: monthEnd })
              ? "bg-white/[0.01] opacity-30"
              : "bg-white/[0.02] hover:bg-white/[0.04]"
              }`}
          >
            <div className="text-right text-[10px] font-mono text-gray-600 mb-2">{formattedDate}</div>
            <div className="space-y-1">
              {dayRentals.map(rental => (
                <button
                  key={rental.id}
                  onClick={() => setSelectedRental(rental)}
                  className={`w-full text-left text-[9px] px-2 py-1 rounded border truncate transition-all font-mono uppercase tracking-tighter ${getStatusColor(rental.status)}`}
                  title={`${rental.product} - ${rental.user}`}
                >
                  {rental.user.split(' ')[0]} // {rental.product.substring(0, 10)}
                </button>
              ))}
            </div>
          </div>
        );
        day = new Date(day.setDate(day.getDate() + 1));
      }
      rows.push(
        <div className="grid grid-cols-7" key={day.toString()}>
          {days}
        </div>
      );
      days = [];
    }

    return (
      <div className="bg-[#0a0a0a] border border-white/10 rounded-2xl p-6 shadow-2xl">
        <div className="flex justify-between items-center mb-6">
          <div className="flex items-center space-x-4">
            <h2 className="text-2xl font-bold text-white tracking-tighter uppercase italic">
              {format(currentDate, "MMMM yyyy")}
            </h2>
            <div className="flex items-center space-x-1">
              <button onClick={prevMonth} className="p-2 hover:bg-white/5 rounded-lg text-gray-400 hover:text-white transition-all">
                <ChevronLeft className="h-5 w-5" />
              </button>
              <button onClick={nextMonth} className="p-2 hover:bg-white/5 rounded-lg text-gray-400 hover:text-white transition-all">
                <ChevronRight className="h-5 w-5" />
              </button>
            </div>
          </div>
          <div className="flex items-center space-x-3 text-[10px] font-mono text-gray-500 uppercase tracking-widest">
            <span className="flex items-center space-x-1"><div className="w-2 h-2 rounded-full bg-blue-500/50"></div><span>Active</span></span>
            <span className="flex items-center space-x-1"><div className="w-2 h-2 rounded-full bg-amber-500/50"></div><span>Pending</span></span>
            <span className="flex items-center space-x-1"><div className="w-2 h-2 rounded-full bg-red-500/50"></div><span>Late</span></span>
          </div>
        </div>
        {header}
        <div className="rounded-xl overflow-hidden border border-white/5">
          {rows}
        </div>
      </div>
    );
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
      {/* Stats Matrix */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="bg-[#0a0a0a] border border-white/10 p-6 rounded-2xl relative overflow-hidden group">
          <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:opacity-20 transition-opacity">
            <Activity className="h-12 w-12 text-[#A855F7]" />
          </div>
          <p className="text-gray-500 text-[10px] font-mono uppercase tracking-widest mb-1">Fleet Utilization</p>
          <div className="flex items-end space-x-2">
            <p className="text-3xl font-bold text-white tracking-tighter">88.4%</p>
            <span className="text-emerald-500 text-[10px] font-mono mb-1">+5.2%</span>
          </div>
          <div className="w-full bg-white/5 h-1 rounded-full mt-4 overflow-hidden">
            <motion.div
              initial={{ width: 0 }}
              animate={{ width: '88.4%' }}
              className="bg-[#A855F7] h-full shadow-[0_0_10px_#A855F7]"
            />
          </div>
        </div>
        <div className="bg-[#0a0a0a] border border-white/10 p-6 rounded-2xl">
          <p className="text-gray-500 text-[10px] font-mono uppercase tracking-widest mb-1">Active Rentals</p>
          <p className="text-3xl font-bold text-white tracking-tighter">{rentals.filter(r => r.status === 'active').length}</p>
          <p className="text-gray-600 text-[10px] font-mono mt-2 uppercase">Units in Field</p>
        </div>
        <div className="bg-[#0a0a0a] border border-white/10 p-6 rounded-2xl">
          <p className="text-gray-500 text-[10px] font-mono uppercase tracking-widest mb-1">Late Returns</p>
          <p className="text-3xl font-bold text-red-500 tracking-tighter">{rentals.filter(r => r.status === 'late').length}</p>
          <p className="text-gray-600 text-[10px] font-mono mt-2 uppercase">Requires Protocol</p>
        </div>
        <div className="bg-[#0a0a0a] border border-white/10 p-6 rounded-2xl">
          <p className="text-gray-500 text-[10px] font-mono uppercase tracking-widest mb-1">Pending Pickup</p>
          <p className="text-3xl font-bold text-amber-500 tracking-tighter">{rentals.filter(r => r.status === 'pending').length}</p>
          <p className="text-gray-600 text-[10px] font-mono mt-2 uppercase">Scheduled Matrix</p>
        </div>
      </div>

      {/* Fleet Utilization Heatmap (Power Tool) */}
      <div className="bg-[#0a0a0a] border border-white/10 rounded-2xl p-6">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h3 className="text-sm font-black uppercase tracking-widest text-white italic">Fleet Intelligence Heatmap</h3>
            <p className="text-[10px] font-mono text-gray-500 uppercase mt-1">Real-time availability matrix // 30-day projection</p>
          </div>
          <button 
            onClick={handleAutoLateScan}
            className="px-4 py-2 bg-red-500/10 border border-red-500/20 rounded-xl text-red-500 hover:bg-red-500 hover:text-white transition-all text-[10px] font-black uppercase tracking-widest flex items-center gap-2"
          >
            <ShieldCheck className="h-3.5 w-3.5" />
            Scan for Overdue
          </button>
        </div>
        
        <div className="grid grid-cols-5 md:grid-cols-10 gap-2">
          {Array.from({ length: 30 }).map((_, i) => {
            const date = new Date();
            date.setDate(date.getDate() + i);
            const activeOnDate = rentals.filter(r => {
              const start = new Date(r.startDate);
              const end = new Date(r.endDate);
              return date >= start && date <= end;
            }).length;
            
            const intensity = Math.min(activeOnDate * 20, 100);
            
            return (
              <div key={i} className="space-y-1">
                <div 
                  className="aspect-square rounded-lg border border-white/5 relative group cursor-help"
                  style={{ 
                    backgroundColor: activeOnDate > 0 ? `rgba(168, 85, 247, ${intensity / 100})` : 'rgba(255,255,255,0.02)',
                    boxShadow: activeOnDate > 5 ? '0 0 15px rgba(168, 85, 247, 0.3)' : 'none'
                  }}
                >
                  <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity bg-black/80 rounded-lg text-[8px] font-mono font-black">
                    {activeOnDate} OUT
                  </div>
                </div>
                <p className="text-[7px] font-mono text-gray-600 text-center uppercase">{date.getDate()}/{date.getMonth() + 1}</p>
              </div>
            );
          })}
        </div>
      </div>

      {/* Control Bar */}
      <div className="flex flex-col md:flex-row gap-4 bg-[#0a0a0a] p-4 rounded-2xl border border-white/10">
        <div className="relative flex-grow">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-500" />
          <input
            type="text"
            placeholder="Search rental matrix..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-10 pr-4 py-2 bg-black border border-white/10 rounded-xl text-white font-mono text-xs focus:outline-none focus:border-[#A855F7] w-full"
          />
        </div>
        <div className="flex items-center space-x-3 overflow-x-auto scrollbar-hide pb-2 md:pb-0">
          <Filter className="h-4 w-4 text-gray-500" />
          <select
            value={filter}
            onChange={(e) => setFilter(e.target.value)}
            className="bg-black border border-white/10 rounded-xl px-4 py-2 text-white font-mono text-xs focus:outline-none focus:border-[#A855F7]"
          >
            <option value="all">All Status</option>
            <option value="active">Active</option>
            <option value="pending">Pending</option>
            <option value="late">Late</option>
            <option value="completed">Completed</option>
          </select>

          <div className="h-6 w-px bg-white/10 mx-2"></div>

          <div className="flex bg-black rounded-xl p-1 border border-white/10">
            <button
              onClick={() => setViewMode('list')}
              className={`p-2 rounded-lg transition-all ${viewMode === 'list' ? 'bg-[#A855F7] text-black shadow-[0_0_10px_#A855F7]' : 'text-gray-500 hover:text-white'}`}
              title="List View"
            >
              <List className="h-4 w-4" />
            </button>
            <button
              onClick={() => setViewMode('calendar')}
              className={`p-2 rounded-lg transition-all ${viewMode === 'calendar' ? 'bg-[#A855F7] text-black shadow-[0_0_10px_#A855F7]' : 'text-gray-500 hover:text-white'}`}
              title="Calendar View"
            >
              <CalendarIcon className="h-4 w-4" />
            </button>
          </div>
          <button onClick={handleExportReport} className="flex items-center space-x-2 px-4 py-2 bg-[#A855F7]/10 text-[#A855F7] border border-[#A855F7]/30 rounded-xl text-[10px] font-mono font-bold uppercase tracking-widest hover:bg-[#A855F7]/20 transition-all">
            <Download size={14} />
            <span>Report</span>
          </button>
          <button
            onClick={() => setIsManualBookingOpen(true)}
            className="flex items-center space-x-2 px-4 py-2 bg-emerald-500 text-black rounded-xl text-[10px] font-mono font-bold uppercase tracking-widest hover:bg-emerald-400 transition-all shadow-[0_0_15px_rgba(16,185,129,0.3)]"
          >
            <Plus size={14} />
            <span>Manual Entry</span>
          </button>
        </div>
      </div>

      {/* Bulk Actions */}
      <AnimatePresence>
        {selectedIds.length > 0 && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            className="bg-[#A855F7]/10 border border-[#A855F7]/30 rounded-xl p-4 flex items-center justify-between"
          >
            <div className="flex items-center space-x-4">
              <span className="text-[10px] font-mono text-[#A855F7] uppercase font-bold tracking-widest">
                {selectedIds.length} Rentals Selected
              </span>
              <div className="h-4 w-px bg-[#A855F7]/30"></div>
              <div className="flex items-center space-x-2">
                <button
                  onClick={() => bulkUpdateStatus('active')}
                  className="px-3 py-1 bg-[#A855F7] text-black text-[9px] font-mono font-bold uppercase rounded hover:bg-[#9333EA] transition-all"
                >
                  Initiate
                </button>
                <button
                  onClick={() => bulkUpdateStatus('completed')}
                  className="px-3 py-1 bg-emerald-500 text-white text-[9px] font-mono font-bold uppercase rounded hover:bg-emerald-600 transition-all"
                >
                  Return
                </button>
                <button
                  onClick={() => bulkUpdateStatus('late')}
                  className="px-3 py-1 bg-red-500 text-white text-[9px] font-mono font-bold uppercase rounded hover:bg-red-600 transition-all"
                >
                  Flag Late
                </button>
              </div>
            </div>
            <button
              onClick={() => setSelectedIds([])}
              className="text-[9px] font-mono text-gray-500 uppercase hover:text-white"
            >
              Clear Selection
            </button>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Content Matrix */}
      {viewMode === 'list' ? (
        <div className="bg-[#0a0a0a] border border-white/10 rounded-2xl overflow-hidden shadow-2xl">
          <div className="overflow-x-auto">
            <table className="w-full text-left">
              <thead className="bg-white/[0.02] text-gray-500 text-[10px] font-mono uppercase tracking-widest">
                <tr>
                  <th className="px-6 py-4">
                    <input
                      type="checkbox"
                      checked={selectedIds.length === filteredRentals.length && filteredRentals.length > 0}
                      onChange={toggleAll}
                      className="rounded border-white/10 bg-black text-[#A855F7] focus:ring-[#A855F7]"
                    />
                  </th>
                  <th className="px-6 py-4 cursor-pointer hover:text-white transition-colors group" onClick={() => requestSort('id')}>
                    <div className="flex items-center space-x-1">
                      <span>Rental ID</span>
                      {renderSortIcon('id')}
                    </div>
                  </th>
                  <th className="px-6 py-4 cursor-pointer hover:text-white transition-colors group" onClick={() => requestSort('product')}>
                    <div className="flex items-center space-x-1">
                      <span>Hardware Asset</span>
                      {renderSortIcon('product')}
                    </div>
                  </th>
                  <th className="px-6 py-4 cursor-pointer hover:text-white transition-colors group" onClick={() => requestSort('user')}>
                    <div className="flex items-center space-x-1">
                      <span>Identity</span>
                      {renderSortIcon('user')}
                    </div>
                  </th>
                  <th className="px-6 py-4 cursor-pointer hover:text-white transition-colors group" onClick={() => requestSort('startDate')}>
                    <div className="flex items-center space-x-1">
                      <span>Temporal Range</span>
                      {renderSortIcon('startDate')}
                    </div>
                  </th>
                  <th className="px-6 py-4 cursor-pointer hover:text-white transition-colors group" onClick={() => requestSort('totalPrice')}>
                    <div className="flex items-center space-x-1">
                      <span>Valuation</span>
                      {renderSortIcon('totalPrice')}
                    </div>
                  </th>
                  <th className="px-6 py-4 cursor-pointer hover:text-white transition-colors group" onClick={() => requestSort('status')}>
                    <div className="flex items-center space-x-1">
                      <span>Protocol Status</span>
                      {renderSortIcon('status')}
                    </div>
                  </th>
                  <th className="px-6 py-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5 text-xs font-mono text-gray-400">
                {sortedRentals.map((rental) => (
                  <motion.tr
                    key={rental.id}
                    className={`hover:bg-white/[0.01] transition-colors group ${selectedIds.includes(rental.id) ? 'bg-[#A855F7]/5' : ''}`}
                    animate={completedTasks.includes(rental.id) ? {
                      backgroundColor: ['rgba(16, 185, 129, 0)', 'rgba(16, 185, 129, 0.2)', 'rgba(16, 185, 129, 0)'],
                      scale: [1, 1.02, 1],
                      transition: { duration: 0.8, ease: "easeInOut" }
                    } : {}}
                  >
                    <td className="px-6 py-4">
                      <input
                        type="checkbox"
                        checked={selectedIds.includes(rental.id)}
                        onChange={() => toggleSelection(rental.id)}
                        className="rounded border-white/10 bg-black text-[#A855F7] focus:ring-[#A855F7]"
                      />
                    </td>
                    <td className="px-6 py-4 text-[#A855F7] font-bold tracking-tighter">[{rental.id}]</td>
                    <td className="px-6 py-4">
                      <div className="flex items-center space-x-3">
                        <img src={rental.image} alt={rental.product} className="w-10 h-10 rounded object-cover border border-white/10" />
                        <span className="text-white uppercase font-bold tracking-tight">{rental.product}</span>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="text-gray-300 uppercase font-bold">{rental.user}</div>
                      <div className="text-[10px] text-gray-600">{rental.email}</div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex flex-col">
                        <span className="text-gray-300">{rental.startDate}</span>
                        <span className="text-gray-600 text-[10px]">to {rental.endDate}</span>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="text-gray-600 text-[10px]">Dep: {formatCurrency(rental.deposit)}</div>
                      <div className="text-white font-bold">{formatCurrency(rental.totalPrice)}</div>
                    </td>
                    <td className="px-6 py-4">
                      <span className={`px-2 py-0.5 text-[9px] font-bold rounded border uppercase tracking-tighter ${getStatusColor(rental.status)}`}>
                        {rental.status}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-right">
                      <div className="flex justify-end space-x-2">
                        {rental.status === 'pending' && (
                          <button
                            onClick={() => handleStatusChange(rental.id, 'active')}
                            className="p-2 bg-[#A855F7]/10 text-[#A855F7] hover:bg-[#A855F7]/20 border border-[#A855F7]/20 rounded transition-all"
                            title="Approve Protocol"
                          >
                            <CheckCircle className="h-4 w-4" />
                          </button>
                        )}
                        {rental.status === 'active' && (
                          <>
                            <button
                              onClick={() => handleStatusChange(rental.id, 'completed')}
                              className="p-2 bg-emerald-500/10 text-emerald-500 hover:bg-emerald-500/20 border border-emerald-500/20 rounded transition-all"
                              title="Complete Protocol"
                            >
                              <CheckCircle className="h-4 w-4" />
                            </button>
                            <button
                              onClick={() => handleStatusChange(rental.id, 'late')}
                              className="p-2 bg-red-500/10 text-red-500 hover:bg-red-500/20 border border-red-500/20 rounded transition-all"
                              title="Flag Late"
                            >
                              <Clock className="h-4 w-4" />
                            </button>
                          </>
                        )}
                        {rental.status === 'late' && (
                          <button
                            onClick={() => handleStatusChange(rental.id, 'completed')}
                            className="p-2 bg-amber-500/10 text-amber-500 hover:bg-amber-500/20 border border-amber-500/20 rounded transition-all"
                            title="Penalty Return"
                          >
                            <AlertTriangle className="h-4 w-4" />
                          </button>
                        )}
                        <button
                          onClick={() => setSelectedRental(rental)}
                          className="p-2 hover:bg-white/5 rounded transition-colors text-gray-600 hover:text-white border border-transparent hover:border-white/10"
                        >
                          <Zap className="h-4 w-4" />
                        </button>
                      </div>
                    </td>
                  </motion.tr>
                ))}
              </tbody>
            </table>
          </div>

          {filteredRentals.length === 0 && (
            <div className="text-center py-12 text-gray-600 font-mono text-xs uppercase tracking-widest">
              Rental Matrix Empty // No matching records
            </div>
          )}
        </div>
      ) : (
        renderCalendar()
      )}

      {/* Manual Booking Modal */}
      <AnimatePresence>
        {isManualBookingOpen && (
          <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/90 backdrop-blur-xl p-4">
            <motion.div
              initial={{ opacity: 0, scale: 0.9, y: 40 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.9, y: 40 }}
              className="bg-[#0a0a0a] border border-white/10 rounded-3xl w-full max-w-2xl overflow-hidden shadow-[0_0_100px_rgba(168,85,247,0.2)]"
            >
              <div className="p-8 border-b border-white/5 flex justify-between items-center bg-white/[0.01]">
                <div>
                  <h2 className="text-2xl font-black text-white italic uppercase tracking-tighter">Manual <span className="text-emerald-400">Entry</span></h2>
                  <p className="text-[10px] font-mono text-gray-500 uppercase tracking-widest mt-1">Direct_Database_Injection_Protocol</p>
                </div>
                <button onClick={() => setIsManualBookingOpen(false)} className="p-3 hover:bg-white/5 rounded-full transition-colors text-gray-500 hover:text-white">
                  <XCircle size={24} />
                </button>
              </div>

              <form onSubmit={handleManualBooking} className="p-8 space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="space-y-2">
                    <label className="text-[10px] font-mono font-bold text-gray-500 uppercase tracking-widest">Customer Identity</label>
                    <input
                      required
                      type="text"
                      placeholder="Full Name"
                      className="w-full bg-black border border-white/10 rounded-xl px-4 py-3 text-sm font-mono text-white focus:outline-none focus:border-emerald-500/50"
                      onChange={(e) => setManualForm({ ...manualForm, user: e.target.value })}
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-[10px] font-mono font-bold text-gray-500 uppercase tracking-widest">Contact Email</label>
                    <input
                      required
                      type="email"
                      placeholder="protocol@example.com"
                      className="w-full bg-black border border-white/10 rounded-xl px-4 py-3 text-sm font-mono text-white focus:outline-none focus:border-emerald-500/50"
                      onChange={(e) => setManualForm({ ...manualForm, email: e.target.value })}
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="space-y-2">
                    <label className="text-[10px] font-mono font-bold text-gray-500 uppercase tracking-widest">Hardware Asset</label>
                    <input
                      required
                      type="text"
                      placeholder="e.g. PS5 Pro"
                      className="w-full bg-black border border-white/10 rounded-xl px-4 py-3 text-sm font-mono text-white focus:outline-none focus:border-emerald-500/50"
                      onChange={(e) => setManualForm({ ...manualForm, product: e.target.value })}
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-[10px] font-mono font-bold text-gray-500 uppercase tracking-widest">Asset Serial/ID</label>
                    <input
                      required
                      type="text"
                      placeholder="SN-XXXX"
                      className="w-full bg-black border border-white/10 rounded-xl px-4 py-3 text-sm font-mono text-white focus:outline-none focus:border-emerald-500/50"
                      onChange={(e) => setManualForm({ ...manualForm, productId: e.target.value })}
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="space-y-2">
                    <label className="text-[10px] font-mono font-bold text-gray-500 uppercase tracking-widest">Deployment Date</label>
                    <input
                      required
                      type="date"
                      className="w-full bg-black border border-white/10 rounded-xl px-4 py-3 text-sm font-mono text-white focus:outline-none focus:border-emerald-500/50"
                      onChange={(e) => setManualForm({ ...manualForm, startDate: e.target.value })}
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-[10px] font-mono font-bold text-gray-500 uppercase tracking-widest">Return Date</label>
                    <input
                      required
                      type="date"
                      className="w-full bg-black border border-white/10 rounded-xl px-4 py-3 text-sm font-mono text-white focus:outline-none focus:border-emerald-500/50"
                      onChange={(e) => setManualForm({ ...manualForm, endDate: e.target.value })}
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                  <div className="space-y-2">
                    <label className="text-[10px] font-mono font-bold text-gray-500 uppercase tracking-widest">Valuation (₹)</label>
                    <input
                      required
                      type="number"
                      className="w-full bg-black border border-white/10 rounded-xl px-4 py-3 text-sm font-mono text-white focus:outline-none focus:border-emerald-500/50"
                      onChange={(e) => setManualForm({ ...manualForm, totalPrice: Number(e.target.value) })}
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-[10px] font-mono font-bold text-gray-500 uppercase tracking-widest">Collateral (₹)</label>
                    <input
                      required
                      type="number"
                      className="w-full bg-black border border-white/10 rounded-xl px-4 py-3 text-sm font-mono text-white focus:outline-none focus:border-emerald-500/50"
                      onChange={(e) => setManualForm({ ...manualForm, deposit: Number(e.target.value) })}
                    />
                  </div>
                  <div className="space-y-2 flex flex-col justify-end">
                    <button type="submit" className="w-full bg-emerald-500 text-black font-black uppercase italic tracking-tighter py-3 rounded-xl hover:bg-emerald-400 transition-all shadow-[0_0_20px_rgba(16,185,129,0.3)]">
                      Commit Entry
                    </button>
                  </div>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Rental Details Modal */}
      <AnimatePresence>
        {selectedRental && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-md p-4">
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              className="bg-[#0a0a0a] border border-white/10 rounded-2xl w-full max-w-4xl max-h-[90vh] overflow-hidden flex flex-col shadow-[0_0_50px_rgba(0,0,0,0.5)]"
            >
              <div className="p-6 border-b border-white/10 flex justify-between items-center bg-white/[0.02]">
                <div>
                  <div className="flex items-center space-x-2 mb-1">
                    <ShieldCheck className="h-3 w-3 text-[#A855F7]" />
                    <span className="text-[10px] font-mono text-[#A855F7] uppercase tracking-widest">Rental_Protocol_Active</span>
                  </div>
                  <h2 className="text-2xl font-bold text-white tracking-tighter uppercase italic">
                    Rental <span className="text-[#A855F7]">[{selectedRental.id}]</span>
                  </h2>
                </div>
                <div className="flex items-center space-x-2">
                  <button
                    onClick={handleEditToggle}
                    className={`p-2 rounded-full transition-colors ${isEditing ? 'bg-[#A855F7]/20 text-[#A855F7]' : 'hover:bg-white/5 text-gray-500 hover:text-white'}`}
                    title={isEditing ? "Save Changes" : "Edit Rental"}
                  >
                    {isEditing ? <Save className="h-5 w-5" /> : <Edit2 className="h-5 w-5" />}
                  </button>
                  <button
                    onClick={closeRentalModal}
                    className="p-2 hover:bg-white/5 rounded-full transition-colors text-gray-500 hover:text-white"
                  >
                    <XCircle className="h-6 w-6" />
                  </button>
                </div>
              </div>

              <div className="flex-grow overflow-y-auto p-8 space-y-8">
                {/* Status & Quick Actions */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                  <div className="md:col-span-2 flex flex-col gap-4 p-6 bg-white/[0.02] rounded-2xl border border-white/5">
                    <div className="flex flex-wrap items-center justify-between w-full">
                      <div className="space-y-1">
                        <span className="text-[10px] font-mono text-gray-500 uppercase block">Current Protocol Status</span>
                        <span className={`px-4 py-1 text-xs font-bold rounded border uppercase tracking-widest inline-block ${getStatusColor(selectedRental.status)}`}>
                          {selectedRental.status}
                        </span>
                      </div>
                      <div className="flex space-x-2">
                        {/* Manual Notification Triggers */}
                        <button
                          onClick={() => handleManualNotification('reminder')}
                          className="p-2 bg-blue-500/10 text-blue-500 border border-blue-500/20 hover:bg-blue-500/20 transition-colors rounded-xl flex items-center justify-center"
                          title="Manually Send Return Reminder"
                        >
                          <Mail className="h-4 w-4" />
                        </button>
                        <button
                          onClick={() => handleManualNotification('penalty')}
                          className="p-2 bg-red-500/10 text-red-500 border border-red-500/20 hover:bg-red-500/20 transition-colors rounded-xl flex items-center justify-center"
                          title="Send Late Penalty Alert"
                        >
                          <AlertTriangle className="h-4 w-4" />
                        </button>
                      </div>
                    </div>
                    <div className="w-full h-px bg-white/10 hidden md:block my-2"></div>
                    <div className="flex flex-wrap gap-2 w-full">
                      {selectedRental.status === 'pending' && (
                        <button
                          onClick={() => handleStatusChange(selectedRental.id, 'active')}
                          className="px-4 py-2 bg-[#A855F7] text-black rounded-xl font-bold hover:bg-[#9333EA] transition-all text-[10px] font-mono uppercase tracking-widest"
                        >
                          Initiate Deployment
                        </button>
                      )}
                      {selectedRental.status === 'active' && (
                        <>
                          <button
                            onClick={() => handleStatusChange(selectedRental.id, 'completed')}
                            className="px-4 py-2 bg-emerald-500 text-white rounded-xl font-bold hover:bg-emerald-600 transition-all text-[10px] font-mono uppercase tracking-widest flex items-center"
                          >
                            <CheckCircle className="mr-2 h-3 w-3" /> Return Asset
                          </button>
                          <button
                            onClick={() => handleStatusChange(selectedRental.id, 'late')}
                            className="px-4 py-2 bg-red-500/10 border border-red-500/20 text-red-500 rounded-xl font-bold hover:bg-red-500/20 transition-all text-[10px] font-mono uppercase tracking-widest"
                          >
                            Flag Late
                          </button>
                        </>
                      )}
                      {selectedRental.status === 'late' && (
                        <button
                          onClick={() => handleStatusChange(selectedRental.id, 'completed')}
                          className="px-4 py-2 bg-amber-500 text-white rounded-xl font-bold hover:bg-amber-600 transition-all text-[10px] font-mono uppercase tracking-widest flex items-center"
                        >
                          <AlertTriangle className="mr-2 h-3 w-3" /> Penalty Return
                        </button>
                      )}
                    </div>
                  </div>
                  <div className="p-6 bg-white/[0.02] rounded-2xl border border-white/5 flex flex-col justify-center">
                    <span className="text-[10px] font-mono text-gray-500 uppercase block mb-2">Live Tracking Status</span>
                    <div className="flex items-center justify-between">
                      <div className="flex items-center space-x-2">
                        <div className={`w-2 h-2 rounded-full ${selectedRental.status === 'active' ? 'bg-[#00d4ff] animate-pulse shadow-[0_0_8px_#00d4ff]' : 'bg-gray-600'}`}></div>
                        <span className="text-white font-mono text-xs font-bold uppercase">{selectedRental.status === 'active' ? 'Position_Locked' : 'Stationary_Storage'}</span>
                      </div>
                      <MapPin className={`h-3 w-3 ${selectedRental.status === 'active' ? 'text-[#00d4ff]' : 'text-gray-600'}`} />
                    </div>
                  </div>
                </div>

                {/* Real-Time Tracking Visualization */}
                {selectedRental.status === 'active' && (
                  <div className="space-y-4">
                    <h3 className="text-xs font-mono font-bold text-gray-500 uppercase tracking-[0.3em] flex items-center">
                      <MapPin className="mr-2 h-3 w-3 text-[#00d4ff]" /> Live_Asset_Tracking
                    </h3>
                    <div className="h-64 bg-white/[0.02] rounded-2xl border border-white/5 relative overflow-hidden group">
                      <div className="absolute inset-0 bg-[#050505] opacity-40"></div>
                      {/* Simulated Tech Map Grid */}
                      <div className="absolute inset-0" style={{ backgroundImage: 'radial-gradient(#1a1a1a 1px, transparent 1px)', backgroundSize: '20px 20px' }}></div>

                      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2">
                        <div className="relative">
                          <div className="absolute inset-0 bg-[#00d4ff]/20 rounded-full animate-ping scale-150"></div>
                          <div className="relative z-10 w-12 h-12 bg-[#00d4ff]/10 border border-[#00d4ff]/50 rounded-full flex items-center justify-center backdrop-blur-sm">
                            <Zap className="h-5 w-5 text-[#00d4ff] animate-pulse" />
                          </div>
                        </div>
                      </div>

                      <div className="absolute bottom-4 left-4 right-4 bg-black/60 backdrop-blur-md p-4 rounded-xl border border-white/10 flex justify-between items-center">
                        <div className="space-y-1">
                          <p className="text-[10px] font-mono text-gray-500 uppercase">Estimated Position</p>
                          <p className="text-xs font-bold text-white uppercase tracking-tight">Cyber-District, Zone 7b // Transit</p>
                        </div>
                        <div className="text-right space-y-1">
                          <p className="text-[10px] font-mono text-gray-500 uppercase">Signal Strength</p>
                          <div className="flex gap-0.5">
                            {[1, 2, 3, 4, 5].map(i => <div key={i} className={`w-1 h-3 rounded-sm ${i < 5 ? 'bg-emerald-500' : 'bg-white/10'}`}></div>)}
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                )}

                <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                  {/* Identity & Asset */}
                  <div className="space-y-6">
                    <div className="space-y-4">
                      <h3 className="text-xs font-mono font-bold text-gray-500 uppercase tracking-[0.3em] flex items-center">
                        <User className="mr-2 h-3 w-3 text-[#A855F7]" /> Customer_Identity
                      </h3>
                      <div className="bg-white/[0.02] p-6 rounded-2xl border border-white/5 space-y-3">
                        <div className="flex justify-between items-center">
                          {isEditing ? (
                            <input
                              type="text"
                              value={editForm.user || ''}
                              onChange={(e) => handleEditChange('user', e.target.value)}
                              className="w-full bg-black border border-white/10 rounded px-2 py-1 text-white font-bold text-lg focus:outline-none focus:border-[#A855F7]"
                              placeholder="Customer Name"
                            />
                          ) : (
                            <span className="text-white font-bold text-lg tracking-tight uppercase">{selectedRental.user}</span>
                          )}
                          {!isEditing && <Mail className="h-4 w-4 text-gray-600 hover:text-white cursor-pointer transition-colors" />}
                        </div>
                        {isEditing ? (
                          <input
                            type="email"
                            value={editForm.email || ''}
                            onChange={(e) => handleEditChange('email', e.target.value)}
                            className="w-full bg-black border border-white/10 rounded px-2 py-1 text-gray-400 font-mono text-xs focus:outline-none focus:border-[#A855F7]"
                            placeholder="Email Address"
                          />
                        ) : (
                          <p className="text-gray-500 font-mono text-xs">{selectedRental.email}</p>
                        )}
                        {isEditing ? (
                          <input
                            type="text"
                            value={editForm.phone || ''}
                            onChange={(e) => handleEditChange('phone', e.target.value)}
                            className="w-full bg-black border border-white/10 rounded px-2 py-1 text-gray-400 font-mono text-xs focus:outline-none focus:border-[#A855F7]"
                            placeholder="Phone Number"
                          />
                        ) : (
                          <p className="text-gray-500 font-mono text-xs">{selectedRental.phone}</p>
                        )}
                      </div>
                    </div>

                    <div className="space-y-4">
                      <h3 className="text-xs font-mono font-bold text-gray-500 uppercase tracking-[0.3em] flex items-center">
                        <Package className="mr-2 h-3 w-3 text-[#A855F7]" /> Hardware_Asset
                      </h3>
                      <div className="bg-white/[0.02] p-6 rounded-2xl border border-white/5 flex items-center space-x-4">
                        <img src={selectedRental.image} alt={selectedRental.product} className="w-16 h-16 rounded-lg object-cover border border-white/10" />
                        <div>
                          <p className="text-white font-bold uppercase tracking-tight">{selectedRental.product}</p>
                          <p className="text-gray-500 font-mono text-[10px] uppercase">{selectedRental.productId}</p>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Timeline & Notes */}
                  <div className="space-y-6">
                    <div className="space-y-4">
                      <h3 className="text-xs font-mono font-bold text-gray-500 uppercase tracking-[0.3em] flex items-center">
                        <Clock className="mr-2 h-3 w-3 text-[#A855F7]" /> Event_Log
                      </h3>
                      <div className="bg-white/[0.02] p-6 rounded-2xl border border-white/5 space-y-6">
                        {selectedRental.timeline.map((event, idx) => (
                          <div key={idx} className="flex gap-4 relative">
                            {idx !== selectedRental.timeline.length - 1 && (
                              <div className="absolute left-[5px] top-4 bottom-[-24px] w-px bg-white/10"></div>
                            )}
                            <div className={`w-2.5 h-2.5 rounded-full mt-1 z-10 ${idx === selectedRental.timeline.length - 1 ? 'bg-[#A855F7] shadow-[0_0_8px_#A855F7]' : 'bg-gray-700'
                              }`}></div>
                            <div className="space-y-1">
                              <p className="text-white text-[10px] font-bold uppercase tracking-tight">{event.note}</p>
                              <p className="text-[9px] font-mono text-gray-600 uppercase">{event.timestamp}</p>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>

                    <div className="space-y-4">
                      <h3 className="text-xs font-mono font-bold text-gray-500 uppercase tracking-[0.3em] flex items-center">
                        <ClipboardList className="mr-2 h-3 w-3 text-[#A855F7]" /> Internal_Notes
                      </h3>
                      <textarea
                        placeholder="Add internal protocol notes..."
                        className="w-full bg-white/[0.02] border border-white/5 rounded-2xl p-4 text-[10px] font-mono text-gray-400 focus:outline-none focus:border-[#A855F7]/30 min-h-[100px] resize-none"
                      />
                    </div>
                  </div>
                </div>

                {/* Financial Manifest */}
                {/* Financial Manifest */}
                <div className="space-y-4">
                  <h3 className="text-xs font-mono font-bold text-gray-500 uppercase tracking-[0.3em] flex items-center">
                    <DollarSign className="mr-2 h-3 w-3 text-[#A855F7]" /> Financial_Manifest
                  </h3>
                  <div className="bg-white/[0.02] rounded-2xl border border-white/5 p-6 space-y-6">
                    <div className="grid grid-cols-3 gap-8 pb-6 border-b border-white/5">
                      <div>
                        <span className="text-[10px] font-mono text-gray-500 uppercase block mb-1">Rental Total</span>
                        {isEditing ? (
                          <input
                            type="number"
                            value={editForm.totalPrice || 0}
                            onChange={(e) => handleEditChange('totalPrice', parseFloat(e.target.value))}
                            className="bg-black border border-white/10 rounded px-2 py-1 text-white font-bold text-xl tracking-tighter w-full focus:outline-none focus:border-[#A855F7]"
                          />
                        ) : (
                          <span className="text-white font-bold text-xl tracking-tighter">{formatCurrency(selectedRental.totalPrice)}</span>
                        )}
                      </div>
                      <div>
                        <span className="text-[10px] font-mono text-gray-500 uppercase block mb-1">Security Deposit</span>
                        {isEditing ? (
                          <input
                            type="number"
                            value={editForm.deposit || 0}
                            onChange={(e) => handleEditChange('deposit', parseFloat(e.target.value))}
                            className="bg-black border border-white/10 rounded px-2 py-1 text-[#A855F7] font-bold text-xl tracking-tighter w-full focus:outline-none focus:border-[#A855F7]"
                          />
                        ) : (
                          <span className="text-[#A855F7] font-bold text-xl tracking-tighter">{formatCurrency(selectedRental.deposit)}</span>
                        )}
                      </div>
                      <div>
                        <span className="text-[10px] font-mono text-gray-500 uppercase block mb-1">Late Penalties</span>
                        {isEditing ? (
                          <input
                            type="number"
                            value={editForm.lateFees || 0}
                            onChange={(e) => handleEditChange('lateFees', parseFloat(e.target.value))}
                            className="bg-black border border-white/10 rounded px-2 py-1 text-red-500 font-bold text-xl tracking-tighter w-full focus:outline-none focus:border-[#A855F7]"
                          />
                        ) : (
                          <span className="text-red-500 font-bold text-xl tracking-tighter">{formatCurrency(selectedRental.lateFees)}</span>
                        )}
                      </div>
                    </div>

                    <div className="space-y-4">
                      <h4 className="text-[10px] font-mono text-gray-400 uppercase tracking-widest flex items-center justify-between">
                        <span>Transaction Ledger</span>
                        <div className="flex gap-2">
                          <button className="px-2 py-1 bg-white/5 hover:bg-white/10 rounded text-[9px] text-[#A855F7] transition-all">Add Fee</button>
                          <button className="px-2 py-1 bg-white/5 hover:bg-white/10 rounded text-[9px] text-emerald-500 transition-all">Process Refund</button>
                        </div>
                      </h4>
                      <div className="space-y-2">
                        {selectedRental.transactions && selectedRental.transactions.map(txn => (
                          <div key={txn.id} className="flex justify-between items-center bg-black/50 p-3 rounded-xl border border-white/5 hover:border-white/10 transition-colors group">
                            <div className="flex items-center space-x-3">
                              <div className={`p-1.5 rounded-lg ${txn.type === 'payment' ? 'bg-blue-500/10 text-blue-500' :
                                txn.type === 'deposit' ? 'bg-[#A855F7]/10 text-[#A855F7]' :
                                  txn.type === 'fee' ? 'bg-red-500/10 text-red-500' :
                                    'bg-emerald-500/10 text-emerald-500'
                                }`}>
                                <DollarSign size={12} />
                              </div>
                              <div>
                                <span className="text-xs font-mono text-white uppercase">{txn.type}</span>
                                <div className="text-[9px] text-gray-600 font-mono">[{txn.id}] // {txn.date}</div>
                              </div>
                            </div>
                            <div className="text-right">
                              <span className="text-sm font-mono font-bold text-white block">{formatCurrency(txn.amount)}</span>
                              <span className={`text-[8px] font-mono uppercase tracking-widest ${txn.status === 'completed' ? 'text-emerald-500' :
                                txn.status === 'pending' ? 'text-amber-500' : 'text-red-500'
                                }`}>
                                {txn.status}
                              </span>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                </div>

                {/* Asset History */}
                <div className="space-y-4">
                  <h3 className="text-xs font-mono font-bold text-gray-500 uppercase tracking-[0.3em] flex items-center">
                    <History className="mr-2 h-3 w-3 text-[#A855F7]" /> Asset_History
                  </h3>
                  <div className="bg-white/[0.02] rounded-2xl border border-white/5 p-6 space-y-4">
                    <div className="flex justify-between items-center pb-4 border-b border-white/5">
                      <div>
                        <span className="text-[10px] font-mono text-gray-500 uppercase block mb-1">Total Rentals</span>
                        <span className="text-white font-bold text-lg tracking-tighter">12</span>
                      </div>
                      <div>
                        <span className="text-[10px] font-mono text-gray-500 uppercase block mb-1">Last Maintenance</span>
                        <span className="text-[#A855F7] font-bold text-lg tracking-tighter">2023-09-15</span>
                      </div>
                      <div>
                        <span className="text-[10px] font-mono text-gray-500 uppercase block mb-1">Current Condition</span>
                        <span className="text-emerald-500 font-bold text-lg tracking-tighter">Good</span>
                      </div>
                    </div>

                    <div className="space-y-3">
                      <h4 className="text-[10px] font-mono text-gray-400 uppercase tracking-widest">Recent Activity</h4>
                      <div className="space-y-2">
                        <div className="flex justify-between items-center bg-black/50 p-3 rounded-lg border border-white/5">
                          <div className="flex items-center space-x-3">
                            <div className="w-2 h-2 rounded-full bg-blue-500"></div>
                            <span className="text-xs font-mono text-white uppercase">Rented to John Doe</span>
                          </div>
                          <span className="text-[10px] font-mono text-gray-500">2023-09-20 to 2023-09-25</span>
                        </div>
                        <div className="flex justify-between items-center bg-black/50 p-3 rounded-lg border border-white/5">
                          <div className="flex items-center space-x-3">
                            <div className="w-2 h-2 rounded-full bg-amber-500"></div>
                            <span className="text-xs font-mono text-white uppercase">Routine Maintenance</span>
                          </div>
                          <span className="text-[10px] font-mono text-gray-500">2023-09-15</span>
                        </div>
                        <div className="flex justify-between items-center bg-black/50 p-3 rounded-lg border border-white/5">
                          <div className="flex items-center space-x-3">
                            <div className="w-2 h-2 rounded-full bg-emerald-500"></div>
                            <span className="text-xs font-mono text-white uppercase">Returned from Jane Smith</span>
                          </div>
                          <span className="text-[10px] font-mono text-gray-500">2023-09-10</span>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              <div className="p-6 bg-white/[0.02] border-t border-white/10 flex justify-end space-x-3">
                <button
                  className="px-6 py-2 bg-white/5 text-gray-400 rounded-xl font-mono text-[10px] uppercase tracking-widest hover:bg-white/10 transition-colors border border-white/5"
                >
                  Print Agreement
                </button>
                <button
                  onClick={() => setSelectedRental(null)}
                  className="px-6 py-2 bg-[#A855F7] text-black rounded-xl font-bold font-mono text-[10px] uppercase tracking-widest hover:bg-[#9333EA] transition-all"
                >
                  Close Matrix
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
