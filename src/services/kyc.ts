/**
 * KYC Service
 * Handles document uploads and KYC submission
 */

import { AgentFeedback, kycAgentService } from './kycAgentService';

export interface KYCData {
    fullName: string;
    user?: string; // For admin panel display
    avatar?: string; // For admin panel display
    type?: string; // Document type for admin panel
    date?: string; // Date for admin panel
    trustScore?: number; // Trust score for admin panel
    phone: string;
    secondaryPhone?: string;
    drivingLicenseNumber: string;
    secondaryIdType?: string;
    secondaryIdNumber?: string;
    address: string;
    idFrontUrl: string;
    idBackUrl: string;
    selfieUrl?: string;
    selfieVideoUrl: string;
    livenessCheck?: 'PASSED' | 'FAILED';
    status?: 'PENDING' | 'APPROVED' | 'REJECTED' | 'MANUAL_REVIEW';
    submittedAt?: string;
    agentReports?: AgentFeedback[];
}

const KYC_STORAGE_KEY = 'consolezone_kyc_data';

export const getKYCStatus = (userId: string): KYCData | null => {
    try {
        const stored = localStorage.getItem(KYC_STORAGE_KEY);
        if (!stored || stored === 'undefined') return null;
        const allData = JSON.parse(stored);
        if (!allData || typeof allData !== 'object') return null;
        return allData[userId] || null;
    } catch (e) {
        console.error("KYC Data corruption:", e);
        return null;
    }
};

export const uploadKYCDocument = async (
    userId: string,
    file: File,
    type: 'id-front' | 'id-back' | 'selfie' | 'selfie-video',
    onProgress?: (progress: number) => void
): Promise<string> => {
    // Simulate upload delay and progress
    return new Promise((resolve) => {
        let progress = 0;
        const interval = setInterval(() => {
            progress += 20;
            if (onProgress) onProgress(progress);
            if (progress >= 100) {
                clearInterval(interval);
                // In a real app, we would upload to storage and get a URL
                // For local simulation, we'll store a mock URL
                resolve(`https://storage.consolezone.com/kyc/${userId}/${type}_${Date.now()}_${file.name}`);
            }
        }, 300);
    });
};

export const submitKYC = async (userId: string, data: KYCData): Promise<void> => {
    // Simulate API call delay for initial submission
    return new Promise((resolve) => {
        setTimeout(async () => {
            const allData = JSON.parse(localStorage.getItem(KYC_STORAGE_KEY) || '{}');
            const submission: KYCData = {
                ...data,
                status: 'PENDING',
                submittedAt: new Date().toISOString()
            };
            allData[userId] = submission;
            localStorage.setItem(KYC_STORAGE_KEY, JSON.stringify(allData));

            // Also trigger an event for components to listen to if needed
            window.dispatchEvent(new CustomEvent('kyc-updated', { detail: { userId, status: 'PENDING' } }));

            console.log(`KYC submitted for user ${userId}:`, submission);
            resolve();

            // Run Agent Verification in background (simulated)
            const result = await kycAgentService.processVerification(data);
            
            // Update with agent findings
            const updatedData = JSON.parse(localStorage.getItem(KYC_STORAGE_KEY) || '{}');
            if (updatedData[userId]) {
                updatedData[userId] = {
                    ...updatedData[userId],
                    agentReports: result.agentReports,
                    trustScore: result.trustScore,
                    status: result.decision === 'APPROVE' ? 'APPROVED' : (result.decision === 'REJECT' ? 'REJECTED' : 'MANUAL_REVIEW')
                };
                localStorage.setItem(KYC_STORAGE_KEY, JSON.stringify(updatedData));
                window.dispatchEvent(new CustomEvent('kyc-updated', { 
                    detail: { 
                        userId, 
                        status: updatedData[userId].status,
                        reports: result.agentReports
                    } 
                }));
            }
        }, 1500);
    });
};

export const updateKYCStatus = async (userId: string, status: 'APPROVED' | 'REJECTED'): Promise<void> => {
    const allData = JSON.parse(localStorage.getItem(KYC_STORAGE_KEY) || '{}');
    if (allData[userId]) {
        allData[userId].status = status;
        localStorage.setItem(KYC_STORAGE_KEY, JSON.stringify(allData));
        window.dispatchEvent(new CustomEvent('kyc-updated', { detail: { userId, status } }));
    }
};

