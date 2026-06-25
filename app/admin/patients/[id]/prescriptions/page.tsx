'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { format, parseISO, addDays, addWeeks, addMonths } from 'date-fns';

interface Prescription {
  id: number;
  medication: string;
  dosage: string;
  quantity: number;
  refill_on: string;
  refill_schedule: string;
}

const MEDICATIONS = ['Diovan','Lexapro','Metformin','Ozempic','Prozac','Seroquel','Tegretol'];
const DOSAGES = ['1mg','2mg','3mg','5mg','10mg','25mg','50mg','100mg','250mg','500mg','1000mg'];
const SCHEDULES = ['daily','weekly','biweekly','monthly','quarterly'];

function getAutoRefillDate(schedule: string): string {
  const now = new Date();
  if (schedule === 'daily') return format(addDays(now, 1), 'yyyy-MM-dd');
  if (schedule === 'weekly') return format(addWeeks(now, 1), 'yyyy-MM-dd');
  if (schedule === 'biweekly') return format(addWeeks(now, 2), 'yyyy-MM-dd');
  if (schedule === 'monthly') return format(addMonths(now, 1), 'yyyy-MM-dd');
  if (schedule === 'quarterly') return format(addMonths(now, 3), 'yyyy-MM-dd');
  return '';
}

const emptyForm = {
  medication: 'Lexapro',
  dosage: '5mg',
  quantity: 1,
  refill_on: format(addMonths(new Date(), 1), 'yyyy-MM-dd'),
  refill_schedule: 'monthly',
};

