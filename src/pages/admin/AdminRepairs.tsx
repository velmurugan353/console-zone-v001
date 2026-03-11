import { useState, useEffect } from 'react';
import { formatCurrency } from '../../lib/utils';
import { Wrench, CheckCircle, Clock, XCircle, Search, Filter, AlertTriangle, Activity, ShieldCheck, Zap, User, Edit2, Save } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { automationService } from '../../services/automationService';
import { notificationService } from '../../services/notificationService';
import { aiService } from '../../services/aiService';
import { collection, onSnapshot, query, doc, updateDoc, orderBy } from 'firebase/firestore';
import { db } from '../../lib/firebase';

type RepairStatus = 'pending' | 'in_progress' | 'completed' | 'cancelled';
type RepairPriority = 'low' | 'medium' | 'high';

interface RepairRequest {
  id: string;
  customer: string;
  email: string;
  device: string;
  issue: string;
  date: string;
  status: RepairStatus;
  priority: RepairPriority;
  technician?: string;
  estimatedCost?: number;
}

const MOCK_REPAIRS: RepairRequest[] = [
  {
    id: 'REP-2001',
    customer: 'John Doe',
    email: 'john@example.com',
    device: 'PlayStation 5',
    issue: 'HDMI Port Replacement',
    date: '2023-10-25',
    status: 'in_progress',
    priority: 'high',
    technician: 'Mike Tech',
    estimatedCost: 85.00
  },
  {
    id: 'REP-2002',
    customer: 'Sarah Smith',
    email: 'sarah@example.com',
    device: 'Nintendo Switch',
    issue: 'JoyCon Drift',
    date: '2023-10-24',
    status: 'pending',
    priority: 'medium',
    estimatedCost: 45.00
  },
  {
    id: 'REP-2003',
    customer: 'Alex Gamer',
    email: 'alex@example.com',
    device: 'Xbox Series X',
    issue: 'Overheating',
    date: '2023-10-22',
    status: 'completed',
    priority: 'low',
    technician: 'Sarah Fix',
    estimatedCost: 60.00
  }
];

