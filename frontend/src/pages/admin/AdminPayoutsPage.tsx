import { useEffect, useState } from 'react';
import toast from 'react-hot-toast';
import { adminApi } from '../../api/admin';
import DashboardLayout from '../../components/shared/DashboardLayout';
import LoadingSpinner from '../../components/shared/LoadingSpinner';

interface Payout {
  id: string; instructor_id: string; instructor_name: string;
  instructor_amount: number; payout_status: string; created_at: string;
}

export default function AdminPayoutsPage() {
  const [payouts, setPayouts] = useState<Payout[]>([]);
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [reference, setReference] = useState('');

  const load = () => {
    adminApi.listPendingPayouts().then((res) => setPayouts(res.data)).finally(() => setLoading(false));
  };

  useEffect(load, []);

  const toggleSelect = (id: string) => {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  };

  const handleProcess = async () => {
    if (selected.size === 0 || !reference.trim()) {
      toast.error('Select payouts and enter a reference');
      return;
    }
    try {
      await adminApi.processPayouts(Array.from(selected), reference);
      toast.success('Payouts processed');
      setSelected(new Set());
      setReference('');
      load();
    } catch (err: any) {
      toast.error(err.response?.data?.error || 'Failed');
    }
  };

  const totalSelected = payouts.filter((p) => selected.has(p.id)).reduce((sum, p) => sum + p.instructor_amount, 0);

  if (loading) return <DashboardLayout><LoadingSpinner /></DashboardLayout>;

  return (
    <DashboardLayout>
      <h1 className="text-2xl font-bold mb-6">Pending Payouts</h1>

      {payouts.length === 0 ? (
        <div className="card p-8 text-center text-gray-500">No pending payouts.</div>
      ) : (
        <>
          <div className="card overflow-hidden mb-4">
            <table className="w-full text-sm">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-4 py-3 w-8">
                    <input type="checkbox"
                      checked={selected.size === payouts.length}
                      onChange={() => {
                        if (selected.size === payouts.length) setSelected(new Set());
                        else setSelected(new Set(payouts.map((p) => p.id)));
                      }}
                    />
                  </th>
                  <th className="text-left px-4 py-3 font-medium">Instructor</th>
                  <th className="text-left px-4 py-3 font-medium">Amount</th>
                  <th className="text-left px-4 py-3 font-medium">Date</th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {payouts.map((p) => (
                  <tr key={p.id} className="hover:bg-gray-50">
                    <td className="px-4 py-3">
                      <input type="checkbox" checked={selected.has(p.id)} onChange={() => toggleSelect(p.id)} />
                    </td>
                    <td className="px-4 py-3 font-medium">{p.instructor_name}</td>
                    <td className="px-4 py-3">₹{p.instructor_amount.toFixed(0)}</td>
                    <td className="px-4 py-3 text-gray-500">{new Date(p.created_at).toLocaleDateString()}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {selected.size > 0 && (
            <div className="card p-4 flex items-center gap-4">
              <span className="text-sm font-medium">{selected.size} selected &bull; Total: ₹{totalSelected.toFixed(0)}</span>
              <input type="text" value={reference} onChange={(e) => setReference(e.target.value)}
                placeholder="Payout reference (e.g. bank transfer ID)" className="input-field flex-1" />
              <button onClick={handleProcess} className="btn-primary text-sm">Process Payouts</button>
            </div>
          )}
        </>
      )}
    </DashboardLayout>
  );
}
