import React, { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Link, useNavigate } from "react-router-dom";
import {
    User, Phone, Fingerprint, MapPin, Loader2, CheckCircle2,
    FileCheck, Scan, ShieldCheck, ChevronRight, ArrowLeft,
    AlertCircle, Target, Crosshair
} from "lucide-react";
import PageHero from "../../layout/PageHero";
import { useAuth } from "../../../context/AuthContext";
import { uploadKYCDocument, submitKYC } from "../../../services/kyc";
import { MapContainer, TileLayer, Marker, useMapEvents } from 'react-leaflet';
import L from 'leaflet';

const fetchAddress = async (lat: number, lng: number, setAddress: (addr: string) => void) => {
    try {
        const response = await fetch(`https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lng}`);
        const data = await response.json();
        if (data.display_name) {
            setAddress(data.display_name);
        }
    } catch (error) {
        console.error("Error fetching address:", error);
    }
};

const LocationMarker = ({ position, setPosition, setAddress }: { position: L.LatLng | null, setPosition: (pos: L.LatLng) => void, setAddress: (addr: string) => void }) => {
    useMapEvents({
        click(e) {
            setPosition(e.latlng);
            fetchAddress(e.latlng.lat, e.latlng.lng, setAddress);
        },
    });

    return position === null ? null : (
        <Marker position={position}></Marker>
    );
};

