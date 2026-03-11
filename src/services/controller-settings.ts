"use client";

export interface ControllerPricing {
    ps4: {
        DAILY: number;
        WEEKLY: number;
        MONTHLY: number;
    };
    ps5: {
        DAILY: number;
        WEEKLY: number;
        MONTHLY: number;
    };
}

export interface ControllerHysteresis {
    ps4: {
        minPrice: number;
        maxPrice: number;
        priceAdjustmentBand: number;
        stockAlertBuffer: number;
        availabilityThresholdBuffer: number;
    };
    ps5: {
        minPrice: number;
        maxPrice: number;
        priceAdjustmentBand: number;
        stockAlertBuffer: number;
        availabilityThresholdBuffer: number;
    };
}

export interface ControllerSettings {
    maxQuantity: number;
    pricing: ControllerPricing;
    hysteresis: ControllerHysteresis;
}

const DEFAULT_CONTROLLER_SETTINGS: ControllerSettings = {
    maxQuantity: 4,
    pricing: {
        ps4: {
            DAILY: 50,
            WEEKLY: 250,
            MONTHLY: 800,
        },
        ps5: {
            DAILY: 80,
            WEEKLY: 400,
            MONTHLY: 1200,
        }
    },
    hysteresis: {
        ps4: {
            minPrice: 40,
            maxPrice: 100,
            priceAdjustmentBand: 10,
            stockAlertBuffer: 5,
            availabilityThresholdBuffer: 2
        },
        ps5: {
            minPrice: 60,
            maxPrice: 150,
            priceAdjustmentBand: 15,
            stockAlertBuffer: 3,
            availabilityThresholdBuffer: 1
        }
    }
};

export const getControllerSettings = (): ControllerSettings => {
    const stored = localStorage.getItem('gv_controller_settings');
    if (stored) {
        try {
            return JSON.parse(stored) as ControllerSettings;
        } catch {
            // Return defaults on corrupt parse string
        }
    }
    return DEFAULT_CONTROLLER_SETTINGS;
};

export const saveControllerSettings = (settings: ControllerSettings) => {
    localStorage.setItem('gv_controller_settings', JSON.stringify(settings));
};

export const resetControllerSettings = () => {
    localStorage.removeItem('gv_controller_settings');
};
