import { useState, useEffect } from 'react';
import { formatCurrency } from '../../lib/utils';
import { Wrench, CheckCircle, Clock, XCircle, Search, Filter, AlertTriangle, Activity, ShieldCheck, Zap, User, Edit2, Save, Mail, Phone, Plus, Package, ChevronDown } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { automationService } from '../../services/automationService';
import { notificationService } from '../../services/notificationService';
import { aiService } from '../../services/aiService';
import { collection, onSnapshot, query, doc, updateDoc, orderBy, setDoc, deleteDoc, getDocs } from 'firebase/firestore';
import { db } from '../../lib/firebase';

type RepairStatus = 'pending' | 'diagnosing' | 'awaiting_parts' | 'in_progress' | 'testing' | 'completed' | 'cancelled';
type RepairPriority = 'low' | 'medium' | 'high' | 'critical';

interface RepairPart {
  id: string;
  name: string;
  cost: number;
  quantity: number;
}

interface RepairLog {
  date: string;
  action: string;
  note?: string;
  user: string;
}

interface RepairRequest {
  id: string;
  customer: string;
  email: string;
  phone?: string;
  device: string;
  serialNumber?: string;
  issue: string;
  date: string;
  status: RepairStatus;
  priority: RepairPriority;
  technician?: string;
  estimatedCost?: number;
  laborCost?: number;
  parts?: RepairPart[];
  history?: RepairLog[];
  completionDate?: string;
  warrantyPeriod?: number; // months
}

const TECHNICIANS = [
  { id: 'T1', name: 'Mike Tech', specialty: 'Consoles' },
  { id: 'T2', name: 'Sarah Fix', specialty: 'Controllers' },
  { id: 'T3', name: 'Dave Repair', specialty: 'Handhelds' },
  { id: 'T4', name: 'Alex Matrix', specialty: 'Microsoldering' }
];

