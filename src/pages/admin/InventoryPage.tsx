import React from 'react';
import AdminInventory from './AdminInventory';
import { ArrowLeft, Box } from "lucide-react";
import { Link } from "react-router-dom";
import { motion } from 'framer-motion';

export default function InventoryPage() {
    return (
        <div className="min-h-screen bg-[#050505] text-white p-6 lg:p-10 space-y-8">
            {/* Breadcrumbs / Back */}
            <div className="flex items-center justify-between">
                <Link 
                    to="/admin" 
                    className="flex items-center space-x-2 text-gray-500 hover:text-[#A855F7] transition-colors group"
                >
                    <ArrowLeft className="h-4 w-4 group-hover:-translate-x-1 transition-transform" />
                    <span className="text-[10px] font-mono uppercase tracking-widest">Return to Command Center</span>
                </Link>
                
                <div className="flex items-center space-x-2">
                    <Box className="h-4 w-4 text-[#A855F7]" />
                    <span className="text-[10px] font-mono text-gray-500 uppercase tracking-[0.3em]">System_Asset_Management</span>
                </div>
            </div>

            {/* Header */}
            <div className="border-b border-white/10 pb-8">
                <div className="flex items-center space-x-2 mb-2">
                    <div className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse" />
                    <span className="text-[10px] font-mono text-emerald-500 uppercase tracking-[0.2em]">Inventory Matrix // Online</span>
                </div>
                <h1 className="text-5xl font-bold text-white tracking-tighter uppercase italic">
                    Rental <span className="text-[#A855F7]">Inventory</span>
                </h1>
                <p className="text-gray-500 font-mono text-xs mt-2 max-w-2xl">
                    Real-time hardware asset tracking, health diagnostics, and maintenance protocol management for the entire rental fleet.
                </p>
            </div>

            <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5 }}
            >
                <AdminInventory />
            </motion.div>

            {/* Footer Matrix Info */}
            <div className="flex items-center justify-between pt-12 border-t border-white/10 text-[9px] font-mono text-gray-700 uppercase tracking-[0.4em]">
                <span>Asset Database v2.4.0</span>
                <span>All hardware units encrypted and tracked via GPS-Matrix</span>
            </div>
        </div>
    );
}
