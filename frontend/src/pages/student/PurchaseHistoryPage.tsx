import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { paymentsApi } from '../../api/student';
import DashboardLayout from '../../components/shared/DashboardLayout';
import LoadingSpinner from '../../components/shared/LoadingSpinner';
import StatusBadge from '../../components/shared/StatusBadge';
import type { PaymentHistoryItem } from '../../types';

export default function PurchaseHistoryPage() {
  const [orders, setOrders] = useState<PaymentHistoryItem[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    paymentsApi.getHistory().then((res) => setOrders(res.data)).finally(() => setLoading(false));
  }, []);

  if (loading) return <DashboardLayout><LoadingSpinner /></DashboardLayout>;

  return (
    <DashboardLayout>
      <h1 className="text-2xl font-bold mb-6">Purchase History</h1>

      {orders.length === 0 ? (
        <div className="card p-8 text-center">
          <p className="text-gray-500">No purchases yet.</p>
        </div>
      ) : (
        <div className="card overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-gray-50">
              <tr>
                <th className="text-left px-4 py-3 font-medium">Course</th>
                <th className="text-left px-4 py-3 font-medium">Amount</th>
                <th className="text-left px-4 py-3 font-medium">Status</th>
                <th className="text-left px-4 py-3 font-medium">Date</th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {orders.map((order) => (
                <tr key={order.id} className="hover:bg-gray-50">
                  <td className="px-4 py-3">
                    <Link to={`/courses/${order.course_slug}`} className="text-primary hover:underline">
                      {order.course_title}
                    </Link>
                  </td>
                  <td className="px-4 py-3">
                    ₹{order.final_amount.toFixed(2)}
                    {order.discount_amount > 0 && (
                      <span className="text-xs text-gray-400 ml-1">(saved ₹{order.discount_amount.toFixed(2)})</span>
                    )}
                  </td>
                  <td className="px-4 py-3"><StatusBadge status={order.payment_status} /></td>
                  <td className="px-4 py-3 text-gray-500">{new Date(order.created_at).toLocaleDateString()}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </DashboardLayout>
  );
}
