import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Check, ArrowRight, RefreshCw } from 'lucide-react';
import { Link } from 'react-router-dom';
import { formatCurrency } from '../lib/utils';
import { RENTAL_CONSOLES, RentalConsole } from '../constants/rentals';
import { db } from '../lib/firebase';
import { collection, query, where, onSnapshot } from 'firebase/firestore';
import { EditableText } from '../components/Editable';
import { getCatalogSettings } from '../services/catalog-settings';
import { getControllerSettings } from '../services/controller-settings';

const GAMES_LIST = [
  "GTA V", "Red Dead Redemption 2", "PUBG: Battlegrounds", "Tomb Raider Collection", "Uncharted 4",
  "Uncharted Lost Legacy", "God of War", "God of War Ragnarok", "God of War 3", "Spider-Man Miles Morales",
  "Marvel's Spider-Man 2", "Mortal Kombat 11", "Tekken 6", "It Takes Two", "A Way Out", "WWE 2K23", "WWE 2K24",
  "FIFA 23", "FIFA 24", "Assassin's Creed Collection", "Batman Arkham Knight", "Days Gone", "Devil May Cry 5",
  "The Evil Within", "Resident Evil 4", "Resident Evil Village", "The Last of Us Remastered Part 1", "Death Stranding",
  "Detroit: Become Human", "F1 22", "F1 23", "Far Cry 3,4,5,6", "Ghost of Tsushima", "Horizon Zero Dawn",
  "Infamous Second Son", "Just Cause 4", "Kena: Bridge of Spirits", "Marvel's Guardians of the Galaxy",
  "Need for Speed Payback", "Watch Dogs 1 & 2", "Watch Dogs Legion", "Call of Duty: Black Ops Cold War",
  "Ratchet & Clank: Rift Apart", "Need for Speed Unbound", "Batman Gotham Knights", "Outlast 2", "Dead Island 2",
  "The Callisto Protocol"
];

function GameController({ size, className }: { size?: number, className?: string }) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      width={size || 24}
      height={size || 24}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
    >
      <line x1="6" x2="10" y1="12" y2="12" />
      <line x1="8" x2="8" y1="10" y2="14" />
      <line x1="15" x2="15.01" y1="13" y2="13" />
      <line x1="18" x2="18.01" y1="11" y2="11" />
      <rect x="2" y="6" width="20" height="12" rx="2" />
    </svg>
  );
}

