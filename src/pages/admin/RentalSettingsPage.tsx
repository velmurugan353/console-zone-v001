"use client";

import React, { useState } from "react";
import {
    Gamepad2,
    Tag,
    Save,
    RefreshCw,
    LucideIcon
} from "lucide-react";
import { motion } from "framer-motion";
import { getControllerSettings, saveControllerSettings, resetControllerSettings, type ControllerSettings } from '../../services/controller-settings';
import { getCatalogSettings, saveCatalogSettings, resetCatalogSettings, type CatalogSettings } from '../../services/catalog-settings';

export default function RentalSettingsPage() {
    // Controller Settings State
    const [controllerSettings, setControllerSettings] = useState<ControllerSettings>(getControllerSettings());

    const handleResetControllerSettings = () => {
        if (confirm('Reset controller settings to defaults?')) {
            resetControllerSettings();
            setControllerSettings(getControllerSettings());
        }
    };

    // Catalog Settings State
    const [catalogSettings, setCatalogSettings] = useState(getCatalogSettings());

    const handleResetCatalogSettings = () => {
        if (confirm('Reset catalog configuration to defaults?')) {
            resetCatalogSettings();
            setCatalogSettings(getCatalogSettings());
        }
    };

    // Save All Settings
    const handleSaveSettings = () => {
        try {
            saveControllerSettings(controllerSettings);
            saveCatalogSettings(catalogSettings);

            const btn = document.getElementById('save-rental-settings');
            if (btn) {
                const originalText = btn.innerText;
                btn.innerText = 'Saved!';
                setTimeout(() => btn.innerText = originalText, 2000);
            }
        } catch (error) {
            console.error('Failed to save settings:', error);
        }
    };

    return (
        <div className="space-y-8 animate-in fade-in duration-500">
            {/* Header */}
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-3xl font-black italic tracking-tighter uppercase">Rental <span className="text-[#A855F7]">Management</span></h1>
                    <p className="text-gray-400 text-sm mt-1">Configure console rates, features, and controller pricing.</p>
                </div>
                <button
                    id="save-rental-settings"
                    onClick={handleSaveSettings}
                    className="px-6 py-3 rounded-xl bg-white text-black font-bold uppercase tracking-widest hover:bg-[#A855F7] hover:text-white transition-all flex items-center gap-2"
                >
                    <Save size={18} />
                    Save Changes
                </button>
            </div>

            <div className="space-y-6">
                {/* Controller Pricing Settings */}
                <ControlSection title="Controller Configuration" icon={<Gamepad2 className="text-[#A855F7]" size={20} />}>
                    <div className="space-y-6">
                        {/* Max Quantity */}
                        <div>
                            <label className="text-[10px] text-gray-500 uppercase font-bold mb-2 block">Maximum Controllers Per Rental</label>
                            <div className="flex items-center gap-4">
                                <input
                                    type="number"
                                    min="1"
                                    max="10"
                                    value={controllerSettings.maxQuantity}
                                    onChange={(e) => setControllerSettings({ ...controllerSettings, maxQuantity: Number(e.target.value) })}
                                    className="w-24 bg-white/5 border border-white/10 rounded-xl p-3 text-white text-center font-bold outline-none focus:border-[#A855F7]"
                                />
                                <p className="text-xs text-gray-400">Customers can select up to this many controllers</p>

                                <button
                                    onClick={handleResetControllerSettings}
                                    className="ml-auto text-xs text-gray-400 hover:text-[#A855F7] transition-colors flex items-center gap-1"
                                >
                                    <RefreshCw size={12} />
                                    Reset Defaults
                                </button>
                            </div>
                        </div>

                        {/* Pricing Grid */}
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            {/* PS4 Pricing */}
                            <div className="bg-white/5 border border-white/10 rounded-xl p-4">
                                <h4 className="text-white font-bold text-sm mb-4 flex items-center gap-2">
                                    <Gamepad2 size={16} className="text-blue-400" />
                                    PS4 Controllers
                                </h4>
                                <div className="space-y-3">
                                    {['DAILY', 'WEEKLY', 'MONTHLY'].map((plan) => (
                                        <div key={plan}>
                                            <label className="text-[9px] text-gray-500 uppercase font-bold mb-1 block">{plan}</label>
                                            <input
                                                type="number"
                                                value={controllerSettings.pricing.ps4[plan.toLowerCase() as keyof typeof controllerSettings.pricing.ps4] || 0}
                                                onChange={(e) => setControllerSettings({
                                                    ...controllerSettings,
                                                    pricing: {
                                                        ...controllerSettings.pricing,
                                                        ps4: { ...controllerSettings.pricing.ps4, [plan]: Number(e.target.value) }
                                                    }
                                                })}
                                                className="w-full bg-black/30 border border-white/10 rounded-lg p-2 text-white text-sm outline-none focus:border-blue-400"
                                            />
                                        </div>
                                    ))}
                                </div>
                            </div>

                            {/* PS5 Pricing */}
                            <div className="bg-white/5 border border-white/10 rounded-xl p-4">
                                <h4 className="text-white font-bold text-sm mb-4 flex items-center gap-2">
                                    <Gamepad2 size={16} className="text-purple-400" />
                                    PS5 Controllers
                                </h4>
                                <div className="space-y-3">
                                    {['DAILY', 'WEEKLY', 'MONTHLY'].map((plan) => (
                                        <div key={plan}>
                                            <label className="text-[9px] text-gray-500 uppercase font-bold mb-1 block">{plan}</label>
                                            <input
                                                type="number"
                                                value={controllerSettings.pricing.ps5[plan.toLowerCase() as keyof typeof controllerSettings.pricing.ps5] || 0}
                                                onChange={(e) => setControllerSettings({
                                                    ...controllerSettings,
                                                    pricing: {
                                                        ...controllerSettings.pricing,
                                                        ps5: { ...controllerSettings.pricing.ps5, [plan]: Number(e.target.value) }
                                                    }
                                                })}
                                                className="w-full bg-black/30 border border-white/10 rounded-lg p-2 text-white text-sm outline-none focus:border-purple-400"
                                            />
                                        </div>
                                    ))}
                                </div>
                            </div>
                        </div>
                    </div>
                </ControlSection>

                {/* Catalog Configuration */}
                <ControlSection title="Catalog Configuration" icon={<Tag className="text-[#A855F7]" size={20} />}>
                    <div>
                        <div className="flex items-center justify-between mb-4">
                            <label className="text-[10px] text-gray-500 uppercase font-bold">Base Console Rates & Features</label>
                            <button
                                onClick={handleResetCatalogSettings}
                                className="text-xs text-gray-400 hover:text-[#A855F7] transition-colors flex items-center gap-1"
                            >
                                <RefreshCw size={12} />
                                Reset Defaults
                            </button>
                        </div>
                        <div className="grid grid-cols-1 gap-6">
                            {Object.keys(catalogSettings).map(catName => (
                                <div key={catName} className="bg-white/5 border border-white/10 rounded-xl p-4">
                                    <h4 className="text-white font-bold text-sm mb-4 flex items-center gap-2 uppercase border-b border-white/10 pb-2">
                                        {catName}
                                    </h4>
                                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                                        {(['daily', 'weekly', 'monthly'] as const).map((plan) => {
                                            const planConfig = (catalogSettings as any)[catName][plan];
                                            if (!planConfig) return null;

                                            return (
                                                <div key={plan} className="bg-black/20 p-3 rounded-lg">
                                                    <label className="text-[10px] text-[#A855F7] uppercase font-bold mb-2 block">{plan} Plan</label>
                                                    <div className="mb-3">
                                                        <label className="text-[9px] text-gray-400 uppercase block mb-1">Price (₹)</label>
                                                        <input
                                                            type="number"
                                                            value={planConfig.price}
                                                            onChange={(e) => {
                                                                const newVal = Number(e.target.value);
                                                                setCatalogSettings(prev => ({
                                                                    ...prev,
                                                                    [catName]: {
                                                                        ...prev[catName],
                                                                        [plan]: {
                                                                            ...prev[catName][plan],
                                                                            price: newVal
                                                                        }
                                                                    }
                                                                }));
                                                            }}
                                                            className="w-full bg-black/30 border border-white/10 rounded px-2 py-1 text-white text-xs outline-none focus:border-[#A855F7]"
                                                        />
                                                    </div>
                                                    <div>
                                                        <label className="text-[9px] text-gray-400 uppercase block mb-1">Features (One per line)</label>
                                                        <textarea
                                                            rows={4}
                                                            value={planConfig.features.join('\n')}
                                                            onChange={(e) => {
                                                                const newFeatures = e.target.value.split('\n');
                                                                setCatalogSettings(prev => ({
                                                                    ...prev,
                                                                    [catName]: {
                                                                        ...prev[catName],
                                                                        [plan]: {
                                                                            ...prev[catName][plan],
                                                                            features: newFeatures
                                                                        }
                                                                    }
                                                                }));
                                                            }}
                                                            className="w-full bg-black/30 border border-white/10 rounded px-2 py-1 text-white text-xs outline-none focus:border-[#A855F7] resize-none font-mono"
                                                        />
                                                    </div>
                                                </div>
                                            );
                                        })}
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                </ControlSection>
            </div>
        </div>
    );
}

function ControlSection({ title, icon, children }: { title: string, icon: React.ReactNode, children: React.ReactNode }) {
    return (
        <div className="bg-[#0a0a0a] border border-white/10 rounded-2xl p-6 relative overflow-hidden">
            <div className="absolute top-0 right-0 p-4 opacity-10 pointer-events-none">
                {icon}
            </div>
            <h3 className="text-lg font-bold text-white uppercase tracking-wider mb-6 flex items-center gap-3 border-b border-white/10 pb-4">
                {icon} {title}
            </h3>
            {children}
        </div>
    );
}
