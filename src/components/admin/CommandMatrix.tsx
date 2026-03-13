import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Terminal, Activity, Zap, Shield, AlertCircle } from 'lucide-react';

interface MatrixEvent {
    id: string;
    type: 'RENTAL' | 'PAYMENT' | 'SERVICE' | 'IDENTITY';
    message: string;
    timestamp: string;
    severity: 'low' | 'medium' | 'high';
}

const MOCK_EVENTS: MatrixEvent[] = [
    { id: '1', type: 'RENTAL', message: 'ASSET [PS5-001] DEPLOYED TO NODE: CHENNAI_SOUTH', timestamp: '23:45:12', severity: 'low' },
    { id: '2', type: 'PAYMENT', message: 'INCOMING FLOW: â‚¹2,450 VIA STRIPE_GATEWAY', timestamp: '23:44:50', severity: 'low' },
    { id: '3', type: 'IDENTITY', message: 'KYC VERIFICATION COMPLETED: USER_ID_882', timestamp: '23:44:30', severity: 'medium' },
    { id: '4', type: 'SERVICE', message: 'MAINTENANCE ALERT: XBS-042 THERMAL_THROTTLE', timestamp: '23:43:10', severity: 'high' }
];

export default function CommandMatrix() {
    const [events, setEvents] = useState<MatrixEvent[]>(MOCK_EVENTS);

    useEffect(() => {
        const interval = setInterval(() => {
            const types: ('RENTAL' | 'PAYMENT' | 'SERVICE' | 'IDENTITY')[] = ['RENTAL', 'PAYMENT', 'SERVICE', 'IDENTITY'];
            const messages = [
                "ASSET_09X SYNCED WITH CLOUD_MATRIX",
                "NEW BOOKING INITIALIZED: SECTOR_NORTH",
                "DEPOSIT SECURED: BATCH_442",
                "HARDWARE_PROTCOL_SCAN: PASS",
                "FIRMWARE UPDATE PUSHED TO PS5_NODES"
            ];

            const newEvent: MatrixEvent = {
                id: Date.now().toString(),
                type: types[Math.floor(Math.random() * types.length)],
                message: messages[Math.floor(Math.random() * messages.length)],
                timestamp: new Date().toLocaleTimeString('en-GB', { hour12: false }),
                severity: Math.random() > 0.8 ? 'high' : 'low'
            };

            setEvents(prev => [newEvent, ...prev.slice(0, 5)]);
        }, 5000);

        return () => clearInterval(interval);
    }, []);

    return (
        <div className="bg-[#080112] border border-white/10 rounded-lg overflow-hidden flex flex-col h-[400px]">
            <div className="p-4 bg-white/[0.02] border-b border-white/10 flex justify-between items-center">
                <div className="flex items-center space-x-2">
                    <Terminal size={14} className="text-[#B000FF]" />
                    <h3 className="text-[10px] font-mono font-bold uppercase tracking-[0.3em] text-white">Command_Matrix // Ticker_Active</h3>
                </div>
                <div className="flex gap-1">
                    <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                    <div className="w-1.5 h-1.5 rounded-full bg-blue-500" />
                </div>
            </div>

            <div className="flex-grow p-4 font-mono text-[9px] overflow-hidden space-y-3">
                <AnimatePresence initial={false}>
                    {events.map((event) => (
                        <motion.div
                            key={event.id}
                            initial={{ opacity: 0, x: -10 }}
                            animate={{ opacity: 1, x: 0 }}
                            exit={{ opacity: 0, height: 0 }}
                            className="flex items-start gap-3 border-l border-white/5 pl-3 group"
                        >
                            <span className="text-gray-600 font-bold shrink-0">{event.timestamp}</span>
                            <div className="flex-grow space-y-1">
                                <div className="flex items-center gap-2">
                                    <span className={`px-1.5 py-0.5 rounded-[2px] font-black uppercase text-[8px] ${event.type === 'RENTAL' ? 'bg-blue-500/20 text-blue-400' :
                                            event.type === 'PAYMENT' ? 'bg-emerald-500/20 text-emerald-400' :
                                                event.type === 'SERVICE' ? 'bg-amber-500/20 text-amber-400' :
                                                    'bg-[#B000FF]/20 text-[#B000FF]'
                                        }`}>
                                        {event.type}
                                    </span>
                                    {event.severity === 'high' && <AlertCircle size={10} className="text-red-500 animate-bounce" />}
                                </div>
                                <p className={`uppercase tracking-tighter leading-tight ${event.severity === 'high' ? 'text-red-400' : 'text-gray-400 group-hover:text-white transition-colors'}`}>
                                    {event.message}
                                </p>
                            </div>
                        </motion.div>
                    ))}
                </AnimatePresence>
            </div>

            <div className="p-2 bg-black/50 border-t border-white/5 flex items-center justify-center">
                <span className="text-[7px] text-gray-700 font-mono uppercase tracking-[0.5em]">System_Pulse_Nominal // Layer_2_Clear</span>
            </div>
        </div>
    );
}

