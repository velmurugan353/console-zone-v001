import { useState, useEffect } from 'react';
import { Search, Filter, Eye, Mail, Phone, MapPin, XCircle, CheckCircle } from 'lucide-react';
import { collection, onSnapshot, query, doc, updateDoc } from 'firebase/firestore';
import { db } from '../../lib/firebase';

interface Customer {
  id: string;
  name: string;
  email: string;
  phone: string;
  address: string;
  joinDate: string;
  orders: number;
  totalSpent: number;
  status: 'active' | 'banned';
}

export default function AdminCustomers() {
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const q = query(collection(db, 'users'));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const fetchedCustomers: Customer[] = snapshot.docs.map(doc => {
        const data = doc.data();
        return {
          id: doc.id,
          name: data.name || data.email?.split('@')[0] || 'Unknown User',
          email: data.email || 'No email',
          phone: data.phone || 'Not provided',
          address: data.address || 'No address stored',
          joinDate: data.created_at?.toDate ? data.created_at.toDate().toLocaleDateString() : 'Unknown',
          orders: data.orders_count || 0,
          totalSpent: data.total_spent || 0,
          status: data.status || 'active'
        };
      });
      setCustomers(fetchedCustomers);
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  const handleToggleStatus = async (id: string, currentStatus: string) => {
    const newStatus = currentStatus === 'active' ? 'banned' : 'active';
    const confirmMessage = newStatus === 'banned'
      ? 'Are you sure you want to ban this user?'
      : 'Are you sure you want to unban this user?';

    if (confirm(confirmMessage)) {
      await updateDoc(doc(db, 'users', id), { status: newStatus });
    }
  };

  const filteredCustomers = customers.filter(customer =>
    customer.name.toLowerCase().includes(search.toLowerCase()) ||
    customer.email.toLowerCase().includes(search.toLowerCase()) ||
    customer.id.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold text-white">Customers</h1>
          <p className="text-gaming-muted">View and manage customer details.</p>
        </div>
      </div>

      {/* Filters */}
      <div className="flex items-center space-x-4 bg-gaming-card p-4 rounded-xl border border-gaming-border">
        <div className="relative flex-grow">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gaming-muted" />
          <input
            type="text"
            placeholder="Search customers..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-10 pr-4 py-2 bg-gaming-bg border border-gaming-border rounded-lg text-white focus:outline-none focus:border-gaming-accent w-full"
          />
        </div>
      </div>

      {/* Table */}
      <div className="bg-gaming-card border border-gaming-border rounded-xl overflow-hidden">
        <table className="w-full text-left">
          <thead className="bg-gaming-bg text-gaming-muted text-xs uppercase">
            <tr>
              <th className="px-6 py-4">Customer</th>
              <th className="px-6 py-4">Contact</th>
              <th className="px-6 py-4">Location</th>
              <th className="px-6 py-4">Orders</th>
              <th className="px-6 py-4">Total Spent</th>
              <th className="px-6 py-4 text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gaming-border text-sm text-gaming-text">
            {filteredCustomers.map((customer) => (
              <tr key={customer.id} className="hover:bg-gaming-bg/50 transition-colors">
                <td className="px-6 py-4">
                  <div className="flex items-center space-x-3">
                    <div className={`h-10 w-10 rounded-full flex items-center justify-center font-bold ${customer.status === 'banned' ? 'bg-red-500/10 text-red-500' : 'bg-gaming-accent/10 text-gaming-accent'
                      }`}>
                      {customer.name.charAt(0)}
                    </div>
                    <div>
                      <div className="font-medium text-white flex items-center">
                        {customer.name}
                        {customer.status === 'banned' && (
                          <span className="ml-2 px-1.5 py-0.5 rounded bg-red-500/10 text-red-500 text-[10px] font-bold uppercase border border-red-500/20">
                            Banned
                          </span>
                        )}
                      </div>
                      <div className="text-xs text-gaming-muted">Joined {customer.joinDate}</div>
                    </div>
                  </div>
                </td>
                <td className="px-6 py-4">
                  <div className="flex items-center space-x-2 text-gaming-muted">
                    <Mail className="h-3 w-3" />
                    <span>{customer.email}</span>
                  </div>
                  <div className="flex items-center space-x-2 text-gaming-muted mt-1">
                    <Phone className="h-3 w-3" />
                    <span>{customer.phone}</span>
                  </div>
                </td>
                <td className="px-6 py-4">
                  <div className="flex items-center space-x-2 text-gaming-muted">
                    <MapPin className="h-3 w-3" />
                    <span className="truncate max-w-[150px]">{customer.address}</span>
                  </div>
                </td>
                <td className="px-6 py-4 text-white font-medium">{customer.orders}</td>
                <td className="px-6 py-4 text-gaming-accent font-bold">${customer.totalSpent.toFixed(2)}</td>
                <td className="px-6 py-4 text-right">
                  <div className="flex justify-end space-x-2">
                    <button className="p-2 hover:bg-gaming-border rounded transition-colors text-gaming-muted hover:text-white">
                      <Eye className="h-4 w-4" />
                    </button>
                    {customer.status === 'active' ? (
                      <button
                        onClick={() => handleToggleStatus(customer.id, customer.status)}
                        className="p-2 hover:bg-red-500/10 text-red-500 rounded transition-colors"
                        title="Ban User"
                      >
                        <XCircle className="h-4 w-4" />
                      </button>
                    ) : (
                      <button
                        onClick={() => handleToggleStatus(customer.id, customer.status)}
                        className="p-2 hover:bg-green-500/10 text-green-500 rounded transition-colors"
                        title="Unban User"
                      >
                        <CheckCircle className="h-4 w-4" />
                      </button>
                    )}
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>

        {filteredCustomers.length === 0 && (
          <div className="text-center py-12 text-gaming-muted">
            No customers found.
          </div>
        )}
      </div>
    </div>
  );
}
