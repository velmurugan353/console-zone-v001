import { useCart } from '../context/CartContext';
import { formatCurrency } from '../lib/utils';
import { Trash2, ShoppingBag, ArrowRight } from 'lucide-react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { razorpayService } from '../services/razorpayService';
import { db } from '../lib/firebase';
import { collection, addDoc } from 'firebase/firestore';
import { automationService } from '../services/automationService';
import { useState } from 'react';

export default function Cart() {
  const { items, removeFromCart, cartTotal } = useCart();
  const { user } = useAuth();
  const navigate = useNavigate();

  // Address State
  const [address, setAddress] = useState({
    street: '',
    city: '',
    pincode: ''
  });

  const handleCheckout = () => {
    if (!user) {
      navigate('/login?redirect=/cart');
      return;
    }

    const hasRentals = items.some(item => item.type === 'rent');

    if (hasRentals && user.kyc_status !== 'APPROVED') {
      // Redirect to KYC but store intended destination
      sessionStorage.setItem('redirectAfterKYC', '/cart');
      navigate('/dashboard/kyc');
      return;
    }

    if (!address.street || !address.city || !address.pincode) {
      alert("Please enter a complete delivery address before checking out.");
      return;
    }

    const fullShippingAddress = `${address.street}, ${address.city}, ${address.pincode}`;

    // Proceed with Razorpay checkout
    razorpayService.openCheckout({
      amount: cartTotal * 100, // Razorpay expects amount in paise
      prefill: {
        name: user.name || '',
        email: user.email || ''
      },
      handler: async (response: any) => {
        console.log('Payment Successful:', response);
        try {
          // Record order in Firestore
          const orderData = {
            userId: user.id,
            customer: user.name || user.email,
            email: user.email,
            items: items,
            totalPrice: cartTotal, // Keeping for backward compatibility if any
            total: cartTotal, // Required by AdminOrders.tsx
            status: 'pending',
            paymentId: response.razorpay_payment_id,
            shippingAddress: fullShippingAddress,
            date: new Date().toISOString().split('T')[0],
            timeline: [
              { status: 'pending', timestamp: new Date().toLocaleString(), note: 'Order placed via matrix terminal' }
            ]
          };

          // Sanitize data to remove undefined values which Firestore rejects
          const sanitizedOrderData = JSON.parse(JSON.stringify(orderData));

          await addDoc(collection(db, 'orders'), sanitizedOrderData);

          // Trigger Automation & Notifications
          await automationService.handleOrderPlacement(
            { id: response.razorpay_payment_id, customerName: user.name || user.email, email: user.email, phone: '' },
            items.map((i: any) => ({ name: i.name, stock: 10, id: i.id }))
          );

          alert('Order placed successfully!');
          navigate('/dashboard');
        } catch (error: any) {
          console.error('Failed to record order:', error);
          alert(`Failed to record order: ${error.message || 'Unknown error'}. Please check your connection or contact support.`);
        }
      },
      modal: {
        ondismiss: () => {
          console.log('Checkout dismissed');
        }
      }
    });
  };

  if (items.length === 0) {
    return (
      <div className="max-w-7xl mx-auto px-4 py-20 text-center">
        <div className="w-20 h-20 bg-gaming-card rounded-full flex items-center justify-center mx-auto mb-6">
          <ShoppingBag className="h-10 w-10 text-gaming-muted" />
        </div>
        <h2 className="text-2xl font-bold text-white mb-4">Your cart is empty</h2>
        <p className="text-gaming-muted mb-8">Looks like you haven't added any gear yet.</p>
        <Link to="/shop">
          <button className="px-8 py-3 bg-gaming-accent text-black font-bold rounded-lg hover:bg-gaming-accent/90 transition-colors">
            Start Shopping
          </button>
        </Link>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
      <h1 className="text-3xl font-bold text-white mb-8">Your Shopping Cart</h1>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="lg:col-span-2 space-y-4">
          {items.map((item) => (
            <div key={`${item.id}-${item.type}`} className="bg-gaming-card border border-gaming-border rounded-xl p-4 flex items-center space-x-4">
              <div className="w-24 h-24 bg-gaming-bg rounded-lg overflow-hidden flex-shrink-0">
                <img src={item.image} alt={item.name} className="w-full h-full object-cover" />
              </div>

              <div className="flex-grow">
                <div className="flex justify-between items-start">
                  <div>
                    <h3 className="text-lg font-bold text-white">{item.name}</h3>
                    <div className="flex items-center space-x-2 mt-1">
                      <span className={`text-xs font-bold px-2 py-0.5 rounded uppercase ${item.type === 'rent' ? 'bg-gaming-secondary text-white' : 'bg-gaming-accent text-black'
                        }`}>
                        {item.type}
                      </span>
                      {item.type === 'rent' && (
                        <span className="text-sm text-gaming-muted">{item.rentalDuration} Days</span>
                      )}
                    </div>
                  </div>
                  <button
                    onClick={() => removeFromCart(item.id, item.type)}
                    className="text-gaming-muted hover:text-red-500 transition-colors"
                  >
                    <Trash2 className="h-5 w-5" />
                  </button>
                </div>

                <div className="flex justify-between items-end mt-4">
                  <span className="text-gaming-muted">Qty: {item.quantity}</span>
                  <div className="text-right">
                    <span className="block text-lg font-bold text-white">
                      {formatCurrency(
                        (item.type === 'rent' && item.rentalDuration
                          ? item.price * item.rentalDuration
                          : item.price) * item.quantity
                      )}
                    </span>
                    {item.type === 'rent' && (
                      <span className="text-xs text-gaming-muted">{formatCurrency(item.price)} / day</span>
                    )}
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>

        <div className="lg:col-span-1 space-y-6">
          <div className="bg-gaming-card border border-gaming-border rounded-xl p-6">
            <h3 className="text-xl font-bold text-white mb-6">Delivery Address</h3>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gaming-muted mb-1">Street Address</label>
                <input
                  type="text"
                  value={address.street}
                  onChange={(e) => setAddress({ ...address, street: e.target.value })}
                  className="w-full bg-gaming-bg border border-gaming-border rounded-lg px-4 py-2 text-white focus:outline-none focus:border-gaming-accent transition-colors"
                  placeholder="123 Gaming Street"
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gaming-muted mb-1">City</label>
                  <input
                    type="text"
                    value={address.city}
                    onChange={(e) => setAddress({ ...address, city: e.target.value })}
                    className="w-full bg-gaming-bg border border-gaming-border rounded-lg px-4 py-2 text-white focus:outline-none focus:border-gaming-accent transition-colors"
                    placeholder="Metropolis"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gaming-muted mb-1">Pincode</label>
                  <input
                    type="text"
                    value={address.pincode}
                    onChange={(e) => setAddress({ ...address, pincode: e.target.value })}
                    className="w-full bg-gaming-bg border border-gaming-border rounded-lg px-4 py-2 text-white focus:outline-none focus:border-gaming-accent transition-colors"
                    placeholder="10001"
                  />
                </div>
              </div>
            </div>
          </div>

          <div className="bg-gaming-card border border-gaming-border rounded-xl p-6 sticky top-24">
            <h3 className="text-xl font-bold text-white mb-6">Order Summary</h3>

            <div className="space-y-4 mb-6">
              <div className="flex justify-between text-gaming-muted">
                <span>Subtotal</span>
                <span>{formatCurrency(cartTotal)}</span>
              </div>
              <div className="flex justify-between text-gaming-muted">
                <span>Shipping</span>
                <span>Calculated at checkout</span>
              </div>
              <div className="flex justify-between text-gaming-muted">
                <span>Tax</span>
                <span>Calculated at checkout</span>
              </div>
              <div className="border-t border-gaming-border pt-4 flex justify-between">
                <span className="text-lg font-bold text-white">Total</span>
                <span className="text-2xl font-bold text-gaming-accent">{formatCurrency(cartTotal)}</span>
              </div>
            </div>

            <button
              onClick={handleCheckout}
              className="w-full py-4 bg-white text-black font-bold rounded-xl hover:bg-gray-200 transition-colors flex items-center justify-center relative group overflow-hidden"
            >
              <span className="relative z-10 flex items-center">
                {(!items.some(i => i.type === 'rent') || user?.kyc_status === 'APPROVED') ? 'Checkout' : 'Verify to Checkout'} <ArrowRight className="ml-2 h-5 w-5" />
              </span>
              {items.some(i => i.type === 'rent') && user?.kyc_status !== 'APPROVED' && (
                <div className="absolute inset-0 bg-[#B000FF]/10 translate-y-full group-hover:translate-y-0 transition-transform duration-300" />
              )}
            </button>

            {items.some(i => i.type === 'rent') && (!user || user.kyc_status !== 'APPROVED') ? (
              <p className="text-xs text-[#B000FF] font-bold text-center mt-4 tracking-widest uppercase">
                Rental KYC Required
              </p>
            ) : (
              <p className="text-xs text-gaming-muted text-center mt-4">
                Secure checkout powered by Razorpay
              </p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}


