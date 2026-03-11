"use client";

export type PlanConfig = {
    price: number;
    features: string[];
};

export interface CatalogSettings {
    [categoryName: string]: {
        daily: PlanConfig;
        weekly: PlanConfig;
        monthly: PlanConfig;
    };
}

const DEFAULT_CATALOG_SETTINGS: CatalogSettings = {
    "Flagship Consoles (PS5/Xbox X)": {
        daily: { price: 2500, features: ["2 controllers included", "2 base games", "4K HDMI cable"] },
        weekly: { price: 10000, features: ["2 controllers included", "4 premium games", "Priority swap support"] },
        monthly: { price: 28000, features: ["2 controllers included", "Unlimited game swaps", "Damage protection waiver"] }
    },
    "Classic Consoles (PS4/Xbox S)": {
        daily: { price: 1500, features: ["2 controllers included", "1 base game", "HDMI cable"] },
        weekly: { price: 6500, features: ["2 controllers", "2 premium games"] },
        monthly: { price: 18000, features: ["2 controllers", "4 monthly game swaps"] }
    },
    "VR & Handhelds": {
        daily: { price: 3000, features: ["Cleaned & sanitized", "Carrying case", "Digital library pre-loaded"] },
        weekly: { price: 12000, features: ["Extra battery packs", "Full library access"] },
        monthly: { price: 35000, features: ["Maximum kit tier", "Accidental damage buffer"] }
    }
};

export const getCatalogSettings = (): CatalogSettings => {
    const stored = localStorage.getItem('gv_catalog_settings');
    if (stored) {
        try {
            return JSON.parse(stored) as CatalogSettings;
        } catch {
            // Fallback 
        }
    }
    return DEFAULT_CATALOG_SETTINGS;
};

export const saveCatalogSettings = (settings: CatalogSettings) => {
    localStorage.setItem('gv_catalog_settings', JSON.stringify(settings));
};

export const resetCatalogSettings = () => {
    localStorage.removeItem('gv_catalog_settings');
};
