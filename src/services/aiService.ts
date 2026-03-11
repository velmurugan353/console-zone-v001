import { GoogleGenerativeAI } from "@google/generative-ai";

// Support both Vite (import.meta.env) and Node/Other (process.env)
const API_KEY = import.meta.env.GEMINI_API_KEY || process.env.GEMINI_API_KEY || '';

const genAI = new GoogleGenerativeAI(API_KEY);

export const aiService = {
    /**
     * Get repair diagnosis and parts estimation
     */
    async getRepairDiagnosis(device: string, issue: string): Promise<string> {
        if (!API_KEY) return "AI Diagnosis Unavailable: API Key Missing.";
        
        try {
            const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });
            const prompt = `You are a console repair expert. Analyze this ticket:
            Device: ${device}
            Issue: ${issue}
            
            Provide a technical diagnosis, common fix protocol, and estimated parts cost in INR. 
            Keep it concise and professional. Use markdown.`;
            
            const result = await model.generateContent(prompt);
            const response = await result.response;
            return response.text();
        } catch (error) {
            console.error("Gemini Repair Error:", error);
            return "Failed to synchronize with AI Matrix.";
        }
    },

    /**
     * Get market value for buyback
     */
    async getMarketValue(device: string, condition: string): Promise<string> {
        if (!API_KEY) return "Market Intelligence Offline.";
        
        try {
            const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });
            const prompt = `Analyze current market value for:
            Device: ${device}
            Condition: ${condition}
            
            Suggest a competitive buyback price range in INR and a recommended resale price. 
            Mention any specific market trends for this model.
            Keep it concise.`;
            
            const result = await model.generateContent(prompt);
            const response = await result.response;
            return response.text();
        } catch (error) {
            console.error("Gemini Market Error:", error);
            return "Failed to fetch market data.";
        }
    }
};
