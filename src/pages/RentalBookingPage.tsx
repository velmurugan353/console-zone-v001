import { useState, useEffect, useMemo, useRef } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { motion, AnimatePresence } from 'framer-motion';
import {
  ChevronLeft,
  ChevronRight,
  Check,
  Info,
  Calendar as CalendarIcon,
  Truck,
  Store,
  CreditCard,
  ShieldCheck,
  Clock,
  MapPin,
  Phone,
  Tag,
  Gamepad2,
  PlusCircle,
  MinusCircle,
  RefreshCw,
  User,
  CheckCircle2,
  AlertCircle
} from 'lucide-react';
import { format, addDays, differenceInDays, isBefore, isSameDay, startOfToday, startOfMonth, endOfMonth, startOfWeek, endOfWeek, eachDayOfInterval, addMonths, subMonths, isSameMonth } from 'date-fns';
import { RENTAL_CONSOLES, RentalConsole } from '../constants/rentals';
import { formatCurrency } from '../lib/utils';
import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';
import { db } from '../lib/firebase';
import { collection, query, where, getDocs, limit, addDoc } from 'firebase/firestore';
import { automationService } from '../services/automationService';
import { razorpayService } from '../services/razorpayService';
import { getCatalogSettings } from '../services/catalog-settings';
import { getControllerSettings } from '../services/controller-settings';
import { rentalService } from '../services/rentalService';

function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

// --- Types ---

type Step = 1 | 2 | 3 | 4 | 5;

interface BookingState {
  console: RentalConsole | null;
  unitId?: string; // Track specific hardware unit
  duration: {
    type: 'daily' | 'weekly' | 'monthly';
    startDate: Date | null;
    endDate: Date | null;
    totalDays: number;
    timeSlot: string;
  };
  delivery: {
    method: 'pickup' | 'delivery';
    address: string;
    phone: string;
    notes: string;
  };
  payment: {
    method: 'card' | 'paypal' | 'apple-pay';
    couponCode: string;
    discount: number;
    termsAccepted: boolean;
  };
  addons: {
    extraControllers: number;
  };
}

// --- Components ---

function StepIndicator({ currentStep, completedSteps }: { currentStep: Step, completedSteps: number[] }) {
  const steps = [
    { id: 1, label: 'CONSOLE' },
    { id: 2, label: 'DATES' },
    { id: 3, label: 'DELIVERY' },
    { id: 4, label: 'PAYMENT' },
    { id: 5, label: 'CONFIRM' }
  ];

  return (
    <div className="flex items-center gap-2 md:gap-4 md:justify-between mb-8 md:mb-12 overflow-x-auto pb-4 scrollbar-hide -mx-4 px-4 md:mx-0 md:px-0">
      {steps.map((step, index) => (
        <div key={step.id} className="flex items-center shrink-0">
          <div className="flex flex-col items-center">
            <div
              className={cn(
                "w-8 h-8 md:w-10 md:h-10 rounded-full flex items-center justify-center font-mono text-xs md:text-sm border-2 transition-all duration-300",
                currentStep === step.id
                  ? "border-[#00d4ff] text-[#00d4ff] shadow-[0_0_15px_rgba(0,212,255,0.4)]"
                  : completedSteps.includes(step.id)
                    ? "border-green-500 bg-green-500 text-black"
                    : "border-white/10 text-white/30"
              )}
            >
              {completedSteps.includes(step.id) ? <Check size={16} strokeWidth={3} /> : step.id}
            </div>
            <span className={cn(
              "mt-2 text-[8px] md:text-[10px] font-bold tracking-widest uppercase transition-colors duration-300",
              currentStep === step.id ? "text-[#00d4ff]" : "text-white/30"
            )}>
              {step.label}
            </span>
          </div>
          {index < steps.length - 1 && (
            <div className={cn(
              "w-6 md:w-16 h-[2px] mx-1 md:mx-2 mb-6 transition-colors duration-300",
              completedSteps.includes(step.id) ? "bg-green-500" : "bg-white/10"
            )} />
          )}
        </div>
      ))}
    </div>
  );
}