export default function Rentals() {
  const [rentals, setRentals] = useState<RentalConsole[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<string>('ps5');

  useEffect(() => {
    const q = query(collection(db, 'products'), where('type', '==', 'rental'));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const fetched = snapshot.docs.map(doc => {
        const data = doc.data();
        return {
          id: doc.id,
          name: data.name || 'Unknown Console',
          slug: data.slug || (data.name ? data.name.toLowerCase().replace(/\s+/g, '-') : doc.id),
          image: data.image || '',
          available: data.stockCount || 0,
          dailyRate: data.price || 500,
          deposit: data.securityDeposit || (data.price ? data.price * 10 : 5000),
          specs: data.specs || ['4K Gaming', 'High Speed SSD', 'Next-Gen Performance'],
          included: data.included || ['Console', 'Controller', 'Cables'],
          condition: data.condition || 'Excellent'
        } as RentalConsole;
      });

      // If Firestore is empty, fallback to constants for initial population
      if (fetched.length === 0) {
        setRentals(RENTAL_CONSOLES);
      } else {
        setRentals(fetched);
      }

      setLoading(false);
    }, (error) => {
      console.error("Firestore error in Rentals:", error);
      setRentals(RENTAL_CONSOLES);
      setLoading(false);
    });
    return () => unsubscribe();
  }, []);

  const activeStock = rentals.find(s => s.id === activeTab) || rentals[0];

  // Dynamic plan generator using Admin Catalog Settings
  const getPlans = (consoleId: string) => {
    const catalog = getCatalogSettings();
    const controllers = getControllerSettings();

    // Map console IDs to catalog keys
    const idToKey: Record<string, string> = {
      'ps5': 'Sony PlayStation 5',
      'xbox': 'Xbox Series X',
      'ps4': 'PlayStation 4 Pro',
      'switch': 'Nintendo Switch OLED'
    };

    const key = idToKey[consoleId] || idToKey['ps5'];
    const config = catalog[key] || catalog['Sony PlayStation 5'];
    
    // Use dynamic stock and deposit from catalog
    const currentStock = config.totalStock || activeStock?.available || 0;
    const currentDeposit = config.securityDeposit || activeStock?.deposit || 0;

    // Map console IDs to controller keys
    const idToCtrl: Record<string, keyof typeof controllers.pricing> = {
      'ps5': 'ps5',
      'xbox': 'xbox',
      'ps4': 'ps4',
      'switch': 'switch'
    };
    const ctrlKey = idToCtrl[consoleId] || 'ps5';
    const ctrlPricing = controllers.pricing[ctrlKey];

    return [
      { 
        duration: "Day", 
        price: config.daily.price, 
        features: config.daily.features, 
        extraController: ctrlPricing.DAILY, 
        color: "bg-[#1a1a1a]", 
        recommended: false,
        available: currentStock,
        deposit: currentDeposit
      },
      { 
        duration: "Week", 
        price: config.weekly.price, 
        features: config.weekly.features, 
        extraController: ctrlPricing.WEEKLY, 
        color: "bg-[#A855F7]", 
        recommended: true,
        available: currentStock,
        deposit: currentDeposit
      },
      { 
        duration: "Month", 
        price: config.monthly.price, 
        features: config.monthly.features, 
        extraController: ctrlPricing.MONTHLY, 
        color: "bg-[#1a1a1a]", 
        recommended: false,
        available: currentStock,
        deposit: currentDeposit
      }
    ];
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-[#050505] flex items-center justify-center">
        <RefreshCw className="h-8 w-8 text-[#A855F7] animate-spin" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#050505]">
      {/* Hero Section */}
      <section className="relative h-[60vh] flex flex-col items-center justify-center text-center px-4 overflow-hidden">
        <div className="absolute inset-0 z-0">
          <div className="absolute inset-0 bg-gradient-to-b from-[#050505]/30 via-[#050505]/80 to-[#050505] z-10" />
          <img
            src={activeStock?.image}
            alt="Background"
            className="w-full h-full object-cover opacity-60 transition-opacity duration-700"
          />
        </div>

        <div className="relative z-20 max-w-5xl mx-auto space-y-8 mt-20">
          <motion.h1
            key={activeTab}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
            className="text-5xl md:text-8xl font-black text-white italic tracking-tighter uppercase leading-[0.9]"
          >
            {activeStock ? activeStock.name.split(' ').slice(0, 2).join(' ') : "RENTALS"}
          </motion.h1>
          <p className="text-gray-300 text-lg md:text-xl font-mono uppercase tracking-widest max-w-2xl mx-auto">
            <EditableText pageKey="rentals" itemKey="hero_subtitle" defaultText="Select from our elite fleet of current-gen and classic consoles" />
          </p>

          <div className="flex md:inline-flex bg-black/40 backdrop-blur-md p-1 rounded-2xl border border-white/10 overflow-x-auto max-w-full mt-8 scrollbar-hide mx-auto">
            {rentals.map((item) => (
              <button
                key={item.id}
                onClick={() => setActiveTab(item.id)}
                className={`px-6 md:px-10 py-4 rounded-xl font-black uppercase tracking-widest text-sm transition-all whitespace-nowrap ${activeTab === item.id
                  ? 'bg-[#A855F7] text-white shadow-[0_0_20px_rgba(168,85,247,0.4)]'
                  : 'text-gray-400 hover:text-white'
                  }`}
              >
                {item.name.split(' ').slice(0, 2).join(' ')}
              </button>
            ))}
          </div>
        </div>
      </section>

      <div className="relative z-10 py-20 px-4 sm:px-6 lg:px-8 mx-auto w-full" style={{ maxWidth: 'var(--layout-max-width, 1280px)' }}>
        {/* Pricing Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8 mb-24">
          <AnimatePresence mode="wait">
            {activeTab && getPlans(activeTab).map((plan: any, index: number) => (
              <motion.div
                key={plan.duration}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -20 }}
                transition={{ delay: index * 0.1 }}
                className={`group relative bg-[#0a0a0a] border border-white/10 rounded-3xl overflow-hidden hover:border-[#A855F7]/50 transition-all duration-500 hover:scale-[1.02] hover:shadow-[0_0_50px_rgba(168,85,247,0.15)] flex flex-col ${plan.recommended ? 'ring-2 ring-[#A855F7] shadow-[0_0_40px_rgba(168,85,247,0.2)]' : ''}`}
              >
                {plan.recommended && (
                  <div className="absolute top-0 inset-x-0 h-1.5 bg-[#A855F7] shadow-[0_0_15px_rgba(168,85,247,0.8)] z-20" />
                )}

                <div className={`p-10 ${plan.color} text-white text-center relative overflow-hidden`}>
                  <div className="absolute inset-0 bg-black/20 backdrop-blur-[2px]" />

                  <h3 className="font-display text-2xl font-black uppercase tracking-widest relative z-10">{plan.duration}</h3>
                  <div className="mt-4 relative z-10 flex flex-col items-center justify-center gap-1">
                    <span className="text-5xl font-black tracking-tighter">{formatCurrency(plan.price)}</span>
                    {/* Availability Badge */}
                    <span className={`text-[10px] font-bold uppercase tracking-widest px-2 py-0.5 rounded-full border ${plan.available > 0 ? 'bg-green-500/10 text-green-500 border-green-500/20' : 'bg-red-500/10 text-red-500 border-red-500/20'}`}>
                      {plan.available > 0 ? `${plan.available} Units Available` : 'Out of Stock'}
                    </span>
                  </div>
                  {plan.recommended && (
                    <span className="absolute top-4 right-4 bg-white text-black text-[10px] font-black px-3 py-1 rounded-full uppercase z-10 shadow-lg">Best Value</span>
                  )}
                </div>

                <div className="p-8 flex-1 flex flex-col bg-gradient-to-b from-[#0a0a0a] to-[#050505]">
                  <ul className="space-y-4 mb-10 flex-1">
                    {plan.features.map((feature: string, i: number) => (
                      <li key={i} className="flex items-start gap-3 text-gray-300 group/item">
                        <div className={`mt-1 w-5 h-5 rounded-full flex items-center justify-center shrink-0 ${plan.recommended ? 'bg-[#06B6D4]/10 text-[#06B6D4]' : 'bg-[#8B5CF6]/10 text-[#8B5CF6]'}`}>
                          <Check size={12} strokeWidth={4} />
                        </div>
                        <span className="text-sm font-medium group-hover/item:text-white transition-colors">{feature}</span>
                      </li>
                    ))}
                    <li className="flex items-center gap-3 text-gray-500 pt-6 border-t border-white/5">
                      <ArrowRight size={18} className="shrink-0 opacity-50" />
                      <span className="text-xs font-bold uppercase tracking-wider">Extra Controller: <span className="text-white">{formatCurrency(plan.extraController)}</span></span>
                    </li>
                  </ul>

                  <div className="space-y-4 pt-4">
                    <Link
                      to={`/rentals/${activeStock?.slug}/book`}
                      className={`group/btn relative overflow-hidden block w-full text-center py-5 rounded-2xl font-black text-lg transition-all ${plan.available > 0
                        ? (plan.recommended ? 'bg-[#A855F7] text-white shadow-[0_0_25px_rgba(168,85,247,0.4)] hover:shadow-[0_0_35px_rgba(168,85,247,0.6)]' : 'bg-white/5 text-white border border-white/10 hover:bg-white/10 hover:border-[#A855F7]/50')
                        : 'bg-white/5 text-gray-600 border border-white/5 cursor-not-allowed grayscale'
                        }`}
                    >
                      <span className="relative z-10 flex items-center justify-center gap-2 tracking-widest uppercase">
                        {plan.available > 0 ? (
                          <>RENT NOW <ArrowRight size={20} className="group-hover/btn:translate-x-1 transition-transform" /></>
                        ) : <span className="flex items-center gap-2"><ArrowRight size={20} className="rotate-45" /> SOLD OUT</span>}
                      </span>
                    </Link>
                  </div>
                </div>
              </motion.div>
            ))}
          </AnimatePresence>
        </div>

        {/* Games List */}
        <div className="w-full px-4 sm:px-6 lg:px-8 mx-auto" style={{ maxWidth: 'var(--layout-max-width, 1280px)' }}>
          <div className="text-center mb-12">
            <h2 className="text-3xl font-bold text-white mb-4">
              <EditableText pageKey="rentals" itemKey="games_title" defaultText="INCLUDED GAMES LIBRARY" />
            </h2>
            <p className="text-gray-400">
              <EditableText pageKey="rentals" itemKey="games_subtitle" defaultText="All rentals come with access to our massive library of top-tier titles." />
            </p>
          </div>

          <div className="bg-[#0a0a0a] border border-[#8B5CF6]/30 rounded-3xl p-8 relative overflow-hidden">
            <div className="absolute inset-0 bg-[#8B5CF6]/5 rounded-3xl" />
            <div className="relative z-10 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-y-4 gap-x-8">
              {GAMES_LIST.map((game, i) => (
                <div key={i} className="flex items-center gap-3 text-gray-300 hover:text-white transition-colors">
                  <div className="w-1.5 h-1.5 rounded-full bg-[#8B5CF6]" />
                  <span className="text-sm font-medium">{game}</span>
                </div>
              ))}
            </div>
            <div className="mt-8 text-center">
              <span className="inline-block px-4 py-1 rounded-full bg-white/10 text-xs text-gray-400 uppercase tracking-widest">And many more...</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
