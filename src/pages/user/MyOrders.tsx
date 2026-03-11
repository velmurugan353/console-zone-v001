import { useState, useEffect } from 'react';
import { Package, Truck, CheckCircle, Clock } from 'lucide-react';
import { formatCurrency } from '../../lib/utils';
import { useAuth } from '../../context/AuthContext';
import { db } from '../../lib/firebase';
import { collection, query, where, onSnapshot, orderBy } from 'firebase/firestore';

export default function MyOrders() {
  const { user } = useAuth();
  const [orders, setOrders] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) return;

    const q = query(
      collection(db, 'orders'),
      where('userId', '==', user.id),
      orderBy('date', 'desc')
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const fetchedOrders = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));
      setOrders(fetchedOrders);
      setLoading(false);
    }, (error) => {
      console.error("Error fetching orders:", error);
      setLoading(false);
    });

    return () => unsubscribe();
  }, [user]);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-gaming-accent"></div>
      </div>
    );
  }

  if (orders.length === 0) {
    return (
      <div className="bg-gaming-card border border-gaming-border rounded-xl p-12 text-center">
        <Package className="h-12 w-12 text-gaming-muted mx-auto mb-4" />
        <h3 className="text-xl font-bold text-white mb-2">No orders found</h3>
        <p className="text-gaming-muted">You haven't placed any orders yet.</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold text-white">My Orders</h1>

      <div className="space-y-4">
        {orders.map((order) => (
          <div key={order.id} className="bg-gaming-card border border-gaming-border rounded-xl overflow-hidden">
            <div className="bg-gaming-bg/50 p-4 border-b border-gaming-border flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
              <div className="space-y-1">
                <p className="text-sm text-gaming-muted">Order Placed</p>
                <p className="text-white font-medium">{order.date}</p>
              </div>
              <div className="space-y-1">
                <p className="text-sm text-gaming-muted">Total</p>
                <p className="text-white font-medium">{formatCurrency(order.total)}</p>
              </div>
              <div className="space-y-1">
                <p className="text-sm text-gaming-muted">Order ID</p>
                <p className="text-white font-mono text-sm">#{order.id.slice(0, 8)}</p>
              </div>
              <div className="sm:ml-auto">
                <span className={`px-3 py-1 rounded-full text-sm font-medium flex items-center gap-2 ${order.status === 'delivered' ? 'bg-green-400/10 text-green-400' : 'bg-yellow-400/10 text-yellow-400'
                  }`}>
                  {order.status === 'delivered' ? <CheckCircle className="h-4 w-4" /> : <Clock className="h-4 w-4" />}
                  <span className="capitalize">{order.status}</span>
                </span>
              </div>
            </div>

            <div className="p-6">
              {order.items.map((item, index) => (
                <div key={index} className="flex items-center space-x-4">
                  <img src={item.image} alt={item.name} className="w-20 h-20 object-cover rounded-lg bg-gaming-bg" />
                  <div>
                    <h3 className="text-white font-bold">{item.name}</h3>
                    <p className="text-gaming-accent">{formatCurrency(item.price)}</p>
                  </div>
                  <button className="ml-auto px-4 py-2 bg-gaming-bg border border-gaming-border text-white rounded-lg hover:bg-gaming-border transition-colors text-sm">
                    View Product
                  </button>
                </div>
              ))}
            </div>

            <div className="bg-gaming-bg/30 p-4 border-t border-gaming-border flex justify-between items-center">
              <div className="flex items-center text-sm text-gaming-muted">
                <Truck className="h-4 w-4 mr-2" />
                {order.status === 'delivered' ? `Delivered on ${order.date}` : 'Awaiting fulfillment'}
              </div>
              <div className="flex space-x-3">
                <button className="text-sm text-gaming-muted hover:text-white underline">Invoice</button>
                <button className="text-sm text-gaming-muted hover:text-white underline">Track Order</button>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
