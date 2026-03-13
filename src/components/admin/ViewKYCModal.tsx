import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
    X, ShieldCheck, User, Phone, MapPin, 
    Fingerprint, FileCheck, Loader2, Eye,
    ExternalLink, Video, CheckCircle2, AlertCircle
} from 'lucide-react';
import { KYCData, getKYCStatus } from '../../services/kyc';

interface ViewKYCModalProps {
    isOpen: boolean;
    onClose: () => void;
    userId: string;
    userName: string;
}

export default function ViewKYCModal({ isOpen, onClose, userId, userName }: ViewKYCModalProps) {
    const [loading, setLoading] = useState(true);
    const [kycData, setKycData] = useState<KYCData | null>(null);

    useEffect(() => {
        if (isOpen && userId) {
            const fetchKYC = async () => {
                setLoading(true);
                const data = await getKYCStatus(userId);
                setKycData(data);
                setLoading(false);
            };
            fetchKYC();
        }
    }, [isOpen, userId]);

    const getStatusColor = (status: string) => {
        switch (status) {
            case 'APPROVED': return 'text-emerald-500 bg-emerald-500/10 border-emerald-500/20';
            case 'REJECTED': return 'text-red-500 bg-red-500/10 border-red-500/20';
            case 'MANUAL_REVIEW': return 'text-amber-500 bg-amber-500/10 border-amber-500/20';
            default: return 'text-blue-500 bg-blue-500/10 border-blue-500/20';
        }
    };

    return (
        <AnimatePresence>
            {isOpen && (
                <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 md:p-6">
                    <motion.div 
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        onClick={onClose}
                        className="absolute inset-0 bg-black/90 backdrop-blur-md"
                    />
                    
                    <motion.div
                        initial={{ scale: 0.95, opacity: 0, y: 20 }}
                        animate={{ scale: 1, opacity: 1, y: 0 }}
                        exit={{ scale: 0.95, opacity: 0, y: 20 }}
                        className="relative w-full max-w-4xl bg-[#080112] border border-white/10 rounded-3xl overflow-hidden shadow-2xl max-h-[90vh] flex flex-col"
                    >
                        {/* Header */}
                        <div className="p-6 border-b border-white/5 flex items-center justify-between bg-white/[0.02]">
                            <div className="flex items-center gap-3">
                                <div className="p-2 bg-[#B000FF]/10 rounded-lg text-[#B000FF]">
                                    <Eye size={20} />
                                </div>
                                <div>
                                    <h3 className="text-white font-black uppercase tracking-widest text-sm">Identity Records: {userName}</h3>
                                    <p className="text-[10px] font-mono text-gray-500 uppercase tracking-widest">Verification Dossier // {userId}</p>
                                </div>
                            </div>
                            <button onClick={onClose} className="text-gray-500 hover:text-white transition-colors">
                                <X size={20} />
                            </button>
                        </div>

                        <div className="flex-1 overflow-y-auto p-8 custom-scrollbar">
                            {loading ? (
                                <div className="py-20 flex flex-col items-center justify-center gap-4 text-[#B000FF]">
                                    <Loader2 className="animate-spin" size={32} />
                                    <p className="text-[10px] font-black uppercase tracking-[0.3em]">Accessing Secure Records...</p>
                                </div>
                            ) : kycData ? (
                                <div className="space-y-10">
                                    {/* Status Banner */}
                                    <div className={`p-4 rounded-2xl border flex items-center justify-between ${getStatusColor(kycData.status || '')}`}>
                                        <div className="flex items-center gap-3">
                                            <ShieldCheck size={20} />
                                            <div>
                                                <p className="text-[10px] font-black uppercase tracking-widest opacity-60">Protocol Status</p>
                                                <p className="text-sm font-bold uppercase">{kycData.status}</p>
                                            </div>
                                        </div>
                                        <div className="text-right">
                                            <p className="text-[10px] font-black uppercase tracking-widest opacity-60">Trust Score</p>
                                            <p className="text-xl font-black italic">{kycData.trustScore || 0}%</p>
                                        </div>
                                    </div>

                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-10">
                                        {/* Basic Info */}
                                        <div className="space-y-6">
                                            <h4 className="text-[10px] font-black text-[#B000FF] uppercase tracking-[0.3em] border-b border-[#B000FF]/20 pb-2">Personnel Profile</h4>
                                            
                                            <div className="space-y-4">
                                                <div className="bg-white/5 p-4 rounded-xl border border-white/5">
                                                    <p className="text-[9px] font-black text-gray-500 uppercase tracking-widest mb-1">Full Legal Name</p>
                                                    <p className="text-white font-bold uppercase italic tracking-tight">{kycData.fullName}</p>
                                                </div>
                                                
                                                <div className="grid grid-cols-2 gap-4">
                                                    <div className="bg-white/5 p-4 rounded-xl border border-white/5">
                                                        <p className="text-[9px] font-black text-gray-500 uppercase tracking-widest mb-1">Mobile Vector</p>
                                                        <p className="text-white font-mono">{kycData.phone}</p>
                                                    </div>
                                                    <div className="bg-white/5 p-4 rounded-xl border border-white/5">
                                                        <p className="text-[9px] font-black text-gray-500 uppercase tracking-widest mb-1">D.L. Identification</p>
                                                        <p className="text-white font-mono uppercase">{kycData.drivingLicenseNumber}</p>
                                                    </div>
                                                </div>

                                                <div className="bg-white/5 p-4 rounded-xl border border-white/5">
                                                    <p className="text-[9px] font-black text-gray-500 uppercase tracking-widest mb-1">{kycData.secondaryIdType} Reference</p>
                                                    <p className="text-white font-mono uppercase">{kycData.secondaryIdNumber}</p>
                                                </div>

                                                <div className="bg-white/5 p-4 rounded-xl border border-white/5">
                                                    <p className="text-[9px] font-black text-gray-500 uppercase tracking-widest mb-1">Registered Habitation</p>
                                                    <p className="text-white text-xs leading-relaxed uppercase">{kycData.address}</p>
                                                </div>
                                            </div>
                                        </div>

                                        {/* Evidence Assets */}
                                        <div className="space-y-6">
                                            <h4 className="text-[10px] font-black text-[#B000FF] uppercase tracking-[0.3em] border-b border-[#B000FF]/20 pb-2">Evidence Matrix</h4>
                                            
                                            <div className="grid grid-cols-2 gap-4">
                                                <div className="space-y-2">
                                                    <p className="text-[8px] font-black text-gray-600 uppercase tracking-widest text-center">ID Front Segment</p>
                                                    <div className="aspect-video rounded-xl bg-white/5 border border-white/10 overflow-hidden group relative flex items-center justify-center">
                                                        {kycData.idFrontUrl === 'MANUAL_ENTRY' ? (
                                                            <span className="text-[10px] font-black text-amber-500/50 uppercase">Manual Entry</span>
                                                        ) : (
                                                            <>
                                                                <img src={kycData.idFrontUrl} className="w-full h-full object-cover" />
                                                                <a href={kycData.idFrontUrl} target="_blank" rel="noreferrer" className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center text-white">
                                                                    <ExternalLink size={16} />
                                                                </a>
                                                            </>
                                                        )}
                                                    </div>
                                                </div>
                                                <div className="space-y-2">
                                                    <p className="text-[8px] font-black text-gray-600 uppercase tracking-widest text-center">ID Back Segment</p>
                                                    <div className="aspect-video rounded-xl bg-white/5 border border-white/10 overflow-hidden group relative flex items-center justify-center">
                                                        {kycData.idBackUrl === 'MANUAL_ENTRY' ? (
                                                            <span className="text-[10px] font-black text-amber-500/50 uppercase">Manual Entry</span>
                                                        ) : (
                                                            <>
                                                                <img src={kycData.idBackUrl} className="w-full h-full object-cover" />
                                                                <a href={kycData.idBackUrl} target="_blank" rel="noreferrer" className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center text-white">
                                                                    <ExternalLink size={16} />
                                                                </a>
                                                            </>
                                                        )}
                                                    </div>
                                                </div>
                                                <div className="space-y-2">
                                                    <p className="text-[8px] font-black text-gray-600 uppercase tracking-widest text-center">Bio-Liveness Stream</p>
                                                    <div className="aspect-video rounded-xl bg-white/5 border border-white/10 overflow-hidden group relative flex items-center justify-center">
                                                        {kycData.selfieVideoUrl === 'MANUAL_ENTRY' ? (
                                                            <span className="text-[10px] font-black text-amber-500/50 uppercase">Manual Entry</span>
                                                        ) : (
                                                            <>
                                                                <Video size={24} className="text-[#B000FF]" />
                                                                <a href={kycData.selfieVideoUrl} target="_blank" rel="noreferrer" className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center text-white">
                                                                    <ExternalLink size={16} />
                                                                </a>
                                                            </>
                                                        )}
                                                    </div>
                                                </div>
                                                <div className="space-y-2">
                                                    <p className="text-[8px] font-black text-gray-600 uppercase tracking-widest text-center">Biometric Capture</p>
                                                    <div className="aspect-video rounded-xl bg-white/5 border border-white/10 overflow-hidden group relative flex items-center justify-center">
                                                        {kycData.selfieUrl === 'MANUAL_ENTRY' || (!kycData.selfieUrl && kycData.idFrontUrl === 'MANUAL_ENTRY') ? (
                                                            <span className="text-[10px] font-black text-amber-500/50 uppercase">Manual Entry</span>
                                                        ) : kycData.selfieUrl ? (
                                                            <>
                                                                <img src={kycData.selfieUrl} className="w-full h-full object-cover" />
                                                                <a href={kycData.selfieUrl} target="_blank" rel="noreferrer" className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center text-white">
                                                                    <ExternalLink size={16} />
                                                                </a>
                                                            </>
                                                        ) : (
                                                            <User size={24} className="text-gray-700" />
                                                        )}
                                                    </div>
                                                </div>
                                            </div>
                                        </div>
                                    </div>

                                    {/* Agent Feedbacks */}
                                    <div className="space-y-6">
                                        <h4 className="text-[10px] font-black text-[#B000FF] uppercase tracking-[0.3em] border-b border-[#B000FF]/20 pb-2">Analysis History</h4>
                                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                                            {kycData.agentReports?.map((report, i) => (
                                                <div key={i} className="bg-black border border-white/5 p-4 rounded-2xl space-y-2">
                                                    <div className="flex items-center justify-between">
                                                        <span className="text-[9px] font-black text-white uppercase">{report.agentName}</span>
                                                        <span className={`text-[8px] font-black px-1.5 py-0.5 rounded ${report.status === 'PASS' ? 'bg-emerald-500/10 text-emerald-500' : 'bg-amber-500/10 text-amber-500'}`}>{report.status}</span>
                                                    </div>
                                                    <p className="text-[10px] text-gray-500 leading-tight italic">{report.message}</p>
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                </div>
                            ) : (
                                <div className="py-20 text-center space-y-4">
                                    <AlertCircle className="mx-auto text-gray-800" size={48} />
                                    <p className="text-gray-600 font-mono text-xs uppercase tracking-widest">No matching identification record detected in the matrix.</p>
                                </div>
                            )}
                        </div>

                        {/* Footer */}
                        <div className="p-6 border-t border-white/5 bg-white/[0.01] flex justify-end">
                            <button
                                onClick={onClose}
                                className="px-8 py-3 bg-white/5 text-white text-[10px] font-black uppercase tracking-[0.2em] rounded-xl hover:bg-white/10 transition-all border border-white/10"
                            >
                                Terminate Session
                            </button>
                        </div>
                    </motion.div>
                </div>
            )}
        </AnimatePresence>
    );
}

