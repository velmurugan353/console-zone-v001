import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  LineChart,
  Line,
  PieChart,
  Pie,
  Cell,
  Legend
} from 'recharts';
import {
  DollarSign,
  CreditCard,
  ArrowUpRight,
  ArrowDownRight,
  TrendingUp,
  TrendingDown,
  Download,
  Filter,
  Search
} from 'lucide-react';

const revenueData = [
  { name: 'Mon', revenue: 1200, orders: 45 },
  { name: 'Tue', revenue: 1900, orders: 52 },
  { name: 'Wed', revenue: 1500, orders: 48 },
  { name: 'Thu', revenue: 2100, orders: 61 },
  { name: 'Fri', revenue: 2800, orders: 75 },
  { name: 'Sat', revenue: 3500, orders: 92 },
  { name: 'Sun', revenue: 3100, orders: 84 },
];

const paymentMethods = [
  { name: 'Credit Card', value: 45, color: '#A855F7' },
  { name: 'PayPal', value: 30, color: '#3B82F6' },
  { name: 'Apple Pay', value: 15, color: '#10B981' },
  { name: 'Google Pay', value: 10, color: '#F59E0B' },
];

const transactions = [
  { id: 'TXN-001', customer: 'John Doe', amount: 499.00, status: 'Completed', method: 'Visa •••• 4242', date: '2024-03-15 14:30' },
  { id: 'TXN-002', customer: 'Jane Smith', amount: 89.99, status: 'Completed', method: 'PayPal', date: '2024-03-15 13:15' },
  { id: 'TXN-003', customer: 'Mike Wilson', amount: 1250.00, status: 'Pending', method: 'Mastercard •••• 5555', date: '2024-03-15 12:45' },
  { id: 'TXN-004', customer: 'Sarah Brown', amount: 45.00, status: 'Refunded', method: 'Apple Pay', date: '2024-03-15 11:20' },
  { id: 'TXN-005', customer: 'Chris Evans', amount: 299.00, status: 'Completed', method: 'Visa •••• 1111', date: '2024-03-15 10:05' },
];

const StatCard = ({ title, value, change, trend, icon: Icon }: any) => (
  <div className="bg-[#111] p-6 rounded-2xl border border-white/10">
    <div className="flex items-center justify-between mb-4">
      <div className="p-3 bg-white/5 rounded-xl">
        <Icon className="h-6 w-6 text-[#A855F7]" />
      </div>
      <span className={`flex items-center text-sm font-medium ${trend === 'up' ? 'text-green-400' : 'text-red-400'}`}>
        {change}
        {trend === 'up' ? <ArrowUpRight className="h-4 w-4 ml-1" /> : <ArrowDownRight className="h-4 w-4 ml-1" />}
      </span>
    </div>
    <h3 className="text-gray-400 text-sm font-medium">{title}</h3>
    <p className="text-2xl font-bold text-white mt-1">{value}</p>
  </div>
);

export default function AdminPayments() {
  return (
    <div className="space-y-8">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold text-white">Payments</h1>
          <p className="text-gray-400 mt-2">Monitor transactions and revenue breakdown.</p>
        </div>
        <button className="flex items-center space-x-2 px-4 py-2 bg-[#A855F7] text-white rounded-xl hover:bg-[#9333EA] transition-colors shadow-lg shadow-[#A855F7]/20">
          <Download className="h-4 w-4" />
          <span>Export Report</span>
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <StatCard title="Total Revenue" value="₹128,430.00" change="+12.5%" trend="up" icon={DollarSign} />
        <StatCard title="Avg. Transaction" value="₹145.20" change="+3.2%" trend="up" icon={TrendingUp} />
        <StatCard title="Refund Rate" value="1.2%" change="-0.5%" trend="down" icon={TrendingDown} />
        <StatCard title="Active Payouts" value="₹12,450.00" change="+15.8%" trend="up" icon={CreditCard} />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        <div className="bg-[#111] p-6 rounded-2xl border border-white/10">
          <h3 className="text-lg font-bold text-white mb-6">Revenue Breakdown</h3>
          <div className="h-[300px]">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={revenueData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#333" vertical={false} />
                <XAxis dataKey="name" stroke="#666" />
                <YAxis stroke="#666" />
                <Tooltip
                  contentStyle={{ backgroundColor: '#111', border: '1px solid #333', borderRadius: '8px' }}
                  itemStyle={{ color: '#fff' }}
                />
                <Bar dataKey="revenue" fill="#A855F7" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="bg-[#111] p-6 rounded-2xl border border-white/10">
          <h3 className="text-lg font-bold text-white mb-6">Payment Methods</h3>
          <div className="h-[300px]">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={paymentMethods}
                  cx="50%"
                  cy="50%"
                  innerRadius={60}
                  outerRadius={80}
                  paddingAngle={5}
                  dataKey="value"
                >
                  {paymentMethods.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip
                  contentStyle={{ backgroundColor: '#111', border: '1px solid #333', borderRadius: '8px' }}
                  itemStyle={{ color: '#fff' }}
                />
                <Legend verticalAlign="bottom" height={36} />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      <div className="bg-[#111] rounded-2xl border border-white/10 overflow-hidden">
        <div className="p-6 border-b border-white/10 flex flex-col md:flex-row md:items-center justify-between gap-4">
          <h3 className="text-lg font-bold text-white">Recent Transactions</h3>
          <div className="flex items-center space-x-4">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-500" />
              <input
                type="text"
                placeholder="Search transactions..."
                className="bg-white/5 border border-white/10 rounded-xl py-2 pl-10 pr-4 text-white focus:outline-none focus:border-[#A855F7] transition-colors"
              />
            </div>
            <button className="p-2 bg-white/5 border border-white/10 rounded-xl text-gray-300 hover:bg-white/10 transition-colors">
              <Filter className="h-4 w-4" />
            </button>
          </div>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm text-gray-400">
            <thead className="bg-white/5 text-gray-200 uppercase font-medium">
              <tr>
                <th className="px-6 py-4">Transaction ID</th>
                <th className="px-6 py-4">Customer</th>
                <th className="px-6 py-4">Amount</th>
                <th className="px-6 py-4">Method</th>
                <th className="px-6 py-4">Status</th>
                <th className="px-6 py-4">Date</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5">
              {transactions.map((txn) => (
                <tr key={txn.id} className="hover:bg-white/5 transition-colors">
                  <td className="px-6 py-4 font-mono text-white">{txn.id}</td>
                  <td className="px-6 py-4 text-white font-medium">{txn.customer}</td>
                  <td className="px-6 py-4 text-white font-bold">₹{txn.amount.toFixed(2)}</td>
                  <td className="px-6 py-4">{txn.method}</td>
                  <td className="px-6 py-4">
                    <span className={`px-2 py-1 rounded-full text-xs font-medium ${txn.status === 'Completed' ? 'bg-green-500/10 text-green-400' :
                        txn.status === 'Refunded' ? 'bg-red-500/10 text-red-400' :
                          'bg-yellow-500/10 text-yellow-400'
                      }`}>
                      {txn.status}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-xs">{txn.date}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
