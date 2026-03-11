import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
    ShieldCheck, FileText, CheckCircle2, XCircle, Clock,
    Search, Filter, ExternalLink, Eye, ChevronDown, ChevronUp,
    AlertTriangle, Zap, Fingerprint, Activity, Terminal, Scan, X, Check
} from 'lucide-react';
import { updateKYCStatus, KYCData } from '../../services/kyc';

export default function AdminKYC() {
    const [documents, setDocuments] = useState<(KYCData & { id: string })[]>([]);
    const [loading, setLoading] = useState(true);
    const [filter, setFilter] = useState<'ALL' | 'PENDING' | 'APPROVED' | 'REJECTED' | 'MANUAL_REVIEW'>('ALL');
    const [searchQuery, setSearchSearchQuery] = useState('');
    const [expandedId, setExpandedId] = useState<string | null>(null);

    const fetchDocuments = () => {
        setLoading(true);
        try {
            const stored = localStorage.getItem('consolezone_kyc_data');
            const allData = stored ? JSON.parse(stored) : {};
            const docsList = Object.keys(allData).map(userId => ({
                ...allData[userId],
                id: userId,
                // Fallback mappings if missing
                user: allData[userId].fullName,
                avatar: "https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?q=80&w=100",
                type: "ID Card & Selfie",
                date: allData[userId].submittedAt?.split('T')[0] || 'N/A',
            }));
            setDocuments(docsList);
        } catch (e) {
            console.error("Failed to parse KYC data:", e);
            setDocuments([]);
        }
        setLoading(false);
    };

    useEffect(() => {
        fetchDocuments();
        window.addEventListener('kyc-updated', fetchDocuments);
        return () => window.removeEventListener('kyc-updated', fetchDocuments);
    }, []);

    const handleAction = async (id: string, status: 'APPROVED' | 'REJECTED') => {
        await updateKYCStatus(id, status);
        fetchDocuments();
    };

    const filteredDocs = documents.filter(doc => {
        const matchesFilter = filter === 'ALL' || doc.status === filter;
        const matchesSearch = doc.fullName.toLowerCase().includes(searchQuery.toLowerCase()) ||
            doc.id.toLowerCase().includes(searchQuery.toLowerCase());
        return matchesFilter && matchesSearch;
    });

    const getStatusColor = (status: string) => {
        switch (status) {
            case 'APPROVED': return 'text-emerald-500 bg-emerald-500/10 border-emerald-500/20';
            case 'REJECTED': return 'text-red-500 bg-red-500/10 border-red-500/20';
            case 'MANUAL_REVIEW': return 'text-amber-500 bg-amber-500/10 border-amber-500/20';
            default: return 'text-blue-500 bg-blue-500/10 border-blue-500/20';
        }
    };

    return (
        <div className="min-h-screen bg-[#050505] text-white p-6 lg:p-10 space-y-8 font-sans">
            {/* Header */}
            <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 border-b border-white/10 pb-8">
                <div>
                    <div className="flex items-center space-x-2 mb-2">
                        <Terminal className="h-3 w-3 text-[#A855F7] animate-pulse" />
                        <span className="text-[10px] font-mono text-[#A855F7] uppercase tracking-[0.2em]">Security Protocol // KYC Terminal</span>
                    </div>
                    <h1 className="text-4xl font-bold text-white tracking-tighter uppercase italic">Agent <span className="text-[#A855F7]">Clearance</span></h1>
                    <p className="text-gray-500 font-mono text-xs mt-1">Automated Identity Verification & Document Integrity Matrix</p>
                </div>

                <div className="flex items-center space-x-3">
                    <div className="bg-white/5 border border-white/10 rounded-lg px-4 py-2 flex items-center space-x-3">
                        <Activity className="h-4 w-4 text-emerald-500" />
                        <span className="text-[10px] font-mono text-gray-400 uppercase tracking-widest">Real-time Analysis Feed</span>
                    </div>
                </div>
            </div>

            {/* Stats Bar */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                {[
                    { label: 'Total Requests', value: documents.length, icon: FileText, color: 'text-white' },
                    { label: 'Auto Approved', value: documents.filter(d => d.status === 'APPROVED').length, icon: CheckCircle2, color: 'text-emerald-500' },
                    { label: 'Manual Review', value: documents.filter(d => d.status === 'MANUAL_REVIEW').length, icon: AlertTriangle, color: 'text-amber-500' },
                    { label: 'Avg Trust Score', value: `${Math.round(documents.reduce((acc, d) => acc + (d.trustScore || 0), 0) / (documents.length || 1))}%`, icon: Zap, color: 'text-[#A855F7]' }
                ].map((stat, i) => (
                    <div key={i} className="bg-[#0a0a0a] border border-white/5 p-4 rounded-xl flex items-center justify-between">
                        <div>
                            <p className="text-[9px] font-mono text-gray-500 uppercase tracking-widest">{stat.label}</p>
                            <p className={`text-xl font-bold ${stat.color}`}>{stat.value}</p>
                        </div>
                        <stat.icon className={`h-5 w-5 ${stat.color} opacity-20`} />
                    </div>
                ))}
            </div>

            {/* Controls */}
            <div className="flex flex-col md:flex-row gap-4">
                <div className="relative flex-1">
                    <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-500 h-4 w-4" />
                    <input
                        type="text"
                        placeholder="Search by name or UUID..."
                        value={searchQuery}
                        onChange={(e) => setSearchSearchQuery(e.target.value)}
                        className="w-full bg-[#0a0a0a] border border-white/10 rounded-lg py-3 pl-12 pr-4 text-sm focus:border-[#A855F7]/50 transition-all outline-none"
                    />
                </div>
                <div className="flex gap-2 overflow-x-auto pb-2 md:pb-0">
                    {['ALL', 'PENDING', 'APPROVED', 'MANUAL_REVIEW', 'REJECTED'].map((f) => (
                        <button
                            key={f}
                            onClick={() => setFilter(f as any)}
                            className={`px-4 py-2 rounded-lg text-[10px] font-black uppercase tracking-widest border transition-all whitespace-nowrap ${filter === f
                                ? 'bg-[#A855F7] text-white border-[#A855F7]'
                                : 'bg-[#0a0a0a] text-gray-500 border-white/10 hover:border-white/20'
                                }`}
                        >
                            {f}
                        </button>
                    ))}
                </div>
            </div>

            {/* Grid */}
            <div className="space-y-4">
                {filteredDocs.map((docItem) => (
                    <div key={docItem.id} className="group">
                        <motion.div
                            initial={{ opacity: 0, y: 10 }}
                            animate={{ opacity: 1, y: 0 }}
                            className={`bg-[#0a0a0a] border transition-all duration-300 rounded-xl overflow-hidden ${expandedId === docItem.id ? 'border-[#A855F7]/50 shadow-[0_0_30px_rgba(168,85,247,0.1)]' : 'border-white/5 hover:border-white/10'}`}
                        >
                            <div className="p-6 flex flex-col md:flex-row items-center justify-between gap-6">
                                <div className="flex items-center gap-6 flex-1">
                                    <div className="relative">
                                        <div className="w-14 h-14 rounded-lg bg-white/5 border border-white/10 flex items-center justify-center overflow-hidden">
                                            {docItem.selfieUrl ? <img src={docItem.selfieUrl} alt="User" className="w-full h-full object-cover" /> : <User className="text-gray-700" />}
                                        </div>
                                        {docItem.trustScore !== undefined && (
                                            <div className={`absolute -bottom-2 -right-2 px-1.5 py-0.5 rounded text-[8px] font-black border ${docItem.trustScore > 80 ? 'bg-emerald-500/20 text-emerald-500 border-emerald-500/20' : 'bg-amber-500/20 text-amber-500 border-amber-500/20'}`}>
                                                {docItem.trustScore}%
                                            </div>
                                        )}
                                    </div>

                                    <div className="space-y-1">
                                        <div className="flex items-center gap-3">
                                            <h3 className="text-lg font-bold text-white tracking-tight">{docItem.fullName}</h3>
                                            <span className="text-[9px] font-mono text-gray-600 px-2 py-0.5 bg-white/5 rounded">ID: {docItem.id.substring(0, 8)}</span>
                                        </div>
                                        <div className="flex flex-wrap items-center gap-4 text-[10px] font-mono uppercase tracking-widest text-gray-500">
                                            <span className="flex items-center gap-1 text-[#A855F7]">
                                                <Fingerprint size={12} /> {docItem.drivingLicenseNumber}
                                            </span>
                                            <span>•</span>
                                            <span>SUBMITTED: {new Date(docItem.submittedAt || '').toLocaleDateString()}</span>
                                            <span>•</span>
                                            <span className={`px-2 py-0.5 rounded-full border ${getStatusColor(docItem.status || '')}`}>{docItem.status}</span>
                                        </div>
                                    </div>
                                </div>

                                <div className="flex items-center gap-3">
                                    <button
                                        onClick={() => setExpandedId(expandedId === docItem.id ? null : docItem.id)}
                                        className="p-2 hover:bg-white/5 rounded-lg transition-colors text-gray-500 hover:text-white"
                                    >
                                        {expandedId === docItem.id ? <ChevronUp size={20} /> : <ChevronDown size={20} />}
                                    </button>
                                    <div className="h-8 w-[1px] bg-white/10 mx-2" />
                                    <button
                                        onClick={() => handleAction(docItem.id, 'APPROVED')}
                                        disabled={docItem.status === 'APPROVED'}
                                        className="p-2.5 bg-emerald-500/10 text-emerald-500 rounded-xl border border-emerald-500/20 hover:bg-emerald-500 hover:text-white transition-all disabled:opacity-30"
                                        title="Approve"
                                    >
                                        <Check size={18} strokeWidth={3} />
                                    </button>
                                    <button
                                        onClick={() => handleAction(docItem.id, 'REJECTED')}
                                        disabled={docItem.status === 'REJECTED'}
                                        className="p-2.5 bg-red-500/10 text-red-500 rounded-xl border border-red-500/20 hover:bg-red-500 hover:text-white transition-all disabled:opacity-30"
                                        title="Reject"
                                    >
                                        <X size={18} strokeWidth={3} />
                                    </button>
                                </div>
                            </div>

                            <AnimatePresence>
                                {expandedId === docItem.id && (
                                    <motion.div
                                        initial={{ height: 0, opacity: 0 }}
                                        animate={{ height: 'auto', opacity: 1 }}
                                        exit={{ height: 0, opacity: 0 }}
                                        className="border-t border-white/5 bg-black/40 overflow-hidden"
                                    >
                                        <div className="p-8 grid grid-cols-1 lg:grid-cols-3 gap-8">
                                            {/* Documents */}
                                            <div className="space-y-4">
                                                <h4 className="text-[10px] font-black text-gray-500 uppercase tracking-widest mb-4">Evidence Assets</h4>
                                                <div className="grid grid-cols-3 gap-2">
                                                    <div className="space-y-2">
                                                        <p className="text-[8px] font-mono text-gray-600 uppercase text-center">ID Front</p>
                                                        <div className="aspect-[4/3] rounded-lg bg-white/5 border border-white/10 overflow-hidden group cursor-pointer relative">
                                                            <img src={docItem.idFrontUrl} className="w-full h-full object-cover opacity-50 group-hover:opacity-100 transition-opacity" />
                                                            <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity bg-black/60">
                                                                <Eye size={14} />
                                                            </div>
                                                        </div>
                                                    </div>
                                                    <div className="space-y-2">
                                                        <p className="text-[8px] font-mono text-gray-600 uppercase text-center">ID Back</p>
                                                        <div className="aspect-[4/3] rounded-lg bg-white/5 border border-white/10 overflow-hidden group cursor-pointer relative">
                                                            <img src={docItem.idBackUrl} className="w-full h-full object-cover opacity-50 group-hover:opacity-100 transition-opacity" />
                                                            <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity bg-black/60">
                                                                <Eye size={14} />
                                                            </div>
                                                        </div>
                                                    </div>
                                                    <div className="space-y-2">
                                                        <p className="text-[8px] font-mono text-gray-600 uppercase text-center">Live Selfie</p>
                                                        <div className="aspect-[4/3] rounded-lg bg-white/5 border border-white/10 overflow-hidden group cursor-pointer relative">
                                                            <img src={docItem.selfieUrl} className="w-full h-full object-cover opacity-50 group-hover:opacity-100 transition-opacity" />
                                                            <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity bg-black/60">
                                                                <Eye size={14} />
                                                            </div>
                                                        </div>
                                                    </div>
                                                </div>
                                                <div className="pt-4 border-t border-white/5">
                                                    <p className="text-[10px] font-black text-gray-500 uppercase tracking-widest mb-2">Registered Address</p>
                                                    <p className="text-[11px] text-gray-400 font-medium leading-relaxed italic">{docItem.address}</p>
                                                </div>
                                            </div>

                                            {/* Agent Reports */}
                                            <div className="lg:col-span-2 space-y-4">
                                                <h4 className="text-[10px] font-black text-gray-500 uppercase tracking-widest mb-4">Automated Agent Findings</h4>
                                                <div className="space-y-3">
                                                    {docItem.agentReports ? docItem.agentReports.map((report, i) => (
                                                        <div key={i} className="bg-white/[0.02] border border-white/5 rounded-xl p-4 flex items-start gap-4">
                                                            <div className={`p-2 rounded-lg ${report.status === 'PASS' ? 'bg-emerald-500/10 text-emerald-500' : 'bg-amber-500/10 text-amber-500'}`}>
                                                                {report.agentName === 'Document Specialist' ? <FileText size={14} /> :
                                                                    report.agentName === 'Biometric Analyst' ? <Scan size={14} /> :
                                                                        <ShieldCheck size={14} />}
                                                            </div>
                                                            <div className="flex-1">
                                                                <div className="flex justify-between items-center mb-1">
                                                                    <p className="text-[10px] font-black text-white uppercase tracking-wider">{report.agentName}</p>
                                                                    <span className={`text-[8px] font-black px-2 py-0.5 rounded ${report.status === 'PASS' ? 'bg-emerald-500/10 text-emerald-500' : 'bg-amber-500/10 text-amber-500'}`}>
                                                                        {report.status}
                                                                    </span>
                                                                </div>
                                                                <p className="text-xs text-gray-400 font-medium">{report.message}</p>
                                                                {report.details && <p className="text-[10px] text-gray-600 font-mono mt-2 italic">{report.details}</p>}
                                                            </div>
                                                        </div>
                                                    )) : (
                                                        <div className="bg-white/5 border border-dashed border-white/10 rounded-xl p-8 text-center">
                                                            <Clock className="mx-auto text-gray-700 mb-2" size={24} />
                                                            <p className="text-[10px] font-mono text-gray-600 uppercase">Awaiting Automated Protocol Analysis</p>
                                                        </div>
                                                    )}
                                                </div>
                                            </div>
                                        </div>
                                    </motion.div>
                                )}
                            </AnimatePresence>
                        </motion.div>
                    </div>
                ))}

                {filteredDocs.length === 0 && (
                    <div className="bg-[#0a0a0a] border border-dashed border-white/10 rounded-2xl p-20 text-center">
                        <Terminal className="mx-auto text-gray-800 mb-4 h-12 w-12" />
                        <h3 className="text-white font-bold text-lg mb-1 italic uppercase tracking-tighter">No Protocol Records Found</h3>
                        <p className="text-gray-600 text-xs font-mono">The matrix is currently empty for the selected filters.</p>
                    </div>
                )}
            </div>
        </div>
    );
}

// Internal User Component for the placeholder
function User({ className }: { className?: string }) {
    return (
        <svg 
            xmlns="http://www.w3.org/2000/svg" 
            width="24" 
            height="24" 
            viewBox="0 0 24 24" 
            fill="none" 
            stroke="currentColor" 
            strokeWidth="2" 
            strokeLinecap="round" 
            strokeLinejoin="round" 
            className={className}
        >
            <path d="M19 21v-2a4 4 0 0 0-4-4H9a4 4 0 0 0-4 4v2" />
            <circle cx="12" cy="7" r="4" />
        </svg>
    );
}
