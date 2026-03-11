import { CreditCard, Download } from 'lucide-react';
import { formatCurrency } from '../../lib/utils';

export default function PaymentHistory() {
  const payments = [
    { id: 'PAY-8832', date: 'Oct 25, 2023', amount: 299.99, method: 'Visa ending in 4242', status: 'Success' },
    { id: 'PAY-7721', date: 'Sep 15, 2023', amount: 59.99, method: 'Mastercard ending in 8822', status: 'Success' },
    { id: 'PAY-6610', date: 'Aug 02, 2023', amount: 120.00, method: 'PayPal', status: 'Success' },
  ];

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold text-white">Payment History</h1>
      
      <div className="bg-gaming-card border border-gaming-border rounded-xl overflow-hidden">
        <table className="w-full text-left">
          <thead className="bg-gaming-bg text-gaming-muted text-xs uppercase">
            <tr>
              <th className="px-6 py-4">Transaction ID</th>
              <th className="px-6 py-4">Date</th>
              <th className="px-6 py-4">Amount</th>
              <th className="px-6 py-4">Payment Method</th>
              <th className="px-6 py-4">Status</th>
              <th className="px-6 py-4 text-right">Invoice</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gaming-border text-sm text-gaming-text">
            {payments.map((payment) => (
              <tr key={payment.id} className="hover:bg-gaming-bg/50 transition-colors">
                <td className="px-6 py-4 font-mono text-white">{payment.id}</td>
                <td className="px-6 py-4">{payment.date}</td>
                <td className="px-6 py-4 font-bold text-white">{formatCurrency(payment.amount)}</td>
                <td className="px-6 py-4 flex items-center gap-2">
                  <CreditCard className="h-4 w-4 text-gaming-muted" />
                  {payment.method}
                </td>
                <td className="px-6 py-4">
                  <span className="px-2 py-1 bg-green-400/10 text-green-400 rounded text-xs font-bold">
                    {payment.status}
                  </span>
                </td>
                <td className="px-6 py-4 text-right">
                  <button className="text-gaming-accent hover:text-white transition-colors" title="Download Invoice">
                    <Download className="h-4 w-4 ml-auto" />
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
