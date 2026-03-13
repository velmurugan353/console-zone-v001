import React, { useState, useMemo, useEffect } from 'react';
import { 
  Plus, 
  Search, 
  Filter, 
  Edit2, 
  Trash2, 
  AlertTriangle, 
  CheckCircle2, 
  Clock, 
  MapPin, 
  Package, 
  Download, 
  Upload,
  QrCode,
  RefreshCw,
  MoreVertical,
  ArrowRight,
  Shield,
  Zap,
  History,
  Wrench,
  Calendar,
  Box,
  LayoutGrid,
  LayoutList,
  XCircle,
  MoreHorizontal,
  ChevronRight,
  ChevronDown,
  ChevronUp,
  Activity,
  Wallet,
  DollarSign
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { formatCurrency, cn } from '../../lib/utils';
import { db } from '../../lib/firebase';
import { 
  collection, 
  onSnapshot, 
  query, 
  doc, 
  updateDoc, 
  deleteDoc, 
  addDoc, 
  serverTimestamp,
  orderBy,
  where
} from 'firebase/firestore';
import { format } from 'date-fns';

type InventoryStatus = 'Available' | 'Rented' | 'Maintenance' | 'Retired';

interface MaintenanceRecord {
  date: string;
  type: string;
  technician: string;
  notes: string;
  cost: number;
}

interface RentalHistoryRecord {
  id: string;
  customer: string;
  startDate: string;
  endDate: string;
  revenue: number;
}

interface TransferRecord {
  date: string;
  from: string;
  to: string;
  reason: string;
  authorizedBy: string;
}

interface InventoryItem {
  id: string;
  name: string;
  category: string;
  status: InventoryStatus;
  health: number;
  lastService: string;
  location: string;
  serialNumber: string;
  purchaseDate: string;
  maintenanceHistory: MaintenanceRecord[];
  rentalHistory: RentalHistoryRecord[];
  usageCount: number; // Added for automation
  basePricePerDay: number;
  dynamicPricingEnabled: boolean;
  image: string;
  purchasePrice: number;
  totalRevenue: number;
  kitRequired: string[];
  kitStatus: Record<string, boolean>;
  conditionLogs: { date: string; photoUrl: string; notes: string }[];
  transferHistory: TransferRecord[];
  warrantyExpiry: string;
  insurancePolicy: string;
  insuranceExpiry: string;
  depreciationRate: number;
  firmwareVersion?: string;
  qrCode?: string;
}

export default function AdminInventory() {
  const [inventory, setInventory] = useState<InventoryItem[]>([]);
  const [products, setProducts] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<'All' | InventoryStatus>('All');
  const [isAdding, setIsAdding] = useState(false);
  const [selectedItem, setSelectedItem] = useState<InventoryItem | null>(null);
  const [isScanning, setIsScanning] = useState(false);
  const [viewMode, setViewMode] = useState<'grid' | 'table'>('grid');
  const [activeTab, setActiveTab] = useState<'overview' | 'maintenance' | 'history' | 'specs' | 'warranty'>('overview');
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [showBulkPanel, setShowBulkPanel] = useState(false);
  const [showScheduleModal, setShowScheduleModal] = useState(false);
  const [editForm, setEditForm] = useState<Partial<InventoryItem>>({});

  useEffect(() => {
    const q = query(collection(db, 'inventory'), orderBy('purchaseDate', 'desc'));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const items = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })) as InventoryItem[];
      setInventory(items);
      setLoading(false);
    }, (error) => {
      console.error("Firestore error in AdminInventory:", error);
      setLoading(false);
    });

    const pq = query(collection(db, 'products'), where('type', '==', 'rental'));
    const pUnsubscribe = onSnapshot(pq, (snapshot) => {
      setProducts(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
    });

    return () => {
      unsubscribe();
      pUnsubscribe();
    };
  }, []);

  const handleSeedInventory = async () => {
    if (!confirm("Initialize hardware matrix seeding protocol?")) return;
    
    const consoleDefs = [
      { id: 'ps5', name: 'Sony PlayStation 5', category: 'Console', count: 5, price: 900, val: 49999 },
      { id: 'xbox', name: 'Xbox Series X', category: 'Console', count: 3, price: 800, val: 44999 },
      { id: 'switch', name: 'Nintendo Switch OLED', category: 'Console', count: 4, price: 600, val: 32999 },
      { id: 'vr', name: 'Meta Quest 3', category: 'VR Gear', count: 2, price: 1200, val: 45999 }
    ];

    try {
      setLoading(true);
      for (const consoleDef of consoleDefs) {
        for (let i = 0; i < consoleDef.count; i++) {
          const newItem: Omit<InventoryItem, 'id'> = {
            name: consoleDef.name,
            category: consoleDef.category,
            status: 'Available',
            health: 100,
            usageCount: 0,
            lastService: new Date().toLocaleDateString(),
            location: 'Secure_Bay_Alpha',
            serialNumber: `SN-${consoleDef.id.toUpperCase()}-${Math.random().toString(36).substring(7).toUpperCase()}`,
            purchaseDate: new Date().toISOString(),
            maintenanceHistory: [],
            rentalHistory: [],
            basePricePerDay: consoleDef.price,
            dynamicPricingEnabled: true,
            image: '',
            purchasePrice: consoleDef.val,
            totalRevenue: 0,
            kitRequired: ['Console', 'Controller', 'HDMI 2.1', 'Power Lead'],
            kitStatus: { 'Console': true, 'Controller': true, 'HDMI 2.1': true, 'Power Lead': true },
            conditionLogs: [],
            transferHistory: [],
            warrantyExpiry: new Date(Date.now() + 31536000000).toISOString(),
            insurancePolicy: 'POLICY-GZ-2024',
            insuranceExpiry: new Date(Date.now() + 31536000000).toISOString(),
            depreciationRate: 10
          };
          await addDoc(collection(db, 'inventory'), newItem);
        }
      }
      alert('Fleet provisioned successfully.');
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  const handleStatusUpdate = async (id: string, newStatus: InventoryStatus) => {
    try {
      await updateDoc(doc(db, 'inventory', id), { status: newStatus });
    } catch (e) {
      console.error(e);
    }
  };

  const handleDeleteAsset = async (id: string) => {
    if (!confirm("Decommission this asset from the matrix?")) return;
    await deleteDoc(doc(db, 'inventory', id));
  };

  const toggleSelectItem = (id: string) => {
    setSelectedIds(prev => prev.includes(id) ? prev.filter(i => i !== id) : [...prev, id]);
  };

  const toggleSelectAll = () => {
    if (selectedIds.length === filteredInventory.length) {
      setSelectedIds([]);
    } else {
      setSelectedIds(filteredInventory.map(i => i.id));
    }
  };

  const handleClearAll = async () => {
    if (!confirm("WARNING: Destructive Protocol. Terminate all entries in the Asset Matrix?")) return;
    for (const item of inventory) {
      await deleteDoc(doc(db, 'inventory', item.id));
    }
  };

  const handleBulkStatusUpdate = async (status: InventoryStatus) => {
    for (const id of selectedIds) {
      await updateDoc(doc(db, 'inventory', id), { status });
    }
    setSelectedIds([]);
    setShowBulkPanel(false);
  };

  const handleBulkDelete = async () => {
    if (!confirm(`Decommission ${selectedIds.length} assets?`)) return;
    for (const id of selectedIds) {
      await deleteDoc(doc(db, 'inventory', id));
    }
    setSelectedIds([]);
    setShowBulkPanel(false);
  };

  const handleBulkExport = () => {
    alert("Exporting selected node data...");
  };

  const handleImportCSV = (e: React.ChangeEvent<HTMLInputElement>) => {
    alert("CSV ingestion logic not yet initialized.");
  };

  const filteredInventory = inventory.filter(item => {
    const matchesSearch = item.name.toLowerCase().includes(search.toLowerCase()) || 
                         item.serialNumber.toLowerCase().includes(search.toLowerCase()) ||
                         item.id.toLowerCase().includes(search.toLowerCase());
    const matchesStatus = statusFilter === 'All' || item.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  const scheduledMaintenances = useMemo(() => {
    return inventory.filter(item => item.health < 80 || item.status === 'Maintenance');
  }, [inventory]);

  const StatusBadge = ({ status }: { status: InventoryStatus }) => {
    const styles = {
      'Available': 'bg-emerald-500/10 text-emerald-500 border-emerald-500/20',
      'Rented': 'bg-blue-500/10 text-blue-500 border-blue-500/20',
      'Maintenance': 'bg-amber-500/10 text-amber-500 border-amber-500/20',
      'Retired': 'bg-red-500/10 text-red-500 border-red-500/20'
    };
    return (
      <span className={`px-2 py-0.5 rounded text-[8px] font-black uppercase tracking-widest border ${styles[status]}`}>
        {status}
      </span>
    );
  };

  const HealthBar = ({ health }: { health: number }) => {
    const color = health > 90 ? 'bg-emerald-500' : health > 70 ? 'bg-amber-500' : 'bg-red-500';
    return (
      <div className="w-full h-1 bg-white/5 rounded-full overflow-hidden">
        <motion.div 
          initial={{ width: 0 }}
          animate={{ width: `${health}%` }}
          className={`${color} h-full shadow-[0_0_8px_rgba(var(--accent-rgb),0.5)]`}
        />
      </div>
    );
  };

  const handleAddAsset = async (e: React.FormEvent) => {
    e.preventDefault();
    const newItem: Omit<InventoryItem, 'id'> = {
      name: editForm.name || '',
      category: editForm.category || 'Console',
      status: 'Available',
      health: 100,
      usageCount: 0,
      lastService: new Date().toLocaleDateString(),
      location: 'Secure_Bay_Alpha',
      serialNumber: editForm.serialNumber || `SN-${Math.random().toString(36).substring(7).toUpperCase()}`,
      purchaseDate: new Date().toISOString(),
      maintenanceHistory: [],
      rentalHistory: [],
      basePricePerDay: editForm.basePricePerDay || 0,
      dynamicPricingEnabled: true,
      image: editForm.image || '',
      purchasePrice: editForm.purchasePrice || 0,
      totalRevenue: 0,
      kitRequired: ['Console', 'Controller', 'Power Lead'],
      kitStatus: { 'Console': true, 'Controller': true, 'Power Lead': true },
      conditionLogs: [],
      transferHistory: [],
      warrantyExpiry: new Date(Date.now() + 31536000000).toISOString(),
      insurancePolicy: 'POLICY-GZ-2024',
      insuranceExpiry: new Date(Date.now() + 31536000000).toISOString(),
      depreciationRate: 10
    };

    try {
      await addDoc(collection(db, 'inventory'), newItem);
      setIsAdding(false);
      setEditForm({});
      alert('Asset successfully committed to matrix.');
    } catch (e: any) {
      console.error("Committal failed:", e);
      if (e.code === 'permission-denied') {
        alert("SECURITY ACCESS DENIED: Your Firebase Rules are blocking this write. Please ensure your Firestore Rules allow 'write' access to the 'inventory' collection.");
      } else {
        alert(`Committal Error: ${e.message}`);
      }
    }
  };

  return (
    <div className="space-y-8">
      {/* Fleet Overview Header */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 border-b border-white/10 pb-8">
        <div>
          <div className="flex items-center space-x-2 mb-2">
            <Package className="h-3 w-3 text-[#B000FF] animate-pulse" />
            <span className="text-[10px] font-mono text-[#B000FF] uppercase tracking-[0.2em]">Hardware Matrix // Operational Fleet</span>
          </div>
          <h1 className="text-4xl font-bold text-white tracking-tighter uppercase italic">Inventory <span className="text-[#B000FF]">Matrix</span></h1>
          <p className="text-gray-500 font-mono text-xs mt-1">Global Asset Oversight & Telemetry // Sector_Alpha</p>
        </div>
        
        <div className="flex gap-4">
          <div className="bg-white/[0.02] border border-white/5 p-4 rounded-2xl flex items-center gap-4">
            <div className="text-right">
              <p className="text-[9px] font-mono text-gray-500 uppercase tracking-widest text-right">Fleet_Health</p>
              <p className="text-xl font-black text-white italic tracking-tighter">94.2%</p>
            </div>
            <div className="p-3 bg-emerald-500/10 rounded-xl border border-emerald-500/20 text-emerald-500">
              <Activity className="h-5 w-5" />
            </div>
          </div>
          <div className="bg-white/[0.02] border border-white/5 p-4 rounded-2xl flex items-center gap-4">
            <div className="text-right">
              <p className="text-[9px] font-mono text-gray-500 uppercase tracking-widest text-right">Deployed_Nodes</p>
              <p className="text-xl font-black text-[#B000FF] italic tracking-tighter">{inventory.filter(i => i.status === 'Rented').length}</p>
            </div>
            <div className="p-3 bg-[#B000FF]/10 rounded-xl border border-[#B000FF]/20 text-[#B000FF]">
              <Box className="h-5 w-5" />
            </div>
          </div>
        </div>
      </div>

      {/* Catalog Quick Provisioning */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="text-[10px] font-black text-gray-500 uppercase tracking-[0.3em] flex items-center gap-2">
            <Zap size={14} className="text-[#B000FF]" /> Hardware Catalog Provisioning
          </h3>
          <button className="text-[10px] font-bold text-gray-600 hover:text-white uppercase transition-colors">Manage Templates</button>
        </div>
        {products.length === 0 ? (
          <div className="p-8 bg-white/5 border border-dashed border-white/10 rounded-2xl text-center">
            <p className="text-[10px] font-mono text-gray-600 uppercase">No active rental products in catalog</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            {products.map(product => {
              const unitCount = inventory.filter(i => i.name === product.name).length;
              return (
                <div key={product.id} className="bg-[#080112] border border-white/10 rounded-2xl p-4 flex items-center gap-4 group hover:border-[#B000FF]/30 transition-all">
                  <div className="w-12 h-12 rounded-xl bg-white/5 border border-white/10 overflow-hidden shrink-0">
                    <img src={product.image} alt={product.name} className="w-full h-full object-cover grayscale group-hover:grayscale-0 transition-all" />
                  </div>
                  <div className="min-w-0 flex-grow">
                    <h4 className="text-xs font-bold text-white truncate uppercase italic">{product.name}</h4>
                    <div className="flex items-center gap-2 mt-1">
                      <span className="text-[9px] font-mono text-gray-500 uppercase">{product.category}</span>
                      <div className={`text-[8px] font-mono px-1.5 py-0.5 rounded border ${unitCount > 0 ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-500' : 'bg-red-500/10 border-red-500/30 text-red-500'
                        }`}>
                        {unitCount} UNITS
                      </div>
                    </div>
                  </div>
                  <button
                    onClick={() => {
                      setEditForm({ name: product.name, category: product.category, basePricePerDay: product.price, image: product.image });
                      setIsAdding(true);
                    }}
                    className="p-2 bg-[#B000FF]/10 text-[#B000FF] rounded-lg opacity-0 group-hover:opacity-100 transition-opacity translate-x-2 group-hover:translate-x-0"
                    title="Provision New Unit"
                  >
                    <Plus size={14} />
                  </button>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Control Bar */}
      <div className="flex flex-col md:flex-row gap-4 bg-[#080112] p-4 rounded-2xl border border-white/10">
        <div className="relative flex-grow">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-500" />
          <input
            type="text"
            placeholder="Search hardware matrix (ID, Serial, Name)..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-10 pr-4 py-2 bg-black border border-white/10 rounded-xl text-white font-mono text-xs focus:outline-none focus:border-[#B000FF] w-full"
          />
        </div>
        <div className="flex items-center space-x-3">
          <button
            onClick={() => setIsScanning(true)}
            className="flex items-center space-x-2 px-4 py-2 bg-white/5 hover:bg-white/10 border border-white/10 rounded-xl text-[10px] font-mono font-bold uppercase tracking-widest text-emerald-400 transition-all shadow-[0_0_10px_rgba(16,185,129,0.1)]"
          >
            <QrCode size={14} />
            <span>Scanner</span>
          </button>
          <button
            onClick={() => {
              const csv = [
                ['ID', 'Name', 'Status', 'Location', 'Health', 'Serial', 'Purchase Price', 'Total Revenue', 'Warranty Expiry'].join(','),
                ...inventory.map(i => [i.id, i.name, i.status, i.location, i.health, i.serialNumber, i.purchasePrice, i.totalRevenue, i.warrantyExpiry || ''].join(','))
              ].join('\n');
              const blob = new Blob([csv], { type: 'text/csv' });
              const url = URL.createObjectURL(blob);
              const a = document.createElement('a');
              a.href = url;
              a.download = `full_inventory_${new Date().toISOString().split('T')[0]}.csv`;
              a.click();
            }}
            className="flex items-center space-x-2 px-4 py-2 bg-white/5 hover:bg-white/10 border border-white/10 rounded-xl text-[10px] font-mono font-bold uppercase tracking-widest text-gray-400 transition-all"
          >
            <Download size={14} />
            <span>Export</span>
          </button>
          <div className="flex items-center bg-white/5 rounded-xl p-1 border border-white/10 mr-2">
            <button
              onClick={() => setViewMode('grid')}
              className={`p-1.5 rounded-lg transition-all ${viewMode === 'grid' ? 'bg-[#B000FF] text-black shadow-[0_0_10px_rgba(168,85,247,0.4)]' : 'text-gray-500 hover:text-white'}`}
            >
              <LayoutGrid size={16} />
            </button>
            <button
              onClick={() => setViewMode('table')}
              className={`p-1.5 rounded-lg transition-all ${viewMode === 'table' ? 'bg-[#B000FF] text-black shadow-[0_0_10px_rgba(168,85,247,0.4)]' : 'text-gray-500 hover:text-white'}`}
            >
              <LayoutList size={16} />
            </button>
          </div>
          <div className="relative">
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value as any)}
              className="appearance-none flex items-center space-x-2 pl-8 pr-8 py-2 bg-white/5 hover:bg-white/10 border border-white/10 rounded-xl text-[10px] font-mono font-bold uppercase tracking-widest text-white transition-all cursor-pointer focus:outline-none focus:border-[#B000FF]"
            >
              <option value="All">All Status</option>
              <option value="Available">Available</option>
              <option value="Rented">Rented</option>
              <option value="Maintenance">Maintenance</option>
              <option value="Retired">Retired</option>
            </select>
            <Filter size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-white pointer-events-none" />
            <ChevronRight size={10} className="absolute right-3 top-1/2 -translate-y-1/2 rotate-90 text-white pointer-events-none" />
          </div>
          <button
            onClick={() => {
              setEditForm({});
              setIsAdding(true);
            }}
            className="flex items-center space-x-2 px-4 py-2 bg-[#B000FF] text-black rounded-xl text-[10px] font-mono font-bold uppercase tracking-widest hover:bg-[#9333EA] transition-all shadow-[0_0_15px_rgba(168,85,247,0.3)]"
          >
            <Plus size={14} />
            <span>Add Asset</span>
          </button>
        </div>
      </div>

      {/* Inventory Grid */}
      {filteredInventory.length === 0 ? (
        <div className="text-center py-20 bg-white/5 rounded-3xl border border-white/5 border-dashed">
          <Box className="mx-auto h-12 w-12 text-gray-700 mb-4" />
          <p className="text-gray-500 font-mono text-xs uppercase tracking-widest">No entries matching query in matrix</p>
        </div>
      ) : viewMode === 'grid' ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredInventory.map((item, i) => (
            <motion.div
              key={item.id}
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: i * 0.05 }}
              className="group bg-[#080112] border border-white/10 rounded-2xl overflow-hidden hover:border-[#B000FF]/50 transition-all shadow-xl"
            >
              <div className="p-6 space-y-6">
                <div className="flex items-start justify-between">
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <span className="text-[10px] font-mono font-bold text-[#B000FF] uppercase tracking-widest">[{item.id}]</span>
                      <StatusBadge status={item.status} />
                    </div>
                    <h3 className="text-xl font-bold text-white group-hover:text-[#B000FF] transition-colors uppercase tracking-tight italic">{item.name}</h3>
                  </div>
                  <button onClick={() => setSelectedItem(item)} className="p-2 text-gray-500 hover:text-white transition-colors"><MoreHorizontal size={16} /></button>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="bg-white/[0.02] p-3 rounded-xl border border-white/5">
                    <p className="text-[9px] font-mono font-bold text-gray-600 uppercase tracking-widest mb-1">Location</p>
                    <div className="flex items-center gap-1.5"><MapPin size={12} className="text-[#B000FF]" /><p className="text-xs text-white font-mono uppercase">{item.location}</p></div>
                  </div>
                  <div className="bg-white/[0.02] p-3 rounded-xl border border-white/5">
                    <p className="text-[9px] font-mono font-bold text-gray-600 uppercase tracking-widest mb-1">Usage_Pulse</p>
                    <div className="flex items-center gap-1.5"><RefreshCw size={12} className="text-emerald-500" /><p className="text-xs text-white font-mono uppercase">{item.usageCount} Cycles</p></div>
                  </div>
                </div>

                <div className="space-y-2">
                  <div className="flex items-center justify-between text-[9px] font-mono font-bold uppercase tracking-widest">
                    <span className="text-gray-500">System Integrity</span>
                    <span className={item.health > 90 ? 'text-emerald-500' : 'text-amber-500'}>{item.health}%</span>
                  </div>
                  <HealthBar health={item.health} />
                </div>

                <div className="pt-4 border-t border-white/5 flex items-center justify-between">
                  <span className="text-xs font-black text-white italic tracking-tighter">{formatCurrency(item.basePricePerDay)}<span className="text-[8px] text-gray-500 not-italic ml-1">/DAY</span></span>
                  <button onClick={() => setSelectedItem(item)} className="text-[9px] font-mono font-black text-[#B000FF] uppercase tracking-widest hover:underline flex items-center gap-1">Details <ChevronRight size={10} /></button>
                </div>
              </div>
            </motion.div>
          ))}
        </div>
      ) : (
        <div className="bg-[#080112] border border-white/10 rounded-2xl overflow-hidden shadow-2xl">
          <table className="w-full text-left">
            <thead className="bg-white/[0.02] text-gray-500 text-[10px] font-mono uppercase tracking-widest border-b border-white/5">
              <tr>
                <th className="px-6 py-4">Node_ID</th>
                <th className="px-6 py-4">Hardware</th>
                <th className="px-6 py-4">Serial</th>
                <th className="px-6 py-4">Status</th>
                <th className="px-6 py-4">Integrity</th>
                <th className="px-6 py-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5 text-xs font-mono text-gray-400">
              {filteredInventory.map(item => (
                <tr key={item.id} className="hover:bg-white/[0.01] transition-colors group">
                  <td className="px-6 py-4 text-[#B000FF] font-bold">[{item.id}]</td>
                  <td className="px-6 py-4 text-white font-bold">{item.name}</td>
                  <td className="px-6 py-4 text-gray-500">{item.serialNumber}</td>
                  <td className="px-6 py-4"><StatusBadge status={item.status} /></td>
                  <td className="px-6 py-4 w-48"><HealthBar health={item.health} /></td>
                  <td className="px-6 py-4 text-right">
                    <div className="flex justify-end space-x-2">
                      <button onClick={() => setSelectedItem(item)} className="p-2 hover:bg-white/5 rounded text-gray-600 hover:text-white"><Edit2 size={14}/></button>
                      <button onClick={() => handleDeleteAsset(item.id)} className="p-2 hover:bg-red-500/10 rounded text-gray-600 hover:text-red-500"><Trash2 size={14}/></button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Add Modal */}
      {isAdding && (
        <div className="fixed inset-0 z-[100] bg-black/90 flex items-center justify-center p-4">
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="bg-[#080112] border border-white/10 rounded-3xl p-8 max-w-lg w-full space-y-6">
            <h2 className="text-2xl font-black text-white italic uppercase italic tracking-tighter">Provision <span className="text-[#B000FF]">Asset</span></h2>
            <form onSubmit={handleAddAsset} className="space-y-4">
              <input required type="text" placeholder="Hardware Name" className="w-full bg-black border border-white/10 rounded-xl p-4 text-white outline-none focus:border-[#B000FF]" onChange={e => setEditForm({...editForm, name: e.target.value})} />
              <input required type="text" placeholder="Serial Number" className="w-full bg-black border border-white/10 rounded-xl p-4 text-white outline-none focus:border-[#B000FF]" onChange={e => setEditForm({...editForm, serialNumber: e.target.value})} />
              <div className="grid grid-cols-2 gap-4">
                <input required type="number" placeholder="Daily Rate" className="bg-black border border-white/10 rounded-xl p-4 text-white outline-none focus:border-[#B000FF]" onChange={e => setEditForm({...editForm, basePricePerDay: Number(e.target.value)})} />
                <input required type="number" placeholder="Asset Value" className="bg-black border border-white/10 rounded-xl p-4 text-white outline-none focus:border-[#B000FF]" onChange={e => setEditForm({...editForm, purchasePrice: Number(e.target.value)})} />
              </div>
              <div className="flex gap-4 pt-4">
                <button type="button" onClick={() => setIsAdding(false)} className="flex-1 py-4 text-gray-500 font-bold uppercase tracking-widest text-xs">Abort</button>
                <button type="submit" className="flex-1 py-4 bg-[#B000FF] text-black font-black uppercase tracking-widest text-xs rounded-xl shadow-[0_0_20px_rgba(176,0,255,0.4)]">Initiate</button>
              </div>
            </form>
          </motion.div>
        </div>
      )}
    </div>
  );
}