export default function AdminRepairs() {
  const [repairs, setRepairs] = useState<RepairRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [filter, setFilter] = useState<string>('all');
  const [selectedRepair, setSelectedRepair] = useState<RepairRequest | null>(null);
  const [isEditing, setIsEditing] = useState(false);
  const [editForm, setEditForm] = useState<Partial<RepairRequest>>({});
  const [diagnosis, setDiagnosis] = useState<string | null>(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);

  const handleAIDiagnosis = async () => {
    if (!selectedRepair) return;
    setIsAnalyzing(true);
    setDiagnosis(null);
    const result = await aiService.getRepairDiagnosis(selectedRepair.device, selectedRepair.issue);
    setDiagnosis(result);
    setIsAnalyzing(false);
  };

  useEffect(() => {
    // Initial fallback for empty DB or connectivity issues in dev
    setRepairs(MOCK_REPAIRS);
    setLoading(false);

    const q = query(collection(db, 'repairs'), orderBy('date', 'desc'));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const fetchedRepairs = snapshot.docs.map(doc => ({
        ...doc.data(),
        id: doc.id
      })) as RepairRequest[];
      
      if (fetchedRepairs.length > 0) {
        setRepairs(fetchedRepairs);
      }
      setLoading(false);
    }, (error) => {
      console.error("Firestore error in AdminRepairs:", error);
      setLoading(false);
    });
    return () => unsubscribe();
  }, []);

  const handleEditToggle = async () => {
    if (isEditing) {
      if (selectedRepair) {
        const updatedRepair = { ...selectedRepair, ...editForm } as RepairRequest;
        try {
          await updateDoc(doc(db, 'repairs', updatedRepair.id), editForm);
          setSelectedRepair(updatedRepair);
        } catch (error) {
          console.error('Failed to update repair:', error);
          alert('Failed to save changes to database.');
        }
      }
      setIsEditing(false);
    } else {
      setEditForm(selectedRepair || {});
      setIsEditing(true);
    }
  };

  const handleEditChange = (field: keyof RepairRequest, value: any) => {
    setEditForm(prev => ({ ...prev, [field]: value }));
  };

  const closeRepairModal = () => {
    setSelectedRepair(null);
    setIsEditing(false);
  };

  const [completedTasks, setCompletedTasks] = useState<string[]>([]);

  const handleStatusChange = async (id: string, newStatus: RepairStatus) => {
    const repair = repairs.find(r => r.id === id);
    if (!repair) return;

    if (newStatus === 'completed') {
      setCompletedTasks(prev => [...prev, id]);
      setTimeout(() => {
        setCompletedTasks(prev => prev.filter(taskId => taskId !== id));
      }, 1000);
    }

    try {
      await updateDoc(doc(db, 'repairs', id), { status: newStatus });
    } catch (error) {
      console.error('Failed to update status:', error);
      alert('Failed to update status in database.');
      return;
    }

    // Trigger Automations
    if (newStatus === 'in_progress') {
      await automationService.triggerWorkflow('repair_created', {
        repairId: id,
        customerName: repair.customer,
        device: repair.device
      });
    } else if (newStatus === 'completed') {
      notificationService.sendNotification('repair_completed', repair.email, {
        customerName: repair.customer,
        repairId: id,
        device: repair.device
      });
    }
  };

  const handleManualNotification = (type: 'update' | 'quote' | 'custom') => {
    if (!selectedRepair) return;

    if (type === 'update') {
      notificationService.sendNotification('repair_update', selectedRepair.email, {
        customerName: selectedRepair.customer,
        repairId: selectedRepair.id,
        device: selectedRepair.device,
        status: selectedRepair.status
      });
      alert(`Status update sent to ${selectedRepair.customer}`);
    } else if (type === 'quote') {
      notificationService.sendNotification('repair_quote', selectedRepair.email, {
        customerName: selectedRepair.customer,
        repairId: selectedRepair.id,
        device: selectedRepair.device,
        estimatedCost: selectedRepair.estimatedCost
      });
      alert(`Quote notification sent to ${selectedRepair.customer}`);
    } else {
      alert(`Manual ${type} notification triggered for ${selectedRepair.customer}`);
    }
  };

  const filteredRepairs = repairs.filter(repair => {
    const matchesSearch =
      repair.customer.toLowerCase().includes(search.toLowerCase()) ||
      repair.device.toLowerCase().includes(search.toLowerCase()) ||
      repair.id.toLowerCase().includes(search.toLowerCase());

    const matchesFilter = filter === 'all' || repair.status === filter;

    return matchesSearch && matchesFilter;
  });

  const getStatusColor = (status: RepairStatus) => {
    switch (status) {
      case 'in_progress': return 'text-blue-400 bg-blue-500/10 border-blue-500/20';
      case 'completed': return 'text-emerald-400 bg-emerald-500/10 border-emerald-500/20';
      case 'cancelled': return 'text-red-400 bg-red-500/10 border-red-500/20';
      case 'pending': return 'text-amber-400 bg-amber-500/10 border-amber-500/20';
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
        {selectedRepair && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-md p-4">
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              className="bg-[#0a0a0a] border border-white/10 rounded-2xl w-full max-w-md p-8 shadow-2xl"
            >
              <div className="flex justify-between items-start mb-8">
                <div>
                  <h3 className="text-xs font-mono uppercase tracking-widest text-[#A855F7]">Repair_Protocol</h3>
                  <p className="text-2xl font-bold text-white tracking-tighter uppercase italic">Ticket Details</p>
                </div>
                <div className="flex items-center space-x-2">
                  <button
                    onClick={handleEditToggle}
                    className={`p-2 rounded-full transition-colors ${isEditing ? 'bg-[#A855F7]/20 text-[#A855F7]' : 'hover:bg-white/5 text-gray-500 hover:text-white'}`}
                    title={isEditing ? "Save Changes" : "Edit Repair"}
                  >
                    {isEditing ? <Save className="h-5 w-5" /> : <Edit2 className="h-5 w-5" />}
                  </button>
                  <button
                    onClick={closeRepairModal}
                    className="text-gray-500 hover:text-white transition-colors"
                  >
                    <XCircle className="h-6 w-6" />
                  </button>
                </div>
              </div>

              <div className="space-y-6">
                <div className="p-4 bg-white/[0.02] border border-white/5 rounded-xl space-y-2">
                  {isEditing ? (
                    <input
                      type="text"
                      value={editForm.device || ''}
                      onChange={(e) => handleEditChange('device', e.target.value)}
                      className="w-full bg-black border border-white/10 rounded px-2 py-1 text-white font-bold text-lg focus:outline-none focus:border-[#A855F7]"
                      placeholder="Device Name"
                    />
                  ) : (
                    <h4 className="font-bold text-white text-lg uppercase tracking-tight">{selectedRepair.device}</h4>
                  )}
                  {isEditing ? (
                    <input
                      type="text"
                      value={editForm.issue || ''}
                      onChange={(e) => handleEditChange('issue', e.target.value)}
                      className="w-full bg-black border border-white/10 rounded px-2 py-1 text-[#A855F7] font-mono text-xs focus:outline-none focus:border-[#A855F7]"
                      placeholder="Issue Description"
                    />
                  ) : (
                    <p className="text-[#A855F7] font-mono text-xs uppercase mt-1">{selectedRepair.issue}</p>
                  )}
                  <div className="flex items-center space-x-2 mt-4">
                    <User className="h-3 w-3 text-gray-500" />
                    {isEditing ? (
                      <input
                        type="text"
                        value={editForm.customer || ''}
                        onChange={(e) => handleEditChange('customer', e.target.value)}
                        className="w-full bg-black border border-white/10 rounded px-2 py-1 text-gray-400 font-mono text-[10px] focus:outline-none focus:border-[#A855F7]"
                        placeholder="Customer Name"
                      />
                    ) : (
                      <span className="text-gray-400 font-mono text-[10px] uppercase">{selectedRepair.customer}</span>
                    )}
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="bg-white/[0.02] p-4 border border-white/5 rounded-xl">
                    <span className="text-gray-500 block text-[10px] font-mono uppercase mb-1">Priority</span>
                    {isEditing ? (
                      <select
                        value={editForm.priority || 'medium'}
                        onChange={(e) => handleEditChange('priority', e.target.value)}
                        className="w-full bg-black border border-white/10 rounded px-2 py-1 text-white font-mono text-xs focus:outline-none focus:border-[#A855F7]"
                      >
                        <option value="low">Low</option>
                        <option value="medium">Medium</option>
                        <option value="high">High</option>
                      </select>
                    ) : (
                      <span className={`px-2 py-0.5 text-[10px] font-bold rounded border uppercase tracking-tighter ${selectedRepair.priority === 'high' ? 'text-red-400 border-red-500/20 bg-red-500/10' :
                        selectedRepair.priority === 'medium' ? 'text-amber-400 border-amber-500/20 bg-amber-500/10' :
                          'text-emerald-400 border-emerald-500/20 bg-emerald-500/10'
                        }`}>
                        {selectedRepair.priority}
                      </span>
                    )}
                  </div>
                  <div className="bg-white/[0.02] p-4 border border-white/5 rounded-xl">
                    <span className="text-gray-500 block text-[10px] font-mono uppercase mb-1">Status Protocol</span>

                    <div className="flex flex-wrap items-center justify-between w-full">
                      <span className={`px-2 py-0.5 text-[10px] font-bold rounded border uppercase tracking-tighter ${getStatusColor(selectedRepair.status)}`}>
                        {selectedRepair.status.replace('_', ' ')}
                      </span>
                    </div>
                  </div>
                </div>

                <div className="flex space-x-2 mt-4 pt-4 border-t border-white/10">
                  <button
                    onClick={() => handleManualNotification('update')}
                    className="flex-1 py-2 bg-blue-500/10 text-blue-500 border border-blue-500/20 hover:bg-blue-500/20 transition-colors rounded-xl flex items-center justify-center gap-2 text-[10px] font-mono uppercase tracking-widest font-bold"
                  >
                    <Activity className="h-4 w-4" /> Push Status
                  </button>
                  <button
                    onClick={() => handleManualNotification('quote')}
                    className="flex-1 py-2 bg-emerald-500/10 text-emerald-500 border border-emerald-500/20 hover:bg-emerald-500/20 transition-colors rounded-xl flex items-center justify-center gap-2 text-[10px] font-mono uppercase tracking-widest font-bold"
                  >
                    <ShieldCheck className="h-4 w-4" /> Send Quote
                  </button>
                </div>

                <div className="bg-white/[0.02] p-4 border border-white/5 rounded-xl">
                  <span className="text-gray-500 block text-[10px] font-mono uppercase mb-1">Estimated Cost</span>
                  {isEditing ? (
                    <input
                      type="number"
                      value={editForm.estimatedCost || ''}
                      onChange={(e) => handleEditChange('estimatedCost', parseFloat(e.target.value))}
                      className="w-full bg-black border border-white/10 rounded px-2 py-1 text-white font-mono text-sm focus:outline-none focus:border-[#A855F7]"
                      placeholder="Cost"
                    />
                  ) : (
                    <span className="text-white font-mono text-sm font-bold">{selectedRepair.estimatedCost ? formatCurrency(selectedRepair.estimatedCost) : 'TBD'}</span>
                  )}
                </div>

              {/* AI Diagnosis Tool */}
              <div className="space-y-3 pb-2">
                <div className="flex items-center justify-between">
                  <h4 className="text-[10px] font-mono font-bold text-gray-500 uppercase tracking-widest">AI_Diagnosis_Matrix</h4>
                  <button
                    onClick={handleAIDiagnosis}
                    disabled={isAnalyzing}
                    className="text-[9px] font-black text-[#A855F7] hover:text-white transition-colors flex items-center gap-1 uppercase tracking-widest disabled:opacity-50"
                  >
                    <Zap size={10} className={isAnalyzing ? 'animate-pulse' : ''} />
                    {isAnalyzing ? 'Processing...' : 'Run Diagnostics'}
                  </button>
                </div>
                
                {diagnosis && (
                  <motion.div
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="p-4 bg-[#A855F7]/5 border border-[#A855F7]/20 rounded-xl text-[10px] font-mono text-gray-300 leading-relaxed max-h-40 overflow-y-auto whitespace-pre-wrap prose prose-invert prose-p:my-1 prose-headings:my-2"
                  >
                    {diagnosis}
                  </motion.div>
                )}
              </div>

              <div className="pt-6 border-t border-white/10 space-y-3">
                <h4 className="text-[10px] font-mono font-bold text-gray-500 mb-4 uppercase tracking-[0.3em]">Execution_Protocols</h4>
                  <div className="grid grid-cols-2 gap-3">
                    {selectedRepair.status === 'pending' && (
                      <button
                        onClick={() => handleStatusChange(selectedRepair.id, 'in_progress')}
                        className="col-span-2 py-3 bg-[#A855F7] text-black font-bold rounded-xl text-xs uppercase tracking-widest hover:bg-[#9333EA] transition-all flex items-center justify-center gap-2"
                      >
                        <Wrench className="h-4 w-4" /> Start Repair
                      </button>
                    )}
                    {selectedRepair.status === 'in_progress' && (
                      <button
                        onClick={() => handleStatusChange(selectedRepair.id, 'completed')}
                        className="col-span-2 py-3 bg-emerald-500/10 border border-emerald-500/20 text-emerald-500 font-bold rounded-xl text-xs uppercase tracking-widest hover:bg-emerald-500/20 transition-all flex items-center justify-center gap-2"
                      >
                        <CheckCircle className="h-4 w-4" /> Finalize Repair
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
          <p className="text-gray-500 text-[10px] font-mono uppercase tracking-widest mb-1">Repair Efficiency</p>
          <div className="flex items-end space-x-2">
            <p className="text-3xl font-bold text-white tracking-tighter">94.2%</p>
            <span className="text-emerald-500 text-[10px] font-mono mb-1">+2.1%</span>
          </div>
          <div className="w-full bg-white/5 h-1 rounded-full mt-4 overflow-hidden">
            <motion.div
              initial={{ width: 0 }}
              animate={{ width: '94.2%' }}
              className="bg-[#A855F7] h-full shadow-[0_0_10px_#A855F7]"
            />
          </div>
        </div>
        <div className="bg-[#0a0a0a] border border-white/10 p-6 rounded-2xl">
          <p className="text-gray-500 text-[10px] font-mono uppercase tracking-widest mb-1">Pending Tickets</p>
          <p className="text-3xl font-bold text-amber-500 tracking-tighter">{repairs.filter(r => r.status === 'pending').length}</p>
          <p className="text-gray-600 text-[10px] font-mono mt-2 uppercase">Awaiting Protocol</p>
        </div>
        <div className="bg-[#0a0a0a] border border-white/10 p-6 rounded-2xl">
          <p className="text-gray-500 text-[10px] font-mono uppercase tracking-widest mb-1">In Progress</p>
          <p className="text-3xl font-bold text-blue-500 tracking-tighter">{repairs.filter(r => r.status === 'in_progress').length}</p>
          <p className="text-gray-600 text-[10px] font-mono mt-2 uppercase">Active Matrix</p>
        </div>
        <div className="bg-[#0a0a0a] border border-white/10 p-6 rounded-2xl">
          <p className="text-gray-500 text-[10px] font-mono uppercase tracking-widest mb-1">High Priority</p>
          <p className="text-3xl font-bold text-red-500 tracking-tighter">{repairs.filter(r => r.priority === 'high' && r.status !== 'completed').length}</p>
          <p className="text-gray-600 text-[10px] font-mono mt-2 uppercase">Critical Status</p>
        </div>
      </div>

      {/* Control Bar */}
      <div className="flex flex-col md:flex-row gap-4 bg-[#0a0a0a] p-4 rounded-2xl border border-white/10">
        <div className="relative flex-grow">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-500" />
          <input
            type="text"
            placeholder="Search repair matrix..."
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
            <option value="in_progress">In Progress</option>
            <option value="completed">Completed</option>
            <option value="cancelled">Cancelled</option>
          </select>
        </div>
      </div>

      {/* Content Matrix */}
      <div className="bg-[#0a0a0a] border border-white/10 rounded-2xl overflow-hidden shadow-2xl">
        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead className="bg-white/[0.02] text-gray-500 text-[10px] font-mono uppercase tracking-widest">
              <tr>
                <th className="px-6 py-4">Ticket ID</th>
                <th className="px-6 py-4">Identity / Date</th>
                <th className="px-6 py-4">Priority</th>
                <th className="px-6 py-4">Hardware & Issue</th>
                <th className="px-6 py-4">Technician</th>
                <th className="px-6 py-4">Valuation</th>
                <th className="px-6 py-4">Protocol Status</th>
                <th className="px-6 py-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5 text-xs font-mono text-gray-400">
              {filteredRepairs.map((repair) => (
                <motion.tr
                  key={repair.id}
                  className="hover:bg-white/[0.01] transition-colors group"
                  animate={completedTasks.includes(repair.id) ? {
                    backgroundColor: ['rgba(16, 185, 129, 0)', 'rgba(16, 185, 129, 0.2)', 'rgba(16, 185, 129, 0)'],
                    scale: [1, 1.02, 1],
                    transition: { duration: 0.8, ease: "easeInOut" }
                  } : {}}
                >
                  <td className="px-6 py-4 text-[#A855F7] font-bold tracking-tighter">[{repair.id}]</td>
                  <td className="px-6 py-4">
                    <div className="text-white uppercase font-bold">{repair.customer}</div>
                    <div className="text-[10px] text-gray-600">{repair.date}</div>
                  </td>
                  <td className="px-6 py-4">
                    <span className={`px-2 py-0.5 text-[9px] font-bold rounded border uppercase tracking-tighter ${repair.priority === 'high' ? 'text-red-400 border-red-500/20 bg-red-500/10' :
                      repair.priority === 'medium' ? 'text-amber-400 border-amber-500/20 bg-amber-500/10' :
                        'text-emerald-400 border-emerald-500/20 bg-emerald-500/10'
                      }`}>
                      {repair.priority}
                    </span>
                  </td>
                  <td className="px-6 py-4">
                    <div className="text-gray-300 uppercase font-bold tracking-tight">{repair.device}</div>
                    <div className="text-[10px] text-gray-600 uppercase">{repair.issue}</div>
                  </td>
                  <td className="px-6 py-4">
                    <select
                      className="bg-black border border-white/10 rounded px-2 py-1 text-[10px] text-white focus:outline-none focus:border-[#A855F7] uppercase"
                      value={repair.technician || ''}
                      onChange={async (e) => {
                        try {
                          await updateDoc(doc(db, 'repairs', repair.id), { technician: e.target.value });
                        } catch (error) {
                          console.error('Failed to assign technician:', error);
                          alert('Failed to assign technician in database.');
                        }
                      }}
                    >
                      <option value="">Unassigned</option>
                      <option value="Mike Tech">Mike Tech</option>
                      <option value="Sarah Fix">Sarah Fix</option>
                      <option value="Dave Repair">Dave Repair</option>
                    </select>
                  </td>
                  <td className="px-6 py-4 font-bold text-white">
                    {repair.estimatedCost ? formatCurrency(repair.estimatedCost) : '-'}
                  </td>
                  <td className="px-6 py-4">
                    <span className={`px-2 py-0.5 text-[9px] font-bold rounded border uppercase tracking-tighter ${getStatusColor(repair.status)}`}>
                      {repair.status.replace('_', ' ')}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-right">
                    <div className="flex justify-end space-x-2">
                      {repair.status === 'pending' && (
                        <button
                          onClick={() => handleStatusChange(repair.id, 'in_progress')}
                          className="p-2 bg-[#A855F7]/10 text-[#A855F7] hover:bg-[#A855F7]/20 border border-[#A855F7]/20 rounded transition-all"
                          title="Start Protocol"
                        >
                          <Wrench className="h-4 w-4" />
                        </button>
                      )}
                      {repair.status === 'in_progress' && (
                        <button
                          onClick={() => handleStatusChange(repair.id, 'completed')}
                          className="p-2 bg-emerald-500/10 text-emerald-500 hover:bg-emerald-500/20 border border-emerald-500/20 rounded transition-all"
                          title="Complete Protocol"
                        >
                          <CheckCircle className="h-4 w-4" />
                        </button>
                      )}
                      <button
                        onClick={() => setSelectedRepair(repair)}
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

        {filteredRepairs.length === 0 && (
          <div className="text-center py-12 text-gray-600 font-mono text-xs uppercase tracking-widest">
            Repair Matrix Empty // No matching records
          </div>
        )}
      </div>
    </div>
  );
}