export default function RentalBookingPage() {
  const { slug } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const [currentStep, setCurrentStep] = useState<Step>(1);
  const [completedSteps, setCompletedSteps] = useState<number[]>([]);
  const [isFirstBooking, setIsFirstBooking] = useState<boolean>(false);
  const [checkingHistory, setCheckingHistory] = useState(true);
  const [isCheckingAvailability, setIsCheckingAvailability] = useState(false);
  const [availabilityError, setAvailabilityError] = useState<string | null>(null);

  const [consoleData, setConsoleData] = useState<RentalConsole | null>(null);
  const [loading, setLoading] = useState(true);

  const [bookingState, setBookingState] = useState<BookingState>({
    console: null,
    duration: {
      type: 'daily',
      startDate: null,
      endDate: null,
      totalDays: 0,
      timeSlot: '10:00 AM - 12:00 PM'
    },
    delivery: {
      method: 'pickup',
      address: '',
      phone: '',
      notes: ''
    },
    payment: {
      method: 'card',
      couponCode: '',
      discount: 0,
      termsAccepted: false
    },
    addons: {
      extraControllers: 0
    }
  });

  useEffect(() => {
    const savedBooking = sessionStorage.getItem('pending_rental_booking');
    if (savedBooking && savedBooking !== 'undefined') {
      try {
        const { state: savedState, step, slug: savedSlug } = JSON.parse(savedBooking);
        if (savedSlug === slug) {
          if (savedState.duration.startDate) savedState.duration.startDate = new Date(savedState.duration.startDate);
          if (savedState.duration.endDate) savedState.duration.endDate = new Date(savedState.duration.endDate);
          
          setBookingState(savedState);
          setCurrentStep(step as Step);
          sessionStorage.removeItem('pending_rental_booking');
        }
      } catch (e) {
        console.error("Failed to restore saved booking:", e);
      }
    }
  }, [slug]);

  useEffect(() => {
    const fetchConsole = async () => {
      try {
        const q = query(collection(db, 'products'), where('type', '==', 'rental'));
        const snapshot = await getDocs(q);
        const fetched = snapshot.docs.map(doc => {
          const data = doc.data();
          const name = data.name || 'Unknown Console';
          return {
            id: doc.id,
            name: name,
            slug: data.slug || name.toLowerCase().replace(/\s+/g, '-'),
            image: data.image || '',
            available: data.stockCount || 0,
            dailyRate: data.price || 500,
            deposit: data.securityDeposit || (data.price ? data.price * 10 : 5000),
            specs: data.specs || ['4K Gaming', 'High Speed SSD', 'Next-Gen Performance'],
            included: data.included || ['Console', 'Controller', 'Cables'],
            condition: data.condition || 'Excellent'
          } as RentalConsole;
        });

        const target = fetched.find(c => c.slug === slug) || RENTAL_CONSOLES.find(c => c.slug === slug) || null;
        setConsoleData(target as RentalConsole);
      } catch (error) {
        console.error("Error fetching console details:", error);
        setConsoleData(RENTAL_CONSOLES.find(c => c.slug === slug) || null);
      } finally {
        setLoading(false);
      }
    };
    fetchConsole();
  }, [slug]);

  useEffect(() => {
    if (consoleData && !bookingState.console) {
      setBookingState(prev => ({ ...prev, console: consoleData }));
    }
  }, [consoleData, bookingState.console]);

  useEffect(() => {
    const checkRentalHistory = async () => {
      if (user) {
        setCheckingHistory(true);
        try {
          const q = query(
            collection(db, 'rentals'),
            where('email', '==', user.email),
            limit(1)
          );
          const snapshot = await getDocs(q);
          const isFirst = snapshot.empty;
          setIsFirstBooking(isFirst);

          if (isFirst) {
            setBookingState(prev => ({
              ...prev,
              delivery: { ...prev.delivery, method: 'delivery' }
            }));
          }
        } catch (error) {
          console.error("Error checking rental history:", error);
        } finally {
          setCheckingHistory(false);
        }
      }
    };
    checkRentalHistory();
  }, [user]);

  // --- Calculations ---
  const { rentalCost, addonsCost, deposit, deliveryFee, subtotal, discountAmount, totalDue, durationLabel } = useMemo(() => {
    if (!consoleData) return { rentalCost: 0, addonsCost: 0, deposit: 0, deliveryFee: 0, subtotal: 0, discountAmount: 0, totalDue: 0, durationLabel: '' };

    const catalog = getCatalogSettings();
    const controllers = getControllerSettings();

    const idToKey: Record<string, string> = {
      'ps5': 'Sony PlayStation 5',
      'xbox': 'Xbox Series X',
      'ps4': 'PlayStation 4 Pro',
      'switch': 'Nintendo Switch OLED'
    };

    const key = idToKey[consoleData.id] || idToKey['ps5'];
    const config = catalog[key] || catalog['Sony PlayStation 5'];

    const idToCtrl: Record<string, keyof typeof controllers.pricing> = {
      'ps5': 'ps5',
      'xbox': 'xbox',
      'ps4': 'ps4',
      'switch': 'switch'
    };
    const ctrlKey = idToCtrl[consoleData.id] || 'ps5';
    const ctrlPricing = controllers.pricing[ctrlKey];

    const ctrlRate = bookingState.duration.type === 'monthly' ? ctrlPricing.MONTHLY :
                    bookingState.duration.type === 'weekly' ? ctrlPricing.WEEKLY :
                    ctrlPricing.DAILY;

    let baseConsoleRate = 0;
    let label = '';

    switch(bookingState.duration.type) {
      case 'monthly':
        baseConsoleRate = config.monthly.price;
        label = '1 Month Deployment';
        break;
      case 'weekly':
        baseConsoleRate = config.weekly.price;
        label = '7 Day Expedition';
        break;
      default:
        baseConsoleRate = config.daily.price * bookingState.duration.totalDays;
        label = `${bookingState.duration.totalDays} Day Mission`;
    }

    const currentAddonsCost = bookingState.addons.extraControllers * ctrlRate * (bookingState.duration.type === 'daily' ? bookingState.duration.totalDays : 1);
    const currentRentalCost = baseConsoleRate + currentAddonsCost;
    const currentDeliveryFee = bookingState.delivery.method === 'delivery' ? 9.99 : 0;
    const currentDeposit = config.securityDeposit || consoleData.deposit;
    const currentSubtotal = currentRentalCost + currentDeliveryFee;
    const currentDiscountAmount = (currentSubtotal * bookingState.payment.discount) / 100;
    const currentTotalDue = currentSubtotal - currentDiscountAmount + currentDeposit;

    return {
      rentalCost: baseConsoleRate,
      addonsCost: currentAddonsCost,
      deposit: currentDeposit,
      deliveryFee: currentDeliveryFee,
      subtotal: currentSubtotal,
      discountAmount: currentDiscountAmount,
      totalDue: currentTotalDue,
      durationLabel: label
    };
  }, [consoleData, bookingState.duration, bookingState.addons.extraControllers, bookingState.delivery.method, bookingState.payment.discount]);

  if (loading) {
    return (
      <div className="min-h-dvh bg-[#080112] flex items-center justify-center">
        <RefreshCw className="h-8 w-8 text-[#00d4ff] animate-spin" />
      </div>
    );
  }

  if (!consoleData) {
    return (
      <div className="min-h-dvh bg-[#080112] flex items-center justify-center">
        <div className="text-center space-y-4">
          <h1 className="text-2xl font-bold text-white">Console not found</h1>
          <Link to="/rentals" className="text-[#B000FF] hover:underline">Back to Rentals</Link>
        </div>
      </div>
    );
  }

  const nextStep = async () => {
    if (currentStep === 2) {
      if (!bookingState.duration.startDate || !bookingState.duration.endDate || !consoleData) return;
      
      setIsCheckingAvailability(true);
      setAvailabilityError(null);
      
      const result = await rentalService.checkAvailability(
        consoleData.id, 
        bookingState.duration.startDate, 
        bookingState.duration.endDate
      );

      setIsCheckingAvailability(false);

      if (!result.available) {
        setAvailabilityError("NEGATIVE. NO UNITS AVAILABLE IN FLEET FOR SELECTED WINDOW.");
        return;
      }

      setBookingState(prev => ({ ...prev, unitId: result.units[0].id }));
    }

    setCompletedSteps(prev => [...new Set([...prev, currentStep])]);
    setCurrentStep(prev => (prev + 1) as Step);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const prevStep = () => {
    setCurrentStep(prev => (prev - 1) as Step);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleConfirmBooking = async () => {
    if (!user || !consoleData) return;

    razorpayService.openCheckout({
      amount: totalDue * 100,
      prefill: {
        name: user.name || '',
        email: user.email || ''
      },
      handler: async (response: any) => {
        try {
          setLoading(true);

          const rentalData = {
            user: user.name || user.email,
            email: user.email,
            phone: bookingState.delivery.phone,
            product: consoleData.name,
            productId: consoleData.id,
            unitId: bookingState.unitId || '', 
            image: consoleData.image,
            startDate: bookingState.duration.startDate ? bookingState.duration.startDate.toISOString().split('T')[0] : '',
            endDate: bookingState.duration.endDate ? bookingState.duration.endDate.toISOString().split('T')[0] : '',
            totalPrice: totalDue,
            deposit: deposit,
            lateFees: 0,
            status: 'pending',
            paymentId: response.razorpay_payment_id,
            deliveryMethod: bookingState.delivery.method,
            shippingAddress: bookingState.delivery.address,
            notes: bookingState.delivery.notes,
            createdAt: new Date().toISOString(),
            timeline: [
              { status: 'pending', timestamp: new Date().toLocaleString(), note: 'Rental booking confirmed via Razorpay' }
            ]
          };

          const docRef = await addDoc(collection(db, 'rentals'), rentalData);
          
          await automationService.triggerWorkflow('rental_confirmed', {
            rentalId: docRef.id,
            customerName: user.name || user.email,
            productName: consoleData.name,
            startDate: rentalData.startDate,
            endDate: rentalData.endDate,
            email: user.email,
            phone: rentalData.phone
          });

          navigate(`/rentals/${slug}/book/confirm?id=${docRef.id}`);
        } catch (error) {
          console.error("Error saving rental booking:", error);
          alert("Failed to confirm booking. Please contact support.");
        } finally {
          setLoading(false);
        }
      }
    });
  };

  return (
    <div className="min-h-dvh bg-[#080112] text-white pt-20 md:pt-24 pb-32 md:pb-20 px-4 sm:px-6 lg:px-8">
      <div className="max-w-7xl mx-auto">
        <div className="flex items-center justify-between mb-6 md:mb-8">
          <button
            onClick={() => navigate('/rentals')}
            className="flex items-center text-gray-400 hover:text-white transition-colors group"
          >
            <ChevronLeft size={20} className="group-hover:-translate-x-1 transition-transform" />
            <span className="ml-1 font-bold uppercase tracking-widest text-[10px] md:text-xs">Back to Rentals</span>
          </button>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 md:gap-12">
          <div className="lg:col-span-7 xl:col-span-8">
            <StepIndicator currentStep={currentStep} completedSteps={completedSteps} />

            <AnimatePresence mode="wait">
              {currentStep === 1 && (
                <Step1ConsoleDetails
                  selectedConsole={consoleData}
                  state={bookingState}
                  setState={setBookingState}
                  onNext={nextStep}
                />
              )}
              {currentStep === 2 && (
                <Step2DurationDates
                  state={bookingState}
                  setState={setBookingState}
                  onNext={nextStep}
                  onBack={prevStep}
                  isChecking={isCheckingAvailability}
                  error={availabilityError}
                />
              )}
              {currentStep === 3 && (
                <Step3DeliveryOptions
                  state={bookingState}
                  setState={setBookingState}
                  onNext={nextStep}
                  onBack={prevStep}
                  kycStatus={user?.kyc_status}
                  kycAddress={user?.kyc_address}
                  isFirstBooking={isFirstBooking}
                />
              )}
              {currentStep === 4 && (
                <Step4Payment
                  state={bookingState}
                  setState={setBookingState}
                  totals={{ subtotal, discountAmount, deposit, totalDue }}
                  onNext={handleConfirmBooking}
                  onBack={prevStep}
                />
              )}
            </AnimatePresence>
          </div>

          <div className="lg:col-span-5 xl:col-span-4">
            <div className="lg:sticky lg:top-24">
              <OrderSummary
                selectedConsole={consoleData}
                state={bookingState}
                totals={{ rentalCost, deliveryFee, deposit, subtotal, discountAmount, totalDue, addonsCost }}
                onNext={currentStep === 4 ? handleConfirmBooking : nextStep}
                currentStep={currentStep}
                user={user}
                isChecking={isCheckingAvailability}
              />
            </div>
          </div>
        </div>
      </div>

      <div className="lg:hidden fixed bottom-0 left-0 right-0 z-50 bg-black/90 backdrop-blur-xl border-t border-white/10 p-4 pb-safe">
        <div className="max-w-7xl mx-auto flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg overflow-hidden border border-white/10 shrink-0">
              <img src={consoleData?.image} alt="" className="w-full h-full object-cover" />
            </div>
            <div>
              <p className="text-[10px] font-black text-[#00d4ff] uppercase tracking-tighter truncate max-w-[80px] xs:max-w-[120px]">
                {consoleData?.name}
              </p>
              <p className="text-sm font-black text-white">
                {formatCurrency(totalDue)}
              </p>
            </div>
          </div>
          <button
            onClick={currentStep === 4 ? handleConfirmBooking : nextStep}
            disabled={
              (currentStep === 2 && (!bookingState.duration.startDate || !bookingState.duration.endDate || isCheckingAvailability)) ||
              (currentStep === 3 && (!bookingState.delivery.phone || (bookingState.delivery.method === 'delivery' && !bookingState.delivery.address))) ||
              (currentStep === 4 && !bookingState.payment.termsAccepted)
            }
            className="flex-1 py-3.5 bg-[#00d4ff] text-black font-black uppercase tracking-widest text-[10px] rounded-xl transition-all shadow-[0_0_20px_rgba(0,212,255,0.3)] disabled:opacity-50 flex items-center justify-center gap-2"
          >
            {isCheckingAvailability ? <RefreshCw className="animate-spin h-3 w-3" /> : (currentStep === 4 ? 'Confirm' : 'Continue')}
          </button>
        </div>
      </div>
    </div>
  );
}

function Step1ConsoleDetails({ selectedConsole, state, setState, onNext }: { selectedConsole: RentalConsole, state: BookingState, setState: any, onNext: () => void }) {
  const controllers = getControllerSettings();
  const idToCtrl: Record<string, keyof typeof controllers.pricing> = { 'ps5': 'ps5', 'xbox': 'xbox', 'ps4': 'ps4', 'switch': 'switch' };
  const ctrlKey = idToCtrl[selectedConsole.id] || 'ps5';
  const ctrlPricing = controllers.pricing[ctrlKey];
  const extraControllerRate = state.duration.type === 'monthly' ? ctrlPricing.MONTHLY : state.duration.type === 'weekly' ? ctrlPricing.WEEKLY : ctrlPricing.DAILY;

  const updateExtraControllers = (val: number) => {
    const newVal = Math.max(0, Math.min(controllers.maxQuantity, state.addons.extraControllers + val));
    setState((prev: BookingState) => ({ ...prev, addons: { ...prev.addons, extraControllers: newVal } }));
  };

  return (
    <motion.div initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} className="space-y-6 md:space-y-8">
      <div className="bg-[#0a0f1e] border border-white/10 rounded-2xl md:rounded-3xl p-6 md:p-12">
        <div className="flex flex-col md:flex-row gap-8 md:gap-12">
          <div className="md:w-1/2">
            <div className="aspect-square rounded-2xl overflow-hidden bg-black/40 border border-white/5 relative group">
              <img src={selectedConsole.image} alt={selectedConsole.name} className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-110" />
              <div className="absolute top-4 left-4">
                <span className="bg-[#00d4ff] text-black text-[8px] md:text-[10px] font-black px-3 py-1 rounded-full uppercase shadow-[0_0_15px_rgba(0,212,255,0.5)]">
                  {selectedConsole.condition} Condition
                </span>
              </div>
            </div>
          </div>
          <div className="md:w-1/2 space-y-6">
            <h2 className="text-2xl md:text-3xl font-black uppercase tracking-tight text-white mb-2">{selectedConsole.name}</h2>
            <div className="space-y-4">
              <h3 className="text-[9px] md:text-[10px] font-black uppercase tracking-[0.2em] text-gray-500">Key Specs</h3>
              <div className="grid grid-cols-1 gap-2 md:gap-3">
                {selectedConsole.specs.map((spec, i) => (
                  <div key={i} className="flex items-center gap-3 text-xs md:text-sm text-gray-300">
                    <div className="w-1 md:w-1.5 h-1 md:h-1.5 rounded-full bg-[#00d4ff]" /> {spec}
                  </div>
                ))}
              </div>
            </div>
            <div className="space-y-4 pt-2 md:pt-4">
              <div className="flex items-center gap-2">
                <Gamepad2 size={16} className="text-[#00d4ff]" />
                <h3 className="text-[9px] md:text-[10px] font-black uppercase tracking-[0.2em] text-gray-500">Add-On Equipment</h3>
              </div>
              <div className="relative group overflow-hidden rounded-xl md:rounded-2xl border bg-white/[0.02] border-white/10 p-4 md:p-5 flex items-center justify-between gap-4">
                <div className="flex items-center gap-3 md:gap-4">
                  <div className="w-10 h-10 md:w-12 md:h-12 rounded-lg bg-[#00d4ff] text-black flex items-center justify-center shadow-[0_0_20px_rgba(0,212,255,0.4)]">
                    <Gamepad2 size={24} />
                  </div>
                  <div>
                    <h4 className="text-xs md:text-sm font-bold text-white uppercase tracking-tight">Extra Controller</h4>
                    <p className="text-[8px] md:text-[9px] text-gray-500 font-black uppercase tracking-widest mt-0.5">₹{extraControllerRate} Day</p>
                  </div>
                </div>
                <div className="flex items-center gap-3 bg-black/60 p-1 rounded-xl border border-white/5">
                  <button onClick={() => updateExtraControllers(-1)} disabled={state.addons.extraControllers === 0} className="w-7 h-7 md:w-8 md:h-8 rounded-lg flex items-center justify-center text-gray-500 hover:text-white transition-all"><MinusCircle size={18} /></button>
                  <span className="w-5 md:w-6 text-center font-black text-[#00d4ff] font-mono text-xs md:text-sm">{state.addons.extraControllers}</span>
                  <button onClick={() => updateExtraControllers(1)} disabled={state.addons.extraControllers === 3} className="w-7 h-7 md:w-8 md:h-8 rounded-lg flex items-center justify-center text-gray-500 hover:text-[#00d4ff] transition-all"><PlusCircle size={18} /></button>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
      <div className="flex justify-end pt-4">
        <button onClick={onNext} className="group relative w-full md:w-auto px-12 py-5 bg-[#00d4ff] text-black font-black uppercase tracking-widest text-xs md:text-sm rounded-xl md:rounded-2xl transition-all hover:shadow-[0_0_30px_rgba(0,212,255,0.4)]">
          Continue <ChevronRight size={20} className="inline ml-2" />
        </button>
      </div>
    </motion.div>
  );
}

function Step2DurationDates({ state, setState, onNext, onBack, isChecking, error }: { state: BookingState, setState: any, onNext: () => void, onBack: () => void, isChecking: boolean, error: string | null }) {
  const today = startOfToday();
  const [viewDate, setViewDate] = useState(startOfMonth(today));
  const monthStart = startOfMonth(viewDate);
  const calendarDays = eachDayOfInterval({ start: startOfWeek(monthStart), end: endOfWeek(endOfMonth(monthStart)) });

  const handleDateClick = (date: Date) => {
    if (isBefore(date, today)) return;
    const planDurations = { weekly: 7, monthly: 30, daily: 0 };
    const type = state.duration.type;
    if (type === 'daily') {
      if (!state.duration.startDate || (state.duration.startDate && state.duration.endDate)) {
        setState((p: any) => ({ ...p, duration: { ...p.duration, startDate: date, endDate: null, totalDays: 0 } }));
      } else {
        if (isBefore(date, state.duration.startDate)) return;
        setState((p: any) => ({ ...p, duration: { ...p.duration, endDate: date, totalDays: differenceInDays(date, p.duration.startDate) + 1 } }));
      }
    } else {
      const days = planDurations[type as keyof typeof planDurations];
      setState((p: any) => ({ ...p, duration: { ...p.duration, startDate: date, endDate: addDays(date, days - 1), totalDays: days } }));
    }
  };

  return (
    <motion.div initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} className="space-y-6 md:space-y-8">
      <div className="bg-[#0a0f1e] border border-white/10 rounded-2xl md:rounded-3xl p-6 md:p-8">
        <div className="space-y-8">
          {error && <div className="p-4 bg-red-500/10 border border-red-500/30 rounded-xl flex items-center gap-3 text-red-500 text-[10px] font-mono uppercase tracking-widest"><AlertCircle size={16} /> {error}</div>}
          <div className="space-y-4">
            <h3 className="text-[10px] font-black uppercase tracking-[0.2em] text-gray-500 text-center">Select Booking Window</h3>
            <div className="grid grid-cols-7 gap-1 md:gap-2">
              {calendarDays.map((date, i) => (
                <button key={i} onClick={() => handleDateClick(date)} disabled={isBefore(date, today) || !isSameMonth(date, monthStart)} className={cn("aspect-square rounded-lg flex items-center justify-center text-xs font-bold transition-all", isSameDay(date, state.duration.startDate || new Date(0)) || isSameDay(date, state.duration.endDate || new Date(0)) ? "bg-[#00d4ff] text-black" : "bg-white/5 text-white hover:bg-white/10", (state.duration.startDate && state.duration.endDate && date > state.duration.startDate && date < state.duration.endDate) ? "bg-[#00d4ff]/20 text-[#00d4ff]" : "", !isSameMonth(date, monthStart) && "opacity-0 pointer-events-none")}>
                  {format(date, 'd')}
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>
      <div className="flex justify-between gap-4">
        <button onClick={onBack} className="px-8 py-4 bg-white/5 text-white font-bold uppercase tracking-widest text-xs rounded-xl border border-white/10">Back</button>
        <button onClick={onNext} disabled={!state.duration.startDate || !state.duration.endDate || isChecking} className="flex-1 px-12 py-4 bg-[#00d4ff] text-black font-black uppercase tracking-widest text-xs rounded-xl flex items-center justify-center gap-2">
          {isChecking ? <><RefreshCw className="animate-spin" size={14} /> SCANNING...</> : 'Continue'}
        </button>
      </div>
    </motion.div>
  );
}

function Step3DeliveryOptions({ state, setState, onNext, onBack, kycStatus, kycAddress, isFirstBooking }: { state: BookingState, setState: any, onNext: () => void, onBack: () => void, kycStatus?: string, kycAddress?: string, isFirstBooking: boolean }) {
  const isKycApproved = kycStatus === 'APPROVED';
  return (
    <motion.div initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} className="space-y-6 md:space-y-8">
      <div className="bg-[#0a0f1e] border border-white/10 rounded-2xl p-6 md:p-8 space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <button onClick={() => setState((p: any) => ({ ...p, delivery: { ...p.delivery, method: 'pickup' } }))} className={cn("p-6 rounded-xl border text-left transition-all", state.delivery.method === 'pickup' ? "bg-[#00d4ff]/10 border-[#00d4ff] text-[#00d4ff]" : "bg-white/5 border-white/10 text-gray-400")}><Store size={24} className="mb-2" /> Store Pickup</button>
          <button onClick={() => setState((p: any) => ({ ...p, delivery: { ...p.delivery, method: 'delivery' } }))} className={cn("p-6 rounded-xl border text-left transition-all", state.delivery.method === 'delivery' ? "bg-[#00d4ff]/10 border-[#00d4ff] text-[#00d4ff]" : "bg-white/5 border-white/10 text-gray-400")}><Truck size={24} className="mb-2" /> Home Delivery</button>
        </div>
        <input type="tel" maxLength={10} placeholder="Mobile Number" value={state.delivery.phone} onChange={e => setState((p: any) => ({ ...p, delivery: { ...p.delivery, phone: e.target.value.replace(/\D/g, '') } }))} className="w-full bg-black/40 border border-white/10 rounded-xl py-4 px-4 text-white outline-none" />
        {state.delivery.method === 'delivery' && <textarea placeholder="Delivery Address" value={state.delivery.address} onChange={e => setState((p: any) => ({ ...p, delivery: { ...p.delivery, address: e.target.value } }))} className="w-full bg-black/40 border border-white/10 rounded-xl py-4 px-4 text-white h-24" />}
      </div>
      <div className="flex justify-between gap-4">
        <button onClick={onBack} className="px-8 py-4 bg-white/5 text-white font-bold uppercase tracking-widest text-xs rounded-xl">Back</button>
        <button onClick={onNext} disabled={!state.delivery.phone || (state.delivery.method === 'delivery' && !state.delivery.address)} className="flex-1 py-4 bg-[#00d4ff] text-black font-black uppercase tracking-widest text-xs rounded-xl">Continue</button>
      </div>
    </motion.div>
  );
}

function Step4Payment({ state, setState, totals, onNext, onBack }: { state: BookingState, setState: any, totals: any, onNext: () => void, onBack: () => void }) {
  return (
    <motion.div initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} className="space-y-8">
      <div className="bg-[#0a0f1e] border border-white/10 rounded-3xl p-8 space-y-6">
        <div className="bg-amber-500/10 border border-amber-500/20 rounded-2xl p-6 flex gap-4">
          <ShieldCheck size={24} className="text-amber-500" />
          <p className="text-xs text-amber-500/80 uppercase font-black tracking-widest">Security Deposit: {formatCurrency(totals.deposit)} (Refundable)</p>
        </div>
        <label className="flex items-start gap-3 cursor-pointer group">
          <input type="checkbox" checked={state.payment.termsAccepted} onChange={e => setState((p: any) => ({ ...p, payment: { ...p.payment, termsAccepted: e.target.checked } }))} className="mt-1" />
          <span className="text-[10px] text-gray-400 uppercase font-bold tracking-widest">I agree to the Rental Terms, Damage Policy & Late Fees.</span>
        </label>
      </div>
      <div className="flex justify-between gap-4">
        <button onClick={onBack} className="px-8 py-4 bg-white/5 text-white font-bold uppercase tracking-widest text-xs rounded-xl">Back</button>
        <button onClick={onNext} disabled={!state.payment.termsAccepted} className="flex-1 py-4 bg-[#00d4ff] text-black font-black uppercase tracking-widest text-xs rounded-xl">Pay {formatCurrency(totals.totalDue)}</button>
      </div>
    </motion.div>
  );
}

function OrderSummary({ selectedConsole, state, totals, onNext, currentStep, isChecking, user }: { selectedConsole: any, state: any, totals: any, onNext: any, currentStep: number, isChecking: boolean, user: any }) {
  return (
    <div className="bg-[#0a0f1e] border border-white/10 rounded-3xl overflow-hidden shadow-2xl p-8 space-y-6">
      <div className="flex gap-4">
        <img src={selectedConsole.image} className="w-20 h-20 rounded-xl object-cover border border-white/10" alt="" />
        <div>
          <h4 className="text-sm font-black text-white uppercase">{selectedConsole.name}</h4>
          <p className="text-[10px] text-[#00d4ff] font-mono mt-1">SN: {state.unitId || 'PENDING_SCAN'}</p>
        </div>
      </div>
      <div className="space-y-3 pt-4 border-t border-white/5 text-[10px] font-black uppercase tracking-widest text-gray-400">
        <div className="flex justify-between"><span>Rental Fee</span><span className="text-white">{formatCurrency(totals.rentalCost)}</span></div>
        <div className="flex justify-between"><span>Security Deposit</span><span className="text-amber-500">{formatCurrency(totals.deposit)}</span></div>
        <div className="flex justify-between border-t border-white/10 pt-3 text-lg text-[#00d4ff]"><span>Total Due</span><span className="italic">{formatCurrency(totals.totalDue)}</span></div>
      </div>
      <button onClick={onNext} disabled={isChecking} className="w-full py-5 bg-[#00d4ff] text-black font-black uppercase tracking-widest text-xs rounded-2xl hover:shadow-[0_0_30px_rgba(0,212,255,0.4)]">
        {isChecking ? 'FLEET SCAN...' : (currentStep === 4 ? 'Initiate Payment' : 'Continue')}
      </button>
    </div>
  );
}
