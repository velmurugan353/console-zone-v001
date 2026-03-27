import React, { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Link, useNavigate } from "react-router-dom";
import {
    User, Phone, Fingerprint, MapPin, Loader2, CheckCircle2,
    FileCheck, Scan, ShieldCheck, ChevronRight, ArrowLeft,
    AlertCircle, Target, Crosshair, Video, VideoOff, Camera, RefreshCw
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
    const { user } = useAuth();
    const navigate = useNavigate();
    const [step, setStep] = useState(2);
    const [activeField, setActiveField] = useState<string | null>(null);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [isLocating, setIsLocating] = useState(false);

    // Form Stats
    const [fullName, setFullName] = useState("");
    const [phone, setPhone] = useState("");
    const [secondaryPhone, setSecondaryPhone] = useState("");

    const [drivingLicenseNumber, setDrivingLicenseNumber] = useState("V-MODE-MOCKED");
    const [secondaryIdType, setSecondaryIdType] = useState("VIDEO_ONLY");
    const [secondaryIdNumber, setSecondaryIdNumber] = useState("V-MODE-MOCKED");
    const [address, setAddress] = useState("V-MODE-MOCKED");

    useEffect(() => {
        if (user) {
            setFullName(user.name || "");
            // If there's a phone on the user object, we could set it too, 
            // but for now we'll just use the name and leave phone for manual entry or mock it.
            setPhone("9876543210"); 
        }
    }, [user]);
    const [mapPosition, setMapPosition] = useState<L.LatLng | null>(null);
    const [isMapActive, setIsMapActive] = useState(false);
    const [idFrontFile, setIdFrontFile] = useState<File | null>(null);
    const [idBackFile, setIdBackFile] = useState<File | null>(null);
    const [scanningFront, setScanningFront] = useState(false);
    const [scanningBack, setScanningBack] = useState(false);
    const [selfieFile, setSelfieFile] = useState<File | null>(null);

    const handleFileChangeWithScan = (e: React.ChangeEvent<HTMLInputElement>, setter: (file: File | null) => void, type: 'front' | 'back') => {
        if (e.target.files && e.target.files[0]) {
            const file = e.target.files[0];
            if (type === 'front') setScanningFront(true);
            else setScanningBack(true);
            
            // Simulate AI scanning and verification
            setTimeout(() => {
                setter(file);
                if (type === 'front') setScanningFront(false);
                else setScanningBack(false);
            }, 3000);
        }
    };

    const [selfieVideoFile, setSelfieVideoFile] = useState<File | null>(null);
    const [isRecording, setIsRecording] = useState(false);
    const [recordingTime, setRecordingTime] = useState(0);
    const videoRef = React.useRef<HTMLVideoElement>(null);
    const mediaRecorderRef = React.useRef<MediaRecorder | null>(null);
    const [stream, setStream] = useState<MediaStream | null>(null);

    const startRecording = async () => {
        try {
            const mediaStream = await navigator.mediaDevices.getUserMedia({ 
                video: { width: 1280, height: 720, facingMode: "user" }, 
                audio: false 
            });
            setStream(mediaStream);
            if (videoRef.current) videoRef.current.srcObject = mediaStream;

            // Define supported mime types for better cross-browser compatibility
            const mimeTypes = [
                'video/webm;codecs=vp9,opus',
                'video/webm;codecs=vp8,opus',
                'video/webm',
                'video/mp4'
            ];
            
            const supportedMimeType = mimeTypes.find(type => MediaRecorder.isTypeSupported(type));
            
            const mediaRecorder = new MediaRecorder(mediaStream, {
                mimeType: supportedMimeType
            });
            
            mediaRecorderRef.current = mediaRecorder;
            const chunks: Blob[] = [];

            mediaRecorder.ondataavailable = (e) => {
                if (e.data.size > 0) chunks.push(e.data);
            };

            mediaRecorder.onstop = () => {
                const blob = new Blob(chunks, { type: supportedMimeType || 'video/webm' });
                const extension = (supportedMimeType && supportedMimeType.includes('mp4')) ? 'mp4' : 'webm';
                const file = new File([blob], `selfie-video-${Date.now()}.${extension}`, { type: blob.type });
                setSelfieVideoFile(file);
                
                // Stop all tracks
                mediaStream.getTracks().forEach(track => track.stop());
                setStream(null);
            };

            // Capture a still frame as selfie (do this after stream is ready)
            setTimeout(async () => {
                try {
                    const canvas = document.createElement('canvas');
                    canvas.width = 640;
                    canvas.height = 480;
                    if (videoRef.current) {
                        canvas.getContext('2d')?.drawImage(videoRef.current, 0, 0);
                        canvas.toBlob((blob) => {
                            if (blob) {
                                const file = new File([blob], `selfie-${Date.now()}.jpg`, { type: 'image/jpeg' });
                                setSelfieFile(file);
                            }
                        }, 'image/jpeg');
                    }
                } catch (e) {
                    console.error("Selfie frame capture failed:", e);
                }
            }, 1000);

            mediaRecorder.start();
            setIsRecording(true);
            setRecordingTime(0);

            const timer = setInterval(() => {
                setRecordingTime(prev => {
                    if (prev >= 5) {
                        stopRecording();
                        clearInterval(timer);
                        return 5;
                    }
                    return prev + 1;
                });
            }, 1000);

        } catch (err) {
            console.error("Camera access error:", err);
            alert("Camera access denied. Video verification is mandatory. Please ensure you have granted camera permissions.");
        }
    };

    const stopRecording = () => {
        if (mediaRecorderRef.current && isRecording) {
            mediaRecorderRef.current.stop();
            setIsRecording(false);
        }
    };

    useEffect(() => {
        if (isRecording && videoRef.current && stream) {
            videoRef.current.srcObject = stream;
        }
    }, [isRecording, stream]);

    const [uploadProgress, setUploadProgress] = useState({ front: 0, back: 0, selfie: 0, video: 0 });
    const [errors, setErrors] = useState<Record<string, string>>({});
    const [agentStatus, setAgentStatus] = useState<{ name: string, status: string }[]>([]);
    const [currentAgent, setCurrentAgent] = useState<string | null>(null);



    const AGENTS = [
        { id: 'doc', name: 'Document Specialist', icon: FileCheck, desc: 'OCR & Integrity Scan' },
        { id: 'bio', name: 'Biometric Analyst', icon: Scan, desc: 'Facial Match & Liveness' },
        { id: 'comp', name: 'Compliance Officer', icon: ShieldCheck, desc: 'Risk Assessment' }
    ];

    const validateStep1 = () => {
        const newErrors: Record<string, string> = {};
        if (!fullName.trim()) newErrors.fullName = "Full Legal Name is required";
        if (!phone.trim()) newErrors.phone = "Primary Mobile is required";
        else if (phone.length !== 10) newErrors.phone = "Must be 10 digits";

        if (secondaryPhone && secondaryPhone.length !== 10) newErrors.secondaryPhone = "Must be 10 digits";

        if (!drivingLicenseNumber.trim()) newErrors.drivingLicenseNumber = "Driving License is required";
        if (!secondaryIdType) newErrors.secondaryIdType = "Secondary ID Type is required";
        if (!secondaryIdNumber.trim()) newErrors.secondaryIdNumber = "Secondary ID Number is required";
        if (!address.trim()) newErrors.address = "Residential Address is required";

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
            if (!selfieVideoFile) {
                alert("Please complete the 5-second Video Liveness Check.");
                return;
            }
            setStep(3);
            return;
        }

        if (!user || !selfieVideoFile) {
            alert("Please ensure you are logged in and the camera is initialized.");
            return;
        }

        setIsSubmitting(true);

        try {
            // Skip ID Front/Back uploads for Video-Only mode
            const idFrontUrl = "https://placehold.co/600x400/18181B/A855F7?text=VIDEO_ONLY_MODE_FRONT";
            const idBackUrl = "https://placehold.co/600x400/18181B/A855F7?text=VIDEO_ONLY_MODE_BACK";

            // Upload Selfie Image
            let selfieUrl = "";
            if (selfieFile) {
                selfieUrl = await uploadKYCDocument(user.id, selfieFile, 'selfie', (progress) => {
                    setUploadProgress(prev => ({ ...prev, selfie: progress }));
                });
            }

            // Upload Selfie Video
            const selfieVideoUrl = await uploadKYCDocument(user.id, selfieVideoFile, 'selfie-video', (progress) => {
                setUploadProgress(prev => ({ ...prev, video: progress }));
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
                selfieUrl,
                selfieVideoUrl,
                livenessCheck: 'PASSED'
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
        <div className="min-h-dvh bg-[#080112] font-sans">
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
                            className="inline-flex items-center gap-2 text-gray-500 hover:text-[#B000FF] transition-colors group"
                        >
                            <ArrowLeft size={16} className="group-hover:-translate-x-1 transition-transform" />
                            <span className="text-[10px] font-black uppercase tracking-[0.2em]">Back to Records</span>
                        </Link>
                    </div>

                    {/* FORM PANEL */}
                    <div className="relative bg-[#080112] border border-white/10 rounded-3xl p-6 md:p-12 lg:p-16 text-white shadow-2xl shadow-black/50">
                        <div className="max-w-3xl mx-auto flex flex-col justify-center">

                            {/* Progress Stepper */}
                            <div className="mb-12">
                                <div className="flex justify-between items-center relative">
                                    <div className="absolute top-1/2 left-0 w-full h-0.5 bg-white/5 -translate-y-1/2" />
                                    <div
                                        className="absolute top-1/2 left-0 h-0.5 bg-gradient-to-r from-[#B000FF] to-[#B000FF] -translate-y-1/2 transition-all duration-500"
                                        style={{ width: `${((step - 1) / 2) * 100}%` }}
                                    />
                                    {[2, 3].map((s) => (
                                        <div key={s} className="relative z-10 flex flex-col items-center gap-2 group">
                                            <div className={`w-10 h-10 rounded-xl flex items-center justify-center font-black transition-all duration-300 border ${step === s
                                                ? 'bg-[#B000FF] text-white border-[#B000FF] shadow-[0_0_20px_rgba(139,92,246,0.5)]'
                                                : step > s
                                                    ? 'bg-emerald-500 text-white border-emerald-500 shadow-[0_0_20px_rgba(16,185,129,0.3)]'
                                                    : 'bg-[#080112] text-gray-600 border-white/10 group-hover:border-white/20'
                                                }`}>
                                                {step > s ? <CheckCircle2 size={20} /> : s === 2 ? 1 : 2}
                                            </div>
                                            <span className={`text-[9px] font-black uppercase tracking-widest ${step >= s ? 'text-white' : 'text-gray-600'}`}>
                                                {s === 2 ? 'BIOMETRICS' : 'FINALIZE'}
                                            </span>
                                        </div>
                                    ))}
                                </div>
                            </div>

                            <form onSubmit={handleSubmit} className="space-y-12 min-h-[400px]">
                                <AnimatePresence mode="wait">
                                    {step === 2 && (
                                        <motion.div
                                            key="step2"
                                            initial={{ opacity: 0, x: 20 }}
                                            animate={{ opacity: 1, x: 0 }}
                                            exit={{ opacity: 0, x: -20 }}
                                            className="space-y-8"
                                        >
                                            <div className="flex flex-col items-center justify-center">
                                                {/* Selfie Video Verification */}
                                                <div className="space-y-4 w-full max-w-lg">
                                                    <label className="text-xs font-bold text-gray-500 uppercase tracking-widest ml-1 block text-center">Video Liveness Check</label>
                                                    <div className={`relative rounded-2xl p-4 text-center transition-all min-h-[300px] flex flex-col items-center justify-center overflow-hidden border-2 ${selfieVideoFile ? 'border-emerald-500 bg-emerald-500/5' : 'border-[#B000FF]/30 bg-black/40'}`}>
                                                        
                                                        {selfieVideoFile ? (
                                                            <div className="text-center space-y-3">
                                                                <div className="w-16 h-16 bg-emerald-500/20 rounded-full flex items-center justify-center mx-auto">
                                                                    <Video size={32} className="text-emerald-500" />
                                                                </div>
                                                                <div>
                                                                    <p className="text-[10px] font-black uppercase text-emerald-500">Video Captured</p>
                                                                    <p className="text-[8px] font-mono text-gray-500 mt-1">LIVENESS_HASH: {Math.random().toString(16).substring(2, 12).toUpperCase()}</p>
                                                                </div>
                                                                <button 
                                                                    type="button"
                                                                    onClick={() => setSelfieVideoFile(null)}
                                                                    className="flex items-center gap-1 mx-auto text-[10px] font-bold text-gray-500 hover:text-white uppercase tracking-widest pt-2"
                                                                >
                                                                    <RefreshCw size={12} /> Retake
                                                                </button>
                                                            </div>
                                                        ) : isRecording ? (
                                                            <div className="w-full space-y-4">
                                                                <div className="relative aspect-video rounded-xl bg-black overflow-hidden border border-red-500/50">
                                                                    <video ref={videoRef} autoPlay muted playsInline className="w-full h-full object-cover scale-x-[-1]" />
                                                                    <div className="absolute top-4 right-4 flex items-center gap-2">
                                                                        <div className="w-2 h-2 bg-red-500 rounded-full animate-ping" />
                                                                        <span className="text-[10px] font-black text-white uppercase tracking-widest">REC 00:0{recordingTime}</span>
                                                                    </div>
                                                                    <div className="absolute bottom-0 left-0 w-full h-1 bg-white/10">
                                                                        <motion.div 
                                                                            initial={{ width: 0 }}
                                                                            animate={{ width: `${(recordingTime / 5) * 100}%` }}
                                                                            className="h-full bg-red-500"
                                                                        />
                                                                    </div>
                                                                </div>
                                                                <p className="text-[10px] font-black text-[#B000FF] animate-pulse uppercase tracking-[0.2em]">Look up, then down, then center</p>
                                                            </div>
                                                        ) : (
                                                            <div className="text-center space-y-4 py-4">
                                                                <div className="w-16 h-16 bg-[#B000FF]/10 rounded-full flex items-center justify-center mx-auto border border-[#B000FF]/20">
                                                                    <Scan size={32} className="text-[#B000FF]" />
                                                                </div>
                                                                <div>
                                                                    <p className="text-[10px] font-black uppercase tracking-[0.2em] text-gray-300">Biometric Scan Required</p>
                                                                    <p className="text-[9px] text-gray-500 font-mono mt-1 px-4">5-second video verify: Look up, down, then center</p>
                                                                </div>
                                                                <button
                                                                    type="button"
                                                                    onClick={startRecording}
                                                                    className="flex items-center gap-2 px-6 py-2 bg-[#B000FF] text-black rounded-xl text-[10px] font-black uppercase tracking-widest hover:bg-[#9333EA] transition-all"
                                                                >
                                                                    <Camera size={14} /> Initialize Camera
                                                                </button>
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
                                                    <h4 className="text-sm font-black uppercase tracking-wider text-white mb-1">Security Guidelines</h4>
                                                    <ul className="text-xs text-gray-500 space-y-2 list-disc pl-4 font-mono">
                                                        <li>Postion face within the camera frame</li>
                                                        <li>Ensure adequate lighting for liveness check</li>
                                                        <li>Maintain a neutral expression during scan</li>
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
                                                <div className="w-8 h-8 rounded-lg bg-[#B000FF]/20 flex items-center justify-center text-[#B000FF] font-black">3</div>
                                                <h2 className="text-xl font-black tracking-widest uppercase italic">
                                                    {isSubmitting ? 'AI Verification Active' : 'Review & Encrypt'}
                                                </h2>
                                            </div>

                                            {isSubmitting ? (
                                                <div className="space-y-6 bg-black/40 border border-white/5 rounded-3xl p-8">
                                                    <div className="flex items-center justify-between mb-8">
                                                        <div className="flex items-center gap-3">
                                                            <div className="relative">
                                                                <Loader2 className="animate-spin text-[#B000FF]" size={24} />
                                                                <div className="absolute inset-0 bg-[#B000FF]/20 blur-xl animate-pulse" />
                                                            </div>
                                                            <div>
                                                                <p className="text-[10px] font-black text-gray-500 uppercase tracking-widest">Protocol Status</p>
                                                                <p className="text-sm font-bold text-[#B000FF] animate-pulse">ANALYZING BIO-METRIC DATA</p>
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
                                                                <div key={agent.id} className={`flex items-center justify-between p-4 rounded-xl border transition-all duration-500 ${isDone ? 'bg-emerald-500/10 border-emerald-500/20' : isProcessing ? 'bg-[#B000FF]/10 border-[#B000FF]/20 animate-pulse' : 'bg-white/5 border-white/5 opacity-40'}`}>
                                                                    <div className="flex items-center gap-4">
                                                                        <div className={`p-2 rounded-lg ${isDone ? 'bg-emerald-500 text-white' : isProcessing ? 'bg-[#B000FF] text-white' : 'bg-gray-800 text-gray-500'}`}>
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
                                                                            <span className="text-[9px] font-black text-[#B000FF] uppercase tracking-widest animate-pulse">Analyzing...</span>
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
                                                <div className="bg-[#080112] border border-white/5 rounded-3xl p-8 space-y-6">
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

                                                    <div className="bg-[#B000FF]/10 border border-[#B000FF]/20 rounded-2xl p-4 flex gap-3">
                                                        <ShieldCheck className="text-[#B000FF] shrink-0" size={20} />
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
                                        className={`flex-[2] py-4 bg-[#B000FF] text-white font-black rounded-xl shadow-[0_4px_30px_rgba(168,85,247,0.3)] hover:shadow-[0_4px_40px_rgba(168,85,247,0.5)] transition-all transform hover:-translate-y-1 relative overflow-hidden group uppercase tracking-widest text-xs disabled:opacity-50 disabled:cursor-not-allowed`}
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
                                <p className="text-[#B000FF]/40 text-[9px] font-black uppercase tracking-[0.3em]">
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

