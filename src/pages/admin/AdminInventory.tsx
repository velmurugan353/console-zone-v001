import React, { useState, useMemo, useEffect } from 'react';
import { collection, onSnapshot, query, doc, updateDoc, addDoc, setDoc, where, getDocs } from 'firebase/firestore';
import { db } from '../../lib/firebase';
import { RENTAL_CONSOLES } from '../../constants/rentals';
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
  Cell,
  PieChart,
  Pie
} from 'recharts';
import {
  Search,
  Filter,
  Plus,
  MoreVertical,
  Cpu,
  Package,
  Zap,
  Shield,
  Activity,
  CheckCircle2,
  AlertCircle,
  Clock,
  Box,
  Wrench,
  History,
  MapPin,
  Heart,
  ChevronRight,
  XCircle,
  LayoutList,
  LayoutGrid,
  Edit2,
  Save,
  Image as ImageIcon,
  DollarSign,
  User,
  TrendingUp,
  QrCode,
  Camera,
  Download,
  Upload,
  Trash2,
  ArrowRight,
  Calendar,
  FileText,
  ShieldCheck,
  Truck,
  Repeat,
  Percent,
  TrendingDown,
  Wallet
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { formatCurrency } from '../../lib/utils';

type InventoryStatus = 'Available' | 'Rented' | 'Maintenance' | 'Retired';

interface MaintenanceRecord {
  date: string;
  type: string;
  technician: string;
  notes: string;
  cost: number;
}

interface RentalHistoryRecord {
  rentalId: string;
  user: string;
  startDate: string;
  endDate: string;
  price: number;
  status: 'completed' | 'active' | 'late' | 'pending';
}

interface KitItem {
  id: string;
  name: string;
  serialNumber?: string;
  status: 'present' | 'missing' | 'damaged';
}

interface ConditionLog {
  date: string;
  status: InventoryStatus;
  note: string;
  technician: string;
  images?: string[];
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

interface TransferRecord {
  id: string;
  fromLocation: string;
  toLocation: string;
  date: string;
  transferredBy: string;
  notes: string;
}

interface ScheduledMaintenance {
  id: string;
  assetId: string;
  assetName: string;
  type: string;
  scheduledDate: string;
  status: 'scheduled' | 'completed' | 'overdue';
  notes: string;
}

interface BulkOperation {
  ids: string[];
  action: 'status' | 'delete' | 'export';
  newStatus?: InventoryStatus;
}

const generateMockInventory = (): InventoryItem[] => {
  const inventory: InventoryItem[] = [];

  RENTAL_CONSOLES.forEach((consoleDef) => {
    // Generate Available units based on exactly what the public storefront says
    for (let i = 0; i < consoleDef.available; i++) {
      inventory.push({
        id: `${consoleDef.id.toUpperCase()}-${String(i + 1).padStart(3, '0')}`,
        name: consoleDef.name,
        category: 'Console',
        status: 'Available',
        health: 100,
        lastService: new Date().toISOString().split('T')[0],
        location: 'Warehouse - A',
        serialNumber: `SN-${consoleDef.id.toUpperCase()}-${Math.floor(1000 + Math.random() * 9000)}`,
        purchaseDate: '2023-11-01',
        maintenanceHistory: [],
        rentalHistory: [],
        basePricePerDay: consoleDef.dailyRate,
        dynamicPricingEnabled: true,
        image: consoleDef.image,
        purchasePrice: consoleDef.name.includes('PS5') || consoleDef.name.includes('Xbox') ? 45000 : 30000,
        totalRevenue: Math.floor(Math.random() * 60000), // Random historical revenue
        kitRequired: consoleDef.included,
        kitStatus: consoleDef.included.reduce((acc, item) => ({ ...acc, [item]: true }), {} as Record<string, boolean>),
        conditionLogs: [],
        transferHistory: [],
        warrantyExpiry: '2025-12-31',
        insurancePolicy: `INS-${consoleDef.id.toUpperCase()}-001`,
        insuranceExpiry: '2025-06-30',
        depreciationRate: 10
      });
    }

    // Generate a few Rented/Maintenance units to show pipeline activity in Admin
    inventory.push({
      id: `${consoleDef.id.toUpperCase()}-R01`,
      name: consoleDef.name,
      category: 'Console',
      status: 'Rented',
      health: 92,
      lastService: '2024-01-15',
      location: 'Client - Active',
      serialNumber: `SN-${consoleDef.id.toUpperCase()}-${Math.floor(1000 + Math.random() * 9000)}`,
      purchaseDate: '2023-11-01',
      maintenanceHistory: [],
      rentalHistory: [{
        rentalId: `R-${Math.floor(1000 + Math.random() * 9000)}`,
        user: 'Active User',
        startDate: '2024-03-01',
        endDate: '2024-03-10',
        price: consoleDef.dailyRate * 7,
        status: 'active'
      }],
      basePricePerDay: consoleDef.dailyRate,
      dynamicPricingEnabled: true,
      image: consoleDef.image,
      purchasePrice: consoleDef.name.includes('PS5') || consoleDef.name.includes('Xbox') ? 45000 : 30000,
      totalRevenue: Math.floor(Math.random() * 60000) + (consoleDef.dailyRate * 7),
      kitRequired: consoleDef.included,
      kitStatus: consoleDef.included.reduce((acc, item) => ({ ...acc, [item]: true }), {} as Record<string, boolean>),
      conditionLogs: [],
      transferHistory: [{
        id: 'TRF-001',
        fromLocation: 'Warehouse - A',
        toLocation: 'Client - Active',
        date: '2024-03-01',
        transferredBy: 'Admin',
        notes: 'Deployed for rental'
      }],
      warrantyExpiry: '2025-12-31',
      insurancePolicy: `INS-${consoleDef.id.toUpperCase()}-002`,
      insuranceExpiry: '2025-06-30',
      depreciationRate: 10
    });

    // Add 1 maintenance unit for flavor
    inventory.push({
      id: `${consoleDef.id.toUpperCase()}-M01`,
      name: consoleDef.name,
      category: 'Console',
      status: 'Maintenance',
      health: 65,
      lastService: '2024-03-01',
      location: 'Service Bay',
      serialNumber: `SN-${consoleDef.id.toUpperCase()}-${Math.floor(1000 + Math.random() * 9000)}`,
      purchaseDate: '2023-11-01',
      maintenanceHistory: [{
        date: '2024-03-01',
        type: 'Repair',
        technician: 'Tech Lead',
        notes: 'General service and diagnostic check.',
        cost: 45
      }],
      rentalHistory: [],
      basePricePerDay: consoleDef.dailyRate,
      dynamicPricingEnabled: false,
      image: consoleDef.image,
      purchasePrice: consoleDef.name.includes('PS5') || consoleDef.name.includes('Xbox') ? 45000 : 30000,
      totalRevenue: Math.floor(Math.random() * 60000),
      kitRequired: consoleDef.included,
      kitStatus: consoleDef.included.reduce((acc, item) => ({ ...acc, [item]: true }), {} as Record<string, boolean>),
      conditionLogs: [],
      transferHistory: [],
      warrantyExpiry: '2024-01-15',
      insurancePolicy: `INS-${consoleDef.id.toUpperCase()}-003`,
      insuranceExpiry: '2024-03-30',
      depreciationRate: 15
    });
  });

  return inventory;
};

const MOCK_INVENTORY: InventoryItem[] = generateMockInventory();

const StatusBadge = ({ status }: { status: InventoryStatus }) => {
  const styles: Record<InventoryStatus, string> = {
    Available: 'bg-emerald-500/10 text-emerald-500 border-emerald-500/20',
    Rented: 'bg-blue-500/10 text-blue-500 border-blue-500/20',
    Maintenance: 'bg-amber-500/10 text-amber-500 border-amber-500/20',
    Retired: 'bg-red-500/10 text-red-500 border-red-500/20',
  };

  return (
    <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-widest border ${styles[status] || 'bg-gray-500/10 text-gray-500 border-gray-500/20'}`}>
      {status}
    </span>
  );
};

const HealthBar = ({ health }: { health: number }) => {
  const color = health > 90 ? 'bg-emerald-500' : health > 70 ? 'bg-amber-500' : 'bg-red-500';
  const shadow = health > 90 ? 'shadow-[0_0_10px_#10b981]' : health > 70 ? 'shadow-[0_0_10px_#f59e0b]' : 'shadow-[0_0_10px_#ef4444]';

  return (
    <div className="w-full h-1 bg-white/5 rounded-full overflow-hidden">
      <motion.div
        initial={{ width: 0 }}
        animate={{ width: `${health}%` }}
        className={`h-full ${color} ${shadow} transition-all duration-1000`}
      />
    </div>
  );
};

export default function AdminInventory() {
  const [inventory, setInventory] = useState<InventoryItem[]>([]);
  const [products, setProducts] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const qInv = query(collection(db, 'inventory'));
    const unsubInv = onSnapshot(qInv, (snapshot) => {
      const fetchedItems: InventoryItem[] = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      })) as InventoryItem[];
      setInventory(fetchedItems);
    });

    const qProd = query(collection(db, 'products'), where('isRental', '==', true));
    const unsubProd = onSnapshot(qProd, (snapshot) => {
      const fetchedProducts = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));
      setProducts(fetchedProducts);
      setLoading(false);
    });

    return () => {
      unsubInv();
      unsubProd();
    };
  }, []);

  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<'All' | InventoryStatus>('All');
  const [selectedItem, setSelectedItem] = useState<InventoryItem | null>(null);
  const [activeTab, setActiveTab] = useState<'control' | 'maintenance' | 'rentals' | 'transfers' | 'warranty' | 'depreciation'>('control');
  const [viewMode, setViewMode] = useState<'grid' | 'table'>('grid');
  const [isEditing, setIsEditing] = useState(false);
  const [isAdding, setIsAdding] = useState(false);
  const [isScanning, setIsScanning] = useState(false);
  const [editForm, setEditForm] = useState<Partial<InventoryItem>>({});
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [showBulkPanel, setShowBulkPanel] = useState(false);
  const [showScheduleModal, setShowScheduleModal] = useState(false);
  const [showTransferModal, setShowTransferModal] = useState(false);
  const [showWarrantyModal, setShowWarrantyModal] = useState(false);
  const [showDepreciationModal, setShowDepreciationModal] = useState(false);
  const [scheduledMaintenances, setScheduledMaintenances] = useState<ScheduledMaintenance[]>([]);
  const [transferForm, setTransferForm] = useState({ toLocation: '', notes: '', transferredBy: '' });
  const [warrantyForm, setWarrantyForm] = useState({ warrantyExpiry: '', insurancePolicy: '', insuranceExpiry: '', depreciationRate: 10 });

  const handleEditToggle = async () => {
    if (isEditing) {
      if (selectedItem) {
        const updatedItem = { ...selectedItem, ...editForm } as InventoryItem;
        await updateDoc(doc(db, 'inventory', updatedItem.id), updatedItem as any);
        setSelectedItem(updatedItem);
      }
      setIsEditing(false);
    } else {
      setEditForm(selectedItem || {});
      setIsEditing(true);
    }
  };

  const handleAddAsset = async (e: React.FormEvent) => {
    e.preventDefault();
    const itemId = `ASSET-${Date.now()}`;

    // Find template if selected
    const template = products.find(p => p.id === editForm.name || p.name === editForm.name);

    const newItem: InventoryItem = {
      id: itemId,
      name: template?.name || editForm.name || 'New Asset',
      category: template?.category || editForm.category || 'Console',
      status: editForm.status || 'Available',
      health: editForm.health || 100,
      lastService: editForm.lastService || new Date().toISOString().split('T')[0],
      location: editForm.location || 'Storage',
      serialNumber: editForm.serialNumber || `SN-${Date.now()}`,
      purchaseDate: editForm.purchaseDate || new Date().toISOString().split('T')[0],
      maintenanceHistory: [],
      rentalHistory: [],
      basePricePerDay: template?.price || editForm.basePricePerDay || 25,
      dynamicPricingEnabled: editForm.dynamicPricingEnabled || false,
      image: template?.image || editForm.image || 'https://images.unsplash.com/photo-1605902711622-cfb39c443f05?auto=format&fit=crop&q=80&w=200',
      purchasePrice: 45000,
      totalRevenue: 0,
      kitRequired: template?.included || ['Console', 'Controller', 'Power Cable'],
      kitStatus: (template?.included || ['Console', 'Controller', 'Power Cable']).reduce((acc: any, item: string) => ({ ...acc, [item]: true }), {}),
      conditionLogs: [],
      transferHistory: [],
      warrantyExpiry: '',
      insurancePolicy: '',
      insuranceExpiry: '',
      depreciationRate: 10
    };
    await setDoc(doc(db, 'inventory', itemId), newItem);
    setIsAdding(false);
    setEditForm({});
  };

  const handleEditChange = (field: keyof InventoryItem, value: any) => {
    setEditForm(prev => ({ ...prev, [field]: value }));
  };

  const closeInventoryModal = () => {
    setSelectedItem(null);
    setActiveTab('control');
    setIsEditing(false);
  };

  const toggleSelectAll = () => {
    if (selectedIds.length === filteredInventory.length) {
      setSelectedIds([]);
    } else {
      setSelectedIds(filteredInventory.map(i => i.id));
    }
  };

  const toggleSelectItem = (id: string) => {
    setSelectedIds(prev => 
      prev.includes(id) ? prev.filter(i => i !== id) : [...prev, id]
    );
  };

  const handleBulkStatusUpdate = async (newStatus: InventoryStatus) => {
    for (const id of selectedIds) {
      await updateDoc(doc(db, 'inventory', id), { status: newStatus });
    }
    setSelectedIds([]);
    setShowBulkPanel(false);
  };

  const handleBulkDelete = async () => {
    if (!confirm(`Delete ${selectedIds.length} assets? This cannot be undone.`)) return;
    for (const id of selectedIds) {
      // In production, you'd delete from Firestore here
    }
    setSelectedIds([]);
    setShowBulkPanel(false);
  };

  const handleBulkExport = () => {
    const data = filteredInventory.filter(i => selectedIds.includes(i.id));
    const csv = [
      ['ID', 'Name', 'Status', 'Location', 'Health', 'Serial', 'Purchase Price', 'Total Revenue'].join(','),
      ...data.map(i => [i.id, i.name, i.status, i.location, i.health, i.serialNumber, i.purchasePrice, i.totalRevenue].join(','))
    ].join('\n');
    
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `inventory_export_${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
    setShowBulkPanel(false);
  };

  const handleImportCSV = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    
    const reader = new FileReader();
    reader.onload = async (event) => {
      const text = event.target?.result as string;
      const lines = text.split('\n').slice(1); // Skip header
      // Process CSV - would create assets in production
      alert(`Imported ${lines.length} assets from CSV`);
    };
    reader.readAsText(file);
  };

  const handleTransferAsset = async () => {
    if (!selectedItem || !transferForm.toLocation) return;
    
    const transferRecord: TransferRecord = {
      id: `TRF-${Date.now()}`,
      fromLocation: selectedItem.location,
      toLocation: transferForm.toLocation,
      date: new Date().toISOString().split('T')[0],
      transferredBy: transferForm.transferredBy || 'Admin',
      notes: transferForm.notes
    };

    const updatedHistory = [...(selectedItem.transferHistory || []), transferRecord];
    await updateDoc(doc(db, 'inventory', selectedItem.id), {
      location: transferForm.toLocation,
      transferHistory: updatedHistory
    });
    
    setSelectedItem({ ...selectedItem, location: transferForm.toLocation, transferHistory: updatedHistory });
    setShowTransferModal(false);
    setTransferForm({ toLocation: '', notes: '', transferredBy: '' });
  };

  const handleScheduleMaintenance = async () => {
    if (!selectedItem) return;
    
    const schedule: ScheduledMaintenance = {
      id: `SCH-${Date.now()}`,
      assetId: selectedItem.id,
      assetName: selectedItem.name,
      type: 'Routine Inspection',
      scheduledDate: new Date().toISOString().split('T')[0],
      status: 'scheduled',
      notes: 'Scheduled via inventory panel'
    };
    
    setScheduledMaintenances([...scheduledMaintenances, schedule]);
    setShowScheduleModal(false);
  };

  const handleSaveWarranty = async () => {
    if (!selectedItem) return;
    
    await updateDoc(doc(db, 'inventory', selectedItem.id), {
      warrantyExpiry: warrantyForm.warrantyExpiry,
      insurancePolicy: warrantyForm.insurancePolicy,
      insuranceExpiry: warrantyForm.insuranceExpiry,
      depreciationRate: warrantyForm.depreciationRate
    });
    
    setSelectedItem({
      ...selectedItem,
      warrantyExpiry: warrantyForm.warrantyExpiry,
      insurancePolicy: warrantyForm.insurancePolicy,
      insuranceExpiry: warrantyForm.insuranceExpiry,
      depreciationRate: warrantyForm.depreciationRate
    });
    setShowWarrantyModal(false);
  };

  const calculateDepreciation = (item: InventoryItem) => {
    const purchaseDate = new Date(item.purchaseDate);
    const now = new Date();
    const yearsOwned = (now.getTime() - purchaseDate.getTime()) / (365.25 * 24 * 60 * 60 * 1000);
    const rate = item.depreciationRate || 10;
    const currentValue = item.purchasePrice * Math.pow(1 - rate / 100, yearsOwned);
    return Math.max(0, currentValue);
  };

  const filteredInventory = inventory.filter(item => {
    const matchesSearch = item.name.toLowerCase().includes(search.toLowerCase()) ||
      item.id.toLowerCase().includes(search.toLowerCase()) ||
      item.serialNumber.toLowerCase().includes(search.toLowerCase());
    const matchesStatus = statusFilter === 'All' || item.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  const handleStatusUpdate = async (id: string, newStatus: InventoryStatus) => {
    const item = inventory.find(i => i.id === id);
    if (!item) return;

    let finalStatus = newStatus;
    // Auto Maintenance Trigger Intercept
    if (newStatus === 'Available' && item.status === 'Rented' && item.rentalHistory.length >= 1) {
      alert(`Auto-Trigger: Asset [${item.id}] has been returned after an active lifecycle and requires routine inspection. Auto-flagging to 'Maintenance'.`);
      finalStatus = 'Maintenance';
    }

    await updateDoc(doc(db, 'inventory', id), { status: finalStatus });

    if (selectedItem?.id === id) {
      setSelectedItem({ ...selectedItem, status: finalStatus });
    }
  };

  const utilizationData = useMemo(() => {
    const statusCounts = inventory.reduce((acc: any, item) => {
      acc[item.status] = (acc[item.status] || 0) + 1;
      return acc;
    }, {});

    return Object.entries(statusCounts).map(([name, value]) => ({ name, value }));
  }, [inventory]);

  const healthData = useMemo(() => {
    return inventory.map(item => ({
      name: item.id.split('-').pop(),
      health: item.health
    }));
  }, [inventory]);

  return (
    <div className="space-y-8">
      {/* Professional Analytics Matrix */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-[#0a0a0a] border border-white/10 p-6 rounded-2xl">
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center space-x-2">
              <TrendingUp className="h-4 w-4 text-[#A855F7]" />
              <h3 className="text-[10px] font-mono uppercase tracking-widest text-white">Fleet Utilization Matrix</h3>
            </div>
            <span className="text-[9px] font-mono text-gray-500 uppercase tracking-tighter">Live Database Feed</span>
          </div>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={utilizationData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#222" vertical={false} />
                <XAxis
                  dataKey="name"
                  stroke="#666"
                  fontSize={10}
                  tickLine={false}
                  axisLine={false}
                  fontFamily="JetBrains Mono, monospace"
                />
                <YAxis
                  stroke="#666"
                  fontSize={10}
                  tickLine={false}
                  axisLine={false}
                  fontFamily="JetBrains Mono, monospace"
                />
                <Tooltip
                  contentStyle={{ backgroundColor: '#0a0a0a', border: '1px solid #333', fontSize: '10px', borderRadius: '8px' }}
                  itemStyle={{ color: '#A855F7' }}
                />
                <Bar dataKey="value" radius={[4, 4, 0, 0]}>
                  {utilizationData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.name === 'Available' ? '#10b981' : entry.name === 'Rented' ? '#A855F7' : '#f59e0b'} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="bg-[#0a0a0a] border border-white/10 p-6 rounded-2xl">
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center space-x-2">
              <Activity className="h-4 w-4 text-emerald-400" />
              <h3 className="text-[10px] font-mono uppercase tracking-widest text-white">Hardware Health Telemetry</h3>
            </div>
            <span className="text-[9px] font-mono text-gray-500 uppercase tracking-tighter">Diagnostic Overlay</span>
          </div>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={healthData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#222" vertical={false} />
                <XAxis
                  dataKey="name"
                  stroke="#666"
                  fontSize={10}
                  tickLine={false}
                  axisLine={false}
                  fontFamily="JetBrains Mono, monospace"
                />
                <YAxis
                  stroke="#666"
                  fontSize={10}
                  tickLine={false}
                  axisLine={false}
                  domain={[0, 100]}
                  fontFamily="JetBrains Mono, monospace"
                />
                <Tooltip
                  contentStyle={{ backgroundColor: '#0a0a0a', border: '1px solid #333', fontSize: '10px', borderRadius: '8px' }}
                />
                <Line
                  type="monotone"
                  dataKey="health"
                  stroke="#10b981"
                  strokeWidth={2}
                  dot={{ fill: '#10b981', r: 4 }}
                  activeDot={{ r: 6, fill: '#fff' }}
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      {/* Stats Matrix */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        {[
          { label: 'Total Assets', value: inventory.length, icon: Box, color: 'text-blue-400' },
          { label: 'Operational', value: inventory.filter(i => i.status === 'Available' || i.status === 'Rented').length, icon: Zap, color: 'text-[#A855F7]' },
          { label: 'Unprovisioned', value: products.filter(p => !inventory.some(i => i.name === p.name)).length, icon: AlertCircle, color: 'text-amber-400' },
          {
            label: 'Avg Health',
            value: inventory.length > 0 ? `${Math.round(inventory.reduce((acc, i) => acc + i.health, 0) / inventory.length)}%` : '100%',
            icon: Heart,
            color: (inventory.length === 0 || Math.round(inventory.reduce((acc, i) => acc + i.health, 0) / inventory.length) > 90)
              ? 'text-emerald-400'
              : Math.round(inventory.reduce((acc, i) => acc + i.health, 0) / inventory.length) > 70
                ? 'text-amber-400'
                : 'text-red-500'
          },
        ].map((stat, i) => (
          <motion.div
            key={stat.label}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.1 }}
            className="bg-[#0a0a0a] border border-white/10 p-6 rounded-2xl relative overflow-hidden group"
          >
            <div className="absolute top-0 right-0 p-4 opacity-5 group-hover:opacity-10 transition-opacity">
              <stat.icon size={48} className={stat.color} />
            </div>
            <p className="text-gray-500 text-[10px] font-mono uppercase tracking-widest mb-1">{stat.label}</p>
            <p className="text-3xl font-bold text-white tracking-tighter">{stat.value}</p>
          </motion.div>
        ))}
      </div>

      {/* Provisioning Alerts */}
      {products.filter(p => !inventory.some(i => i.name === p.name)).length > 0 && (
        <div className="bg-amber-500/5 border border-amber-500/20 rounded-2xl p-6 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div className="w-10 h-10 rounded-full bg-amber-500/10 flex items-center justify-center text-amber-500">
              <AlertCircle size={20} />
            </div>
            <div>
              <h4 className="text-[10px] font-black uppercase tracking-widest text-amber-500">Fleet Provisioning Alert</h4>
              <p className="text-xs text-amber-500/70 font-mono">
                The following rental products are live on storefront but have zero physical assets provisioned:
                <span className="text-white ml-2">
                  {products.filter(p => !inventory.some(i => i.name === p.name)).map(p => p.name).join(', ')}
                </span>
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Hardware Registry (Storefront Models) */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <Cpu className="h-4 w-4 text-[#A855F7]" />
            <h3 className="text-[10px] font-mono uppercase tracking-widest text-white">Hardware Model Registry</h3>
          </div>
          <span className="text-[9px] font-mono text-gray-500 uppercase tracking-tighter">Storefront Definitions</span>
        </div>

        {products.length === 0 ? (
          <div className="bg-[#0a0a0a] border border-dashed border-white/10 rounded-2xl p-12 text-center">
            <Package className="h-8 w-8 text-gray-600 mx-auto mb-4 opacity-20" />
            <p className="text-gray-500 font-mono text-xs uppercase tracking-widest">No Rental Products Found in Mast Registry</p>
            <p className="text-[10px] text-gray-700 mt-2">Initialize consoles as 'For Rent' in the Product Master</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            {products.map(product => {
              const unitCount = inventory.filter(i => i.name === product.name).length;
              return (
                <div key={product.id} className="bg-[#0a0a0a] border border-white/10 rounded-2xl p-4 flex items-center gap-4 group hover:border-[#A855F7]/30 transition-all">
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
                    className="p-2 bg-[#A855F7]/10 text-[#A855F7] rounded-lg opacity-0 group-hover:opacity-100 transition-opacity translate-x-2 group-hover:translate-x-0"
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
      <div className="flex flex-col md:flex-row gap-4 bg-[#0a0a0a] p-4 rounded-2xl border border-white/10">
        <div className="relative flex-grow">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-500" />
          <input
            type="text"
            placeholder="Search hardware matrix (ID, Serial, Name)..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-10 pr-4 py-2 bg-black border border-white/10 rounded-xl text-white font-mono text-xs focus:outline-none focus:border-[#A855F7] w-full"
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
          <label className="flex items-center space-x-2 px-4 py-2 bg-white/5 hover:bg-white/10 border border-white/10 rounded-xl text-[10px] font-mono font-bold uppercase tracking-widest text-gray-400 transition-all cursor-pointer">
            <Upload size={14} />
            <span>Import</span>
            <input type="file" accept=".csv" onChange={handleImportCSV} className="hidden" />
          </label>
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
          {selectedIds.length > 0 && (
            <button
              onClick={() => setShowBulkPanel(true)}
              className="flex items-center space-x-2 px-4 py-2 bg-[#A855F7]/20 hover:bg-[#A855F7]/30 border border-[#A855F7]/30 rounded-xl text-[10px] font-mono font-bold uppercase tracking-widest text-[#A855F7] transition-all"
            >
              <Package size={14} />
              <span>Bulk ({selectedIds.length})</span>
            </button>
          )}
          <div className="flex items-center bg-white/5 rounded-xl p-1 border border-white/10 mr-2">
            <button
              onClick={() => setViewMode('grid')}
              className={`p-1.5 rounded-lg transition-all ${viewMode === 'grid' ? 'bg-[#A855F7] text-black shadow-[0_0_10px_rgba(168,85,247,0.4)]' : 'text-gray-500 hover:text-white'}`}
            >
              <LayoutGrid size={16} />
            </button>
            <button
              onClick={() => setViewMode('table')}
              className={`p-1.5 rounded-lg transition-all ${viewMode === 'table' ? 'bg-[#A855F7] text-black shadow-[0_0_10px_rgba(168,85,247,0.4)]' : 'text-gray-500 hover:text-white'}`}
            >
              <LayoutList size={16} />
            </button>
          </div>
          <div className="relative">
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value as any)}
              className="appearance-none flex items-center space-x-2 pl-8 pr-8 py-2 bg-white/5 hover:bg-white/10 border border-white/10 rounded-xl text-[10px] font-mono font-bold uppercase tracking-widest text-white transition-all cursor-pointer focus:outline-none focus:border-[#A855F7]"
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
            className="flex items-center space-x-2 px-4 py-2 bg-[#A855F7] text-black rounded-xl text-[10px] font-mono font-bold uppercase tracking-widest hover:bg-[#9333EA] transition-all shadow-[0_0_15px_rgba(168,85,247,0.3)]"
          >
            <Plus size={14} />
            <span>Add Asset</span>
          </button>
        </div>
      </div>

      {/* Bulk Operations Panel */}
      <AnimatePresence>
        {showBulkPanel && (
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className="bg-[#0a0a0a] border border-[#A855F7]/30 p-6 rounded-2xl flex items-center justify-between"
          >
            <div className="flex items-center gap-4">
              <div className="w-10 h-10 rounded-full bg-[#A855F7]/10 flex items-center justify-center text-[#A855F7]">
                <Package size={20} />
              </div>
              <div>
                <h4 className="text-xs font-bold text-white uppercase tracking-wider">Bulk Operations</h4>
                <p className="text-[10px] font-mono text-gray-500">{selectedIds.length} assets selected</p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <select
                onChange={(e) => {
                  if (e.target.value) handleBulkStatusUpdate(e.target.value as InventoryStatus);
                }}
                className="appearance-none px-4 py-2 bg-white/5 border border-white/10 rounded-xl text-[10px] font-mono text-white focus:outline-none focus:border-[#A855F7]"
              >
                <option value="">Set Status...</option>
                <option value="Available">Available</option>
                <option value="Rented">Rented</option>
                <option value="Maintenance">Maintenance</option>
                <option value="Retired">Retired</option>
              </select>
              <button
                onClick={handleBulkExport}
                className="flex items-center space-x-2 px-4 py-2 bg-white/5 hover:bg-white/10 border border-white/10 rounded-xl text-[10px] font-mono text-gray-400 hover:text-white transition-all"
              >
                <Download size={14} />
                <span>Export Selected</span>
              </button>
              <button
                onClick={handleBulkDelete}
                className="flex items-center space-x-2 px-4 py-2 bg-red-500/10 hover:bg-red-500/20 border border-red-500/30 rounded-xl text-[10px] font-mono text-red-500 hover:text-red-400 transition-all"
              >
                <Trash2 size={14} />
                <span>Delete</span>
              </button>
              <button
                onClick={() => { setShowBulkPanel(false); setSelectedIds([]); }}
                className="p-2 hover:bg-white/5 rounded-lg text-gray-500 hover:text-white transition-colors"
              >
                <XCircle size={20} />
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Scheduled Maintenance Calendar Alert */}
      {scheduledMaintenances.length > 0 && (
        <div className="bg-blue-500/5 border border-blue-500/20 rounded-2xl p-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-full bg-blue-500/10 flex items-center justify-center text-blue-500">
              <Calendar size={16} />
            </div>
            <span className="text-xs font-mono text-blue-400">{scheduledMaintenances.length} scheduled maintenance items</span>
          </div>
          <button
            onClick={() => setShowScheduleModal(true)}
            className="text-[10px] font-mono text-blue-500 hover:underline uppercase tracking-wider"
          >
            View Schedule
          </button>
        </div>
      )}

      {/* Inventory Display */}
      {viewMode === 'grid' ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredInventory.map((item, i) => (
            <motion.div
              key={item.id}
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: i * 0.05 }}
              className="group bg-[#0a0a0a] border border-white/10 rounded-2xl overflow-hidden hover:border-[#A855F7]/50 transition-all shadow-xl"
            >
              <div className="p-6 space-y-6">
                <div className="flex items-start justify-between">
                  <div className="flex items-start gap-3">
                    <button
                      onClick={() => toggleSelectItem(item.id)}
                      className={`mt-1 w-5 h-5 rounded border flex items-center justify-center transition-all ${
                        selectedIds.includes(item.id) ? 'bg-[#A855F7] border-[#A855F7] text-black'
                          : 'border-gray-600 hover:border-[#A855F7]'
                      }`}
                    >
                      {selectedIds.includes(item.id) && <CheckCircle2 size={14} />}
                    </button>
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <span className="text-[10px] font-mono font-bold text-[#A855F7] uppercase tracking-widest">[{item.id}]</span>
                        <StatusBadge status={item.status} />
                      </div>
                      <h3 className="text-xl font-bold text-white group-hover:text-[#A855F7] transition-colors uppercase tracking-tight italic">{item.name}</h3>
                    </div>
                  </div>
                  <button
                    onClick={() => setSelectedItem(item)}
                    className="p-2 text-gray-600 hover:text-white transition-colors bg-white/5 rounded-lg"
                  >
                    <MoreVertical size={18} />
                  </button>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="bg-white/[0.02] p-3 rounded-xl border border-white/5">
                    <p className="text-[9px] font-mono font-bold text-gray-600 uppercase tracking-widest mb-1">Location</p>
                    <div className="flex items-center gap-1.5">
                      <MapPin size={12} className="text-[#A855F7]" />
                      <p className="text-xs text-white font-mono uppercase">{item.location}</p>
                    </div>
                  </div>
                  <div className="bg-white/[0.02] p-3 rounded-xl border border-white/5">
                    <p className="text-[9px] font-mono font-bold text-gray-600 uppercase tracking-widest mb-1">Last Service</p>
                    <div className="flex items-center gap-1.5">
                      <Clock size={12} className="text-[#A855F7]" />
                      <p className="text-xs text-white font-mono uppercase">{item.lastService}</p>
                    </div>
                  </div>
                  <div className="bg-white/[0.02] p-3 rounded-xl border border-white/5 col-span-2">
                    <p className="text-[9px] font-mono font-bold text-gray-600 uppercase tracking-widest mb-1">Serial Number</p>
                    <p className="text-xs text-white font-mono uppercase">{item.serialNumber}</p>
                  </div>
                </div>

                <div className="space-y-4">
                  <div className="space-y-2">
                    <div className="flex items-center justify-between text-[9px] font-mono font-bold uppercase tracking-widest">
                      <span className="text-gray-500">System Health</span>
                      <span className={item.health > 90 ? 'text-emerald-500' : 'text-amber-500'}>{item.health}%</span>
                    </div>
                    <HealthBar health={item.health} />
                  </div>

                  <div className="space-y-2 pt-2 border-t border-white/5">
                    <div className="flex items-center justify-between text-[9px] font-mono font-bold uppercase tracking-widest">
                      <span className="text-gray-500">ROI Progress</span>
                      <span className={item.totalRevenue >= item.purchasePrice ? 'text-amber-400' : 'text-gray-400'}>
                        {formatCurrency(item.totalRevenue)} / {formatCurrency(item.purchasePrice)}
                      </span>
                    </div>
                    <div className="w-full h-1 bg-white/5 rounded-full overflow-hidden relative">
                      <div
                        className={`absolute top-0 left-0 h-full ${item.totalRevenue >= item.purchasePrice ? 'bg-amber-400 shadow-[0_0_10px_#fbbf24]' : 'bg-[#A855F7]'}`}
                        style={{ width: `${Math.min(100, (item.totalRevenue / item.purchasePrice) * 100)}%` }}
                      />
                    </div>
                  </div>
                </div>

                <div className="pt-4 border-t border-white/5 flex items-center justify-between">
                  <div className="relative">
                    <select
                      value={item.status}
                      onChange={(e) => handleStatusUpdate(item.id, e.target.value as InventoryStatus)}
                      className="appearance-none bg-white/5 border border-white/10 rounded-lg pl-3 pr-8 py-1.5 text-[10px] font-mono font-bold uppercase text-[#A855F7] focus:outline-none focus:border-[#A855F7] transition-all cursor-pointer hover:bg-white/10"
                    >
                      <option value="Available">Available</option>
                      <option value="Rented">Rented</option>
                      <option value="Maintenance">Maintenance</option>
                      <option value="Retired">Retired</option>
                    </select>
                    <div className="absolute right-2 top-1/2 -translate-y-1/2 pointer-events-none">
                      <ChevronRight size={10} className="rotate-90 text-gray-500" />
                    </div>
                  </div>
                  <button
                    onClick={() => {
                      setSelectedItem(item);
                      setActiveTab('maintenance');
                    }}
                    className="text-[9px] font-mono font-black text-[#A855F7] uppercase tracking-widest hover:underline flex items-center gap-1 bg-[#A855F7]/5 px-2 py-1 rounded-lg border border-[#A855F7]/10 hover:bg-[#A855F7]/10 transition-all"
                  >
                    History <ChevronRight size={10} />
                  </button>
                </div>
              </div>
            </motion.div>
          ))}
        </div>
      ) : (
        <div className="bg-[#0a0a0a] border border-white/10 rounded-2xl overflow-hidden shadow-2xl">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-white/[0.02] border-b border-white/10">
                  <th className="p-4 w-12">
                    <button
                      onClick={toggleSelectAll}
                      className={`w-5 h-5 rounded border flex items-center justify-center transition-all ${
                        selectedIds.length === filteredInventory.length && filteredInventory.length > 0
                          ? 'bg-[#A855F7] border-[#A855F7] text-black'
                          : 'border-gray-600 hover:border-[#A855F7]'
                      }`}
                    >
                      {selectedIds.length === filteredInventory.length && filteredInventory.length > 0 && <CheckCircle2 size={14} />}
                    </button>
                  </th>
                  <th className="p-4 text-[10px] font-mono font-bold text-gray-500 uppercase tracking-widest">Asset ID</th>
                  <th className="p-4 text-[10px] font-mono font-bold text-gray-500 uppercase tracking-widest">Name</th>
                  <th className="p-4 text-[10px] font-mono font-bold text-gray-500 uppercase tracking-widest">Status</th>
                  <th className="p-4 text-[10px] font-mono font-bold text-gray-500 uppercase tracking-widest">Location</th>
                  <th className="p-4 text-[10px] font-mono font-bold text-gray-500 uppercase tracking-widest">Last Service</th>
                  <th className="p-4 text-[10px] font-mono font-bold text-gray-500 uppercase tracking-widest">Health</th>
                  <th className="p-4 text-[10px] font-mono font-bold text-gray-500 uppercase tracking-widest">Yield (ROI)</th>
                  <th className="p-4 text-[10px] font-mono font-bold text-gray-500 uppercase tracking-widest text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5">
                {filteredInventory.map((item) => (
                  <tr key={item.id} className="hover:bg-white/[0.01] transition-colors group">
                    <td className="p-4">
                      <button
                        onClick={() => toggleSelectItem(item.id)}
                        className={`w-5 h-5 rounded border flex items-center justify-center transition-all ${
                          selectedIds.includes(item.id)
                            ? 'bg-[#A855F7] border-[#A855F7] text-black'
                            : 'border-gray-600 hover:border-[#A855F7]'
                        }`}
                      >
                        {selectedIds.includes(item.id) && <CheckCircle2 size={14} />}
                      </button>
                    </td>
                    <td className="p-4">
                      <span className="text-[10px] font-mono font-bold text-[#A855F7]">[{item.id}]</span>
                    </td>
                    <td className="p-4">
                      <span className="text-xs font-bold text-white uppercase tracking-tight">{item.name}</span>
                    </td>
                    <td className="p-4">
                      <div className="relative inline-block">
                        <select
                          value={item.status}
                          onChange={(e) => handleStatusUpdate(item.id, e.target.value as InventoryStatus)}
                          className="appearance-none bg-white/5 border border-white/10 rounded px-2 py-1 text-[9px] font-mono font-bold uppercase text-[#A855F7] focus:outline-none focus:border-[#A855F7] transition-all cursor-pointer hover:bg-white/10 pr-6"
                        >
                          <option value="Available">Available</option>
                          <option value="Rented">Rented</option>
                          <option value="Maintenance">Maintenance</option>
                          <option value="Retired">Retired</option>
                        </select>
                        <div className="absolute right-1 top-1/2 -translate-y-1/2 pointer-events-none">
                          <ChevronRight size={8} className="rotate-90 text-gray-500" />
                        </div>
                      </div>
                    </td>
                    <td className="p-4">
                      <div className="flex items-center gap-1.5">
                        <MapPin size={10} className="text-gray-500" />
                        <span className="text-[10px] font-mono text-gray-400 uppercase">{item.location}</span>
                      </div>
                    </td>
                    <td className="p-4">
                      <div className="flex items-center gap-1.5">
                        <Clock size={10} className="text-gray-500" />
                        <span className="text-[10px] font-mono text-gray-400 uppercase">{item.lastService}</span>
                      </div>
                    </td>
                    <td className="p-4 w-32">
                      <div className="flex items-center gap-2">
                        <div className="flex-grow h-1 bg-white/5 rounded-full overflow-hidden">
                          <div className={`h-full ${item.health > 90 ? 'bg-emerald-500' : item.health > 70 ? 'bg-amber-500' : 'bg-red-500'}`} style={{ width: `${item.health}%` }} />
                        </div>
                        <span className="text-[9px] font-mono text-gray-500">{item.health}%</span>
                      </div>
                    </td>
                    <td className="p-4 w-32">
                      <div className="flex items-center gap-2">
                        <div className="flex-grow h-1 bg-white/5 rounded-full overflow-hidden">
                          <div
                            className={`h-full ${item.totalRevenue >= item.purchasePrice ? 'bg-amber-400' : 'bg-[#A855F7]'}`}
                            style={{ width: `${Math.min(100, (item.totalRevenue / item.purchasePrice) * 100)}%` }}
                          />
                        </div>
                        <span className="text-[9px] font-mono text-gray-500">
                          {Math.round((item.totalRevenue / item.purchasePrice) * 100)}%
                        </span>
                      </div>
                    </td>
                    <td className="p-4 text-right">
                      <button
                        onClick={() => setSelectedItem(item)}
                        className="p-1.5 text-gray-600 hover:text-white transition-colors bg-white/5 rounded-lg"
                      >
                        <MoreVertical size={14} />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Scanner Mode Overlay */}
      <AnimatePresence>
        {isScanning && (
          <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/95 backdrop-blur-md p-4">
            <motion.div
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.9 }}
              className="relative w-full max-w-md bg-[#0a0a0a] border border-white/10 rounded-3xl overflow-hidden flex flex-col items-center justify-center p-12 text-center"
            >
              <button
                onClick={() => setIsScanning(false)}
                className="absolute top-6 right-6 text-gray-500 hover:text-white transition-colors"
                title="Close Scanner"
              >
                <XCircle size={24} />
              </button>
              <div className="w-48 h-48 border-2 border-dashed border-[#A855F7] rounded-xl flex items-center justify-center mb-8 relative">
                <div className="absolute inset-0 bg-[#A855F7]/10 animate-pulse" />
                <div className="absolute inset-0 border border-[#A855F7] opacity-50 scale-110 animate-ping rounded-xl" />
                <QrCode size={48} className="text-[#A855F7]" />
              </div>
              <h3 className="text-2xl font-bold text-white mb-2 tracking-tighter uppercase italic">Scanner Mode Active</h3>
              <p className="text-gray-400 font-mono text-xs uppercase tracking-widest max-w-[250px]">
                Awaiting QR or Barcode Input from hardware tags
              </p>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Asset Detail & Maintenance Modal */}
      <AnimatePresence>
        {selectedItem && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/90 backdrop-blur-sm p-4">
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              className="bg-[#0a0a0a] border border-white/10 rounded-2xl w-full max-w-2xl max-h-[90vh] overflow-hidden flex flex-col shadow-2xl"
            >
              <div className="p-6 border-b border-white/10 flex justify-between items-center bg-white/[0.02]">
                <div className="flex items-center gap-4">
                  {selectedItem.image ? (
                    <img src={selectedItem.image} alt={selectedItem.name} className="w-12 h-12 rounded-xl object-cover border border-white/10" />
                  ) : (
                    <div className="w-12 h-12 rounded-xl bg-[#A855F7]/10 flex items-center justify-center text-[#A855F7] border border-[#A855F7]/20">
                      <Cpu size={24} />
                    </div>
                  )}
                  <div>
                    <div className="flex items-center gap-2 mb-1">
                      <span className="text-[10px] font-mono text-[#A855F7] uppercase tracking-[0.2em]">Asset ID: {selectedItem.id}</span>
                      <StatusBadge status={selectedItem.status} />
                    </div>
                    <h2 className="text-2xl font-bold text-white tracking-tighter uppercase italic">{selectedItem.name}</h2>
                  </div>
                </div>
                <div className="flex items-center space-x-2">
                  <button
                    onClick={handleEditToggle}
                    className={`p-2 rounded-full transition-colors ${isEditing ? 'bg-[#A855F7]/20 text-[#A855F7]' : 'hover:bg-white/5 text-gray-500 hover:text-white'}`}
                    title={isEditing ? "Save Changes" : "Edit Asset"}
                  >
                    {isEditing ? <Save className="h-5 w-5" /> : <Edit2 className="h-5 w-5" />}
                  </button>
                  <button
                    onClick={closeInventoryModal}
                    className="p-2 hover:bg-white/5 rounded-full transition-colors text-gray-500 hover:text-white"
                  >
                    <XCircle size={24} />
                  </button>
                </div>
              </div>

              <div className="flex-grow overflow-y-auto p-8">
                <div className="flex border-b border-white/10 mb-8 space-x-2 overflow-x-auto">
                  <button
                    onClick={() => setActiveTab('control')}
                    className={`px-6 py-3 text-[10px] font-mono font-bold uppercase tracking-widest transition-all relative whitespace-nowrap ${activeTab === 'control' ? 'text-white' : 'text-gray-500 hover:text-gray-300'}`}
                  >
                    Control Panel
                    {activeTab === 'control' && <motion.div layoutId="activeTab" className="absolute bottom-0 left-0 right-0 h-0.5 bg-[#A855F7]" />}
                  </button>
                  <button
                    onClick={() => setActiveTab('maintenance')}
                    className={`px-6 py-3 text-[10px] font-mono font-bold uppercase tracking-widest transition-all relative whitespace-nowrap ${activeTab === 'maintenance' ? 'text-white' : 'text-gray-500 hover:text-gray-300'}`}
                  >
                    Maintenance History
                    {activeTab === 'maintenance' && <motion.div layoutId="activeTab" className="absolute bottom-0 left-0 right-0 h-0.5 bg-[#A855F7]" />}
                  </button>
                  <button
                    onClick={() => setActiveTab('rentals')}
                    className={`px-6 py-3 text-[10px] font-mono font-bold uppercase tracking-widest transition-all relative whitespace-nowrap ${activeTab === 'rentals' ? 'text-white' : 'text-gray-500 hover:text-gray-300'}`}
                  >
                    Rental History
                    {activeTab === 'rentals' && <motion.div layoutId="activeTab" className="absolute bottom-0 left-0 right-0 h-0.5 bg-[#A855F7]" />}
                  </button>
                  <button
                    onClick={() => setActiveTab('transfers')}
                    className={`px-6 py-3 text-[10px] font-mono font-bold uppercase tracking-widest transition-all relative whitespace-nowrap ${activeTab === 'transfers' ? 'text-white' : 'text-gray-500 hover:text-gray-300'}`}
                  >
                    Transfers
                    {activeTab === 'transfers' && <motion.div layoutId="activeTab" className="absolute bottom-0 left-0 right-0 h-0.5 bg-[#A855F7]" />}
                  </button>
                  <button
                    onClick={() => setActiveTab('warranty')}
                    className={`px-6 py-3 text-[10px] font-mono font-bold uppercase tracking-widest transition-all relative whitespace-nowrap ${activeTab === 'warranty' ? 'text-white' : 'text-gray-500 hover:text-gray-300'}`}
                  >
                    Warranty & Insurance
                    {activeTab === 'warranty' && <motion.div layoutId="activeTab" className="absolute bottom-0 left-0 right-0 h-0.5 bg-[#A855F7]" />}
                  </button>
                  <button
                    onClick={() => setActiveTab('depreciation')}
                    className={`px-6 py-3 text-[10px] font-mono font-bold uppercase tracking-widest transition-all relative whitespace-nowrap ${activeTab === 'depreciation' ? 'text-white' : 'text-gray-500 hover:text-gray-300'}`}
                  >
                    Depreciation
                    {activeTab === 'depreciation' && <motion.div layoutId="activeTab" className="absolute bottom-0 left-0 right-0 h-0.5 bg-[#A855F7]" />}
                  </button>
                </div>

                {activeTab === 'control' && (
                  <div className="space-y-8">
                    {/* Unit Command Center */}
                    <div className="bg-[#A855F7]/5 border border-[#A855F7]/20 rounded-2xl p-6 flex flex-col md:flex-row gap-8 items-center">
                      <div className="bg-white p-2 rounded-xl shrink-0 shadow-[0_0_30px_rgba(168,85,247,0.2)]">
                        <QrCode size={120} className="text-black" />
                        <p className="text-[8px] font-black text-center text-black mt-1 tracking-tighter uppercase">{selectedItem.id}</p>
                      </div>
                      <div className="flex-grow space-y-4">
                        <div className="flex items-center justify-between">
                          <div>
                            <h3 className="text-sm font-black uppercase tracking-widest text-white italic">Unit Command Center</h3>
                            <p className="text-[9px] font-mono text-[#A855F7] uppercase tracking-widest mt-1">Direct Hardware Link // OS v{selectedItem.firmwareVersion || '2.4.0'}</p>
                          </div>
                          <button className="px-4 py-2 bg-white/5 border border-white/10 rounded-xl text-[10px] font-black uppercase tracking-widest hover:bg-white/10 transition-all flex items-center gap-2">
                            <Download size={14} />
                            Print Label
                          </button>
                        </div>
                        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                          <div className="bg-black/40 p-3 rounded-xl border border-white/5">
                            <p className="text-[8px] font-mono text-gray-500 uppercase mb-1">Status</p>
                            <p className="text-[10px] font-black text-emerald-500 uppercase tracking-widest">SIGNAL_LOCK</p>
                          </div>
                          <div className="bg-black/40 p-3 rounded-xl border border-white/5">
                            <p className="text-[8px] font-mono text-gray-500 uppercase mb-1">Uptime</p>
                            <p className="text-[10px] font-black text-white uppercase tracking-widest">1,244 HRS</p>
                          </div>
                          <div className="bg-black/40 p-3 rounded-xl border border-white/5">
                            <p className="text-[8px] font-mono text-gray-500 uppercase mb-1">Last Sync</p>
                            <p className="text-[10px] font-black text-white uppercase tracking-widest">2 MIN AGO</p>
                          </div>
                          <div className="bg-black/40 p-3 rounded-xl border border-white/5">
                            <p className="text-[8px] font-mono text-gray-500 uppercase mb-1">Battery/Power</p>
                            <p className="text-[10px] font-black text-[#A855F7] uppercase tracking-widest">STABLE</p>
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Asset Condition Gallery */}
                    <div className="space-y-4">
                      <div className="flex items-center justify-between">
                        <h3 className="text-[10px] font-mono font-bold text-gray-500 uppercase tracking-[0.3em]">Evidence Timeline // Condition Assets</h3>
                        <button className="flex items-center gap-2 px-3 py-1.5 bg-white/5 text-gray-400 rounded-lg text-[9px] font-mono font-bold uppercase tracking-widest hover:bg-white/10 transition-all border border-white/5">
                          <Camera size={12} /> Add Evidence
                        </button>
                      </div>
                      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                        <div className="aspect-video bg-black rounded-xl border border-white/5 relative group overflow-hidden">
                          <img src={selectedItem.image} alt="Ref" className="w-full h-full object-cover opacity-40 group-hover:opacity-100 transition-opacity" />
                          <div className="absolute inset-0 bg-gradient-to-t from-black via-transparent to-transparent flex items-end p-3">
                            <p className="text-[8px] font-mono text-white/60 uppercase">Pre-Deployment // {selectedItem.lastService}</p>
                          </div>
                        </div>
                        {selectedItem.conditionLogs?.map((log, idx) => (
                          <div key={idx} className="aspect-video bg-black rounded-xl border border-white/5 relative group overflow-hidden">
                            <img src={log.photoUrl} alt="Log" className="w-full h-full object-cover opacity-40 group-hover:opacity-100 transition-opacity" />
                            <div className="absolute inset-0 bg-gradient-to-t from-black via-transparent to-transparent flex items-end p-3">
                              <p className="text-[8px] font-mono text-white/60 uppercase">Log_{idx + 1} // {log.date}</p>
                            </div>
                          </div>
                        ))}
                        <button className="aspect-video bg-white/[0.02] border border-dashed border-white/10 rounded-xl flex flex-col items-center justify-center gap-2 hover:bg-white/[0.05] transition-all group">
                          <Upload size={20} className="text-gray-600 group-hover:text-[#A855F7]" />
                          <span className="text-[8px] font-black text-gray-600 uppercase tracking-widest">Upload Frame</span>
                        </button>
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-6">
                      <div className="space-y-4">
                        <h3 className="text-[10px] font-mono font-bold text-gray-500 uppercase tracking-[0.3em]">Status Controls</h3>
                        <div className="grid grid-cols-1 gap-2">
                          {(['Available', 'Rented', 'Maintenance', 'Retired'] as InventoryStatus[]).map(status => (
                            <button
                              key={status}
                              onClick={() => handleStatusUpdate(selectedItem.id, status)}
                              className={`flex items-center justify-between p-4 rounded-xl border transition-all ${selectedItem.status === status
                                ? 'bg-[#A855F7]/10 border-[#A855F7] text-white'
                                : 'bg-white/[0.02] border-white/5 text-gray-500 hover:border-white/20 hover:text-gray-300'
                                }`}
                            >
                              <span className="text-xs font-mono font-bold uppercase tracking-widest">{status}</span>
                              {selectedItem.status === status && <CheckCircle2 size={16} className="text-[#A855F7]" />}
                            </button>
                          ))}
                        </div>
                      </div>
                      <div className="space-y-6">
                        <div className="space-y-4">
                          <h3 className="text-[10px] font-mono font-bold text-gray-500 uppercase tracking-[0.3em]">Hardware Specifications</h3>
                          <div className="bg-white/[0.02] border border-white/5 rounded-2xl p-6 space-y-4">
                            <div className="flex justify-between items-center">
                              <span className="text-[10px] font-mono text-gray-600 uppercase">Serial Number</span>
                              {isEditing ? (
                                <input
                                  type="text"
                                  value={editForm.serialNumber || ''}
                                  onChange={(e) => handleEditChange('serialNumber', e.target.value)}
                                  className="w-1/2 bg-black border border-white/10 rounded px-2 py-1 text-white font-mono text-xs focus:outline-none focus:border-[#A855F7] text-right"
                                />
                              ) : (
                                <span className="text-xs font-mono text-white">{selectedItem.serialNumber}</span>
                              )}
                            </div>
                            <div className="flex justify-between items-center">
                              <span className="text-[10px] font-mono text-gray-600 uppercase">Purchase Date</span>
                              {isEditing ? (
                                <input
                                  type="date"
                                  value={editForm.purchaseDate || ''}
                                  onChange={(e) => handleEditChange('purchaseDate', e.target.value)}
                                  className="w-1/2 bg-black border border-white/10 rounded px-2 py-1 text-white font-mono text-xs focus:outline-none focus:border-[#A855F7] text-right"
                                />
                              ) : (
                                <span className="text-xs font-mono text-white">{selectedItem.purchaseDate}</span>
                              )}
                            </div>
                            <div className="flex justify-between items-center">
                              <span className="text-[10px] font-mono text-gray-600 uppercase">Current Location</span>
                              {isEditing ? (
                                <input
                                  type="text"
                                  value={editForm.location || ''}
                                  onChange={(e) => handleEditChange('location', e.target.value)}
                                  className="w-1/2 bg-black border border-white/10 rounded px-2 py-1 text-white font-mono text-xs focus:outline-none focus:border-[#A855F7] text-right"
                                />
                              ) : (
                                <span className="text-xs font-mono text-white">{selectedItem.location}</span>
                              )}
                            </div>
                            <div className="flex justify-between items-center">
                              <span className="text-[10px] font-mono text-gray-600 uppercase">Base Price / Day</span>
                              {isEditing ? (
                                <input
                                  type="number"
                                  value={editForm.basePricePerDay || 0}
                                  onChange={(e) => handleEditChange('basePricePerDay', parseFloat(e.target.value))}
                                  className="w-1/2 bg-black border border-white/10 rounded px-2 py-1 text-white font-mono text-xs focus:outline-none focus:border-[#A855F7] text-right"
                                />
                              ) : (
                                <span className="text-xs font-mono text-white">${selectedItem.basePricePerDay?.toFixed(2) || '0.00'}</span>
                              )}
                            </div>
                            <div className="flex justify-between items-center">
                              <span className="text-[10px] font-mono text-gray-600 uppercase">Image URL</span>
                              {isEditing ? (
                                <input
                                  type="text"
                                  value={editForm.image || ''}
                                  onChange={(e) => handleEditChange('image', e.target.value)}
                                  className="w-1/2 bg-black border border-white/10 rounded px-2 py-1 text-white font-mono text-xs focus:outline-none focus:border-[#A855F7] text-right"
                                />
                              ) : (
                                <span className="text-xs font-mono text-white truncate max-w-[150px]">{selectedItem.image || 'N/A'}</span>
                              )}
                            </div>
                            <div className="flex justify-between items-center">
                              <span className="text-[10px] font-mono text-gray-600 uppercase">Dynamic Pricing</span>
                              {isEditing ? (
                                <input
                                  type="checkbox"
                                  checked={editForm.dynamicPricingEnabled || false}
                                  onChange={(e) => handleEditChange('dynamicPricingEnabled', e.target.checked)}
                                  className="rounded bg-black border border-white/10 text-[#A855F7] focus:ring-[#A855F7]"
                                />
                              ) : (
                                <span className={`text-[10px] font-mono uppercase font-bold ${selectedItem.dynamicPricingEnabled ? 'text-emerald-500' : 'text-gray-500'}`}>
                                  {selectedItem.dynamicPricingEnabled ? 'Active' : 'Disabled'}
                                </span>
                              )}
                            </div>
                          </div>
                        </div>
                        <div className="space-y-4">
                          <h3 className="text-[10px] font-mono font-bold text-gray-500 uppercase tracking-[0.3em]">System Health Status</h3>
                          <div className="bg-white/[0.02] border border-white/5 rounded-2xl p-6">
                            <div className="flex items-center justify-between mb-4">
                              <span className="text-3xl font-bold text-white">{selectedItem.health}%</span>
                              <Activity size={24} className={selectedItem.health > 90 ? 'text-emerald-500' : 'text-amber-500'} />
                            </div>
                            <HealthBar health={selectedItem.health} />
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Elite Features: Kitting & Evidence */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pt-6 border-t border-white/10">
                      {/* Kitting Checklist */}
                      <div className="space-y-4">
                        <div className="flex justify-between items-center">
                          <h3 className="text-[10px] font-mono font-bold text-gray-500 uppercase tracking-[0.3em]">Kitting Checklist</h3>
                          <span className="text-[10px] font-mono text-[#A855F7] bg-[#A855F7]/10 px-2 py-0.5 rounded border border-[#A855F7]/20">Loss Prevention Enabled</span>
                        </div>
                        <div className="bg-white/[0.02] border border-white/5 rounded-2xl p-4">
                          {selectedItem.kitRequired?.map(item => (
                            <div key={item} className="flex items-center justify-between p-3 border-b border-white/5 last:border-0 hover:bg-white/[0.02] transition-colors rounded-lg">
                              <span className="text-xs font-mono text-gray-300">{item}</span>
                              <button
                                onClick={() => {
                                  if (!isEditing) return; // Only toggleable in edit mode
                                  const currentKit = editForm.kitStatus || selectedItem.kitStatus;
                                  const currentStatus = currentKit?.[item] ?? false;
                                  handleEditChange('kitStatus', { ...currentKit, [item]: !currentStatus });
                                }}
                                className={`w-6 h-6 rounded-md border flex items-center justify-center transition-all ${(isEditing ? editForm.kitStatus?.[item] : selectedItem.kitStatus?.[item])
                                  ? 'bg-emerald-500/20 border-emerald-500/50 text-emerald-500'
                                  : 'bg-red-500/20 border-red-500/50 text-red-500'
                                  } ${!isEditing && 'cursor-default'}`}
                              >
                                {(isEditing ? editForm.kitStatus?.[item] : selectedItem.kitStatus?.[item]) ? <CheckCircle2 size={12} /> : <XCircle size={12} />}
                              </button>
                            </div>
                          ))}
                        </div>
                      </div>

                      {/* Condition Logs */}
                      <div className="space-y-4">
                        <div className="flex justify-between items-center">
                          <h3 className="text-[10px] font-mono font-bold text-gray-500 uppercase tracking-[0.3em]">Condition Logs</h3>
                          <button className="flex items-center gap-2 px-3 py-1 bg-[#A855F7]/10 text-[#A855F7] rounded-lg text-[9px] font-mono font-bold uppercase tracking-widest hover:bg-[#A855F7]/20 transition-all border border-[#A855F7]/20">
                            <Camera size={10} /> Add Evidence
                          </button>
                        </div>
                        <div className="grid grid-cols-2 gap-4">
                          <div className="aspect-video bg-white/[0.02] border border-white/10 rounded-xl flex flex-col items-center justify-center text-gray-500 border-dashed hover:border-[#A855F7]/50 hover:text-[#A855F7] transition-colors cursor-pointer group">
                            <Camera size={20} className="mb-2 opacity-50 group-hover:opacity-100 transition-opacity" />
                            <span className="text-[8px] font-mono uppercase">Upload Post-Return</span>
                          </div>
                          {selectedItem.conditionLogs?.map((log, idx) => (
                            <div key={idx} className="aspect-video bg-black rounded-xl overflow-hidden relative group border border-white/10">
                              <img src={log.photoUrl} alt="Condition" className="w-full h-full object-cover opacity-80" />
                              <div className="absolute inset-0 bg-gradient-to-t from-black/80 to-transparent flex items-end p-2 opacity-0 group-hover:opacity-100 transition-opacity">
                                <span className="text-[9px] font-mono text-white truncate px-1">{log.date}</span>
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    </div>
                  </div>
                )}

                {activeTab === 'maintenance' && (
                  <div className="space-y-6">
                    <div className="flex items-center justify-between">
                      <h3 className="text-[10px] font-mono font-bold text-gray-500 uppercase tracking-[0.3em]">Maintenance Log</h3>
                      <button className="flex items-center gap-2 px-3 py-1.5 bg-[#A855F7]/10 text-[#A855F7] rounded-lg text-[9px] font-mono font-bold uppercase tracking-widest hover:bg-[#A855F7]/20 transition-all">
                        <Plus size={12} /> Add Record
                      </button>
                    </div>
                    <div className="space-y-4">
                      {selectedItem.maintenanceHistory.map((record, idx) => (
                        <div key={idx} className="bg-white/[0.02] border border-white/5 rounded-2xl p-6 space-y-4 relative overflow-hidden group">
                          <div className="absolute top-0 right-0 p-4 opacity-5 group-hover:opacity-10 transition-opacity">
                            <History size={32} />
                          </div>
                          <div className="flex items-start justify-between">
                            <div>
                              <p className="text-xs font-bold text-white uppercase tracking-tight">{record.type}</p>
                              <p className="text-[10px] font-mono text-gray-500 uppercase">{record.date} // {record.technician}</p>
                            </div>
                            <span className="text-xs font-mono font-bold text-[#A855F7]">{formatCurrency(record.cost)}</span>
                          </div>
                          <p className="text-[10px] font-mono text-gray-400 leading-relaxed italic">"{record.notes}"</p>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {activeTab === 'rentals' && (
                  <div className="space-y-6">
                    <div className="flex items-center justify-between mb-4">
                      <h3 className="text-[10px] font-mono font-bold text-gray-500 uppercase tracking-[0.3em]">Rental History</h3>
                    </div>
                    <div className="bg-black/50 border border-white/5 rounded-2xl overflow-hidden">
                      <table className="w-full text-left">
                        <thead className="bg-white/[0.02] text-gray-500 text-[9px] font-mono uppercase tracking-widest border-b border-white/5">
                          <tr>
                            <th className="px-4 py-3">Rental ID</th>
                            <th className="px-4 py-3">User</th>
                            <th className="px-4 py-3">Period</th>
                            <th className="px-4 py-3">Status</th>
                            <th className="px-4 py-3 text-right">Price</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-white/5 text-[10px] font-mono text-gray-400">
                          {selectedItem.rentalHistory && selectedItem.rentalHistory.length > 0 ? (
                            selectedItem.rentalHistory.map((rental, idx) => (
                              <tr key={idx} className="hover:bg-white/[0.02] transition-colors">
                                <td className="px-4 py-3 text-[#A855F7] font-bold">[{rental.rentalId}]</td>
                                <td className="px-4 py-3 text-white">{rental.user}</td>
                                <td className="px-4 py-3">{rental.startDate} to {rental.endDate}</td>
                                <td className="px-4 py-3">
                                  <span className={`px-2 py-0.5 rounded border uppercase tracking-tighter ${rental.status === 'completed' ? 'text-emerald-500 border-emerald-500/20 bg-emerald-500/10' :
                                    rental.status === 'late' ? 'text-red-500 border-red-500/20 bg-red-500/10' :
                                      'text-blue-500 border-blue-500/20 bg-blue-500/10'
                                    }`}>
                                    {rental.status}
                                  </span>
                                </td>
                                <td className="px-4 py-3 text-right text-white font-bold">${rental.price.toFixed(2)}</td>
                              </tr>
                            ))
                          ) : (
                            <tr>
                              <td colSpan={5} className="px-4 py-8 text-center text-gray-600 uppercase tracking-widest">
                                No rental history found for this asset
                              </td>
                            </tr>
                          )}
                        </tbody>
                      </table>
                    </div>
                  </div>
                )}

                {activeTab === 'transfers' && (
                  <div className="space-y-6">
                    <div className="flex items-center justify-between">
                      <h3 className="text-[10px] font-mono font-bold text-gray-500 uppercase tracking-[0.3em]">Transfer History</h3>
                      <button 
                        onClick={() => setShowTransferModal(true)}
                        className="flex items-center gap-2 px-3 py-1.5 bg-[#A855F7]/10 text-[#A855F7] rounded-lg text-[9px] font-mono font-bold uppercase tracking-widest hover:bg-[#A855F7]/20 transition-all"
                      >
                        <Truck size={12} /> Transfer Asset
                      </button>
                    </div>
                    <div className="space-y-4">
                      {selectedItem.transferHistory && selectedItem.transferHistory.length > 0 ? (
                        selectedItem.transferHistory.map((transfer, idx) => (
                          <div key={idx} className="bg-white/[0.02] border border-white/5 rounded-2xl p-6 space-y-3">
                            <div className="flex items-center justify-between">
                              <div className="flex items-center gap-2">
                                <Truck size={16} className="text-[#A855F7]" />
                                <span className="text-xs font-bold text-white uppercase">{transfer.fromLocation}</span>
                                <ArrowRight size={12} className="text-gray-500" />
                                <span className="text-xs font-bold text-[#A855F7] uppercase">{transfer.toLocation}</span>
                              </div>
                              <span className="text-[10px] font-mono text-gray-500">{transfer.date}</span>
                            </div>
                            <div className="flex items-center justify-between text-[10px] font-mono">
                              <span className="text-gray-400">By: {transfer.transferredBy}</span>
                              <span className="text-gray-600 italic">"{transfer.notes}"</span>
                            </div>
                          </div>
                        ))
                      ) : (
                        <div className="bg-white/[0.02] border border-dashed border-white/10 rounded-2xl p-12 text-center">
                          <Truck size={32} className="text-gray-600 mx-auto mb-4 opacity-30" />
                          <p className="text-gray-500 font-mono text-xs uppercase tracking-widest">No transfers recorded</p>
                        </div>
                      )}
                    </div>
                  </div>
                )}

                {activeTab === 'warranty' && (
                  <div className="space-y-6">
                    <div className="flex items-center justify-between">
                      <h3 className="text-[10px] font-mono font-bold text-gray-500 uppercase tracking-[0.3em]">Warranty & Insurance</h3>
                      <button 
                        onClick={() => {
                          setWarrantyForm({
                            warrantyExpiry: selectedItem.warrantyExpiry || '',
                            insurancePolicy: selectedItem.insurancePolicy || '',
                            insuranceExpiry: selectedItem.insuranceExpiry || '',
                            depreciationRate: selectedItem.depreciationRate || 10
                          });
                          setShowWarrantyModal(true);
                        }}
                        className="flex items-center gap-2 px-3 py-1.5 bg-[#A855F7]/10 text-[#A855F7] rounded-lg text-[9px] font-mono font-bold uppercase tracking-widest hover:bg-[#A855F7]/20 transition-all"
                      >
                        <Edit2 size={12} /> Edit
                      </button>
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div className="bg-white/[0.02] border border-white/5 rounded-2xl p-6">
                        <div className="flex items-center gap-3 mb-4">
                          <ShieldCheck size={20} className="text-emerald-500" />
                          <h4 className="text-xs font-bold text-white uppercase">Warranty</h4>
                        </div>
                        <div className="space-y-3">
                          <div className="flex justify-between items-center">
                            <span className="text-[10px] font-mono text-gray-500 uppercase">Expiry Date</span>
                            <span className={`text-xs font-mono font-bold ${new Date(selectedItem.warrantyExpiry || '2024-01-01') < new Date() ? 'text-red-500' : 'text-white'}`}>
                              {selectedItem.warrantyExpiry || 'Not Set'}
                            </span>
                          </div>
                          <div className="w-full h-1 bg-white/5 rounded-full overflow-hidden">
                            <div 
                              className={`h-full ${new Date(selectedItem.warrantyExpiry || '2024-01-01') < new Date() ? 'bg-red-500' : 'bg-emerald-500'}`}
                              style={{ width: '100%' }}
                            />
                          </div>
                        </div>
                      </div>
                      <div className="bg-white/[0.02] border border-white/5 rounded-2xl p-6">
                        <div className="flex items-center gap-3 mb-4">
                          <Shield size={20} className="text-blue-500" />
                          <h4 className="text-xs font-bold text-white uppercase">Insurance</h4>
                        </div>
                        <div className="space-y-3">
                          <div className="flex justify-between items-center">
                            <span className="text-[10px] font-mono text-gray-500 uppercase">Policy</span>
                            <span className="text-xs font-mono text-white">{selectedItem.insurancePolicy || 'Not Set'}</span>
                          </div>
                          <div className="flex justify-between items-center">
                            <span className="text-[10px] font-mono text-gray-500 uppercase">Expires</span>
                            <span className={`text-xs font-mono font-bold ${new Date(selectedItem.insuranceExpiry || '2024-01-01') < new Date() ? 'text-red-500' : 'text-white'}`}>
                              {selectedItem.insuranceExpiry || 'Not Set'}
                            </span>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                )}

                {activeTab === 'depreciation' && (
                  <div className="space-y-6">
                    <div className="flex items-center justify-between">
                      <h3 className="text-[10px] font-mono font-bold text-gray-500 uppercase tracking-[0.3em]">Depreciation Analysis</h3>
                      <button 
                        onClick={() => {
                          setWarrantyForm({
                            warrantyExpiry: selectedItem.warrantyExpiry || '',
                            insurancePolicy: selectedItem.insurancePolicy || '',
                            insuranceExpiry: selectedItem.insuranceExpiry || '',
                            depreciationRate: selectedItem.depreciationRate || 10
                          });
                          setShowDepreciationModal(true);
                        }}
                        className="flex items-center gap-2 px-3 py-1.5 bg-[#A855F7]/10 text-[#A855F7] rounded-lg text-[9px] font-mono font-bold uppercase tracking-widest hover:bg-[#A855F7]/20 transition-all"
                      >
                        <Percent size={12} /> Adjust Rate
                      </button>
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                      <div className="bg-white/[0.02] border border-white/5 rounded-2xl p-6 text-center">
                        <p className="text-[10px] font-mono text-gray-500 uppercase tracking-widest mb-2">Purchase Price</p>
                        <p className="text-2xl font-bold text-white">{formatCurrency(selectedItem.purchasePrice || 0)}</p>
                      </div>
                      <div className="bg-white/[0.02] border border-white/5 rounded-2xl p-6 text-center">
                        <p className="text-[10px] font-mono text-gray-500 uppercase tracking-widest mb-2">Current Value</p>
                        <p className="text-2xl font-bold text-[#A855F7]">{formatCurrency(calculateDepreciation(selectedItem))}</p>
                      </div>
                      <div className="bg-white/[0.02] border border-white/5 rounded-2xl p-6 text-center">
                        <p className="text-[10px] font-mono text-gray-500 uppercase tracking-widest mb-2">Depreciation Rate</p>
                        <p className="text-2xl font-bold text-amber-400">{selectedItem.depreciationRate || 10}%</p>
                      </div>
                    </div>
                    <div className="bg-white/[0.02] border border-white/5 rounded-2xl p-6">
                      <div className="flex items-center justify-between mb-4">
                        <span className="text-[10px] font-mono text-gray-500 uppercase">Value Over Time</span>
                        <span className="text-xs font-mono text-emerald-500">
                          {Math.round((calculateDepreciation(selectedItem) / (selectedItem.purchasePrice || 1)) * 100)}% of original
                        </span>
                      </div>
                      <div className="w-full h-3 bg-white/5 rounded-full overflow-hidden">
                        <div 
                          className="h-full bg-gradient-to-r from-red-500 via-amber-500 to-emerald-500"
                          style={{ width: `${Math.round((calculateDepreciation(selectedItem) / (selectedItem.purchasePrice || 1)) * 100)}%` }}
                        />
                      </div>
                      <div className="flex justify-between mt-2 text-[8px] font-mono text-gray-600">
                        <span>0%</span>
                        <span>25%</span>
                        <span>50%</span>
                        <span>75%</span>
                        <span>100%</span>
                      </div>
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div className="bg-white/[0.02] border border-white/5 rounded-2xl p-6">
                        <div className="flex items-center gap-2 mb-3">
                          <TrendingUp size={16} className="text-emerald-500" />
                          <span className="text-xs font-bold text-white uppercase">Total Revenue</span>
                        </div>
                        <p className="text-xl font-bold text-emerald-400">{formatCurrency(selectedItem.totalRevenue || 0)}</p>
                      </div>
                      <div className="bg-white/[0.02] border border-white/5 rounded-2xl p-6">
                        <div className="flex items-center gap-2 mb-3">
                          <Wallet size={16} className="text-amber-400" />
                          <span className="text-xs font-bold text-white uppercase">Net Value</span>
                        </div>
                        <p className="text-xl font-bold text-amber-400">
                          {formatCurrency((selectedItem.totalRevenue || 0) + calculateDepreciation(selectedItem) - (selectedItem.purchasePrice || 0))}
                        </p>
                      </div>
                    </div>
                  </div>
                )}
              </div>

              <div className="p-6 bg-white/[0.02] border-t border-white/10 flex justify-end gap-3">
                <button
                  onClick={closeInventoryModal}
                  className="px-6 py-2 bg-white/5 text-gray-400 rounded-xl font-mono text-[10px] uppercase tracking-widest hover:bg-white/10 transition-colors border border-white/5"
                >
                  Close Matrix
                </button>
                {isEditing && (
                  <button
                    onClick={handleEditToggle}
                    className="px-6 py-2 bg-[#A855F7] text-black rounded-xl font-bold font-mono text-[10px] uppercase tracking-widest hover:bg-[#9333EA] transition-all"
                  >
                    Save Changes
                  </button>
                )}
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Add Asset Modal */}
      <AnimatePresence>
        {isAdding && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/90 backdrop-blur-sm p-4">
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              className="bg-[#0a0a0a] border border-white/10 rounded-2xl w-full max-w-md overflow-hidden flex flex-col shadow-2xl"
            >
              <div className="p-6 border-b border-white/10 flex justify-between items-center bg-white/[0.02]">
                <div className="flex items-center gap-4">
                  <div className="w-10 h-10 rounded-xl bg-[#A855F7]/10 flex items-center justify-center text-[#A855F7] border border-[#A855F7]/20">
                    <Plus size={20} />
                  </div>
                  <div>
                    <h2 className="text-xl font-bold text-white tracking-tighter uppercase italic">Add Asset</h2>
                  </div>
                </div>
                <button
                  onClick={() => setIsAdding(false)}
                  className="p-2 hover:bg-white/5 rounded-full transition-colors text-gray-500 hover:text-white"
                >
                  <XCircle size={24} />
                </button>
              </div>

              <form onSubmit={handleAddAsset} className="p-6 space-y-4">
                <div className="space-y-2">
                  <label className="text-[10px] font-mono uppercase tracking-widest text-gray-500">Select Product Template</label>
                  <select
                    required
                    value={editForm.name || ''}
                    onChange={(e) => {
                      const template = products.find(p => p.name === e.target.value);
                      if (template) {
                        setEditForm({
                          ...editForm,
                          name: template.name,
                          category: template.category
                        });
                      } else {
                        handleEditChange('name', e.target.value);
                      }
                    }}
                    className="w-full bg-black border border-white/10 rounded-lg px-3 py-2 text-white font-mono text-xs focus:outline-none focus:border-[#A855F7] appearance-none"
                  >
                    <option value="">-- Select Hardware Model --</option>
                    {products.map(p => (
                      <option key={p.id} value={p.name}>{p.name}</option>
                    ))}
                    <option value="custom">-- Custom Entry --</option>
                  </select>
                </div>
                {editForm.name === 'custom' && (
                  <div className="space-y-2">
                    <label className="text-[10px] font-mono uppercase tracking-widest text-gray-500">Custom Asset Name</label>
                    <input
                      required
                      type="text"
                      onChange={(e) => handleEditChange('name', e.target.value)}
                      className="w-full bg-black border border-white/10 rounded-lg px-3 py-2 text-white font-mono text-xs focus:outline-none focus:border-[#A855F7]"
                      placeholder="e.g. Custom Hardware"
                    />
                  </div>
                )}
                <div className="space-y-2">
                  <label className="text-[10px] font-mono uppercase tracking-widest text-gray-500">Serial Number</label>
                  <input
                    required
                    type="text"
                    value={editForm.serialNumber || ''}
                    onChange={(e) => handleEditChange('serialNumber', e.target.value)}
                    className="w-full bg-black border border-white/10 rounded-lg px-3 py-2 text-white font-mono text-xs focus:outline-none focus:border-[#A855F7]"
                    placeholder="e.g. SN-12345"
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-[10px] font-mono uppercase tracking-widest text-gray-500">Location</label>
                  <input
                    required
                    type="text"
                    value={editForm.location || ''}
                    onChange={(e) => handleEditChange('location', e.target.value)}
                    className="w-full bg-black border border-white/10 rounded-lg px-3 py-2 text-white font-mono text-xs focus:outline-none focus:border-[#A855F7]"
                    placeholder="e.g. Storage A"
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-[10px] font-mono uppercase tracking-widest text-gray-500">Purchase Date</label>
                  <input
                    required
                    type="date"
                    value={editForm.purchaseDate || ''}
                    onChange={(e) => handleEditChange('purchaseDate', e.target.value)}
                    className="w-full bg-black border border-white/10 rounded-lg px-3 py-2 text-white font-mono text-xs focus:outline-none focus:border-[#A855F7]"
                  />
                </div>

                <div className="pt-6 flex justify-end gap-3">
                  <button
                    type="button"
                    onClick={() => setIsAdding(false)}
                    className="px-6 py-2 bg-white/5 text-gray-400 rounded-xl font-mono text-[10px] uppercase tracking-widest hover:bg-white/10 transition-colors border border-white/5"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="px-6 py-2 bg-[#A855F7] text-black rounded-xl font-bold font-mono text-[10px] uppercase tracking-widest hover:bg-[#9333EA] transition-all"
                  >
                    Add Asset
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Transfer Modal */}
      <AnimatePresence>
        {showTransferModal && (
          <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/90 backdrop-blur-sm p-4">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-[#0a0a0a] border border-white/10 rounded-2xl w-full max-w-md overflow-hidden"
            >
              <div className="p-6 border-b border-white/10 flex justify-between items-center">
                <div className="flex items-center gap-3">
                  <Truck size={20} className="text-[#A855F7]" />
                  <h3 className="text-lg font-bold text-white uppercase italic">Transfer Asset</h3>
                </div>
                <button onClick={() => setShowTransferModal(false)} className="text-gray-500 hover:text-white">
                  <XCircle size={24} />
                </button>
              </div>
              <div className="p-6 space-y-4">
                <div className="space-y-2">
                  <label className="text-[10px] font-mono uppercase tracking-widest text-gray-500">From Location</label>
                  <input
                    disabled
                    value={selectedItem?.location || ''}
                    className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-gray-400 font-mono text-xs"
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-[10px] font-mono uppercase tracking-widest text-gray-500">To Location</label>
                  <input
                    required
                    type="text"
                    value={transferForm.toLocation}
                    onChange={(e) => setTransferForm({ ...transferForm, toLocation: e.target.value })}
                    className="w-full bg-black border border-white/10 rounded-lg px-3 py-2 text-white font-mono text-xs focus:outline-none focus:border-[#A855F7]"
                    placeholder="e.g. Warehouse - B"
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-[10px] font-mono uppercase tracking-widest text-gray-500">Transferred By</label>
                  <input
                    required
                    type="text"
                    value={transferForm.transferredBy}
                    onChange={(e) => setTransferForm({ ...transferForm, transferredBy: e.target.value })}
                    className="w-full bg-black border border-white/10 rounded-lg px-3 py-2 text-white font-mono text-xs focus:outline-none focus:border-[#A855F7]"
                    placeholder="Admin name"
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-[10px] font-mono uppercase tracking-widest text-gray-500">Notes</label>
                  <textarea
                    value={transferForm.notes}
                    onChange={(e) => setTransferForm({ ...transferForm, notes: e.target.value })}
                    className="w-full bg-black border border-white/10 rounded-lg px-3 py-2 text-white font-mono text-xs focus:outline-none focus:border-[#A855F7] h-20 resize-none"
                    placeholder="Optional notes..."
                  />
                </div>
                <div className="pt-4 flex justify-end gap-3">
                  <button
                    onClick={() => setShowTransferModal(false)}
                    className="px-6 py-2 bg-white/5 text-gray-400 rounded-xl font-mono text-[10px] uppercase tracking-widest hover:bg-white/10"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={handleTransferAsset}
                    className="px-6 py-2 bg-[#A855F7] text-black rounded-xl font-bold font-mono text-[10px] uppercase tracking-widest hover:bg-[#9333EA]"
                  >
                    Confirm Transfer
                  </button>
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Warranty Modal */}
      <AnimatePresence>
        {showWarrantyModal && (
          <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/90 backdrop-blur-sm p-4">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-[#0a0a0a] border border-white/10 rounded-2xl w-full max-w-md overflow-hidden"
            >
              <div className="p-6 border-b border-white/10 flex justify-between items-center">
                <div className="flex items-center gap-3">
                  <ShieldCheck size={20} className="text-emerald-500" />
                  <h3 className="text-lg font-bold text-white uppercase italic">Warranty & Insurance</h3>
                </div>
                <button onClick={() => setShowWarrantyModal(false)} className="text-gray-500 hover:text-white">
                  <XCircle size={24} />
                </button>
              </div>
              <div className="p-6 space-y-4">
                <div className="space-y-2">
                  <label className="text-[10px] font-mono uppercase tracking-widest text-gray-500">Warranty Expiry</label>
                  <input
                    type="date"
                    value={warrantyForm.warrantyExpiry}
                    onChange={(e) => setWarrantyForm({ ...warrantyForm, warrantyExpiry: e.target.value })}
                    className="w-full bg-black border border-white/10 rounded-lg px-3 py-2 text-white font-mono text-xs focus:outline-none focus:border-[#A855F7]"
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-[10px] font-mono uppercase tracking-widest text-gray-500">Insurance Policy Number</label>
                  <input
                    type="text"
                    value={warrantyForm.insurancePolicy}
                    onChange={(e) => setWarrantyForm({ ...warrantyForm, insurancePolicy: e.target.value })}
                    className="w-full bg-black border border-white/10 rounded-lg px-3 py-2 text-white font-mono text-xs focus:outline-none focus:border-[#A855F7]"
                    placeholder="e.g. INS-12345"
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-[10px] font-mono uppercase tracking-widest text-gray-500">Insurance Expiry</label>
                  <input
                    type="date"
                    value={warrantyForm.insuranceExpiry}
                    onChange={(e) => setWarrantyForm({ ...warrantyForm, insuranceExpiry: e.target.value })}
                    className="w-full bg-black border border-white/10 rounded-lg px-3 py-2 text-white font-mono text-xs focus:outline-none focus:border-[#A855F7]"
                  />
                </div>
                <div className="pt-4 flex justify-end gap-3">
                  <button
                    onClick={() => setShowWarrantyModal(false)}
                    className="px-6 py-2 bg-white/5 text-gray-400 rounded-xl font-mono text-[10px] uppercase tracking-widest hover:bg-white/10"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={handleSaveWarranty}
                    className="px-6 py-2 bg-[#A855F7] text-black rounded-xl font-bold font-mono text-[10px] uppercase tracking-widest hover:bg-[#9333EA]"
                  >
                    Save
                  </button>
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Depreciation Modal */}
      <AnimatePresence>
        {showDepreciationModal && (
          <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/90 backdrop-blur-sm p-4">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-[#0a0a0a] border border-white/10 rounded-2xl w-full max-w-md overflow-hidden"
            >
              <div className="p-6 border-b border-white/10 flex justify-between items-center">
                <div className="flex items-center gap-3">
                  <Percent size={20} className="text-amber-400" />
                  <h3 className="text-lg font-bold text-white uppercase italic">Depreciation Settings</h3>
                </div>
                <button onClick={() => setShowDepreciationModal(false)} className="text-gray-500 hover:text-white">
                  <XCircle size={24} />
                </button>
              </div>
              <div className="p-6 space-y-4">
                <div className="space-y-2">
                  <label className="text-[10px] font-mono uppercase tracking-widest text-gray-500">Annual Depreciation Rate (%)</label>
                  <input
                    type="number"
                    min="0"
                    max="100"
                    value={warrantyForm.depreciationRate}
                    onChange={(e) => setWarrantyForm({ ...warrantyForm, depreciationRate: parseFloat(e.target.value) })}
                    className="w-full bg-black border border-white/10 rounded-lg px-3 py-2 text-white font-mono text-xs focus:outline-none focus:border-[#A855F7]"
                  />
                  <p className="text-[9px] font-mono text-gray-500">Standard rates: Electronics 20%, Consoles 10-15%</p>
                </div>
                <div className="pt-4 flex justify-end gap-3">
                  <button
                    onClick={() => setShowDepreciationModal(false)}
                    className="px-6 py-2 bg-white/5 text-gray-400 rounded-xl font-mono text-[10px] uppercase tracking-widest hover:bg-white/10"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={handleSaveWarranty}
                    className="px-6 py-2 bg-[#A855F7] text-black rounded-xl font-bold font-mono text-[10px] uppercase tracking-widest hover:bg-[#9333EA]"
                  >
                    Save
                  </button>
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Schedule Maintenance Modal */}
      <AnimatePresence>
        {showScheduleModal && (
          <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/90 backdrop-blur-sm p-4">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-[#0a0a0a] border border-white/10 rounded-2xl w-full max-w-lg overflow-hidden"
            >
              <div className="p-6 border-b border-white/10 flex justify-between items-center">
                <div className="flex items-center gap-3">
                  <Calendar size={20} className="text-blue-500" />
                  <h3 className="text-lg font-bold text-white uppercase italic">Maintenance Schedule</h3>
                </div>
                <button onClick={() => setShowScheduleModal(false)} className="text-gray-500 hover:text-white">
                  <XCircle size={24} />
                </button>
              </div>
              <div className="p-6 space-y-4">
                <div className="space-y-3">
                  {scheduledMaintenances.length > 0 ? (
                    scheduledMaintenances.map((schedule) => (
                      <div key={schedule.id} className="bg-white/[0.02] border border-white/5 rounded-xl p-4 flex items-center justify-between">
                        <div>
                          <p className="text-xs font-bold text-white">{schedule.assetName}</p>
                          <p className="text-[10px] font-mono text-gray-500">{schedule.type} - {schedule.scheduledDate}</p>
                        </div>
                        <span className={`text-[9px] font-mono uppercase px-2 py-1 rounded ${
                          schedule.status === 'completed' ? 'bg-emerald-500/10 text-emerald-500' :
                          schedule.status === 'overdue' ? 'bg-red-500/10 text-red-500' :
                          'bg-blue-500/10 text-blue-500'
                        }`}>
                          {schedule.status}
                        </span>
                      </div>
                    ))
                  ) : (
                    <p className="text-gray-500 font-mono text-xs text-center py-8">No scheduled maintenance</p>
                  )}
                </div>
                <div className="pt-4 flex justify-end">
                  <button
                    onClick={() => {
                      handleScheduleMaintenance();
                      setShowScheduleModal(false);
                    }}
                    className="px-6 py-2 bg-[#A855F7] text-black rounded-xl font-bold font-mono text-[10px] uppercase tracking-widest hover:bg-[#9333EA]"
                  >
                    Schedule New
                  </button>
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
