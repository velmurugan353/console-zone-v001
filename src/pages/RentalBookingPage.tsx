import { useState, useEffect, useMemo } from 'react';
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
  User
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

function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

// --- Types ---

type Step = 1 | 2 | 3 | 4 | 5;

interface BookingState {
  console: RentalConsole | null;
  duration: {
    type: 'daily' | 'weekend' | 'weekly' | 'monthly';
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
    <div className="flex items-center justify-between mb-12 overflow-x-auto pb-4 scrollbar-hide">
      {steps.map((step, index) => (
        <div key={step.id} className="flex items-center">
          <div className="flex flex-col items-center">
            <div
              className={cn(
                "w-10 h-10 rounded-full flex items-center justify-center font-mono text-sm border-2 transition-all duration-300",
                currentStep === step.id
                  ? "border-[#00d4ff] text-[#00d4ff] shadow-[0_0_15px_rgba(0,212,255,0.4)]"
                  : completedSteps.includes(step.id)
                    ? "border-green-500 bg-green-500 text-black"
                    : "border-white/10 text-white/30"
              )}
            >
              {completedSteps.includes(step.id) ? <Check size={18} strokeWidth={3} /> : step.id}
            </div>
            <span className={cn(
              "mt-2 text-[10px] font-bold tracking-widest uppercase transition-colors duration-300",
              currentStep === step.id ? "text-[#00d4ff]" : "text-white/30"
            )}>
              {step.label}
            </span>
          </div>
          {index < steps.length - 1 && (
            <div className={cn(
              "w-8 md:w-16 h-[2px] mx-2 mb-6 transition-colors duration-300",
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

  const [consoleData, setConsoleData] = useState<RentalConsole | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchConsole = async () => {
      try {
        const q = query(collection(db, 'products'), where('type', '==', 'rental'));
        const snapshot = await getDocs(q);
        const fetched = snapshot.docs.map(doc => {
          const data = doc.data();
          return {
            id: doc.id,
            name: data.name,
            slug: data.slug || data.name.toLowerCase().replace(/\s+/g, '-'),
            image: data.image,
            available: data.stockCount || 0,
            dailyRate: data.price || 500,
            deposit: data.securityDeposit || (data.price * 10),
            specs: data.specs || ['4K Gaming', 'High Speed SSD', 'Next-Gen Performance'],
            included: data.included || ['Console', 'Controller', 'Cables'],
            condition: data.condition || 'Excellent'
          } as RentalConsole;
        });

        const target = fetched.find(c => c.slug === slug) || RENTAL_CONSOLES.find(c => c.slug === slug) || null;
        setConsoleData(target as RentalConsole);
      } catch (error) {
        console.error("Error fetching console details:", error);
        // Fallback to constants
        setConsoleData(RENTAL_CONSOLES.find(c => c.slug === slug) || null);
      } finally {
        setLoading(false);
      }
    };
    fetchConsole();
  }, [slug]);

  const [bookingState, setBookingState] = useState<BookingState>({
    console: consoleData,
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

  if (loading) {
    return (
      <div className="min-h-screen bg-[#050505] flex items-center justify-center">
        <RefreshCw className="h-8 w-8 text-[#00d4ff] animate-spin" />
      </div>
    );
  }

  if (!consoleData) {
    return (
      <div className="min-h-screen bg-[#050505] flex items-center justify-center">
        <div className="text-center space-y-4">
          <h1 className="text-2xl font-bold text-white">Console not found</h1>
          <Link to="/rentals" className="text-[#A855F7] hover:underline">Back to Rentals</Link>
        </div>
      </div>
    );
  }

  const nextStep = () => {
    setCompletedSteps(prev => [...new Set([...prev, currentStep])]);
    setCurrentStep(prev => (prev + 1) as Step);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const prevStep = () => {
    setCurrentStep(prev => (prev - 1) as Step);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const goToStep = (step: Step) => {
    if (completedSteps.includes(step) || step === 1) {
      setCurrentStep(step);
    }
  };

  // --- Calculations ---
  const extraControllerRate = 100; // ₹100 per controller per day
  const addonsCost = bookingState.addons.extraControllers * extraControllerRate * bookingState.duration.totalDays;
  const rentalCost = (bookingState.duration.totalDays * (consoleData?.dailyRate || 0)) + addonsCost;
  const deliveryFee = bookingState.delivery.method === 'delivery' ? 9.99 : 0;
  const deposit = consoleData?.deposit || 0;
  const subtotal = rentalCost + deliveryFee;
  const discountAmount = (subtotal * bookingState.payment.discount) / 100;
  const totalDue = subtotal - discountAmount + deposit;

  const handleConfirmBooking = async () => {
    if (!user || !consoleData) return;

    // Proceed with Razorpay checkout
    razorpayService.openCheckout({
      amount: totalDue * 100, // Razorpay expects amount in paise
      prefill: {
        name: user.name || '',
        email: user.email || ''
      },
      handler: async (response: any) => {
        console.log('Payment Successful:', response);
        try {
          setLoading(true);

          const rentalData = {
            user: user.name || user.email,
            email: user.email,
            phone: bookingState.delivery.phone,
            product: consoleData.name,
            productId: consoleData.id,
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
            ],
            transactions: [
              {
                id: response.razorpay_payment_id,
                type: 'payment',
                amount: totalDue,
                date: new Date().toISOString().split('T')[0],
                status: 'completed'
              }
            ]
          };

          const docRef = await addDoc(collection(db, 'rentals'), rentalData);
          console.log("Rental saved with ID: ", docRef.id);

          // Trigger Automation & Notifications
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
          alert("Failed to confirm booking. Please contact support if your payment was successful.");
        } finally {
          setLoading(false);
        }
      },
      modal: {
        ondismiss: () => {
          console.log('Checkout dismissed');
        }
      }
    });
  };

  return (
    <div className="min-h-screen bg-[#050505] text-white pt-24 pb-20 px-4 sm:px-6 lg:px-8">
      <div className="max-w-7xl mx-auto">
        {/* Breadcrumbs & Back */}
        <div className="flex items-center justify-between mb-8">
          <button
            onClick={() => navigate('/rentals')}
            className="flex items-center text-gray-400 hover:text-white transition-colors group"
          >
            <ChevronLeft size={20} className="group-hover:-translate-x-1 transition-transform" />
            <span className="ml-1 font-medium uppercase tracking-widest text-xs">Back to Rentals</span>
          </button>
          <div className="hidden md:flex items-center gap-2 text-[10px] font-bold tracking-widest uppercase text-gray-500">
            <Link to="/" className="hover:text-white">Home</Link>
            <span>/</span>
            <Link to="/rentals" className="hover:text-white">Rent</Link>
            <span>/</span>
            <span className="text-white">Book</span>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-12">
          {/* Left Column: Form */}
          <div className="lg:col-span-7 xl:col-span-8">
            <StepIndicator currentStep={currentStep} completedSteps={completedSteps} />

            <AnimatePresence mode="wait">
              {currentStep === 1 && (
                <Step1ConsoleDetails
                  console={consoleData}
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

          {/* Right Column: Sticky Summary */}
          <div className="lg:col-span-5 xl:col-span-4">
            <div className="sticky top-24">
              <OrderSummary
                console={consoleData}
                state={bookingState}
                totals={{ rentalCost, deliveryFee, deposit, subtotal, discountAmount, totalDue, addonsCost }}
                onNext={currentStep === 4 ? handleConfirmBooking : nextStep}
                currentStep={currentStep}
                user={user}
              />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

// --- Step Components ---

function Step1ConsoleDetails({ console, state, setState, onNext }: { console: RentalConsole, state: BookingState, setState: any, onNext: () => void }) {
  const extraControllerRate = 100; // ₹100 per controller per day

  const updateExtraControllers = (val: number) => {
    const newVal = Math.max(0, Math.min(3, state.addons.extraControllers + val));
    setState((prev: BookingState) => ({
      ...prev,
      addons: { ...prev.addons, extraControllers: newVal }
    }));
  };

  return (
    <motion.div
      initial={{ opacity: 0, x: 20 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: -20 }}
      className="space-y-8"
    >
      <div className="bg-[#0a0f1e] border border-white/10 rounded-3xl p-8 md:p-12">
        <div className="flex flex-col md:flex-row gap-12">
          <div className="md:w-1/2">
            <div className="aspect-square rounded-2xl overflow-hidden bg-black/40 border border-white/5 relative group">
              <img
                src={console.image}
                alt={console.name}
                className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-110"
                referrerPolicy="no-referrer"
              />
              <div className="absolute top-4 left-4">
                <span className="bg-[#00d4ff] text-black text-[10px] font-black px-3 py-1 rounded-full uppercase shadow-[0_0_15px_rgba(0,212,255,0.5)]">
                  {console.condition} Condition
                </span>
              </div>
            </div>
          </div>
          <div className="md:w-1/2 space-y-6">
            <div>
              <h2 className="text-3xl font-black uppercase tracking-tight text-white mb-2">{console.name}</h2>
              <div className="flex items-center gap-2">
                <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />
                <span className="text-xs font-bold text-green-500 uppercase tracking-widest">{console.available} Units Available</span>
              </div>
            </div>

            <div className="space-y-4">
              <h3 className="text-[10px] font-black uppercase tracking-[0.2em] text-gray-500">Key Specs</h3>
              <div className="grid grid-cols-1 gap-3">
                {console.specs.map((spec, i) => (
                  <div key={i} className="flex items-center gap-3 text-sm text-gray-300">
                    <div className="w-1.5 h-1.5 rounded-full bg-[#00d4ff]" />
                    {spec}
                  </div>
                ))}
              </div>
            </div>

            <div className="space-y-4">
              <h3 className="text-[10px] font-black uppercase tracking-[0.2em] text-gray-500">What's Included</h3>
              <div className="flex flex-wrap gap-2">
                {console.included.map((item, i) => (
                  <span key={i} className="px-3 py-1.5 bg-white/5 border border-white/10 rounded-lg text-xs font-medium text-gray-300">
                    {item}
                  </span>
                ))}
              </div>
            </div>

            <div className="w-full h-px bg-white/5 my-6" />

            {/* Optional Addons Section */}
            <div className="space-y-4 pt-2">
              <div className="flex items-center gap-2">
                <Gamepad2 size={16} className="text-[#00d4ff]" />
                <h3 className="text-xs font-black uppercase tracking-widest text-white">Enhance Your Experience</h3>
              </div>
              <div className="bg-white/5 border border-white/10 rounded-2xl p-6 flex flex-col md:flex-row md:items-center justify-between gap-6 transition-all hover:border-[#00d4ff]/30">
                <div className="space-y-1">
                  <h4 className="text-sm font-bold text-white uppercase tracking-tight">Extra Wireless Controller</h4>
                  <p className="text-[10px] text-gray-500 font-mono">₹{extraControllerRate}/DAY PER UNIT // MAX 3</p>
                </div>
                <div className="flex items-center gap-6">
                  <div className="flex items-center gap-4 bg-black/40 p-2 rounded-xl border border-white/10">
                    <button
                      onClick={() => updateExtraControllers(-1)}
                      className="text-gray-500 hover:text-white transition-colors"
                      disabled={state.addons.extraControllers === 0}
                    >
                      <MinusCircle size={20} />
                    </button>
                    <span className="w-4 text-center font-black text-[#00d4ff] font-mono">{state.addons.extraControllers}</span>
                    <button
                      onClick={() => updateExtraControllers(1)}
                      className="text-gray-500 hover:text-[#00d4ff] transition-colors"
                      disabled={state.addons.extraControllers === 3}
                    >
                      <PlusCircle size={20} />
                    </button>
                  </div>
                  {state.addons.extraControllers > 0 && (
                    <div className="text-right">
                      <span className="text-[10px] font-mono text-emerald-500 block">+ ₹{state.addons.extraControllers * extraControllerRate} / Day</span>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>

        <div className="mt-12 pt-12 border-t border-white/5 grid grid-cols-1 md:grid-cols-3 gap-8">
          <div className="space-y-2">
            <div className="flex items-center gap-2 text-[#00d4ff]">
              <ShieldCheck size={18} />
              <span className="text-xs font-bold uppercase tracking-widest">Deposit Policy</span>
            </div>
            <p className="text-xs text-gray-400 leading-relaxed">
              A refundable deposit of {formatCurrency(console.deposit)} is required. Released within 3 days of return.
            </p>
          </div>
          <div className="space-y-2">
            <div className="flex items-center gap-2 text-amber-500">
              <Clock size={18} />
              <span className="text-xs font-bold uppercase tracking-widest">Late Fees</span>
            </div>
            <p className="text-xs text-gray-400 leading-relaxed">
              Returned late? A fee of ₹15/day applies. Please notify us 24h in advance for extensions.
            </p>
          </div>
          <div className="space-y-2">
            <div className="flex items-center gap-2 text-[#A855F7]">
              <Info size={18} />
              <span className="text-xs font-bold uppercase tracking-widest">Max Duration</span>
            </div>
            <p className="text-xs text-gray-400 leading-relaxed">
              Standard rentals are capped at 30 days. Contact us for long-term corporate leasing.
            </p>
          </div>
        </div>
      </div>

      <div className="flex justify-end">
        <button
          onClick={onNext}
          className="group relative px-12 py-5 bg-[#00d4ff] text-black font-black uppercase tracking-widest text-sm rounded-2xl overflow-hidden transition-all hover:shadow-[0_0_30px_rgba(0,212,255,0.4)]"
        >
          <span className="relative z-10 flex items-center gap-2">
            Looks Good — Continue <ChevronRight size={20} className="group-hover:translate-x-1 transition-transform" />
          </span>
          <div className="absolute inset-0 bg-white/20 translate-x-[-100%] group-hover:translate-x-[100%] transition-transform duration-700 skew-x-12" />
        </button>
      </div>
    </motion.div>
  );
}

function Step2DurationDates({ state, setState, onNext, onBack }: { state: BookingState, setState: any, onNext: () => void, onBack: () => void }) {
  const [hoverDate, setHoverDate] = useState<Date | null>(null);
  const today = startOfToday();
  const [viewDate, setViewDate] = useState(startOfMonth(today));

  const monthStart = startOfMonth(viewDate);
  const monthEnd = endOfMonth(monthStart);
  const calendarStartDate = startOfWeek(monthStart);
  const calendarEndDate = endOfWeek(monthEnd);

  const calendarDays = eachDayOfInterval({
    start: calendarStartDate,
    end: calendarEndDate
  });

  const handleDateClick = (date: Date) => {
    if (isBefore(date, today)) return;

    // Mapping plan types to day counts
    const planDurations = {
      weekly: 7,
      weekend: 3,
      daily: 0 // daily is special, manual range
    };

    const currentDurationType = state.duration.type;

    if (currentDurationType === 'daily') {
      // Original manual logic for 'daily' mode
      if (!state.duration.startDate || (state.duration.startDate && state.duration.endDate)) {
        setState((prev: BookingState) => ({
          ...prev,
          duration: { ...prev.duration, startDate: date, endDate: null, totalDays: 0 }
        }));
      } else {
        if (isBefore(date, state.duration.startDate)) {
          setState((prev: BookingState) => ({
            ...prev,
            duration: { ...prev.duration, startDate: date, endDate: null, totalDays: 0 }
          }));
        } else {
          const days = differenceInDays(date, state.duration.startDate) + 1;
          setState((prev: BookingState) => ({
            ...prev,
            duration: { ...prev.duration, endDate: date, totalDays: days }
          }));
        }
      }
    } else {
      // Fixed plan logic: Clicking a date sets start AND calculates end based on plan duration
      const daysToAdd = planDurations[currentDurationType as keyof typeof planDurations] - 1;
      const calculatedEnd = addDays(date, daysToAdd);

      setState((prev: BookingState) => ({
        ...prev,
        duration: {
          ...prev.duration,
          startDate: date,
          endDate: calculatedEnd,
          totalDays: planDurations[currentDurationType as keyof typeof planDurations]
        }
      }));
    }
  };

  const isInRange = (date: Date) => {
    if (!state.duration.startDate || !state.duration.endDate) return false;
    return date >= state.duration.startDate && date <= state.duration.endDate;
  };

  const isSelected = (date: Date) => {
    return (state.duration.startDate && isSameDay(date, state.duration.startDate)) ||
      (state.duration.endDate && isSameDay(date, state.duration.endDate));
  };

  const durationTypes = [
    { id: 'daily', label: 'Daily', days: 1 },
    { id: 'weekend', label: 'Weekend', days: 3 },
    { id: 'weekly', label: 'Weekly', days: 7 }
  ];

  return (
    <motion.div
      initial={{ opacity: 0, x: 20 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: -20 }}
      className="space-y-8"
    >
      <div className="bg-[#0a0f1e] border border-white/10 rounded-3xl p-8">
        <div className="space-y-8">
          {/* Custom Duration Type */}
          <div className="space-y-4">
            <h3 className="text-[10px] font-black uppercase tracking-[0.2em] text-gray-500">Select Booking Duration</h3>
            <div className="flex flex-wrap gap-3">
              {durationTypes.map(type => (
                <button
                  key={type.id}
                  onClick={() => {
                    const planDays = type.days;

                    setState((prev: BookingState) => {
                      const newDuration = { ...prev.duration, type: type.id as any };

                      // If customer has already picked a start date, immediately auto-recalculate the range for the new plan
                      if (prev.duration.startDate && type.id !== 'daily') {
                        newDuration.endDate = addDays(prev.duration.startDate, planDays - 1);
                        newDuration.totalDays = planDays;
                      } else if (type.id === 'daily') {
                        // Reset range when switching to manual daily mode to prevent confusion
                        newDuration.endDate = null;
                        newDuration.totalDays = 0;
                      }

                      return { ...prev, duration: newDuration };
                    });
                  }}
                  className={cn(
                    "px-6 py-3 rounded-xl font-bold uppercase tracking-widest text-xs border transition-all",
                    state.duration.type === type.id
                      ? "bg-[#00d4ff] text-black border-[#00d4ff] shadow-[0_0_15px_rgba(0,212,255,0.3)]"
                      : "bg-white/5 text-gray-400 border-white/10 hover:border-white/30"
                  )}
                >
                  {type.label}
                </button>
              ))}
            </div>
          </div>

          {/* Pick Your Dates */}
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-[10px] font-black uppercase tracking-[0.2em] text-gray-500">Pick Your Dates</h3>
              <div className="flex items-center gap-4">
                <div className="flex items-center gap-2">
                  <div className="w-2 h-2 rounded-full bg-green-500" />
                  <span className="text-[10px] font-bold text-gray-500 uppercase tracking-widest">Available</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-2 h-2 rounded-full bg-red-500" />
                  <span className="text-[10px] font-bold text-gray-500 uppercase tracking-widest">Booked</span>
                </div>
              </div>
            </div>

            <div className="bg-black/40 border border-white/5 rounded-2xl p-6">
              <div className="flex items-center justify-between mb-6 px-2">
                <button
                  onClick={() => setViewDate(subMonths(viewDate, 1))}
                  className="p-2 hover:bg-white/10 rounded-lg transition-colors text-gray-400 hover:text-white"
                >
                  <ChevronLeft size={20} />
                </button>
                <h4 className="text-sm font-black uppercase tracking-[0.3em] text-white">
                  {format(viewDate, 'MMMM yyyy')}
                </h4>
                <button
                  onClick={() => setViewDate(addMonths(viewDate, 1))}
                  className="p-2 hover:bg-white/10 rounded-lg transition-colors text-gray-400 hover:text-white"
                >
                  <ChevronRight size={20} />
                </button>
              </div>

              <div className="grid grid-cols-7 gap-2 mb-4">
                {['SUN', 'MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT'].map(day => (
                  <div key={day} className="text-center text-[10px] font-black text-gray-600 py-2">{day}</div>
                ))}
              </div>
              <div className="grid grid-cols-7 gap-2">
                {calendarDays.map((date, i) => {
                  const isPast = isBefore(date, today);
                  const isToday = isSameDay(date, today);
                  const isCurrentMonth = isSameMonth(date, monthStart);
                  const selected = isSelected(date);
                  const inRange = isInRange(date);
                  const isBooked = i % 12 === 0 && i > 10; // Mock booked dates

                  return (
                    <button
                      key={i}
                      disabled={isPast || isBooked || !isCurrentMonth}
                      onClick={() => handleDateClick(date)}
                      onMouseEnter={() => setHoverDate(date)}
                      onMouseLeave={() => setHoverDate(null)}
                      className={cn(
                        "aspect-square rounded-xl flex flex-col items-center justify-center relative transition-all duration-200",
                        (isPast || !isCurrentMonth) ? "opacity-20 cursor-not-allowed" : "hover:scale-110",
                        isBooked ? "bg-red-500/10 text-red-500 cursor-not-allowed border border-red-500/20" : "bg-white/5 text-white",
                        isToday && !selected && "border border-[#00d4ff]/50",
                        selected ? "bg-[#00d4ff] text-black z-10 shadow-[0_0_15px_rgba(0,212,255,0.5)]" : "",
                        inRange ? "bg-[#00d4ff]/20 text-[#00d4ff]" : ""
                      )}
                    >
                      <span className="text-sm font-bold">{format(date, 'd')}</span>
                      {isToday && <div className="absolute bottom-1 w-1 h-1 rounded-full bg-[#00d4ff]" />}
                    </button>
                  );
                })}
              </div>
            </div>
          </div>

          {/* Time Slot */}
          <div className="space-y-4">
            <h3 className="text-[10px] font-black uppercase tracking-[0.2em] text-gray-500">Preferred Pickup/Delivery Time</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {['10:00 AM - 12:00 PM', '12:00 PM - 02:00 PM', '02:00 PM - 04:00 PM', '04:00 PM - 06:00 PM'].map(slot => (
                <button
                  key={slot}
                  onClick={() => setState((prev: BookingState) => ({ ...prev, duration: { ...prev.duration, timeSlot: slot } }))}
                  className={cn(
                    "p-4 rounded-xl border text-left transition-all",
                    state.duration.timeSlot === slot
                      ? "bg-[#00d4ff]/10 border-[#00d4ff] text-[#00d4ff]"
                      : "bg-white/5 border-white/10 text-gray-400 hover:border-white/30"
                  )}
                >
                  <span className="text-sm font-bold">{slot}</span>
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>

      <div className="flex justify-between">
        <button
          onClick={onBack}
          className="px-8 py-4 bg-white/5 text-white font-bold uppercase tracking-widest text-xs rounded-xl border border-white/10 hover:bg-white/10 transition-all"
        >
          Back
        </button>
        <button
          onClick={onNext}
          disabled={!state.duration.startDate || !state.duration.endDate}
          className="px-12 py-4 bg-[#00d4ff] text-black font-black uppercase tracking-widest text-xs rounded-xl transition-all hover:shadow-[0_0_20px_rgba(0,212,255,0.4)] disabled:opacity-50 disabled:cursor-not-allowed"
        >
          Continue
        </button>
      </div>
    </motion.div>
  );
}

function Step3DeliveryOptions({ state, setState, onNext, onBack, kycStatus, kycAddress, isFirstBooking }: {
  state: BookingState,
  setState: any,
  onNext: () => void,
  onBack: () => void,
  kycStatus?: string,
  kycAddress?: string,
  isFirstBooking: boolean
}) {
  const isKycApproved = kycStatus === 'APPROVED';

  useEffect(() => {
    if (state.delivery.method === 'delivery' && isKycApproved && kycAddress) {
      setState((prev: BookingState) => ({
        ...prev,
        delivery: { ...prev.delivery, address: kycAddress }
      }));
    }
  }, [state.delivery.method, isKycApproved, kycAddress]);

  return (
    <motion.div
      initial={{ opacity: 0, x: 20 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: -20 }}
      className="space-y-8"
    >
      <div className="bg-[#0a0f1e] border border-white/10 rounded-3xl p-8">
        <div className="space-y-8">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <button
              onClick={() => {
                if (isFirstBooking) {
                  alert("Security Protocol: First-time rentals are restricted to Home Delivery for identity verification.");
                } else {
                  setState((prev: BookingState) => ({ ...prev, delivery: { ...prev.delivery, method: 'pickup' } }));
                }
              }}
              className={cn(
                "p-8 rounded-2xl border text-left transition-all group relative overflow-hidden",
                state.delivery.method === 'pickup'
                  ? "bg-[#00d4ff]/10 border-[#00d4ff] text-[#00d4ff]"
                  : "bg-white/5 border-white/10 text-gray-400 hover:border-white/30",
                isFirstBooking && "opacity-50 grayscale cursor-not-allowed hover:border-white/10"
              )}
            >
              <Store size={32} className="mb-4" />
              <div className="flex justify-between items-start">
                <h4 className="text-xl font-black uppercase tracking-tight mb-2">Store Pickup</h4>
                {isFirstBooking && (
                  <span className="text-[9px] font-black bg-red-500/20 text-red-500 px-2 py-0.5 rounded border border-red-500/30 uppercase tracking-widest">Locked</span>
                )}
              </div>
              <p className="text-xs leading-relaxed opacity-70">
                {isFirstBooking ? "Restricted for first-time deployments." : "Pick up from our central hub. Free of charge."}
              </p>
              <div className="mt-4 pt-4 border-t border-white/10 flex items-center gap-2">
                <span className="text-[10px] font-black uppercase tracking-widest">Free</span>
              </div>
            </button>

            <button
              onClick={() => {
                if (isKycApproved) {
                  setState((prev: BookingState) => ({ ...prev, delivery: { ...prev.delivery, method: 'delivery' } }));
                } else {
                  alert("KYC Verification Required for Home Delivery. Please verify your identity first.");
                }
              }}
              className={cn(
                "p-8 rounded-2xl border text-left transition-all group relative overflow-hidden",
                state.delivery.method === 'delivery'
                  ? "bg-[#00d4ff]/10 border-[#00d4ff] text-[#00d4ff]"
                  : "bg-white/5 border-white/10 text-gray-400 hover:border-white/30",
                !isKycApproved && "opacity-50 grayscale hover:border-white/10 cursor-not-allowed"
              )}
            >
              <Truck size={32} className="mb-4" />
              <h4 className="text-xl font-black uppercase tracking-tight mb-2">Home Delivery</h4>
              <p className="text-xs leading-relaxed opacity-70">We bring the game to your doorstep. Same-day available.</p>
              {!isKycApproved && (
                <div className="mt-2 text-[10px] text-amber-500 font-bold uppercase tracking-widest flex items-center gap-1">
                  <ShieldCheck size={12} />
                  KYC Required
                </div>
              )}
              <div className="mt-4 pt-4 border-t border-white/10 flex items-center gap-2">
                <span className="text-[10px] font-black uppercase tracking-widest">+₹9.99</span>
              </div>
            </button>
          </div>

          <div className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-2">
                <label className="text-[10px] font-black uppercase tracking-[0.2em] text-gray-500">Contact Phone</label>
                <div className="relative">
                  <Phone size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-500" />
                  <input
                    type="tel"
                    placeholder="+1 (555) 000-0000"
                    value={state.delivery.phone}
                    onChange={(e) => setState((prev: BookingState) => ({ ...prev, delivery: { ...prev.delivery, phone: e.target.value } }))}
                    className="w-full bg-black/40 border border-white/10 rounded-xl py-4 pl-12 pr-4 text-sm focus:border-[#00d4ff] focus:ring-1 focus:ring-[#00d4ff] outline-none transition-all"
                  />
                </div>
              </div>
              <div className="space-y-2">
                <label className="text-[10px] font-black uppercase tracking-[0.2em] text-gray-500">Delivery Address</label>
                <div className="relative">
                  <MapPin size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-500" />
                  <input
                    type="text"
                    readOnly={state.delivery.method === 'pickup' || isKycApproved}
                    placeholder={state.delivery.method === 'pickup' ? "Store Location (Auto-filled)" : "Enter your full address"}
                    disabled={state.delivery.method === 'pickup' || (!isKycApproved && state.delivery.method === 'delivery')}
                    value={state.delivery.method === 'pickup' ? "123 Gaming Hub, Tech District" : (isKycApproved ? kycAddress : state.delivery.address)}
                    onChange={(e) => !isKycApproved && setState((prev: BookingState) => ({ ...prev, delivery: { ...prev.delivery, address: e.target.value } }))}
                    className={cn(
                      "w-full bg-black/40 border border-white/10 rounded-xl py-4 pl-12 pr-4 text-sm focus:border-[#00d4ff] focus:ring-1 focus:ring-[#00d4ff] outline-none transition-all",
                      (state.delivery.method === 'pickup' || isKycApproved) && "opacity-70 cursor-not-allowed bg-white/5"
                    )}
                  />
                </div>
                {isKycApproved && state.delivery.method === 'delivery' && (
                  <p className="text-[9px] text-emerald-500 font-mono uppercase tracking-widest mt-1">Verified KYC Address Locked</p>
                )}
              </div>
            </div>

            <div className="space-y-2">
              <label className="text-[10px] font-black uppercase tracking-[0.2em] text-gray-500">Access Notes / Apartment #</label>
              <textarea
                placeholder="Gate codes, floor number, or specific instructions..."
                value={state.delivery.notes}
                onChange={(e) => setState((prev: BookingState) => ({ ...prev, delivery: { ...prev.delivery, notes: e.target.value } }))}
                className="w-full bg-black/40 border border-white/10 rounded-xl py-4 px-4 text-sm focus:border-[#00d4ff] focus:ring-1 focus:ring-[#00d4ff] outline-none transition-all h-24 resize-none"
              />
            </div>
          </div>
        </div>
      </div>

      <div className="flex justify-between">
        <button
          onClick={onBack}
          className="px-8 py-4 bg-white/5 text-white font-bold uppercase tracking-widest text-xs rounded-xl border border-white/10 hover:bg-white/10 transition-all"
        >
          Back
        </button>
        <button
          onClick={onNext}
          disabled={!state.delivery.phone || (state.delivery.method === 'delivery' && !state.delivery.address)}
          className="px-12 py-4 bg-[#00d4ff] text-black font-black uppercase tracking-widest text-xs rounded-xl transition-all hover:shadow-[0_0_20px_rgba(0,212,255,0.4)] disabled:opacity-50 disabled:cursor-not-allowed"
        >
          Continue
        </button>
      </div>
    </motion.div>
  );
}

function Step4Payment({ state, setState, totals, onNext, onBack }: { state: BookingState, setState: any, totals: any, onNext: () => void, onBack: () => void }) {
  const [couponInput, setCouponInput] = useState('');
  const [isApplying, setIsApplying] = useState(false);

  const applyCoupon = () => {
    setIsApplying(true);
    setTimeout(() => {
      if (couponInput.toUpperCase() === 'GAMER20') {
        setState((prev: BookingState) => ({ ...prev, payment: { ...prev.payment, couponCode: 'GAMER20', discount: 20 } }));
      }
      setIsApplying(false);
    }, 800);
  };

  return (
    <motion.div
      initial={{ opacity: 0, x: 20 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: -20 }}
      className="space-y-8"
    >
      <div className="bg-[#0a0f1e] border border-white/10 rounded-3xl p-8">
        <div className="space-y-8">
          {/* Coupon */}
          <div className="space-y-4">
            <h3 className="text-[10px] font-black uppercase tracking-[0.2em] text-gray-500">Promo Code</h3>
            <div className="flex gap-3">
              <div className="relative flex-1">
                <Tag size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-500" />
                <input
                  type="text"
                  placeholder="Enter code (Try GAMER20)"
                  value={couponInput}
                  onChange={(e) => setCouponInput(e.target.value)}
                  className="w-full bg-black/40 border border-white/10 rounded-xl py-4 pl-12 pr-4 text-sm focus:border-[#00d4ff] focus:ring-1 focus:ring-[#00d4ff] outline-none transition-all"
                />
              </div>
              <button
                onClick={applyCoupon}
                disabled={isApplying || !couponInput}
                className="px-8 bg-white/5 border border-white/10 rounded-xl text-xs font-black uppercase tracking-widest hover:bg-white/10 transition-all disabled:opacity-50"
              >
                {isApplying ? '...' : 'Apply'}
              </button>
            </div>
            {state.payment.couponCode && (
              <div className="flex items-center gap-2 text-green-500 text-[10px] font-bold uppercase tracking-widest">
                <Check size={12} />
                Code Applied: {state.payment.couponCode} (20% OFF)
              </div>
            )}
          </div>

          {/* Deposit Info */}
          <div className="bg-amber-500/10 border border-amber-500/20 rounded-2xl p-6 flex gap-4">
            <div className="w-10 h-10 rounded-full bg-amber-500/20 flex items-center justify-center text-amber-500 shrink-0">
              <ShieldCheck size={20} />
            </div>
            <div className="space-y-1">
              <h4 className="text-sm font-black uppercase tracking-tight text-amber-500">Refundable Deposit</h4>
              <p className="text-xs text-amber-500/80 leading-relaxed">
                A {formatCurrency(totals.deposit)} refundable deposit will be held and released within 3 business days of return. This is charged separately from your rental fee.
              </p>
            </div>
          </div>

          {/* Terms */}
          <label className="flex items-start gap-3 cursor-pointer group">
            <div className="relative mt-1">
              <input
                type="checkbox"
                checked={state.payment.termsAccepted}
                onChange={(e) => setState((prev: BookingState) => ({ ...prev, payment: { ...prev.payment, termsAccepted: e.target.checked } }))}
                className="sr-only"
              />
              <div className={cn(
                "w-5 h-5 rounded border transition-all flex items-center justify-center",
                state.payment.termsAccepted ? "bg-[#00d4ff] border-[#00d4ff]" : "bg-white/5 border-white/20 group-hover:border-white/40"
              )}>
                {state.payment.termsAccepted && <Check size={14} className="text-black" strokeWidth={4} />}
              </div>
            </div>
            <span className="text-xs text-gray-400 leading-relaxed">
              I agree to the <button className="text-[#00d4ff] hover:underline">Rental Terms & Conditions</button> and the <button className="text-[#00d4ff] hover:underline">Late Fee Policy</button>.
            </span>
          </label>
        </div>
      </div>

      <div className="flex justify-between">
        <button
          onClick={onBack}
          className="px-8 py-4 bg-white/5 text-white font-bold uppercase tracking-widest text-xs rounded-xl border border-white/10 hover:bg-white/10 transition-all"
        >
          Back
        </button>
        <button
          onClick={onNext}
          disabled={!state.payment.termsAccepted}
          className="px-12 py-4 bg-[#00d4ff] text-black font-black uppercase tracking-widest text-xs rounded-xl transition-all hover:shadow-[0_0_20px_rgba(0,212,255,0.4)] disabled:opacity-50 disabled:cursor-not-allowed"
        >
          Pay with Razorpay — {formatCurrency(totals.totalDue)}
        </button>
      </div>
    </motion.div>
  );
}

function OrderSummary({ console, state, totals, onNext, currentStep, user }: { console: RentalConsole, state: BookingState, totals: any, onNext: () => void, currentStep: number, user: any }) {
  return (
    <div className="bg-[#0a0f1e] border border-white/10 rounded-3xl overflow-hidden shadow-2xl">
      <div className="p-8 space-y-6">
        <div className="flex gap-4">
          <div className="w-20 h-20 rounded-xl overflow-hidden bg-black/40 border border-white/5 shrink-0">
            <img src={console.image} alt={console.name} className="w-full h-full object-cover" referrerPolicy="no-referrer" />
          </div>
          <div className="flex-1">
            <h4 className="text-sm font-bold text-white leading-tight">{console.name}</h4>
            <p className="text-xs text-gray-500 mt-1">{formatCurrency(console.dailyRate)} / Day</p>
          </div>
        </div>

        <div className="space-y-3 pt-4 border-t border-white/5">
          <div className="flex justify-between text-xs">
            <span className="text-gray-400">Duration</span>
            <span className="text-white font-bold">
              {state.duration.totalDays > 0 ? `${state.duration.totalDays} Days` : 'Not selected'}
            </span>
          </div>
          <div className="flex justify-between text-xs">
            <span className="text-gray-400">Dates</span>
            <span className="text-white font-bold">
              {state.duration.startDate ? format(state.duration.startDate, 'MMM d') : '-'}
              {state.duration.endDate ? ` — ${format(state.duration.endDate, 'MMM d')}` : ''}
            </span>
          </div>
          <div className="flex justify-between text-xs">
            <span className="text-gray-400">Delivery</span>
            <span className="text-white font-bold capitalize">{state.delivery.method}</span>
          </div>
          {state.delivery.phone && (
            <div className="flex justify-between text-xs">
              <span className="text-gray-400">Contact</span>
              <span className="text-white font-bold">{state.delivery.phone}</span>
            </div>
          )}
          {state.delivery.method === 'delivery' && (state.delivery.address || state.delivery.notes) && (
            <div className="pt-2">
              <div className="text-[10px] text-gray-500 font-black uppercase tracking-widest mb-1">Shipping Destination</div>
              <div className="text-[11px] text-gray-300 bg-white/5 p-3 rounded-lg border border-white/5 leading-relaxed">
                <p className="font-bold text-white mb-1">{state.delivery.address || 'Address pending...'}</p>
                {state.delivery.notes && <p className="opacity-60 italic">Note: {state.delivery.notes}</p>}
              </div>
            </div>
          )}
          {state.delivery.method === 'delivery' && (
            <div className="flex items-center gap-2 mt-2 py-2 px-3 bg-emerald-500/10 border border-emerald-500/20 rounded-lg">
              <div className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
              <span className="text-[9px] font-black text-emerald-400 uppercase tracking-tighter">Live Location Tracking Enabled</span>
            </div>
          )}
        </div>

        <div className="space-y-3 pt-6 border-t border-white/5">
          <div className="flex justify-between text-sm">
            <span className="text-gray-400">Rental Cost</span>
            <span className="text-white font-bold">{formatCurrency(totals.rentalCost)}</span>
          </div>
          <div className="flex justify-between text-sm">
            <span className="text-gray-400">Delivery Fee</span>
            <span className="text-white font-bold">{formatCurrency(totals.deliveryFee)}</span>
          </div>
          {totals.addonsCost > 0 && (
            <div className="flex justify-between text-sm">
              <span className="text-gray-400">Addons (Controllers)</span>
              <span className="text-white font-bold">{formatCurrency(totals.addonsCost)}</span>
            </div>
          )}
          {totals.discountAmount > 0 && (
            <div className="flex justify-between text-sm text-green-500">
              <span>Discount</span>
              <span className="font-bold">-{formatCurrency(totals.discountAmount)}</span>
            </div>
          )}
          <div className="flex justify-between text-sm">
            <span className="text-gray-400">Refundable Deposit</span>
            <span className="text-white font-bold">{formatCurrency(totals.deposit)}</span>
          </div>
        </div>

        <div className="pt-6 border-t border-white/10">
          <div className="flex justify-between items-end">
            <span className="text-[10px] font-black uppercase tracking-widest text-gray-500">Total Due</span>
            <span className="text-3xl font-black text-[#00d4ff] tracking-tighter">{formatCurrency(totals.totalDue)}</span>
          </div>
        </div>

        <button
          onClick={onNext}
          disabled={
            (currentStep === 2 && (!state.duration.startDate || !state.duration.endDate)) ||
            (currentStep === 3 && (!state.delivery.phone || (state.delivery.method === 'delivery' && !state.delivery.address))) ||
            (currentStep === 4 && !state.payment.termsAccepted)
          }
          className="w-full py-5 bg-[#00d4ff] text-black font-black uppercase tracking-widest text-sm rounded-2xl transition-all hover:shadow-[0_0_30px_rgba(0,212,255,0.4)] disabled:opacity-50 disabled:cursor-not-allowed mt-4"
        >
          {currentStep === 4 ? 'Pay with Razorpay' : 'Continue'}
        </button>
      </div>

      <div className="bg-white/5 p-6 space-y-3">
        <div className="flex items-center gap-3 text-[10px] font-bold uppercase tracking-widest text-gray-400">
          <ShieldCheck size={14} className="text-green-500" />
          <span>Secure Payment Processing</span>
        </div>
        <div className="flex items-center gap-3 text-[10px] font-bold uppercase tracking-widest text-gray-400">
          <Check size={14} className="text-green-500" />
          <span>Refundable Deposit</span>
        </div>
        <div className="flex items-center gap-3 text-[10px] font-bold uppercase tracking-widest text-gray-400">
          <Check size={14} className="text-green-500" />
          <span>Free Cancellation (24h)</span>
        </div>
      </div>
    </div>
  );
}

function Mail(props: any) {
  return (
    <svg
      {...props}
      xmlns="http://www.w3.org/2000/svg"
      width="24"
      height="24"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <rect width="20" height="16" x="2" y="4" rx="2" />
      <path d="m22 7-8.97 5.7a1.94 1.94 0 0 1-2.06 0L2 7" />
    </svg>
  )
}