export default function AdminPrescriptionsPage() {
  const { id } = useParams();
  const router = useRouter();

  const [prescriptions, setPrescriptions] = useState<Prescription[]>([]);
  const [patientName, setPatientName] = useState('');
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editingRx, setEditingRx] = useState<Prescription | null>(null);
  const [form, setForm] = useState(emptyForm);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [deletingId, setDeletingId] = useState<number | null>(null);

  useEffect(() => {
    fetchData();
  }, [id]);

  async function fetchData() {
    try {
      const res = await fetch(`/api/patients/${id}`);
      if (!res.ok) { router.push('/admin'); return; }
      const data = await res.json();
      setPatientName(data.user.name);
      setPrescriptions(data.user.prescriptions);
    } catch {
      router.push('/admin');
    } finally {
      setLoading(false);
    }
  }

  function openCreate() {
    setEditingRx(null);
    setForm(emptyForm);
    setError('');
    setShowModal(true);
  }

  function openEdit(rx: Prescription) {
    setEditingRx(rx);
    setForm({
      medication: rx.medication,
      dosage: rx.dosage,
      quantity: rx.quantity,
      refill_on: rx.refill_on,
      refill_schedule: rx.refill_schedule,
    });
    setError('');
    setShowModal(true);
  }

  function handleChange(e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) {
    const { name, value } = e.target;

    // Auto update refill date when schedule changes
    if (name === 'refill_schedule') {
      const autoDate = getAutoRefillDate(value);
      setForm(prev => ({
        ...prev,
        refill_schedule: value,
        refill_on: autoDate,
      }));
      return;
    }

    setForm(prev => ({
      ...prev,
      [name]: name === 'quantity' ? Number(value) : value,
    }));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError('');
    setSaving(true);

    try {
      const url = editingRx
        ? `/api/patients/${id}/prescriptions/${editingRx.id}`
        : `/api/patients/${id}/prescriptions`;

      const res = await fetch(url, {
        method: editingRx ? 'PUT' : 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form),
      });

      const data = await res.json();
      if (!res.ok) { setError(data.error || 'Failed to save'); return; }

      await fetchData();
      setShowModal(false);
    } catch {
      setError('Something went wrong.');
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete(rxId: number) {
    if (!confirm('Delete this prescription?')) return;
    setDeletingId(rxId);
    try {
      await fetch(`/api/patients/${id}/prescriptions/${rxId}`, { method: 'DELETE' });
      await fetchData();
    } catch {
      console.error('Delete failed');
    } finally {
      setDeletingId(null);
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin w-8 h-8 border-4 border-indigo-600 border-t-transparent rounded-full" />
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto space-y-6">

      {/* Header */}
      <div className="flex items-center gap-4">
        <Link href={`/admin/patients/${id}`} className="text-slate-400 hover:text-slate-600 transition-colors">
          <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
          </svg>
        </Link>
        <div className="flex-1">
          <h1 className="text-3xl font-bold text-slate-900">Prescriptions</h1>
          <p className="text-slate-500 mt-1">{patientName}</p>
        </div>
        <button onClick={openCreate} className="btn-primary flex items-center gap-2">
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
          </svg>
          Add Prescription
        </button>
      </div>

      {/* Prescriptions Table */}
      <div className="card overflow-hidden">
        {prescriptions.length === 0 ? (
          <div className="px-6 py-16 text-center">
            <svg className="w-12 h-12 mx-auto mb-4 text-slate-300" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M19.428 15.428a2 2 0 00-1.022-.547l-2.387-.477a6 6 0 00-3.86.517l-.318.158a6 6 0 01-3.86.517L6.05 15.21a2 2 0 00-1.806.547M8 4h8l-1 1v5.172a2 2 0 00.586 1.414l5 5c1.26 1.26.367 3.414-1.415 3.414H4.828c-1.782 0-2.674-2.154-1.414-3.414l5-5A2 2 0 009 10.172V5L8 4z" />
            </svg>
            <p className="text-slate-500 font-medium">No prescriptions yet</p>
            <p className="text-slate-400 text-sm mt-1">Click "Add Prescription" to prescribe a medication</p>
          </div>
        ) : (
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-200">
                <th className="text-left px-6 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wider">Medication</th>
                <th className="text-left px-6 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wider">Dosage</th>
                <th className="text-left px-6 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wider">Quantity</th>
                <th className="text-left px-6 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wider">Next Refill</th>
                <th className="text-left px-6 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wider">Schedule</th>
                <th className="px-6 py-3"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {prescriptions.map(rx => (
                <tr key={rx.id} className="hover:bg-slate-50 transition-colors">
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 bg-blue-50 rounded-lg flex items-center justify-center flex-shrink-0">
                        <svg className="w-4 h-4 text-blue-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19.428 15.428a2 2 0 00-1.022-.547l-2.387-.477a6 6 0 00-3.86.517l-.318.158a6 6 0 01-3.86.517L6.05 15.21a2 2 0 00-1.806.547M8 4h8l-1 1v5.172a2 2 0 00.586 1.414l5 5c1.26 1.26.367 3.414-1.415 3.414H4.828c-1.782 0-2.674-2.154-1.414-3.414l5-5A2 2 0 009 10.172V5L8 4z" />
                        </svg>
                      </div>
                      <span className="font-semibold text-slate-800">{rx.medication}</span>
                    </div>
                  </td>
                  <td className="px-6 py-4 text-slate-600">{rx.dosage}</td>
                  <td className="px-6 py-4 text-slate-600">{rx.quantity}</td>
                  <td className="px-6 py-4 text-slate-600">
                    {format(new Date(rx.refill_on + 'T00:00:00'), 'MMM d, yyyy')}
                  </td>
                  <td className="px-6 py-4">
                    <span className="badge-blue capitalize">{rx.refill_schedule}</span>
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-2 justify-end">
                      <button onClick={() => openEdit(rx)} className="btn-secondary text-xs px-3 py-1.5">
                        Edit
                      </button>
                      <button
                        onClick={() => handleDelete(rx.id)}
                        disabled={deletingId === rx.id}
                        className="btn-danger text-xs px-3 py-1.5"
                      >
                        {deletingId === rx.id ? '...' : 'Delete'}
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {/* Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-md">
            <div className="px-6 py-5 border-b border-slate-100 flex items-center justify-between">
              <h3 className="font-semibold text-slate-900 text-lg">
                {editingRx ? 'Edit Prescription' : 'New Prescription'}
              </h3>
              <button onClick={() => setShowModal(false)} className="text-slate-400 hover:text-slate-600">
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            <form onSubmit={handleSubmit} className="px-6 py-5 space-y-4">

              <div>
                <label className="label">Medication <span className="text-red-500">*</span></label>
                <select
                  name="medication"
                  className="input"
                  value={form.medication}
                  onChange={handleChange}
                  required
                >
                  {MEDICATIONS.map(m => (
                    <option key={m} value={m}>{m}</option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="label">Dosage <span className="text-red-500">*</span></label>
                  <select
                    name="dosage"
                    className="input"
                    value={form.dosage}
                    onChange={handleChange}
                    required
                  >
                    {DOSAGES.map(d => (
                      <option key={d} value={d}>{d}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="label">Quantity <span className="text-red-500">*</span></label>
                  <input
                    type="number"
                    name="quantity"
                    className="input"
                    min={1}
                    max={99}
                    value={form.quantity}
                    onChange={handleChange}
                    required
                  />
                </div>
              </div>

              <div>
                <label className="label">Refill Schedule <span className="text-red-500">*</span></label>
                <select
                  name="refill_schedule"
                  className="input"
                  value={form.refill_schedule}
                  onChange={handleChange}
                  required
                >
                  {SCHEDULES.map(s => (
                    <option key={s} value={s} className="capitalize">{s}</option>
                  ))}
                </select>
                <p className="text-xs text-slate-400 mt-1">Refill date auto-updates based on schedule</p>
              </div>

              <div>
                <label className="label">First Refill Date <span className="text-red-500">*</span></label>
                <input
                  type="date"
                  name="refill_on"
                  className="input"
                  value={form.refill_on}
                  onChange={handleChange}
                  required
                />
              </div>

              {error && (
                <div className="bg-red-50 border border-red-200 text-red-700 text-sm px-4 py-3 rounded-lg">
                  {error}
                </div>
              )}

              <div className="flex gap-3 pt-2">
                <button type="submit" className="btn-primary flex-1" disabled={saving}>
                  {saving ? 'Saving...' : editingRx ? 'Save Changes' : 'Add Prescription'}
                </button>
                <button type="button" className="btn-secondary" onClick={() => setShowModal(false)}>
                  Cancel
                </button>
              </div>

            </form>
          </div>
        </div>
      )}

    </div>
  );
}