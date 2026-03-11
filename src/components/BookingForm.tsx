import React, { useState } from 'react';
import { Calendar, CreditCard } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

const BookingForm = () => {
  const [step, setStep] = useState(1);
  const { user } = useAuth();
  const navigate = useNavigate();
  const [formData, setFormData] = useState({
    startDate: '',
    endDate: '',
    consoleType: 'ps5',
    games: [],
    name: '',
    email: '',
    phone: ''
  });

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const getDays = () => {
    if (!formData.startDate || !formData.endDate) return 1;
    const start = new Date(formData.startDate);
    const end = new Date(formData.endDate);
    return Math.max(1, Math.ceil((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24)));
  };

  const getPrice = () => {
    const prices: Record<string, number> = {
      'ps5': 500,
      'xbox': 450,
      'switch': 350,
      'ps4': 300
    };
    return prices[formData.consoleType] || 500;
  };

  const nextStep = () => {
    if (step === 2) {
      if (!user) {
        navigate('/login?redirect=/book');
        return;
      }
      if (user.kyc_status !== 'APPROVED') {
        sessionStorage.setItem('redirectAfterKYC', '/book');
        navigate('/dashboard/kyc');
        return;
      }
    }
    setStep(prev => prev + 1);
  };
  const prevStep = () => setStep(prev => prev - 1);

  return (
    <div className="bg-[#111] p-6 rounded-2xl border border-white/10 shadow-xl">
      <div className="mb-8">
        <h2 className="text-2xl font-bold text-white mb-2">Book Your Console</h2>
        <div className="flex items-center space-x-2 text-sm text-gray-400">
          <span className={`flex items-center ${step >= 1 ? 'text-[#A855F7]' : ''}`}>
            <span className="w-6 h-6 rounded-full border border-current flex items-center justify-center mr-2 text-xs">1</span>
            Details
          </span>
          <div className="w-8 h-px bg-white/10"></div>
          <span className={`flex items-center ${step >= 2 ? 'text-[#A855F7]' : ''}`}>
            <span className="w-6 h-6 rounded-full border border-current flex items-center justify-center mr-2 text-xs">2</span>
            Info
          </span>
          <div className="w-8 h-px bg-white/10"></div>
          <span className={`flex items-center ${step >= 3 ? 'text-[#A855F7]' : ''}`}>
            <span className="w-6 h-6 rounded-full border border-current flex items-center justify-center mr-2 text-xs">3</span>
            Confirm
          </span>
        </div>
      </div>

      {step === 1 && (
        <div className="space-y-6">
          <div>
            <label className="block text-sm font-medium text-gray-400 mb-2">Select Console</label>
            <select
              name="consoleType"
              value={formData.consoleType}
              onChange={handleInputChange}
              className="w-full bg-black/50 border border-white/10 rounded-lg p-3 text-white focus:border-[#A855F7] focus:outline-none transition-colors"
            >
              <option value="ps5">PlayStation 5</option>
              <option value="xbox">Xbox Series X</option>
              <option value="switch">Nintendo Switch OLED</option>
            </select>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-400 mb-2">Start Date</label>
              <div className="relative">
                <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" />
                <input
                  type="date"
                  name="startDate"
                  value={formData.startDate}
                  onChange={handleInputChange}
                  className="w-full bg-black/50 border border-white/10 rounded-lg p-3 pl-10 text-white focus:border-[#A855F7] focus:outline-none transition-colors"
                />
              </div>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-400 mb-2">End Date</label>
              <div className="relative">
                <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" />
                <input
                  type="date"
                  name="endDate"
                  value={formData.endDate}
                  onChange={handleInputChange}
                  className="w-full bg-black/50 border border-white/10 rounded-lg p-3 pl-10 text-white focus:border-[#A855F7] focus:outline-none transition-colors"
                />
              </div>
            </div>
          </div>

          <button
            onClick={nextStep}
            className="w-full bg-[#A855F7] hover:bg-[#9333EA] text-white font-bold py-3 rounded-lg transition-colors flex items-center justify-center"
          >
            Continue
          </button>
        </div>
      )}

      {step === 2 && (
        <div className="space-y-6">
          <div>
            <label className="block text-sm font-medium text-gray-400 mb-2">Full Name</label>
            <input
              type="text"
              name="name"
              value={formData.name}
              onChange={handleInputChange}
              placeholder="John Doe"
              className="w-full bg-black/50 border border-white/10 rounded-lg p-3 text-white focus:border-[#A855F7] focus:outline-none transition-colors"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-400 mb-2">Email Address</label>
            <input
              type="email"
              name="email"
              value={formData.email}
              onChange={handleInputChange}
              placeholder="john@example.com"
              className="w-full bg-black/50 border border-white/10 rounded-lg p-3 text-white focus:border-[#A855F7] focus:outline-none transition-colors"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-400 mb-2">Phone Number</label>
            <input
              type="tel"
              name="phone"
              value={formData.phone}
              onChange={handleInputChange}
              placeholder="+1 (555) 000-0000"
              className="w-full bg-black/50 border border-white/10 rounded-lg p-3 text-white focus:border-[#A855F7] focus:outline-none transition-colors"
            />
          </div>

          <div className="flex space-x-4">
            <button
              onClick={prevStep}
              className="w-1/3 bg-white/5 hover:bg-white/10 text-white font-bold py-3 rounded-lg transition-colors"
            >
              Back
            </button>
            <button
              onClick={nextStep}
              className="w-2/3 bg-[#A855F7] hover:bg-[#9333EA] text-white font-bold py-3 rounded-lg transition-colors"
            >
              {user?.kyc_status === 'APPROVED' ? 'Review Booking' : 'Verify Identity to Review'}
            </button>
          </div>
        </div>
      )}

      {step === 3 && (
        <div className="space-y-6">
          <div className="bg-white/5 rounded-lg p-4 space-y-3">
            <div className="flex justify-between text-sm">
              <span className="text-gray-400">Console</span>
              <span className="text-white font-medium capitalize">{formData.consoleType}</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-gray-400">Dates</span>
              <span className="text-white font-medium">{formData.startDate} - {formData.endDate}</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-gray-400">Duration</span>
              <span className="text-white font-medium">{getDays()} Days</span>
            </div>
            <div className="border-t border-white/10 pt-3 flex justify-between">
              <span className="text-gray-400">Total</span>
              <span className="text-[#A855F7] font-bold text-lg">₹{(getDays() * getPrice()).toFixed(2)}</span>
            </div>
          </div>

          <div className="flex space-x-4">
            <button
              onClick={prevStep}
              className="w-1/3 bg-white/5 hover:bg-white/10 text-white font-bold py-3 rounded-lg transition-colors"
            >
              Back
            </button>
            <button
              onClick={() => alert("Booking confirmed!")}
              className="w-2/3 bg-[#A855F7] hover:bg-[#9333EA] text-white font-bold py-3 rounded-lg transition-colors flex items-center justify-center"
            >
              <CreditCard className="w-4 h-4 mr-2" />
              Pay & Book
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default BookingForm;
