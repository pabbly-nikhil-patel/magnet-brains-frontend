import { useEffect, useState } from 'react';
import { DollarSign, Clock, CheckCircle } from 'lucide-react';
import { instructorApi } from '../../api/instructor';
import DashboardLayout from '../../components/shared/DashboardLayout';
import LoadingSpinner from '../../components/shared/LoadingSpinner';
import StatusBadge from '../../components/shared/StatusBadge';
import type { EarningsSummary } from '../../types';

export default function EarningsPage() {
  const [data, setData] = useState<EarningsSummary | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    instructorApi.getEarnings().then((res) => setData(res.data)).finally(() => setLoading(false));
  }, []);

  if (loading) return <DashboardLayout><LoadingSpinner /></DashboardLayout>;
  if (!data) return null;

  return (
    <DashboardLayout>
      <h1 className="text-2xl font-bold mb-6">Earnings</h1>

      <div className="grid grid-cols-3 gap-4 mb-8">
        <div className="card p-4">
          <div className="w-10 h-10 rounded-lg flex items-center justify-center mb-3 text-green-600 bg-green-50">
            <DollarSign className="w-6 h-6" />
          </div>
          <p className="text-2xl font-bold">₹{data.total_earnings.toFixed(0)}</p>
          <p className="text-sm text-gray-500">Total Earnings</p>
        </div>
        <div className="card p-4">
          <div className="w-10 h-10 rounded-lg flex items-center justify-center mb-3 text-orange-600 bg-orange-50">
            <Clock className="w-6 h-6" />
          </div>
          <p className="text-2xl font-bold">₹{data.pending_payouts.toFixed(0)}</p>
          <p className="text-sm text-gray-500">Pending Payouts</p>
        </div>
        <div className="card p-4">
          <div className="w-10 h-10 rounded-lg flex items-center justify-center mb-3 text-blue-600 bg-blue-50">
            <CheckCircle className="w-6 h-6" />
          </div>
          <p className="text-2xl font-bold">₹{data.paid_out.toFixed(0)}</p>
          <p className="text-sm text-gray-500">Paid Out</p>
        </div>
      </div>

      <h2 className="text-xl font-bold mb-4">Recent Transactions</h2>
      {data.recent_earnings.length === 0 ? (
        <p className="text-gray-500">No earnings yet.</p>
      ) : (
        <div className="card overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-gray-50">
              <tr>
                <th className="text-left px-4 py-3 font-medium">Course</th>
                <th className="text-left px-4 py-3 font-medium">Order Amount</th>
                <th className="text-left px-4 py-3 font-medium">Platform %</th>
                <th className="text-left px-4 py-3 font-medium">Your Share</th>
                <th className="text-left px-4 py-3 font-medium">Status</th>
                <th className="text-left px-4 py-3 font-medium">Date</th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {data.recent_earnings.map((e) => (
                <tr key={e.id} className="hover:bg-gray-50">
                  <td className="px-4 py-3">{e.course_title}</td>
                  <td className="px-4 py-3">₹{e.order_amount.toFixed(0)}</td>
                  <td className="px-4 py-3">{e.platform_pct}%</td>
                  <td className="px-4 py-3 font-medium text-green-600">₹{e.instructor_amount.toFixed(0)}</td>
                  <td className="px-4 py-3"><StatusBadge status={e.payout_status} /></td>
                  <td className="px-4 py-3 text-gray-500">{new Date(e.created_at).toLocaleDateString()}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </DashboardLayout>
  );
}