export default function EnterpriseKYC() {
    const [step, setStep] = useState(1);
    const [activeField, setActiveField] = useState<string | null>(null);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [isLocating, setIsLocating] = useState(false);

    // Form Stats
    const [fullName, setFullName] = useState("");
    const [phone, setPhone] = useState("");
    const [secondaryPhone, setSecondaryPhone] = useState("");
    const [drivingLicenseNumber, setDrivingLicenseNumber] = useState("");
    const [secondaryIdType, setSecondaryIdType] = useState("");
    const [secondaryIdNumber, setSecondaryIdNumber] = useState("");
    const [address, setAddress] = useState("");
    const [mapPosition, setMapPosition] = useState<L.LatLng | null>(null);
    const [isMapActive, setIsMapActive] = useState(false);
    const [idFrontFile, setIdFrontFile] = useState<File | null>(null);
    const [idBackFile, setIdBackFile] = useState<File | null>(null);
    const [selfieFile, setSelfieFile] = useState<File | null>(null);
    const [uploadProgress, setUploadProgress] = useState({ front: 0, back: 0, selfie: 0 });
    const [errors, setErrors] = useState<Record<string, string>>({});
    const [agentStatus, setAgentStatus] = useState<{ name: string, status: string }[]>([]);
    const [currentAgent, setCurrentAgent] = useState<string | null>(null);

    const { user } = useAuth();
    const navigate = useNavigate();

    const AGENTS = [
        { id: 'doc', name: 'Document Specialist', icon: FileCheck, desc: 'OCR & Integrity Scan' },
        { id: 'bio', name: 'Biometric Analyst', icon: Scan, desc: 'Facial Match & Liveness' },
        { id: 'comp', name: 'Compliance Officer', icon: ShieldCheck, desc: 'Risk Assessment' }
    ];

    const validateStep1 = () => {
        const newErrors: Record<string, string> = {};
        if (!fullName.trim()) newErrors.fullName = "Full Legal Name is required";
        if (!phone.trim()) newErrors.phone = "Primary Mobile is required";
        if (!drivingLicenseNumber.trim()) newErrors.drivingLicenseNumber = "Driving License is required";
        if (!secondaryIdType) newErrors.secondaryIdType = "Secondary ID Type is required";
        if (!secondaryIdNumber.trim()) newErrors.secondaryIdNumber = "Secondary ID Number is required";
        if (!address.trim()) newErrors.address = "Residential Address is required";

        // Simple regex validation
        if (phone && !/^\+?[0-9]{10,15}$/.test(phone)) newErrors.phone = "Invalid phone format";

        setErrors(newErrors);
        return Object.keys(newErrors).length === 0;
    };

    const detectLocation = () => {
        setIsLocating(true);
        if ("geolocation" in navigator) {
            navigator.geolocation.getCurrentPosition(async (position) => {
                const { latitude, longitude } = position.coords;
                const latlng = L.latLng(latitude, longitude);
                setMapPosition(latlng);
                await fetchAddress(latitude, longitude, setAddress);
                setIsLocating(false);
                setIsMapActive(true);
            }, (error) => {
                console.error("Error getting location:", error);
                setIsLocating(false);
            });
        } else {
            setIsLocating(false);
        }
    };

    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>, setter: (file: File | null) => void) => {
        if (e.target.files && e.target.files[0]) {
            setter(e.target.files[0]);
        }
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();

        if (step === 1) {
            if (validateStep1()) {
                setStep(2);
            }
            return;
        }

        if (step === 2) {
            if (!idFrontFile || !idBackFile || !selfieFile) {
                alert("Please upload Front & Back of ID and Selfie.");
                return;
            }
            setStep(3);
            return;
        }

        if (!user || !idFrontFile || !idBackFile || !selfieFile) {
            alert("Please ensure you are logged in and all documents are uploaded.");
            return;
        }

        setIsSubmitting(true);

        try {
            // Upload ID Front
            const idFrontUrl = await uploadKYCDocument(user.id, idFrontFile, 'id-front', (progress) => {
                setUploadProgress(prev => ({ ...prev, front: progress }));
            });

            // Upload ID Back
            const idBackUrl = await uploadKYCDocument(user.id, idBackFile, 'id-back', (progress) => {
                setUploadProgress(prev => ({ ...prev, back: progress }));
            });

            // Upload Selfie
            const selfieUrl = await uploadKYCDocument(user.id, selfieFile, 'selfie', (progress) => {
                setUploadProgress(prev => ({ ...prev, selfie: progress }));
            });

            // Listen for agent updates
            const handleUpdate = (event: any) => {
                const { status, reports } = event.detail;
                if (reports) {
                    setAgentStatus(reports.map((r: any) => ({ name: r.agentName, status: r.status })));
                }
                if (status !== 'PENDING') {
                    setTimeout(() => {
                        window.removeEventListener('kyc-updated', handleUpdate);
                        const redirectPath = sessionStorage.getItem('redirectAfterKYC');
                        if (redirectPath) {
                            sessionStorage.removeItem('redirectAfterKYC');
                            navigate(redirectPath);
                        } else {
                            navigate("/dashboard");
                        }
                    }, 2000);
                }
            };
            window.addEventListener('kyc-updated', handleUpdate);

            // Trigger simulation steps for UI
            setCurrentAgent('Document Specialist');
            
            // Submit Data
            await submitKYC(user.id, {
                fullName,
                phone,
                secondaryPhone,
                drivingLicenseNumber,
                secondaryIdType,
                secondaryIdNumber,
                address,
                idFrontUrl,
                idBackUrl,
                selfieUrl
            });

            // Local UI simulation of agent sequence
            setTimeout(() => setCurrentAgent('Biometric Analyst'), 2000);
            setTimeout(() => setCurrentAgent('Compliance Officer'), 4000);
            setTimeout(() => setCurrentAgent(null), 6000);

        } catch (error) {
            console.error("KYC Submission Failed:", error);
            alert("Failed to submit KYC. Please try again.");
            setIsSubmitting(false);
        }
    };


    return (
        <div className="min-h-screen bg-[#050505] font-sans">
            <PageHero
                title="AGENT VERIFICATION"
                subtitle="Identity & Security Clearance"
                height="60vh"
            />

            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 -mt-24 relative z-20 pb-32">
                <div className="max-w-4xl mx-auto">
                    {/* Back button */}
                    <div className="mb-8">
                        <Link
                            to="/dashboard"
                            className="inline-flex items-center gap-2 text-gray-500 hover:text-[#A855F7] transition-colors group"
                        >
                            <ArrowLeft size={16} className="group-hover:-translate-x-1 transition-transform" />
                            <span className="text-[10px] font-black uppercase tracking-[0.2em]">Back to Records</span>
                        </Link>
                    </div>

                    {/* FORM PANEL */}
                    <div className="relative bg-[#0a0a0a] border border-white/10 rounded-3xl p-6 md:p-12 lg:p-16 text-white shadow-2xl shadow-black/50">
                        <div className="max-w-3xl mx-auto flex flex-col justify-center">

                            {/* Progress Stepper */}
                            <div className="mb-12">
                                <div className="flex justify-between items-center relative">
                                    <div className="absolute top-1/2 left-0 w-full h-0.5 bg-white/5 -translate-y-1/2" />
                                    <div
                                        className="absolute top-1/2 left-0 h-0.5 bg-gradient-to-r from-[#8B5CF6] to-[#A855F7] -translate-y-1/2 transition-all duration-500"
                                        style={{ width: `${((step - 1) / 2) * 100}%` }}
                                    />
                                    {[1, 2, 3].map((s) => (
                                        <div key={s} className="relative z-10 flex flex-col items-center gap-2 group">
                                            <div className={`w-10 h-10 rounded-xl flex items-center justify-center font-black transition-all duration-300 border ${step === s
                                                ? 'bg-[#8B5CF6] text-white border-[#8B5CF6] shadow-[0_0_20px_rgba(139,92,246,0.5)]'
                                                : step > s
                                                    ? 'bg-emerald-500 text-white border-emerald-500 shadow-[0_0_20px_rgba(16,185,129,0.3)]'
                                                    : 'bg-[#0a0a0a] text-gray-600 border-white/10 group-hover:border-white/20'
                                                }`}>
                                                {step > s ? <CheckCircle2 size={20} /> : s}
                                            </div>
                                            <span className={`text-[9px] font-black uppercase tracking-widest ${step >= s ? 'text-white' : 'text-gray-600'}`}>
                                                {s === 1 ? 'IDENTITY' : s === 2 ? 'DOCUMENTS' : 'FINALIZE'}
                                            </span>
                                        </div>
                                    ))}
                                </div>
                            </div>

                            <form onSubmit={handleSubmit} className="space-y-12 min-h-[400px]">
                                <AnimatePresence mode="wait">
                                    {step === 1 && (
                                        <motion.div
                                            key="step1"
                                            initial={{ opacity: 0, x: 20 }}
                                            animate={{ opacity: 1, x: 0 }}
                                            exit={{ opacity: 0, x: -20 }}
                                            className="space-y-8"
                                        >
                                            <div className="flex items-center gap-3 mb-2">
                                                <div className="w-8 h-8 rounded-lg bg-[#A855F7]/20 flex items-center justify-center text-[#A855F7] font-black">1</div>
                                                <h2 className="text-xl font-black tracking-widest uppercase italic">Personal Identity</h2>
                                            </div>

                                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                                <div className="group">
                                                    <label className="text-xs font-bold text-gray-500 uppercase tracking-widest ml-1 mb-2 block group-focus-within:text-[#A855F7] transition-colors">Full Legal Name</label>
                                                    <div className={`relative bg-[#0A0A0A] border rounded-xl overflow-hidden transition-all duration-300 ${activeField === 'name' ? 'border-[#A855F7] shadow-[0_0_20px_rgba(168,85,247,0.1)]' : 'border-white/10'}`}>
                                                        <div className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-500">
                                                            <User size={18} />
                                                        </div>
                                                        <input
                                                            required
                                                            type="text"
                                                            value={fullName}
                                                            onChange={(e) => setFullName(e.target.value)}
                                                            placeholder="John Doe"
                                                            onFocus={() => setActiveField('name')}
                                                            onBlur={() => setActiveField(null)}
                                                            className="w-full bg-transparent p-4 pl-12 text-white outline-none placeholder:text-gray-700 font-bold"
                                                        />
                                                    </div>
                                                </div>

                                                <div className="group">
                                                    <label className="text-xs font-bold text-gray-500 uppercase tracking-widest ml-1 mb-2 block group-focus-within:text-[#A855F7] transition-colors">Primary Mobile</label>
                                                    <div className={`relative bg-[#0A0A0A] border rounded-xl overflow-hidden transition-all duration-300 ${activeField === 'phone' ? 'border-[#A855F7] shadow-[0_0_20px_rgba(168,85,247,0.1)]' : 'border-white/10'}`}>
                                                        <div className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-500">
                                                            <Phone size={18} />
                                                        </div>
                                                        <input
                                                            required
                                                            type="tel"
                                                            value={phone}
                                                            onChange={(e) => setPhone(e.target.value)}
                                                            placeholder="+91"
                                                            onFocus={() => setActiveField('phone')}
                                                            onBlur={() => setActiveField(null)}
                                                            className="w-full bg-transparent p-4 pl-12 text-white font-mono outline-none placeholder:text-gray-700"
                                                        />
                                                    </div>
                                                </div>
                                            </div>

                                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                                <div className="group">
                                                    <label className="text-xs font-bold text-gray-500 uppercase tracking-widest ml-1 mb-2 block group-focus-within:text-[#A855F7] transition-colors">Secondary Mobile</label>
                                                    <div className={`relative bg-[#0A0A0A] border rounded-xl overflow-hidden transition-all duration-300 ${activeField === 'phone2' ? 'border-[#A855F7] shadow-[0_0_20px_rgba(168,85,247,0.1)]' : 'border-white/10'}`}>
                                                        <div className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-500">
                                                            <Phone size={18} className="opacity-50" />
                                                        </div>
                                                        <input
                                                            type="tel"
                                                            value={secondaryPhone}
                                                            onChange={(e) => setSecondaryPhone(e.target.value)}
                                                            placeholder="Emergency Contact"
                                                            onFocus={() => setActiveField('phone2')}
                                                            onBlur={() => setActiveField(null)}
                                                            className="w-full bg-transparent p-4 pl-12 text-white font-mono outline-none placeholder:text-gray-700"
                                                        />
                                                    </div>
                                                </div>

                                                <div className="group">
                                                    <label className="text-xs font-bold text-gray-500 uppercase tracking-widest ml-1 mb-2 block group-focus-within:text-[#A855F7] transition-colors">Driving License Number</label>
                                                    <div className={`relative bg-[#0A0A0A] border rounded-xl overflow-hidden transition-all duration-300 ${activeField === 'dl' ? 'border-[#A855F7] shadow-[0_0_20px_rgba(168,85,247,0.1)]' : errors.drivingLicenseNumber ? 'border-red-500/50' : 'border-white/10'}`}>
                                                        <div className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-500">
                                                            <Fingerprint size={18} />
                                                        </div>
                                                        <input
                                                            required
                                                            type="text"
                                                            value={drivingLicenseNumber}
                                                            onChange={(e) => setDrivingLicenseNumber(e.target.value)}
                                                            placeholder="DL-XXXXXXXXXXXXX"
                                                            onFocus={() => setActiveField('dl')}
                                                            onBlur={() => setActiveField(null)}
                                                            className="w-full bg-transparent p-4 pl-12 text-white font-mono outline-none placeholder:text-gray-700"
                                                        />
                                                    </div>
                                                    {errors.drivingLicenseNumber && <p className="text-[10px] text-red-500 mt-1 ml-2 font-bold uppercase tracking-tighter">{errors.drivingLicenseNumber}</p>}
                                                </div>
                                            </div>

                                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                                <div className="group">
                                                    <label className="text-xs font-bold text-gray-500 uppercase tracking-widest ml-1 mb-2 block group-focus-within:text-[#A855F7] transition-colors">Secondary ID Type</label>
                                                    <div className={`relative bg-[#0A0A0A] border rounded-xl overflow-hidden transition-all duration-300 ${activeField === 'secIdType' ? 'border-[#A855F7] shadow-[0_0_20px_rgba(168,85,247,0.1)]' : errors.secondaryIdType ? 'border-red-500/50' : 'border-white/10'}`}>
                                                        <select
                                                            required
                                                            value={secondaryIdType}
                                                            onChange={(e) => setSecondaryIdType(e.target.value)}
                                                            onFocus={() => setActiveField('secIdType')}
                                                            onBlur={() => setActiveField(null)}
                                                            className="w-full bg-transparent p-4 text-white outline-none font-bold appearance-none cursor-pointer"
                                                        >
                                                            <option value="" disabled className="bg-[#0A0A0A]">Select ID Type</option>
                                                            <option value="VOTER" className="bg-[#0A0A0A]">Voter ID</option>
                                                            <option value="PASSPORT" className="bg-[#0A0A0A]">Passport</option>
                                                            <option value="AADHAR" className="bg-[#0A0A0A]">Aadhar Card</option>
                                                            <option value="OTHERS" className="bg-[#0A0A0A]">Others</option>
                                                        </select>
                                                        <div className="absolute right-4 top-1/2 -translate-y-1/2 pointer-events-none text-gray-500">
                                                            <ChevronRight size={18} className="rotate-90" />
                                                        </div>
                                                    </div>
                                                    {errors.secondaryIdType && <p className="text-[10px] text-red-500 mt-1 ml-2 font-bold uppercase tracking-tighter">{errors.secondaryIdType}</p>}
                                                </div>

                                                <div className="group">
                                                    <label className="text-xs font-bold text-gray-500 uppercase tracking-widest ml-1 mb-2 block group-focus-within:text-[#A855F7] transition-colors">Secondary ID Number</label>
                                                    <div className={`relative bg-[#0A0A0A] border rounded-xl overflow-hidden transition-all duration-300 ${activeField === 'secIdNum' ? 'border-[#A855F7] shadow-[0_0_20px_rgba(168,85,247,0.1)]' : errors.secondaryIdNumber ? 'border-red-500/50' : 'border-white/10'}`}>
                                                        <div className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-500">
                                                            <FileCheck size={18} />
                                                        </div>
                                                        <input
                                                            required
                                                            type="text"
                                                            value={secondaryIdNumber}
                                                            onChange={(e) => setSecondaryIdNumber(e.target.value)}
                                                            placeholder="Enter ID number"
                                                            onFocus={() => setActiveField('secIdNum')}
                                                            onBlur={() => setActiveField(null)}
                                                            className="w-full bg-transparent p-4 pl-12 text-white font-mono outline-none placeholder:text-gray-700"
                                                        />
                                                    </div>
                                                    {errors.secondaryIdNumber && <p className="text-[10px] text-red-500 mt-1 ml-2 font-bold uppercase tracking-tighter">{errors.secondaryIdNumber}</p>}
                                                </div>
                                            </div>

                                            <div className="group">
                                                <div className="flex justify-between items-center mb-2">
                                                    <label className="text-xs font-bold text-gray-500 uppercase tracking-widest ml-1 group-focus-within:text-[#A855F7] transition-colors">Residential Address</label>
                                                    <div className="flex gap-2">
                                                        <button
                                                            type="button"
                                                            onClick={() => setIsMapActive(!isMapActive)}
                                                            className={`text-[10px] font-black flex items-center gap-1 uppercase tracking-[0.1em] transition-colors ${isMapActive ? 'text-[#A855F7]' : 'text-gray-500 hover:text-white'}`}
                                                        >
                                                            <Crosshair size={12} />
                                                            {isMapActive ? "Close Map" : "Mark on Map"}
                                                        </button>
                                                        <button
                                                            type="button"
                                                            onClick={detectLocation}
                                                            disabled={isLocating}
                                                            className="text-[10px] font-black text-[#A855F7] hover:text-[#A855F7]/80 flex items-center gap-1 disabled:opacity-50 uppercase tracking-[0.1em]"
                                                        >
                                                            {isLocating ? <Loader2 size={12} className="animate-spin" /> : <Target size={12} />}
                                                            {isLocating ? "Locating..." : "Auto-Locate"}
                                                        </button>
                                                    </div>
                                                </div>

                                                <AnimatePresence>
                                                    {isMapActive && (
                                                        <motion.div
                                                            initial={{ height: 0, opacity: 0, marginBottom: 0 }}
                                                            animate={{ height: 350, opacity: 1, marginBottom: 16 }}
                                                            exit={{ height: 0, opacity: 0, marginBottom: 0 }}
                                                            className="relative rounded-xl border border-white/10 bg-[#0a0a0a] overflow-hidden group/map"
                                                        >
                                                            <MapContainer 
                                                                center={[20.5937, 78.9629]} 
                                                                zoom={5} 
                                                                style={{ height: '100%', width: '100%', background: '#050505' }}
                                                                attributionControl={false}
                                                            >
                                                                <TileLayer
                                                                    url="https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png"
                                                                />
                                                                <LocationMarker 
                                                                    position={mapPosition} 
                                                                    setPosition={setMapPosition} 
                                                                    setAddress={setAddress} 
                                                                />
                                                            </MapContainer>
                                                            
                                                            {/* Overlay elements */}
                                                            <div className="absolute top-4 left-4 z-[1000] pointer-events-none">
                                                                <div className="bg-black/60 backdrop-blur-md border border-white/10 p-2 rounded-lg">
                                                                    <p className="text-[8px] font-black text-white uppercase tracking-widest">OpenSource Mapping Engine</p>
                                                                </div>
                                                            </div>

                                                            <div className="absolute bottom-4 right-4 z-[1000] pointer-events-none text-right">
                                                                <p className="text-[8px] font-mono text-gray-500 uppercase tracking-widest mb-1">Global Positioning Matrix v4.2</p>
                                                                {mapPosition && (
                                                                    <p className="text-[10px] font-mono text-[#A855F7] bg-black/60 backdrop-blur-md px-2 py-1 rounded">COORD: {mapPosition.lat.toFixed(4)}°N / {mapPosition.lng.toFixed(4)}°E</p>
                                                                )}
                                                            </div>

                                                            {!mapPosition && (
                                                                <div className="absolute inset-0 flex items-center justify-center pointer-events-none opacity-40 group-hover/map:opacity-100 transition-opacity z-[1000]">
                                                                    <p className="text-[10px] font-black uppercase tracking-[0.3em] text-gray-500 bg-black/40 px-4 py-2 rounded-full backdrop-blur-sm">Tap to place landing pin</p>
                                                                </div>
                                                            )}
                                                        </motion.div>
                                                    )}
                                                </AnimatePresence>

                                                <div className={`relative bg-[#0A0A0A] border rounded-xl overflow-hidden transition-all duration-300 ${activeField === 'address' ? 'border-[#A855F7] shadow-[0_0_20px_rgba(168,85,247,0.1)]' : 'border-white/10'}`}>
                                                    <div className="absolute left-4 top-4 text-gray-500">
                                                        <MapPin size={18} />
                                                    </div>
                                                    <textarea
                                                        required
                                                        rows={3}
                                                        placeholder="Enter full verification address"
                                                        value={address}
                                                        onChange={(e) => setAddress(e.target.value)}
                                                        onFocus={() => setActiveField('address')}
                                                        onBlur={() => setActiveField(null)}
                                                        className="w-full bg-transparent p-4 pl-12 text-white outline-none placeholder:text-gray-700 resize-none font-bold"
                                                    />
                                                </div>
                                            </div>
                                        </motion.div>
                                    )}

                                    {step === 2 && (
                                        <motion.div
                                            key="step2"
                                            initial={{ opacity: 0, x: 20 }}
                                            animate={{ opacity: 1, x: 0 }}
                                            exit={{ opacity: 0, x: -20 }}
                                            className="space-y-8"
                                        >
                                            <div className="flex items-center gap-3 mb-2">
                                                <div className="w-8 h-8 rounded-lg bg-[#A855F7]/20 flex items-center justify-center text-[#A855F7] font-black">2</div>
                                                <h2 className="text-xl font-black tracking-widest uppercase italic">Secure Document Sync</h2>
                                            </div>

                                            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                                                {/* ID Front Upload */}
                                                <div className="space-y-4">
                                                    <label className="text-xs font-bold text-gray-500 uppercase tracking-widest ml-1 block text-center">Primary ID (Front)</label>
                                                    <div className={`relative group cursor-pointer border-2 border-dashed rounded-2xl p-6 text-center transition-all min-h-[160px] flex flex-col items-center justify-center ${idFrontFile ? 'border-emerald-500 bg-emerald-500/5' : 'border-white/10 hover:border-[#A855F7] hover:bg-white/5'}`}>
                                                        <input type="file" className="absolute inset-0 opacity-0 cursor-pointer" onChange={(e) => handleFileChange(e, setIdFrontFile)} accept="image/*,.pdf" />

                                                        {idFrontFile ? (
                                                            <div className="text-center">
                                                                <CheckCircle2 className="text-emerald-500 mx-auto mb-2" size={24} />
                                                                <p className="text-[10px] font-mono text-white truncate max-w-[150px] mx-auto">{idFrontFile.name}</p>
                                                            </div>
                                                        ) : (
                                                            <div className="text-center">
                                                                <FileCheck className="text-[#A855F7] mx-auto mb-2 group-hover:scale-110 transition-transform" size={24} />
                                                                <p className="text-[10px] font-black uppercase tracking-widest text-gray-300">Front Side</p>
                                                            </div>
                                                        )}
                                                    </div>
                                                </div>

                                                {/* ID Back Upload */}
                                                <div className="space-y-4">
                                                    <label className="text-xs font-bold text-gray-500 uppercase tracking-widest ml-1 block text-center">Primary ID (Back)</label>
                                                    <div className={`relative group cursor-pointer border-2 border-dashed rounded-2xl p-6 text-center transition-all min-h-[160px] flex flex-col items-center justify-center ${idBackFile ? 'border-emerald-500 bg-emerald-500/5' : 'border-white/10 hover:border-[#A855F7] hover:bg-white/5'}`}>
                                                        <input type="file" className="absolute inset-0 opacity-0 cursor-pointer" onChange={(e) => handleFileChange(e, setIdBackFile)} accept="image/*,.pdf" />

                                                        {idBackFile ? (
                                                            <div className="text-center">
                                                                <CheckCircle2 className="text-emerald-500 mx-auto mb-2" size={24} />
                                                                <p className="text-[10px] font-mono text-white truncate max-w-[150px] mx-auto">{idBackFile.name}</p>
                                                            </div>
                                                        ) : (
                                                            <div className="text-center">
                                                                <FileCheck className="text-[#A855F7] mx-auto mb-2 group-hover:scale-110 transition-transform" size={24} />
                                                                <p className="text-[10px] font-black uppercase tracking-widest text-gray-300">Back Side</p>
                                                            </div>
                                                        )}
                                                    </div>
                                                </div>

                                                {/* Selfie Upload */}
                                                <div className="space-y-4">
                                                    <label className="text-xs font-bold text-gray-500 uppercase tracking-widest ml-1 block text-center">Live Face Check</label>
                                                    <div className={`relative group cursor-pointer border-2 border-dashed rounded-2xl p-6 text-center transition-all min-h-[160px] flex flex-col items-center justify-center ${selfieFile ? 'border-emerald-500 bg-emerald-500/5' : 'border-white/10 hover:border-[#A855F7] hover:bg-white/5'}`}>
                                                        <input type="file" className="absolute inset-0 opacity-0 cursor-pointer" onChange={(e) => handleFileChange(e, setSelfieFile)} accept="image/*" />

                                                        {selfieFile ? (
                                                            <div className="text-center">
                                                                <CheckCircle2 className="text-emerald-500 mx-auto mb-2" size={24} />
                                                                <p className="text-[10px] font-mono text-white truncate max-w-[150px] mx-auto">{selfieFile.name}</p>
                                                            </div>
                                                        ) : (
                                                            <div className="text-center">
                                                                <Scan className="text-[#A855F7] mx-auto mb-2 group-hover:scale-110 transition-transform" size={24} />
                                                                <p className="text-[10px] font-black uppercase tracking-widest text-gray-300">Face Scan</p>
                                                            </div>
                                                        )}
                                                    </div>
                                                </div>
                                            </div>

                                            <div className="bg-white/5 border border-white/10 rounded-2xl p-6 flex gap-4">
                                                <div className="p-3 bg-amber-500/10 rounded-xl text-amber-500 h-fit">
                                                    <AlertCircle size={20} />
                                                </div>
                                                <div>
                                                    <h4 className="text-sm font-black uppercase tracking-wider text-white mb-1">Upload Guidelines</h4>
                                                    <ul className="text-xs text-gray-500 space-y-2 list-disc pl-4 font-mono">
                                                        <li>Ensure all 4 corners of the ID are visible</li>
                                                        <li>Text must be clearly readable, no glare</li>
                                                        <li>Selfie must include your face and ID clearly</li>
                                                    </ul>
                                                </div>
                                            </div>
                                        </motion.div>
                                    )}

                                    {step === 3 && (
                                        <motion.div
                                            key="step3"
                                            initial={{ opacity: 0, x: 20 }}
                                            animate={{ opacity: 1, x: 0 }}
                                            exit={{ opacity: 0, x: -20 }}
                                            className="space-y-8"
                                        >
                                            <div className="flex items-center gap-3 mb-2">
                                                <div className="w-8 h-8 rounded-lg bg-[#A855F7]/20 flex items-center justify-center text-[#A855F7] font-black">3</div>
                                                <h2 className="text-xl font-black tracking-widest uppercase italic">
                                                    {isSubmitting ? 'AI Verification Active' : 'Review & Encrypt'}
                                                </h2>
                                            </div>

                                            {isSubmitting ? (
                                                <div className="space-y-6 bg-black/40 border border-white/5 rounded-3xl p-8">
                                                    <div className="flex items-center justify-between mb-8">
                                                        <div className="flex items-center gap-3">
                                                            <div className="relative">
                                                                <Loader2 className="animate-spin text-[#A855F7]" size={24} />
                                                                <div className="absolute inset-0 bg-[#A855F7]/20 blur-xl animate-pulse" />
                                                            </div>
                                                            <div>
                                                                <p className="text-[10px] font-black text-gray-500 uppercase tracking-widest">Protocol Status</p>
                                                                <p className="text-sm font-bold text-[#A855F7] animate-pulse">ANALYZING BIO-METRIC DATA</p>
                                                            </div>
                                                        </div>
                                                        <div className="text-right">
                                                            <p className="text-[10px] font-black text-gray-500 uppercase tracking-widest">Sync Hash</p>
                                                            <p className="text-[10px] font-mono text-gray-400">0x{Math.random().toString(16).substring(2, 10).toUpperCase()}</p>
                                                        </div>
                                                    </div>

                                                    <div className="space-y-4">
                                                        {AGENTS.map((agent) => {
                                                            const isDone = agentStatus.some(s => s.name === agent.name && s.status === 'PASS');
                                                            const isProcessing = currentAgent === agent.name;
                                                            return (
                                                                <div key={agent.id} className={`flex items-center justify-between p-4 rounded-xl border transition-all duration-500 ${isDone ? 'bg-emerald-500/10 border-emerald-500/20' : isProcessing ? 'bg-[#A855F7]/10 border-[#A855F7]/20 animate-pulse' : 'bg-white/5 border-white/5 opacity-40'}`}>
                                                                    <div className="flex items-center gap-4">
                                                                        <div className={`p-2 rounded-lg ${isDone ? 'bg-emerald-500 text-white' : isProcessing ? 'bg-[#A855F7] text-white' : 'bg-gray-800 text-gray-500'}`}>
                                                                            <agent.icon size={18} />
                                                                        </div>
                                                                        <div>
                                                                            <h4 className="text-xs font-black uppercase tracking-widest text-white">{agent.name}</h4>
                                                                            <p className="text-[10px] text-gray-500 font-mono">{agent.desc}</p>
                                                                        </div>
                                                                    </div>
                                                                    <div className="flex items-center gap-2">
                                                                        {isDone ? (
                                                                            <span className="text-[9px] font-black text-emerald-500 uppercase tracking-widest bg-emerald-500/10 px-2 py-1 rounded">Clearance Granted</span>
                                                                        ) : isProcessing ? (
                                                                            <span className="text-[9px] font-black text-[#A855F7] uppercase tracking-widest animate-pulse">Analyzing...</span>
                                                                        ) : (
                                                                            <span className="text-[9px] font-black text-gray-600 uppercase tracking-widest">Awaiting Sync</span>
                                                                        )}
                                                                    </div>
                                                                </div>
                                                            );
                                                        })}
                                                    </div>
                                                </div>
                                            ) : (
                                                <div className="bg-[#0a0a0a] border border-white/5 rounded-3xl p-8 space-y-6">
                                                    <div className="grid grid-cols-2 gap-8">
                                                        <div className="space-y-4">
                                                            <div>
                                                                <p className="text-[10px] uppercase font-black text-gray-600 tracking-widest mb-1">Full Name</p>
                                                                <p className="text-lg font-black text-white">{fullName || 'Not Provided'}</p>
                                                            </div>
                                                            <div>
                                                                <p className="text-[10px] uppercase font-black text-gray-600 tracking-widest mb-1">Driving License</p>
                                                                <p className="text-lg font-mono text-white tracking-widest">{drivingLicenseNumber || 'Not Provided'}</p>
                                                            </div>
                                                            {secondaryIdType && (
                                                                <div>
                                                                    <p className="text-[10px] uppercase font-black text-gray-600 tracking-widest mb-1">Secondary ID ({secondaryIdType})</p>
                                                                    <p className="text-lg font-mono text-white tracking-widest">{secondaryIdNumber || 'Not Provided'}</p>
                                                                </div>
                                                            )}
                                                        </div>
                                                        <div className="space-y-4 text-right">
                                                            <div>
                                                                <p className="text-[10px] uppercase font-black text-gray-600 tracking-widest mb-1">Sync Status</p>
                                                                <p className="text-sm font-black text-emerald-500">READY TO TRANSMIT</p>
                                                            </div>
                                                            <div className="flex justify-end gap-2">
                                                                {idFrontFile && <div className="p-2 bg-emerald-500/10 text-emerald-500 rounded-lg" title="Front Sync"><FileCheck size={16} /></div>}
                                                                {idBackFile && <div className="p-2 bg-emerald-500/10 text-emerald-500 rounded-lg" title="Back Sync"><FileCheck size={16} /></div>}
                                                                {selfieFile && <div className="p-2 bg-emerald-500/10 text-emerald-500 rounded-lg" title="Bio Sync"><User size={16} /></div>}
                                                            </div>
                                                        </div>
                                                    </div>

                                                    <div className="border-t border-white/5 pt-6">
                                                        <p className="text-[10px] uppercase font-black text-gray-600 tracking-widest mb-2">Registered Address</p>
                                                        <p className="text-sm text-gray-300 leading-relaxed italic">{address || 'No location data'}</p>
                                                    </div>

                                                    <div className="bg-[#A855F7]/10 border border-[#A855F7]/20 rounded-2xl p-4 flex gap-3">
                                                        <ShieldCheck className="text-[#A855F7] shrink-0" size={20} />
                                                        <p className="text-[10px] text-gray-400 font-mono leading-relaxed uppercase tracking-wider">
                                                            Finalizing this step will hash your identity into our private ledger. This action is irreversible once the verification process begins.
                                                        </p>
                                                    </div>
                                                </div>
                                            )}
                                        </motion.div>
                                    )}
                                </AnimatePresence>

                                {/* Navigation */}
                                <div className="flex gap-4 pt-12">
                                    {step > 1 && (
                                        <button
                                            type="button"
                                            onClick={() => setStep(step - 1)}
                                            className="flex-1 py-4 bg-white/5 text-white font-black rounded-xl hover:bg-white/10 transition-all border border-white/10 uppercase tracking-widest text-xs"
                                        >
                                            Back
                                        </button>
                                    )}
                                    <button
                                        type="submit"
                                        disabled={isSubmitting}
                                        className={`flex-[2] py-4 bg-[#A855F7] text-white font-black rounded-xl shadow-[0_4px_30px_rgba(168,85,247,0.3)] hover:shadow-[0_4px_40px_rgba(168,85,247,0.5)] transition-all transform hover:-translate-y-1 relative overflow-hidden group uppercase tracking-widest text-xs disabled:opacity-50 disabled:cursor-not-allowed`}
                                    >
                                        <span className="relative z-10 flex items-center justify-center gap-2">
                                            {isSubmitting ? <Loader2 className="animate-spin" size={18} /> : (step === 3 ? 'Finalize Verification' : 'Continue')}
                                            {!isSubmitting && <ChevronRight size={18} />}
                                        </span>
                                        <div className="absolute inset-0 bg-white/20 translate-y-full group-hover:translate-y-0 transition-transform duration-300" />
                                    </button>
                                </div>
                            </form>

                            {/* Footer */}
                            <div className="mt-12 text-center">
                                <p className="text-[#A855F7]/40 text-[9px] font-black uppercase tracking-[0.3em]">
                                    End-to-End Encrypted Verification Protocol v2.4.0
                                </p>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
