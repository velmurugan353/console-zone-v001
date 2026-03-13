import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Loader2, ShieldAlert } from "lucide-react";
import EnterpriseKYC from "../../components/kyc/enterprise/EnterpriseKYC";
import { useAuth } from "../../context/AuthContext";

export default function UserKYC() {
    const [loading, setLoading] = useState(true);
    const [status, setStatus] = useState<string | null>(null);
    const { user } = useAuth();
    const navigate = useNavigate();

    useEffect(() => {
        // Simulate checking KYC status (replace with real API call if available)
        const checkStatus = async () => {
            if (!user) {
                navigate("/login?redirect=/dashboard/kyc");
                return;
            }

            try {
                // Mocking the check - in a real app, this would be a db lookup
                // For demo, we check if user has a kyc_status property (mocking approved for specific IDs)
                const mockStatus = (user as any).kyc_status || null;

                if (mockStatus === 'APPROVED') {
                    const redirectPath = sessionStorage.getItem('redirectAfterKYC');
                    if (redirectPath) {
                        sessionStorage.removeItem('redirectAfterKYC');
                        navigate(redirectPath);
                        return;
                    }
                }

                if (mockStatus === 'PENDING' || mockStatus === 'APPROVED') {
                    setStatus(mockStatus);
                }
            } catch (err) {
                console.error("Status check failed", err);
            } finally {
                setLoading(false);
            }
        };

        checkStatus();
    }, [user, navigate]);

    if (loading) {
        return (
            <div className="min-h-dvh bg-[#0b0b0f] flex flex-col items-center justify-center gap-4">
                <div className="w-12 h-12 rounded-xl bg-[#B000FF]/20 border border-[#B000FF]/30 flex items-center justify-center animate-pulse">
                    <Loader2 className="text-[#B000FF] animate-spin" size={24} />
                </div>
                <p className="text-[10px] font-mono text-[#B000FF]/70 uppercase tracking-[0.4em]">Establishing Secure Link...</p>
            </div>
        );
    }

    if (status) {
        return (
            <div className="min-h-dvh bg-[#0b0b0f] flex flex-col items-center justify-center p-6 text-center">
                <div className="w-20 h-20 bg-[#B000FF]/10 rounded-full flex items-center justify-center text-[#B000FF] mb-6 purple-glow">
                    <ShieldAlert size={40} />
                </div>
                <h1 className="text-2xl font-black text-white uppercase tracking-widest mb-2">Verification Active</h1>
                <p className="text-gray-400 max-w-md text-sm leading-relaxed mb-8">
                    Your account is currently in <span className="text-[#B000FF] font-bold">{status}</span> status. Our automated verification engine is reviewing your submission.
                </p>
                <button
                    onClick={() => navigate("/dashboard")}
                    className="px-8 py-3 bg-[#B000FF] text-white text-[10px] font-black uppercase tracking-[0.2em] rounded-full hover:bg-[#B000FF] transition-all cursor-pointer"
                >
                    Return to Profile
                </button>
            </div>
        );
    }

    return <EnterpriseKYC />;
}


