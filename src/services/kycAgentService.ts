/**
 * KYC Agent Service
 * A multi-agent simulation for automated identity verification.
 */

export interface AgentFeedback {
    agentName: string;
    status: 'PASS' | 'FAIL' | 'WARNING';
    message: string;
    details?: string;
    timestamp: string;
}

export interface VerificationResult {
    trustScore: number;
    decision: 'APPROVE' | 'REJECT' | 'MANUAL_REVIEW';
    agentReports: AgentFeedback[];
}

class KYCAgentService {
    /**
     * Simulates the Document Specialist Agent (OCR & Document Validation)
     */
    private async documentAgent(data: any): Promise<AgentFeedback> {
        // Simulate processing time
        await new Promise(r => setTimeout(r, 1500));
        
        const hasAadhar = data.aadharNumber && data.aadharNumber.length === 12;
        const hasIdUrl = !!data.idUrl;
        
        if (hasAadhar && hasIdUrl) {
            return {
                agentName: 'Document Specialist',
                status: 'PASS',
                message: 'Document structure validated. OCR successfully extracted data.',
                details: `Extracted Name: ${data.fullName}, ID: ${data.aadharNumber.substring(0,4)}-XXXX-XXXX`,
                timestamp: new Date().toISOString()
            };
        }
        
        return {
            agentName: 'Document Specialist',
            status: 'FAIL',
            message: 'Incomplete document data or unreadable image.',
            timestamp: new Date().toISOString()
        };
    }

    /**
     * Simulates the Biometric Analyst Agent (Face Match & Liveness)
     */
    private async biometricAgent(data: any): Promise<AgentFeedback> {
        await new Promise(r => setTimeout(r, 2000));
        
        // Randomly simulate success/failure for the demo
        const matchScore = Math.floor(Math.random() * 40) + 60; // 60-100%
        
        if (matchScore > 75) {
            return {
                agentName: 'Biometric Analyst',
                status: 'PASS',
                message: `Facial match successful. Confidence: ${matchScore}%`,
                details: 'Live selfie matches document photo. No spoofing detected.',
                timestamp: new Date().toISOString()
            };
        }
        
        return {
            agentName: 'Biometric Analyst',
            status: 'WARNING',
            message: `Facial match confidence low: ${matchScore}%`,
            details: 'Manual verification recommended due to lighting or alignment.',
            timestamp: new Date().toISOString()
        };
    }

    /**
     * Simulates the Compliance Officer (Risk Assessment)
     */
    private async complianceAgent(data: any, previousReports: AgentFeedback[]): Promise<AgentFeedback> {
        await new Promise(r => setTimeout(r, 1000));
        
        const docPass = previousReports.find(r => r.agentName === 'Document Specialist')?.status === 'PASS';
        const bioPass = previousReports.find(r => r.agentName === 'Biometric Analyst')?.status === 'PASS';
        
        if (docPass && bioPass) {
            return {
                agentName: 'Compliance Officer',
                status: 'PASS',
                message: 'No risk indicators found. User cleared for standard limits.',
                details: 'Social records verified. No blacklist matches.',
                timestamp: new Date().toISOString()
            };
        }
        
        return {
            agentName: 'Compliance Officer',
            status: 'WARNING',
            message: 'Elevated risk detected.',
            details: 'Incomplete automated verification chain.',
            timestamp: new Date().toISOString()
        };
    }

    /**
     * Run the full agentic verification flow
     */
    async processVerification(kycData: any): Promise<VerificationResult> {
        const reports: AgentFeedback[] = [];
        
        // 1. Run specialists in parallel
        const [docReport, bioReport] = await Promise.all([
            this.documentAgent(kycData),
            this.biometricAgent(kycData)
        ]);
        
        reports.push(docReport, bioReport);
        
        // 2. Compliance reviews the findings
        const compReport = await this.complianceAgent(kycData, reports);
        reports.push(compReport);
        
        // 3. Calculate trust score and decision
        let passCount = reports.filter(r => r.status === 'PASS').length;
        let trustScore = Math.floor((passCount / reports.length) * 100);
        
        // Adjust for bio match specifically
        if (bioReport.status === 'WARNING') trustScore -= 10;
        if (docReport.status === 'FAIL') trustScore = 0;

        let decision: 'APPROVE' | 'REJECT' | 'MANUAL_REVIEW' = 'MANUAL_REVIEW';
        if (trustScore > 85) decision = 'APPROVE';
        else if (trustScore < 40) decision = 'REJECT';

        return {
            trustScore,
            decision,
            agentReports: reports
        };
    }
}

export const kycAgentService = new KYCAgentService();