const MOCK_REPAIRS: RepairRequest[] = [
  {
    id: 'REP-2001',
    customer: 'John Doe',
    email: 'john@example.com',
    phone: '9876543210',
    device: 'PlayStation 5',
    serialNumber: 'SN-PS5-8821',
    issue: 'HDMI Port Replacement',
    date: '2023-10-25',
    status: 'in_progress',
    priority: 'high',
    technician: 'Mike Tech',
    estimatedCost: 8500,
    laborCost: 3500,
    parts: [{ id: 'P1', name: 'PS5 HDMI Port', cost: 1200, quantity: 1 }],
    history: [
      { date: '2023-10-25 10:00', action: 'Ticket Created', user: 'System' },
      { date: '2023-10-25 14:00', action: 'Technician Assigned', note: 'Assigned to Mike Tech', user: 'Admin' }
    ]
  },
  {
    id: 'REP-2002',
    customer: 'Sarah Smith',
    email: 'sarah@example.com',
    phone: '9988776655',
    device: 'Nintendo Switch',
    issue: 'JoyCon Drift',
    date: '2023-10-24',
    status: 'pending',
    priority: 'medium',
    estimatedCost: 4500,
    history: [
      { date: '2023-10-24 09:30', action: 'Ticket Created', user: 'System' }
    ]
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
    const q = query(collection(db, 'repairs'), orderBy('date', 'desc'));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const fetchedRepairs = snapshot.docs.map(doc => ({
        ...doc.data(),
        id: doc.id
      })) as RepairRequest[];
      
      setRepairs(fetchedRepairs);
      setLoading(false);
    }, (error) => {
      console.error("Firestore error in AdminRepairs:", error);
      setLoading(false);
    });
    return () => unsubscribe();
  }, []);

  const handleSeedRepairs = async () => {
    if (!confirm('This will seed the Repair Matrix with mock data. Proceed?')) return;
    setLoading(true);
    try {
      for (const repair of MOCK_REPAIRS) {
        await setDoc(doc(db, 'repairs', repair.id), repair);
      }
      alert('Repair Matrix seeded successfully.');
    } catch (error) {
      console.error("Error seeding repairs:", error);
      alert('Failed to seed repairs.');
    } finally {
      setLoading(false);
    }
  };

  const handleClearAll = async () => {
    if (!confirm('CRITICAL ACTION: This will permanently delete ALL repair tickets. Proceed?')) return;
    setLoading(true);
    try {
      const q = query(collection(db, 'repairs'));
      const snapshot = await getDocs(q);
      for (const d of snapshot.docs) {
        await deleteDoc(doc(db, 'repairs', d.id));
      }
      alert('Repair Matrix cleared successfully.');
    } catch (error) {
      console.error("Error clearing repairs:", error);
      alert('Failed to clear repairs.');
    } finally {
      setLoading(false);
    }
  };

  const handleEditToggle = async () => {
    if (isEditing) {
      if (selectedRepair) {
        const updatedRepair = { ...selectedRepair, ...editForm } as RepairRequest;
        
        // Log changes if status or technician changed
        const newLogs: RepairLog[] = [...(selectedRepair.history || [])];
        if (editForm.status && editForm.status !== selectedRepair.status) {
          newLogs.push({
            date: new Date().toLocaleString(),
            action: 'Protocol Update',
            note: `Status shifted to ${editForm.status.replace('_', ' ')}`,
            user: 'Admin'
          });
        }
        if (editForm.technician && editForm.technician !== selectedRepair.technician) {
          newLogs.push({
            date: new Date().toLocaleString(),
            action: 'Technician Assigned',
            note: `Linked to ${editForm.technician}`,
            user: 'Admin'
          });
        }

        const finalUpdate = { ...editForm, history: newLogs };
        try {
          await updateDoc(doc(db, 'repairs', updatedRepair.id), finalUpdate);
          setSelectedRepair({ ...updatedRepair, history: newLogs });
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

  const handleAppendPart = async () => {
    if (!selectedRepair) return;
    const partName = prompt('Enter part name:');
    const partCost = parseFloat(prompt('Enter part cost (â‚¹):') || '0');
    if (!partName) return;

    const newPart: RepairPart = {
      id: `P-${Date.now()}`,
      name: partName,
      cost: partCost,
      quantity: 1
    };

    const updatedParts = [...(selectedRepair.parts || []), newPart];
    const newLog: RepairLog = {
      date: new Date().toLocaleString(),
      action: 'Part Allocated',
      note: `Added ${partName} to manifest`,
      user: 'Admin'
    };

    const updatedHistory = [...(selectedRepair.history || []), newLog];

    try {
      await updateDoc(doc(db, 'repairs', selectedRepair.id), {
        parts: updatedParts,
        history: updatedHistory
      });
      setSelectedRepair({ ...selectedRepair, parts: updatedParts, history: updatedHistory });
    } catch (error) {
      console.error('Failed to add part:', error);
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
      if (selectedRepair && selectedRepair.id === id) {
        setSelectedRepair({ ...repair, status: newStatus });
      }
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

  const handlePriorityChange = async (id: string, newPriority: RepairPriority) => {
    const repair = repairs.find(r => r.id === id);
    if (!repair) return;

    try {
      await updateDoc(doc(db, 'repairs', id), { priority: newPriority });
      if (selectedRepair && selectedRepair.id === id) {
        setSelectedRepair({ ...repair, priority: newPriority });
      }
    } catch (error) {
      console.error('Failed to update priority:', error);
      alert('Failed to update priority in database.');
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
      case 'pending': return 'text-amber-400 bg-amber-500/10 border-amber-500/20';
      case 'diagnosing': return 'text-blue-400 bg-blue-500/10 border-blue-500/20';
      case 'awaiting_parts': return 'text-purple-400 bg-purple-500/10 border-purple-500/20';
      case 'in_progress': return 'text-cyan-400 bg-cyan-500/10 border-cyan-500/20';
      case 'testing': return 'text-orange-400 bg-orange-500/10 border-orange-500/20';
      case 'completed': return 'text-emerald-400 bg-emerald-500/10 border-emerald-500/20';
      case 'cancelled': return 'text-red-400 bg-red-500/10 border-red-500/20';
      default: return 'text-gray-400 bg-gray-500/10 border-gray-500/20';
    }
  };

  const getPriorityColor = (priority: RepairPriority) => {
    switch (priority) {
      case 'critical': return 'text-white bg-red-600 border-red-600';
      case 'high': return 'text-red-400 bg-red-500/10 border-red-500/20';
      case 'medium': return 'text-amber-400 bg-amber-500/10 border-amber-500/20';
      case 'low': return 'text-emerald-400 bg-emerald-500/10 border-emerald-500/20';
      default: return 'text-gray-400 bg-gray-500/10 border-gray-500/20';
    }
  };

  const getStatusIcon = (status: RepairStatus) => {
    switch (status) {
      case 'pending': return <Clock size={14} />;
      case 'diagnosing': return <Activity size={14} />;
      case 'awaiting_parts': return <Package size={14} />;
      case 'in_progress': return <Wrench size={14} />;
      case 'testing': return <Zap size={14} />;
      case 'completed': return <CheckCircle size={14} />;
      case 'cancelled': return <XCircle size={14} />;
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-[#B000FF]"></div>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      {/* Repair Command Center Modal */}
      <AnimatePresence>
        {selectedRepair && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/90 backdrop-blur-xl p-4 overflow-y-auto">
            <motion.div
              initial={{ opacity: 0, scale: 0.9, y: 40 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.9, y: 40 }}
              className="bg-[#080112] border border-white/10 rounded-3xl w-full max-w-5xl shadow-2xl overflow-hidden flex flex-col my-8"
            >
              {/* Modal Header */}
              <div className="p-6 border-b border-white/10 flex justify-between items-center bg-white/[0.02]">
                <div className="flex items-center gap-4">
                  <div className={`p-3 rounded-2xl ${getStatusColor(selectedRepair.status)}`}>
                    {getStatusIcon(selectedRepair.status)}
                  </div>
                  <div>
                    <h3 className="text-2xl font-black text-white tracking-tighter uppercase italic flex items-center gap-3">
                      Repair_Command_Center
                      <span className="text-gray-600 not-italic font-mono text-xs tracking-widest bg-white/5 px-2 py-1 rounded">#{selectedRepair.id}</span>
                    </h3>
                    <p className="text-[10px] font-mono text-gray-500 uppercase tracking-widest mt-1">Operational Matrix v4.2 // Active Node</p>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <button
                    onClick={handleEditToggle}
                    className={`flex items-center gap-2 px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${isEditing ? 'bg-[#B000FF] text-black shadow-[0_0_20px_rgba(168,85,247,0.4)]' : 'bg-white/5 text-gray-400 hover:bg-white/10 hover:text-white'}`}
                  >
                    {isEditing ? <><Save size={14} /> Save Protocol</> : <><Edit2 size={14} /> Modify Node</>}
                  </button>
                  <button
                    onClick={closeRepairModal}
                    className="p-2 bg-white/5 text-gray-500 hover:text-white rounded-xl transition-colors"
                  >
                    <XCircle size={24} />
                  </button>
                </div>
              </div>

              <div className="flex-1 overflow-y-auto p-8 lg:p-12">
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-12">
                  
                  {/* LEFT: Identity & Hardware */}
                  <div className="lg:col-span-1 space-y-8">
                    <div className="space-y-6">
                      <h4 className="text-[10px] font-black text-gray-500 uppercase tracking-[0.3em] border-b border-white/5 pb-2">Node_Identity</h4>
                      
                      <div className="space-y-4">
                        <div className="flex items-center gap-4 group">
                          <div className="w-12 h-12 rounded-2xl bg-white/5 border border-white/10 flex items-center justify-center text-[#B000FF]">
                            <User size={24} />
                          </div>
                          <div className="flex-1">
                            <p className="text-[8px] font-mono text-gray-600 uppercase mb-1">Customer</p>
                            {isEditing ? (
                              <input
                                type="text"
                                value={editForm.customer || ''}
                                onChange={(e) => handleEditChange('customer', e.target.value)}
                                className="w-full bg-black border border-white/10 rounded-lg px-2 py-1 text-sm text-white font-bold"
                              />
                            ) : (
                              <p className="text-sm font-black text-white uppercase">{selectedRepair.customer}</p>
                            )}
                          </div>
                        </div>

                        <div className="flex items-center gap-4">
                          <div className="w-12 h-12 rounded-2xl bg-white/5 border border-white/10 flex items-center justify-center text-gray-500">
                            <Mail size={20} />
                          </div>
                          <div className="flex-1">
                            <p className="text-[8px] font-mono text-gray-600 uppercase mb-1">Email_Anchor</p>
                            <p className="text-xs font-mono text-gray-400">{selectedRepair.email}</p>
                          </div>
                        </div>

                        <div className="flex items-center gap-4">
                          <div className="w-12 h-12 rounded-2xl bg-white/5 border border-white/10 flex items-center justify-center text-gray-500">
                            <Phone size={20} />
                          </div>
                          <div className="flex-1">
                            <p className="text-[8px] font-mono text-gray-600 uppercase mb-1">Comm_Link</p>
                            <p className="text-xs font-mono text-gray-400">{selectedRepair.phone || '987XXXXXXX'}</p>
                          </div>
                        </div>
                      </div>
                    </div>

                    <div className="space-y-6 pt-4">
                      <h4 className="text-[10px] font-black text-gray-500 uppercase tracking-[0.3em] border-b border-white/5 pb-2">Hardware_Specs</h4>
                      <div className="bg-white/[0.02] border border-white/5 rounded-2xl p-6 space-y-4">
                        <div>
                          <p className="text-[8px] font-mono text-gray-600 uppercase mb-1">Host_Device</p>
                          <p className="text-lg font-black text-white uppercase italic tracking-tighter">{selectedRepair.device}</p>
                        </div>
                        <div>
                          <p className="text-[8px] font-mono text-gray-600 uppercase mb-1">Serial_Manifest</p>
                          <p className="text-xs font-mono text-[#B000FF] tracking-widest">{selectedRepair.serialNumber || 'SN-UNKNOWN-X'}</p>
                        </div>
                        <div>
                          <p className="text-[8px] font-mono text-gray-600 uppercase mb-1">Fault_Detection</p>
                          <p className="text-xs text-gray-400 leading-relaxed font-medium">{selectedRepair.issue}</p>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* CENTER: Status & AI */}
                  <div className="lg:col-span-1 space-y-8">
                    <div className="space-y-6">
                      <h4 className="text-[10px] font-black text-gray-500 uppercase tracking-[0.3em] border-b border-white/5 pb-2">Operational_Status</h4>
                      
                      <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2">
                          <label className="text-[8px] font-mono text-gray-600 uppercase ml-1">Priority_Level</label>
                          <select
                            value={isEditing ? (editForm.priority || selectedRepair.priority) : selectedRepair.priority}
                            onChange={(e) => {
                              const newPriority = e.target.value as RepairPriority;
                              if (isEditing) {
                                handleEditChange('priority', newPriority);
                              } else {
                                handlePriorityChange(selectedRepair.id, newPriority);
                              }
                            }}
                            className={`w-full bg-black border border-white/10 rounded-xl px-3 py-2 text-[10px] font-black uppercase tracking-widest focus:outline-none transition-all ${getPriorityColor(isEditing ? (editForm.priority || selectedRepair.priority) : selectedRepair.priority)}`}
                          >
                            <option value="low">Low</option>
                            <option value="medium">Medium</option>
                            <option value="high">High</option>
                            <option value="critical">Critical</option>
                          </select>
                        </div>
                        <div className="space-y-2">
                          <label className="text-[8px] font-mono text-gray-600 uppercase ml-1">Current_Protocol</label>
                          <select
                            value={isEditing ? (editForm.status || selectedRepair.status) : selectedRepair.status}
                            onChange={(e) => {
                              const newStatus = e.target.value as RepairStatus;
                              if (isEditing) {
                                handleEditChange('status', newStatus);
                              } else {
                                handleStatusChange(selectedRepair.id, newStatus);
                              }
                            }}
                            className={`w-full bg-black border border-white/10 rounded-xl px-3 py-2 text-[10px] font-black uppercase tracking-widest focus:outline-none transition-all ${getStatusColor(isEditing ? (editForm.status || selectedRepair.status) : selectedRepair.status)}`}
                          >
                            <option value="pending">Pending</option>
                            <option value="diagnosing">Diagnosing</option>
                            <option value="awaiting_parts">Awaiting Parts</option>
                            <option value="in_progress">In Progress</option>
                            <option value="testing">Testing</option>
                            <option value="completed">Completed</option>
                            <option value="cancelled">Cancelled</option>
                          </select>
                        </div>
                      </div>

                      <div className="space-y-2">
                        <label className="text-[8px] font-mono text-gray-600 uppercase ml-1">Assigned_Technician</label>
                        <div className="flex gap-2">
                          <select
                            value={editForm.technician || selectedRepair.technician || ''}
                            onChange={(e) => handleEditChange('technician', e.target.value)}
                            disabled={!isEditing}
                            className="flex-1 bg-black border border-white/10 rounded-xl px-3 py-2 text-[10px] font-black uppercase tracking-widest text-white focus:outline-none focus:border-[#B000FF]"
                          >
                            <option value="">Unassigned</option>
                            {TECHNICIANS.map(t => (
                              <option key={t.id} value={t.name}>{t.name} ({t.specialty})</option>
                            ))}
                          </select>
                        </div>
                      </div>
                    </div>

                    <div className="space-y-6 pt-4">
                      <div className="flex items-center justify-between border-b border-white/5 pb-2">
                        <h4 className="text-[10px] font-black text-gray-500 uppercase tracking-[0.3em]">AI_Diagnosis_Matrix</h4>
                        <button
                          onClick={handleAIDiagnosis}
                          disabled={isAnalyzing}
                          className="text-[9px] font-black text-[#B000FF] hover:text-white transition-colors flex items-center gap-1 uppercase tracking-widest disabled:opacity-50"
                        >
                          <Zap size={10} className={isAnalyzing ? 'animate-pulse' : ''} />
                          {isAnalyzing ? 'Processing...' : 'Run Analysis'}
                        </button>
                      </div>
                      
                      <div className="relative min-h-[150px] bg-black/40 border border-[#B000FF]/20 rounded-2xl p-6 overflow-hidden group">
                        <div className="absolute inset-0 bg-[#B000FF]/5 opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none" />
                        
                        {diagnosis ? (
                          <motion.div
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            className="text-[10px] font-mono text-gray-300 leading-relaxed space-y-2"
                          >
                            <p className="text-[#B000FF] font-black uppercase tracking-tighter">Diagnostic Report Output:</p>
                            <div className="whitespace-pre-wrap">{diagnosis}</div>
                          </motion.div>
                        ) : (
                          <div className="flex flex-col items-center justify-center h-full text-center space-y-3">
                            <Activity className="text-gray-800" size={32} />
                            <p className="text-[9px] font-mono text-gray-600 uppercase tracking-widest">Awaiting Fault Analysis Scan</p>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* RIGHT: Parts & Financials */}
                  <div className="lg:col-span-1 space-y-8">
                    <div className="space-y-6">
                      <h4 className="text-[10px] font-black text-gray-500 uppercase tracking-[0.3em] border-b border-white/5 pb-2">Parts_Manifest</h4>
                      
                      <div className="space-y-3">
                        {selectedRepair.parts && selectedRepair.parts.length > 0 ? (
                          selectedRepair.parts.map(part => (
                            <div key={part.id} className="flex items-center justify-between p-3 bg-white/[0.02] border border-white/5 rounded-xl">
                              <div>
                                <p className="text-[10px] font-black text-white uppercase">{part.name}</p>
                                <p className="text-[8px] font-mono text-gray-600">Qty: {part.quantity} @ {formatCurrency(part.cost)}</p>
                              </div>
                              <p className="text-[10px] font-bold text-gray-400">{formatCurrency(part.cost * part.quantity)}</p>
                            </div>
                          ))
                        ) : (
                          <div className="p-4 border border-dashed border-white/5 rounded-xl text-center">
                            <p className="text-[9px] font-mono text-gray-700 uppercase tracking-widest">No Parts Allocated</p>
                          </div>
                        )}
                        
                        {isEditing && (
                          <button 
                            onClick={handleAppendPart}
                            className="w-full py-2 border border-dashed border-[#B000FF]/30 text-[#B000FF]/50 hover:text-[#B000FF] hover:border-[#B000FF] transition-all rounded-xl text-[9px] font-black uppercase tracking-widest flex items-center justify-center gap-2"
                          >
                            <Plus size={12} /> Append Part Node
                          </button>
                        )}
                      </div>
                    </div>

                    <div className="space-y-6 pt-4">
                      <h4 className="text-[10px] font-black text-gray-500 uppercase tracking-[0.3em] border-b border-white/5 pb-2">Financial_Ledger</h4>
                      <div className="bg-[#B000FF]/5 border border-[#B000FF]/10 rounded-2xl p-6 space-y-4">
                        <div className="flex justify-between items-center">
                          <span className="text-[10px] font-mono text-gray-500 uppercase">Parts Total</span>
                          <span className="text-xs font-bold text-white">
                            {formatCurrency(selectedRepair.parts?.reduce((sum, p) => sum + (p.cost * p.quantity), 0) || 0)}
                          </span>
                        </div>
                        <div className="flex justify-between items-center">
                          <span className="text-[10px] font-mono text-gray-500 uppercase">Labor_Node</span>
                          {isEditing ? (
                            <input
                              type="number"
                              value={editForm.laborCost || 0}
                              onChange={(e) => handleEditChange('laborCost', parseFloat(e.target.value))}
                              className="w-20 bg-black border border-white/10 rounded px-2 py-1 text-xs text-right text-white font-bold"
                            />
                          ) : (
                            <span className="text-xs font-bold text-white">{formatCurrency(selectedRepair.laborCost || 0)}</span>
                          )}
                        </div>
                        <div className="pt-4 border-t border-[#B000FF]/20 flex justify-between items-end">
                          <div>
                            <p className="text-[10px] font-black text-[#B000FF] uppercase tracking-[0.2em]">Total_Valuation</p>
                            <p className="text-[8px] font-mono text-gray-600 uppercase mt-1">Final Invoice Estimator</p>
                          </div>
                          <span className="text-2xl font-black text-white tracking-tighter italic">
                            {formatCurrency((selectedRepair.parts?.reduce((sum, p) => sum + (p.cost * p.quantity), 0) || 0) + (editForm.laborCost || selectedRepair.laborCost || 0))}
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>

                {/* BOTTOM: Event History Log */}
                <div className="mt-12 space-y-6">
                  <h4 className="text-[10px] font-black text-gray-500 uppercase tracking-[0.3em] border-b border-white/5 pb-2">Activity_Timeline_Manifest</h4>
                  <div className="space-y-4">
                    {(selectedRepair.history || []).map((log, i) => (
                      <div key={i} className="flex gap-4 items-start relative group">
                        {i !== (selectedRepair.history?.length || 0) - 1 && (
                          <div className="absolute left-2 top-6 bottom-[-16px] w-[1px] bg-white/5" />
                        )}
                        <div className="w-4 h-4 rounded-full bg-white/10 border border-white/10 flex-shrink-0 mt-1 z-10 group-hover:bg-[#B000FF] transition-colors" />
                        <div className="flex-1 pb-4">
                          <div className="flex justify-between items-start">
                            <p className="text-[10px] font-black text-white uppercase tracking-wider">{log.action}</p>
                            <span className="text-[8px] font-mono text-gray-600 uppercase">{log.date}</span>
                          </div>
                          <p className="text-[10px] text-gray-500 font-medium mt-1 leading-relaxed">{log.note || 'No additional telemetry data recorded.'}</p>
                          <p className="text-[8px] font-mono text-[#B000FF]/50 uppercase mt-1">Authorized By: {log.user}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              {/* Action Bar Footer */}
              <div className="p-6 bg-white/[0.02] border-t border-white/10 flex justify-between items-center">
                <div className="flex gap-2">
                  <button
                    onClick={() => handleManualNotification('update')}
                    className="px-4 py-2 bg-blue-500/10 text-blue-500 border border-blue-500/20 hover:bg-blue-500/20 transition-all rounded-xl text-[10px] font-black uppercase tracking-widest flex items-center gap-2"
                  >
                    <Activity size={14} /> Push Status Update
                  </button>
                  <button
                    onClick={() => handleManualNotification('quote')}
                    className="px-4 py-2 bg-emerald-500/10 text-emerald-500 border border-emerald-500/20 hover:bg-emerald-500/20 transition-all rounded-xl text-[10px] font-black uppercase tracking-widest flex items-center gap-2"
                  >
                    <ShieldCheck size={14} /> Dispatch Quote
                  </button>
                </div>
                
                <div className="flex gap-2">
                  {selectedRepair.status === 'pending' && (
                    <button
                      onClick={() => handleStatusChange(selectedRepair.id, 'diagnosing')}
                      className="px-4 py-2 bg-blue-500 text-black font-black rounded-xl text-[10px] uppercase tracking-widest hover:bg-blue-400 transition-all shadow-[0_0_15px_rgba(59,130,246,0.3)] flex items-center gap-2"
                    >
                      <Activity size={14} /> Start Diagnosis
                    </button>
                  )}
                  {selectedRepair.status === 'diagnosing' && (
                    <button
                      onClick={() => handleStatusChange(selectedRepair.id, 'in_progress')}
                      className="px-4 py-2 bg-cyan-500 text-black font-black rounded-xl text-[10px] uppercase tracking-widest hover:bg-cyan-400 transition-all shadow-[0_0_15px_rgba(6,182,212,0.3)] flex items-center gap-2"
                    >
                      <Wrench size={14} /> Begin Repair
                    </button>
                  )}
                  {selectedRepair.status === 'in_progress' && (
                    <button
                      onClick={() => handleStatusChange(selectedRepair.id, 'testing')}
                      className="px-4 py-2 bg-orange-500 text-black font-black rounded-xl text-[10px] uppercase tracking-widest hover:bg-orange-400 transition-all shadow-[0_0_15px_rgba(249,115,22,0.3)] flex items-center gap-2"
                    >
                      <Zap size={14} /> QC Testing
                    </button>
                  )}
                  {['diagnosing', 'in_progress', 'testing', 'awaiting_parts'].includes(selectedRepair.status) && (
                    <button
                      onClick={() => handleStatusChange(selectedRepair.id, 'completed')}
                      className="px-6 py-3 bg-[#B000FF] text-black font-black rounded-2xl text-xs uppercase tracking-[0.2em] hover:bg-[#9333EA] transition-all shadow-[0_0_30px_rgba(168,85,247,0.3)] flex items-center gap-2"
                    >
                      <CheckCircle size={18} /> Finalize Protocol
                    </button>
                  )}
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Stats Matrix */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="bg-[#080112] border border-white/10 p-6 rounded-2xl relative overflow-hidden group">
          <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:opacity-20 transition-opacity">
            <Activity className="h-12 w-12 text-[#B000FF]" />
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
              className="bg-[#B000FF] h-full shadow-[0_0_10px_#B000FF]"
            />
          </div>
        </div>
        <div className="bg-[#080112] border border-white/10 p-6 rounded-2xl">
          <p className="text-gray-500 text-[10px] font-mono uppercase tracking-widest mb-1">Pending Tickets</p>
          <p className="text-3xl font-bold text-amber-500 tracking-tighter">{repairs.filter(r => r.status === 'pending').length}</p>
          <p className="text-gray-600 text-[10px] font-mono mt-2 uppercase">Awaiting Protocol</p>
        </div>
        <div className="bg-[#080112] border border-white/10 p-6 rounded-2xl">
          <p className="text-gray-500 text-[10px] font-mono uppercase tracking-widest mb-1">In Progress</p>
          <p className="text-3xl font-bold text-blue-500 tracking-tighter">{repairs.filter(r => ['diagnosing', 'in_progress', 'testing', 'awaiting_parts'].includes(r.status)).length}</p>
          <p className="text-gray-600 text-[10px] font-mono mt-2 uppercase">Active Matrix</p>
        </div>
        <div className="bg-[#080112] border border-white/10 p-6 rounded-2xl">
          <p className="text-gray-500 text-[10px] font-mono uppercase tracking-widest mb-1">Critical Status</p>
          <p className="text-3xl font-bold text-red-500 tracking-tighter">{repairs.filter(r => r.priority === 'critical' || (r.priority === 'high' && r.status !== 'completed')).length}</p>
          <p className="text-gray-600 text-[10px] font-mono mt-2 uppercase">Immediate Attention</p>
        </div>
      </div>

      {/* Control Bar */}
      <div className="flex flex-col md:flex-row gap-4 bg-[#080112] p-4 rounded-2xl border border-white/10">
        <div className="relative flex-grow">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-500" />
          <input
            type="text"
            placeholder="Search repair matrix..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-10 pr-4 py-2 bg-black border border-white/10 rounded-xl text-white font-mono text-xs focus:outline-none focus:border-[#B000FF] w-full"
          />
        </div>
        <div className="flex items-center space-x-3 overflow-x-auto pb-2 md:pb-0">
          <Filter className="h-4 w-4 text-gray-500 flex-shrink-0" />
          {(['all', 'pending', 'diagnosing', 'in_progress', 'awaiting_parts', 'completed'] as const).map(f => (
            <button
              key={f}
              onClick={() => setFilter(f)}
              className={`px-3 py-1.5 rounded-lg text-[9px] font-black uppercase tracking-widest border transition-all whitespace-nowrap ${
                filter === f ? 'bg-[#B000FF] text-white border-[#B000FF]' : 'bg-black text-gray-500 border-white/10 hover:border-white/20'
              }`}
            >
              {f.replace('_', ' ')}
            </button>
          ))}
        </div>
      </div>

      {/* Content Matrix */}
      <div className="bg-[#080112] border border-white/10 rounded-2xl overflow-hidden shadow-2xl">
        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead className="bg-white/[0.02] text-gray-500 text-[10px] font-mono uppercase tracking-widest">
              <tr>
                <th className="px-6 py-4">Ticket ID</th>
                <th className="px-6 py-4">Identity / Date</th>
                <th className="px-6 py-4">Hardware & Issue</th>
                <th className="px-6 py-4">Priority</th>
                <th className="px-6 py-4">Technician</th>
                <th className="px-6 py-4">Status Protocol</th>
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
                  <td className="px-6 py-4">
                    <span className="text-[#B000FF] font-bold tracking-tighter block">[{repair.id}]</span>
                    <span className="text-[8px] text-gray-600 mt-1 block uppercase">Matrix_Node</span>
                  </td>
                  <td className="px-6 py-4">
                    <div className="text-white uppercase font-bold">{repair.customer}</div>
                    <div className="text-[10px] text-gray-600">{repair.date}</div>
                  </td>
                  <td className="px-6 py-4">
                    <div className="text-gray-300 uppercase font-bold tracking-tight">{repair.device}</div>
                    <div className="text-[10px] text-gray-600 uppercase truncate max-w-[150px]">{repair.issue}</div>
                  </td>
                  <td className="px-6 py-4">
                    <span className={`px-2 py-0.5 text-[9px] font-black rounded border uppercase tracking-widest ${getPriorityColor(repair.priority)}`}>
                      {repair.priority}
                    </span>
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-2">
                      <div className="w-6 h-6 rounded-lg bg-white/5 border border-white/10 flex items-center justify-center text-[10px] text-gray-500 font-bold uppercase">
                        {repair.technician ? repair.technician[0] : '?'}
                      </div>
                      <span className="text-[10px] text-white uppercase font-bold">{repair.technician || 'Unassigned'}</span>
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <div className="relative inline-block">
                      <select
                        value={repair.status}
                        onChange={(e) => handleStatusChange(repair.id, e.target.value as RepairStatus)}
                        className={`appearance-none px-3 py-1 rounded-full border text-[9px] font-black uppercase tracking-widest cursor-pointer outline-none transition-all pr-8 ${getStatusColor(repair.status)}`}
                      >
                        <option value="pending">Pending</option>
                        <option value="diagnosing">Diagnosing</option>
                        <option value="awaiting_parts">Awaiting Parts</option>
                        <option value="in_progress">In Progress</option>
                        <option value="testing">Testing</option>
                        <option value="completed">Completed</option>
                        <option value="cancelled">Cancelled</option>
                      </select>
                      <div className="absolute right-2 top-1/2 -translate-y-1/2 pointer-events-none opacity-50">
                        <ChevronDown size={10} />
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4 text-right">
                    <div className="flex justify-end space-x-2">
                      {['diagnosing', 'in_progress', 'testing', 'awaiting_parts'].includes(repair.status) && (
                        <button
                          onClick={() => handleStatusChange(repair.id, 'completed')}
                          className="p-2 bg-emerald-500/10 text-emerald-500 hover:bg-emerald-500 border border-emerald-500/20 rounded-xl transition-all"
                          title="Quick Complete"
                        >
                          <CheckCircle size={14} />
                        </button>
                      )}
                      <button
                        onClick={() => setSelectedRepair(repair)}
                        className="p-2 bg-white/5 hover:bg-[#B000FF]/20 border border-white/5 hover:border-[#B000FF]/30 text-gray-400 hover:text-white rounded-xl transition-all group/btn"
                        title="Open Command Center"
                      >
                        <Zap className="h-4 w-4 group-hover/btn:fill-[#B000FF]" />
                      </button>
                    </div>
                  </td>
                </motion.tr>
              ))}
            </tbody>
          </table>
        </div>

        {filteredRepairs.length === 0 && (
          <div className="text-center py-12 space-y-4">
            <p className="text-gray-600 font-mono text-xs uppercase tracking-widest">
              Repair Matrix Empty // No matching records
            </p>
            {repairs.length === 0 ? (
              <button
                onClick={handleSeedRepairs}
                className="px-6 py-2 bg-[#B000FF] text-black rounded-xl font-black uppercase tracking-widest hover:bg-[#9333EA] transition-all shadow-[0_0_20px_rgba(168,85,247,0.4)]"
              >
                Seed Mock Repairs
              </button>
            ) : (
              <div className="flex flex-col gap-4 items-center mt-4">
                <button
                  onClick={() => { setFilter('all'); setSearch(''); }}
                  className="text-[10px] font-black text-[#B000FF] uppercase tracking-widest hover:underline"
                >
                  Reset Matrix Filters
                </button>
                <button
                  onClick={handleClearAll}
                  className="px-4 py-2 bg-red-500/10 text-red-500 rounded-xl text-[10px] font-bold uppercase tracking-widest hover:bg-red-500/20 transition-all border border-red-500/20"
                >
                  Clear All Repairs (Reset Matrix)
                </button>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

