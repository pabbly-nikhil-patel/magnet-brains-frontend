import { useState } from 'react';
import toast from 'react-hot-toast';
import { adminApi } from '../../api/admin';
import DashboardLayout from '../../components/shared/DashboardLayout';

export default function AdminRevenuePage() {
  const [defaultPct, setDefaultPct] = useState('30');
  const [instructorId, setInstructorId] = useState('');
  const [overridePct, setOverridePct] = useState('');

  const handleUpdateDefault = async () => {
    try {
      await adminApi.updateRevenueSettings(parseInt(defaultPct));
      toast.success('Default commission updated');
    } catch (err: any) {
      toast.error(err.response?.data?.error || 'Failed');
    }
  };

  const handleSetOverride = async () => {
    if (!instructorId || !overridePct) return;
    try {
      await adminApi.setInstructorOverride(instructorId, parseInt(overridePct));
      toast.success('Instructor override set');
      setInstructorId('');
      setOverridePct('');
    } catch (err: any) {
      toast.error(err.response?.data?.error || 'Failed');
    }
  };

  return (
    <DashboardLayout>
      <h1 className="text-2xl font-bold mb-6">Revenue Settings</h1>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="card p-6">
          <h2 className="text-lg font-bold mb-4">Default Platform Commission</h2>
          <p className="text-sm text-gray-500 mb-4">
            This percentage is taken by the platform from each course sale.
          </p>
          <div className="flex gap-3">
            <input
              type="number" value={defaultPct} onChange={(e) => setDefaultPct(e.target.value)}
              className="input-field w-24" min="1" max="100"
            />
            <span className="py-2">%</span>
            <button onClick={handleUpdateDefault} className="btn-primary text-sm">Update</button>
          </div>
        </div>

        <div className="card p-6">
          <h2 className="text-lg font-bold mb-4">Instructor Override</h2>
          <p className="text-sm text-gray-500 mb-4">
            Set a custom commission rate for a specific instructor.
          </p>
          <div className="space-y-3">
            <input
              type="text" value={instructorId} onChange={(e) => setInstructorId(e.target.value)}
              placeholder="Instructor UUID" className="input-field"
            />
            <div className="flex gap-3">
              <input
                type="number" value={overridePct} onChange={(e) => setOverridePct(e.target.value)}
                className="input-field w-24" min="1" max="100" placeholder="%"
              />
              <button onClick={handleSetOverride} className="btn-primary text-sm">Set Override</button>
            </div>
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
}
