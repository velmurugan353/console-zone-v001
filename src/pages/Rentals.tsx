import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Check, ArrowRight, RefreshCw } from 'lucide-react';
import { Link } from 'react-router-dom';
import { formatCurrency } from '../lib/utils';
import { RENTAL_CONSOLES, RentalConsole } from '../constants/rentals';
import { db } from '../lib/firebase';
import { collection, query, where, onSnapshot } from 'firebase/firestore';
import { EditableText, EditableList } from '../components/Editable';
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

  const getPlans = (consoleId: string) => {
    const catalog = getCatalogSettings();
    const controllers = getControllerSettings();

    const idToKey: Record<string, string> = {
      'ps5': 'Sony PlayStation 5',
      'xbox': 'Xbox Series X',
      'ps4': 'PlayStation 4 Pro',
      'switch': 'Nintendo Switch OLED'
    };

    const key = idToKey[consoleId] || idToKey['ps5'];
    const config = catalog[key] || catalog['Sony PlayStation 5'];
    
    const currentStock = config.totalStock || activeStock?.available || 0;
    const currentDeposit = config.securityDeposit || activeStock?.deposit || 0;

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
        color: "bg-gaming-card", 
        recommended: false,
        available: currentStock,
        deposit: currentDeposit
      },
      { 
        duration: "Week", 
        price: config.weekly.price, 
        features: config.weekly.features, 
        extraController: ctrlPricing.WEEKLY, 
        color: "bg-gaming-accent", 
        recommended: true,
        available: currentStock,
        deposit: currentDeposit
      },
      { 
        duration: "Month", 
        price: config.monthly.price, 
        features: config.monthly.features, 
        extraController: ctrlPricing.MONTHLY, 
        color: "bg-gaming-card", 
        recommended: false,
        available: currentStock,
        deposit: currentDeposit
      }
    ];
  };

  if (loading) {
    return (
      <div className="min-h-dvh bg-[#080112] flex items-center justify-center">
        <RefreshCw className="h-8 w-8 text-[#B000FF] animate-spin" />
      </div>
    );
  }

  return (
    <div className="min-h-dvh bg-[#080112]">
      {/* Hero Section */}
      <section className="relative min-h-[60vh] md:h-[80vh] flex flex-col items-center justify-center text-center px-4 overflow-hidden pt-20 md:pt-0">
        <div className="absolute inset-0 z-0">
          <div className="absolute inset-0 bg-gradient-to-b from-[#080112]/50 via-[#080112]/80 to-[#080112] z-10" />
          <img
            src={activeStock?.image}
            alt="Background"
            className="w-full h-full object-cover opacity-50 transition-opacity duration-700"
          />
        </div>

        <div className="relative z-20 max-w-5xl mx-auto space-y-6 md:space-y-8">
          <motion.h1
            key={activeTab}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
            className="text-4xl sm:text-5xl md:text-8xl font-black text-white italic tracking-tighter uppercase leading-[0.9] drop-shadow-[0_0_20px_rgba(176,0,255,0.4)]"
          >
            {activeStock ? activeStock.name.split(' ').slice(0, 2).join(' ') : "RENTALS"}
          </motion.h1>
          <p className="text-gray-300 text-sm sm:text-lg md:text-xl font-mono uppercase tracking-widest max-w-2xl mx-auto opacity-80 px-4">
            <EditableText pageKey="rentals" itemKey="hero_subtitle" defaultText="Select from our elite fleet of current-gen and classic consoles" />
          </p>

          <div className="flex bg-white/[0.02] backdrop-blur-xl p-1.5 rounded-2xl border border-white/10 overflow-x-auto max-w-[95vw] md:max-w-max mt-4 md:mt-8 scrollbar-hide mx-auto shadow-2xl">
            {rentals.map((item) => (
              <button
                key={item.id}
                onClick={() => setActiveTab(item.id)}
                className={`px-4 sm:px-6 md:px-10 py-3 md:py-4 rounded-xl font-black uppercase tracking-widest text-[10px] sm:text-xs md:text-sm transition-all duration-300 whitespace-nowrap ${activeTab === item.id
                  ? 'bg-gradient-to-r from-[#B000FF] to-[#4D008C] text-white shadow-[0_0_20px_rgba(176,0,255,0.5)]'
                  : 'text-gray-400 hover:text-white hover:bg-white/5'
                  }`}
              >
                {item.name.split(' ').slice(0, 2).join(' ')}
              </button>
            ))}
          </div>
        </div>
      </section>

      <div className="relative z-10 py-12 md:py-20 px-4 sm:px-6 lg:px-8 mx-auto w-full" style={{ maxWidth: 'var(--layout-max-width, 1280px)' }}>
        {/* Pricing Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 md:gap-8 mb-16 md:mb-24">
          <AnimatePresence mode="wait">
            {activeTab && getPlans(activeTab).map((plan: any, index: number) => (
              <motion.div
                key={plan.duration}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -20 }}
                transition={{ delay: index * 0.1 }}
                className={`group relative bg-[#0c021a] border border-white/10 rounded-[2rem] md:rounded-3xl overflow-hidden hover:border-[#B000FF]/50 transition-all duration-500 hover:-translate-y-2 hover:shadow-[0_20px_50px_rgba(176,0,255,0.2)] flex flex-col ${plan.recommended ? 'ring-2 ring-[#B000FF] shadow-[0_0_40px_rgba(176,0,255,0.3)]' : ''}`}
              >
                {plan.recommended && (
                  <div className="absolute top-0 inset-x-0 h-1 md:h-1.5 bg-[#B000FF] shadow-[0_0_15px_#B000FF] z-20" />
                )}

                <div className={`p-6 md:p-10 ${plan.recommended ? 'text-white' : 'text-white'} text-center relative overflow-hidden`}>
                  {plan.recommended ? (
                    <div className="absolute inset-0 bg-gradient-to-br from-[#B000FF] to-[#4D008C] opacity-90" />
                  ) : (
                    <div className="absolute inset-0 bg-white/[0.03] backdrop-blur-xl" />
                  )}

                  <h3 className="font-display text-xl md:text-2xl font-black uppercase tracking-widest relative z-10">{plan.duration}</h3>
                  <div className="mt-3 md:mt-4 relative z-10 flex flex-col items-center justify-center gap-1">
                    <span className="text-4xl md:text-5xl font-black tracking-tighter drop-shadow-md">{formatCurrency(plan.price)}</span>
                    <span className={`text-[8px] md:text-[10px] font-bold uppercase tracking-widest px-2 py-0.5 rounded-full border backdrop-blur-md ${plan.available > 0 ? (plan.recommended ? 'bg-black/20 text-white border-white/20' : 'bg-green-500/10 text-green-500 border-green-500/20') : 'bg-red-500/10 text-red-500 border-red-500/20'}`}>
                      {plan.available > 0 ? `${plan.available} Units Available` : 'Out of Stock'}
                    </span>
                  </div>
                  {plan.recommended && (
                    <span className="absolute top-3 right-3 md:top-4 md:right-4 bg-black text-white text-[8px] md:text-[10px] font-black px-2 md:px-3 py-1 rounded-full uppercase z-10 shadow-[0_0_20px_rgba(0,0,0,0.5)] border border-white/20">Best Value</span>
                  )}
                </div>

                <div className="p-6 md:p-8 flex-1 flex flex-col bg-gradient-to-b from-[#0c021a] to-[#080112] relative z-10">
                  <ul className="space-y-3 md:space-y-4 mb-8 md:mb-10 flex-1">
                    {plan.features.map((feature: string, i: number) => (
                      <li key={i} className="flex items-start gap-3 text-white opacity-90 group/item">
                        <div className={`mt-1 w-4 h-4 md:w-5 md:h-5 rounded-full flex items-center justify-center shrink-0 ${plan.recommended ? 'bg-[#B000FF] text-white shadow-[0_0_10px_#B000FF]' : 'bg-[#4D008C] text-white'}`}>
                          <Check size={12} strokeWidth={4} />
                        </div>
                        <span className="text-xs md:text-sm font-medium group-hover/item:text-[#B000FF] transition-colors">{feature}</span>
                      </li>
                    ))}
                    <li className="flex items-center gap-3 text-gray-400 pt-4 md:pt-6 border-t border-white/10">
                      <ArrowRight size={18} className="shrink-0 opacity-50" />
                      <span className="text-[10px] md:text-xs font-bold uppercase tracking-wider">Extra Controller: <span className="text-white">{formatCurrency(plan.extraController)}</span></span>
                    </li>
                  </ul>

                  <div className="space-y-4 pt-2">
                    <Link
                      to={`/rentals/${activeStock?.slug}/book`}
                      className={`group/btn relative overflow-hidden block w-full text-center py-4 md:py-5 rounded-xl md:rounded-2xl font-black text-sm md:text-lg transition-all ${plan.available > 0
                        ? (plan.recommended ? 'bg-[#B000FF] text-white shadow-[0_0_30px_rgba(176,0,255,0.4)] hover:shadow-[0_0_50px_rgba(176,0,255,0.6)]' : 'bg-white/5 text-white border border-white/10 hover:bg-[#B000FF]/20 hover:border-[#B000FF]/50')
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
          <div className="text-center mb-12 relative z-10">
            <h2 className="text-3xl md:text-5xl font-black text-white mb-4 italic uppercase tracking-tighter drop-shadow-[0_0_15px_rgba(176,0,255,0.3)]">
              <EditableText pageKey="rentals" itemKey="games_title" defaultText="INCLUDED GAMES LIBRARY" />
            </h2>
            <p className="text-gray-400 font-mono text-xs uppercase tracking-widest">
              <EditableText pageKey="rentals" itemKey="games_subtitle" defaultText="All rentals come with access to our massive library of top-tier titles." />
            </p>
            <div className="h-1 w-20 bg-gradient-to-r from-transparent via-[#B000FF] to-transparent mx-auto rounded-full mt-4" />
          </div>

          <div className="bg-white/[0.02] backdrop-blur-xl border border-white/10 rounded-3xl p-8 md:p-12 relative overflow-hidden shadow-2xl hover:border-[#B000FF]/30 transition-all duration-500">
            <div className="absolute inset-0 bg-[#B000FF]/5 rounded-3xl pointer-events-none" />
            <EditableList
              pageKey="rentals"
              itemKey="games_list"
              defaultList={GAMES_LIST}
              listContainerClassName="relative z-10 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-y-4 gap-x-8"
              renderItem={(game, i) => (
                <div key={i} className="flex items-center gap-3 text-gray-300 opacity-80 hover:opacity-100 hover:text-white transition-all">
                  <div className="w-1.5 h-1.5 rounded-full bg-[#B000FF] shadow-[0_0_8px_#B000FF]" />
                  <span className="text-sm font-medium">{game}</span>
                </div>
              )}
            />
            <div className="mt-12 text-center relative z-10">
              <span className="inline-block px-6 py-2 rounded-full bg-white/5 border border-white/10 text-xs text-gray-400 uppercase tracking-widest font-black shadow-inner">And many more...</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
