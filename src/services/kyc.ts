/**
 * KYC Service
 * Handles document uploads and KYC submission using Firebase
 */

import { AgentFeedback, kycAgentService } from './kycAgentService';
import { db, storage } from '../lib/firebase';
import { ref, uploadBytesResumable, getDownloadURL } from 'firebase/storage';
import { doc, setDoc, getDoc, updateDoc, serverTimestamp } from 'firebase/firestore';

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
    submittedAt?: any;
    agentReports?: AgentFeedback[];
}

export const getKYCStatus = async (userId: string): Promise<KYCData | null> => {
    try {
        const docRef = doc(db, "kyc", userId);
        const docSnap = await getDoc(docRef);
        
        if (docSnap.exists()) {
            return docSnap.data() as KYCData;
        }
        return null;
    } catch (e) {
        console.error("Error fetching KYC status:", e);
        return null;
    }
};

export const uploadKYCDocument = async (
    userId: string,
    file: File,
    type: 'id-front' | 'id-back' | 'selfie' | 'selfie-video',
    onProgress?: (progress: number) => void
): Promise<string> => {
    const fileExtension = file.name.split('.').pop();
    const fileName = `${type}_${Date.now()}.${fileExtension}`;
    const storageRef = ref(storage, `kyc/${userId}/${fileName}`);
    
    const uploadTask = uploadBytesResumable(storageRef, file);

    return new Promise((resolve, reject) => {
        uploadTask.on('state_changed', 
            (snapshot) => {
                const progress = (snapshot.bytesTransferred / snapshot.totalBytes) * 100;
                if (onProgress) onProgress(progress);
            }, 
            (error) => {
                console.error("Upload failed:", error);
                reject(error);
            }, 
            async () => {
                const downloadURL = await getDownloadURL(uploadTask.snapshot.ref);
                resolve(downloadURL);
            }
        );
    });
};

export const submitKYC = async (userId: string, data: KYCData, isManual: boolean = false): Promise<void> => {
    try {
        const submission: KYCData = {
            ...data,
            status: isManual ? 'APPROVED' : 'PENDING',
            submittedAt: serverTimestamp(),
            ...(isManual ? { 
                trustScore: 100, 
                agentReports: [{
                    agentName: 'Admin Override',
                    status: 'PASS',
                    message: 'Manual KYC Entry by Administrator',
                    timestamp: new Date().toISOString()
                }] 
            } : {})
        };

        // Save to Firestore
        await setDoc(doc(db, "kyc", userId), submission);
        
        // Update user record with kyc_status
        await updateDoc(doc(db, "users", userId), {
            kyc_status: submission.status
        });

        // Trigger local event for UI update
        window.dispatchEvent(new CustomEvent('kyc-updated', { detail: { userId, status: submission.status } }));

        if (!isManual) {
            // Run Agent Verification in background (async)
            // Note: In a production app, this should ideally be a Cloud Function
            kycAgentService.processVerification(submission).then(async (result) => {
                const status = result.decision === 'APPROVE' ? 'APPROVED' : (result.decision === 'REJECT' ? 'REJECTED' : 'MANUAL_REVIEW');
                
                await updateDoc(doc(db, "kyc", userId), {
                    agentReports: result.agentReports,
                    trustScore: result.trustScore,
                    status: status
                });

                await updateDoc(doc(db, "users", userId), {
                    kyc_status: status
                });

                window.dispatchEvent(new CustomEvent('kyc-updated', { 
                    detail: { 
                        userId, 
                        status: status,
                        reports: result.agentReports
                    } 
                }));
            });
        }

    } catch (error) {
        console.error("KYC Submission failed:", error);
        throw error;
    }
};

export const updateKYCStatus = async (userId: string, status: 'APPROVED' | 'REJECTED' | 'MANUAL_REVIEW'): Promise<void> => {
    try {
        await updateDoc(doc(db, "kyc", userId), { status });
        await updateDoc(doc(db, "users", userId), { kyc_status: status });
        window.dispatchEvent(new CustomEvent('kyc-updated', { detail: { userId, status } }));
    } catch (error) {
        console.error("Status update failed:", error);
        throw error;
    }
};
