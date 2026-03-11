import { useState, useEffect, useMemo } from 'react';
import {
  ShoppingBag,
  Gamepad2,
  Wrench,
  CreditCard,
  Clock,
  CheckCircle,
  AlertTriangle,
  Package
} from 'lucide-react';
import { formatCurrency } from '../../lib/utils';
import { useAuth } from '../../context/AuthContext';
import { db } from '../../lib/firebase';
import { collection, query, where, onSnapshot } from 'firebase/firestore';

export default function UserDashboard() {
  const { user } = useAuth();
  const [orders, setOrders] = useState<any[]>([]);
  const [rentals, setRentals] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) return;

    // Listen to orders
    const qOrders = query(collection(db, 'orders'), where('userId', '==', user.id));
    const unsubOrders = onSnapshot(qOrders, (snapshot) => {
      setOrders(snapshot.docs.map(doc => ({ id: doc.id, type: 'order', ...doc.data() })));
    });

    // Listen to rentals
    const qRentals = query(collection(db, 'rentals'), where('email', '==', user.email));
    const unsubRentals = onSnapshot(qRentals, (snapshot) => {
      setRentals(snapshot.docs.map(doc => ({ id: doc.id, type: 'rental', ...doc.data() })));
      setLoading(false);
    });

    return () => {
      unsubOrders();
      unsubRentals();
    };
  }, [user]);

  const stats = useMemo(() => {
    const activeRentals = rentals.filter(r => r.status === 'active').length;
    const pendingOrders = orders.filter(o => o.status === 'pending').length;
    const totalSpent = orders.reduce((acc, o) => acc + (o.total || 0), 0) +
      rentals.reduce((acc, r) => acc + (r.totalPrice || 0), 0);

    return [
      { label: 'Active Rentals', value: activeRentals.toString(), icon: Gamepad2, color: 'text-blue-400', bg: 'bg-blue-400/10' },
      { label: 'Pending Orders', value: pendingOrders.toString(), icon: ShoppingBag, color: 'text-green-400', bg: 'bg-green-400/10' },
      { label: 'Repair Status', value: 'N/A', icon: Wrench, color: 'text-yellow-400', bg: 'bg-yellow-400/10' },
      { label: 'Total Spent', value: formatCurrency(totalSpent), icon: CreditCard, color: 'text-purple-400', bg: 'bg-purple-400/10' },
    ];
  }, [orders, rentals]);

  const recentActivity = useMemo(() => {
    const combined = [
      ...orders.map(o => ({
        id: o.id,
        type: 'order',
        title: `Order #${o.id.slice(0, 8)}`,
        date: o.date || 'Recently',
        status: o.status,
        amount: o.total || 0,
        timestamp: new Date(o.date || 0).getTime()
      })),
      ...rentals.map(r => ({
        id: r.id,
        type: 'rental',
        title: `${r.product} Rental`,
        date: r.startDate || 'Recently',
        status: r.status,
        amount: r.totalPrice || 0,
        timestamp: new Date(r.startDate || 0).getTime()
      }))
    ];

    return combined.sort((a, b) => b.timestamp - a.timestamp).slice(0, 5);
  }, [orders, rentals]);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-gaming-accent"></div>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-bold text-white mb-2">Dashboard Overview</h1>
        <p className="text-gaming-muted">Welcome back, here's what's happening with your account.</p>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {stats.map((stat, index) => (
          <div key={index} className="bg-gaming-card border border-gaming-border rounded-xl p-6">
            <div className="flex items-center justify-between mb-4">
              <div className={`p-3 rounded-lg ${stat.bg}`}>
                <stat.icon className={`h-6 w-6 ${stat.color}`} />
              </div>
            </div>
            <h3 className="text-2xl font-bold text-white mb-1">{stat.value}</h3>
            <p className="text-gaming-muted text-sm">{stat.label}</p>
          </div>
        ))}
      </div>

      {/* Recent Activity */}
      <div className="bg-gaming-card border border-gaming-border rounded-xl p-6">
        <h2 className="text-xl font-bold text-white mb-6">Recent Activity</h2>
        <div className="space-y-4">
          {recentActivity.map((activity) => (
            <div key={activity.id} className="flex items-center justify-between p-4 bg-gaming-bg rounded-lg border border-gaming-border hover:border-gaming-accent/50 transition-colors">
              <div className="flex items-center space-x-4">
                <div className={`p-2 rounded-full ${activity.type === 'order' ? 'bg-green-400/10 text-green-400' :
                  activity.type === 'rental' ? 'bg-blue-400/10 text-blue-400' :
                    'bg-yellow-400/10 text-yellow-400'
                  }`}>
                  {activity.type === 'order' && <ShoppingBag className="h-5 w-5" />}
                  {activity.type === 'rental' && <Gamepad2 className="h-5 w-5" />}
                  {activity.type === 'repair' && <Wrench className="h-5 w-5" />}
                </div>
                <div>
                  <h4 className="text-white font-medium">{activity.title}</h4>
                  <p className="text-gaming-muted text-sm flex items-center">
                    <Clock className="h-3 w-3 mr-1" /> {activity.date}
                  </p>
                </div>
              </div>
              <div className="text-right">
                <p className="text-white font-bold">{formatCurrency(activity.amount)}</p>
                <span className={`text-xs px-2 py-1 rounded-full capitalize ${activity.status === 'processing' || activity.status === 'pending' ? 'bg-yellow-400/10 text-yellow-400' :
                    activity.status === 'active' || activity.status === 'delivered' ? 'bg-green-400/10 text-green-400' :
                      'bg-blue-400/10 text-blue-400'
                  }`}>
                  {activity.status}
                </span>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
