'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { format, addDays, addWeeks, addMonths } from 'date-fns';

interface Appointment {
  id: number;
  provider: string;
  datetime: string;
  repeat: string;
  end_date?: string;
}

const REPEAT_OPTIONS = ['none', 'daily', 'weekly', 'biweekly', 'monthly'];

const emptyForm = {
  provider: '',
  date: '',
  hour: '',
  minute: '',
  ampm: 'AM',
  repeat: 'weekly',
  end_date: '',
};

export default function AdminAppointmentsPage() {
  const { id } = useParams();
  const router = useRouter();

  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [patientName, setPatientName] = useState('');
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editingAppt, setEditingAppt] = useState<Appointment | null>(null);
  const [form, setForm] = useState(emptyForm);
  const [endDateEnabled, setEndDateEnabled] = useState(false);
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
      setAppointments(data.user.appointments);
    } catch {
      router.push('/admin');
    } finally {
      setLoading(false);
    }
  }

  function openCreate() {
    setEditingAppt(null);
    setForm(emptyForm);
    setEndDateEnabled(false);
    setError('');
    setShowModal(true);
  }

  function openEdit(appt: Appointment) {
    setEditingAppt(appt);

    const dt = new Date(appt.datetime);
    const datePart = format(dt, 'yyyy-MM-dd');
    const h24 = dt.getHours();
    const mins = dt.getMinutes();
    const ampm = h24 >= 12 ? 'PM' : 'AM';
    const h12 = h24 === 0 ? 12 : h24 > 12 ? h24 - 12 : h24;

    setForm({
      provider: appt.provider,
      date: datePart,
      hour: String(h12),
      minute: String(mins).padStart(2, '0'),
      ampm,
      repeat: appt.repeat,
      end_date: appt.end_date ? appt.end_date.slice(0, 10) : '',
    });
    setEndDateEnabled(!!appt.end_date);
    setError('');
    setShowModal(true);
  }

  function handleChange(e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) {
    const { name, value } = e.target;
    setForm(prev => ({ ...prev, [name]: value }));
  }

  function toggleEndDate() {
    if (!endDateEnabled) {
      const now = new Date();
      let endDate = '';
      if (form.repeat === 'daily') endDate = format(addDays(now, 1), 'yyyy-MM-dd');
      else if (form.repeat === 'weekly') endDate = format(addWeeks(now, 1), 'yyyy-MM-dd');
      else if (form.repeat === 'biweekly') endDate = format(addWeeks(now, 2), 'yyyy-MM-dd');
      else if (form.repeat === 'monthly') endDate = format(addMonths(now, 1), 'yyyy-MM-dd');
      setForm(prev => ({ ...prev, end_date: endDate }));
      setEndDateEnabled(true);
    } else {
      setForm(prev => ({ ...prev, end_date: '' }));
      setEndDateEnabled(false);
    }
  }

  function buildDatetime(): string {
    let h = parseInt(form.hour);
    const m = parseInt(form.minute);
    if (form.ampm === 'PM' && h !== 12) h += 12;
    if (form.ampm === 'AM' && h === 12) h = 0;
    return `${form.date}T${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}:00`;
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError('');

    if (!form.date) {
      setError('Please select a date');
      return;
    }

    const h = parseInt(form.hour);
    const m = parseInt(form.minute);

    if (!form.hour || isNaN(h) || h < 1 || h > 12) {
      setError('Please enter a valid hour (1-12)');
      return;
    }

    if (form.minute === '' || isNaN(m) || m < 0 || m > 59) {
      setError('Please enter valid minutes (0-59)');
      return;
    }

    setSaving(true);

    try {
      const datetime = buildDatetime();

      const url = editingAppt
        ? `/api/patients/${id}/appointments/${editingAppt.id}`
        : `/api/patients/${id}/appointments`;

      const res = await fetch(url, {
        method: editingAppt ? 'PUT' : 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          provider: form.provider,
          datetime,
          repeat: form.repeat,
          end_date: endDateEnabled && form.end_date ? form.end_date : null,
        }),
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

  async function handleDelete(apptId: number) {
    if (!confirm('Delete this appointment?')) return;
    setDeletingId(apptId);
    try {
      await fetch(`/api/patients/${id}/appointments/${apptId}`, { method: 'DELETE' });
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
          <h1 className="text-3xl font-bold text-slate-900">Appointments</h1>
          <p className="text-slate-500 mt-1">{patientName}</p>
        </div>
        <button onClick={openCreate} className="btn-primary flex items-center gap-2">
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
          </svg>
          Add Appointment
        </button>
      </div>

      {/* Appointments Table */}
      <div className="card overflow-hidden">
        {appointments.length === 0 ? (
          <div className="px-6 py-16 text-center">
            <svg className="w-12 h-12 mx-auto mb-4 text-slate-300" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
            </svg>
            <p className="text-slate-500 font-medium">No appointments yet</p>
            <p className="text-slate-400 text-sm mt-1">Click "Add Appointment" to schedule one</p>
          </div>
        ) : (
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-200">
                <th className="text-left px-6 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wider">Provider</th>
                <th className="text-left px-6 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wider">Date & Time</th>
                <th className="text-left px-6 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wider">Repeat</th>
                <th className="text-left px-6 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wider">End Date</th>
                <th className="px-6 py-3"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {appointments.map(appt => (
                <tr key={appt.id} className="hover:bg-slate-50 transition-colors">
                  <td className="px-6 py-4 font-medium text-slate-800">{appt.provider}</td>
                  <td className="px-6 py-4 text-slate-600">
                    {format(new Date(appt.datetime), 'MMM d, yyyy · h:mm a')}
                  </td>
                  <td className="px-6 py-4">
                    <span className="badge-green capitalize">{appt.repeat}</span>
                  </td>
                  <td className="px-6 py-4 text-slate-500">
                    {appt.end_date
                      ? format(new Date(appt.end_date + 'T00:00:00'), 'MMM d, yyyy')
                      : <span className="text-slate-300">No end date</span>
                    }
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-2 justify-end">
                      <button
                        onClick={() => openEdit(appt)}
                        className="btn-secondary text-xs px-3 py-1.5"
                      >
                        Edit
                      </button>
                      <button
                        onClick={() => handleDelete(appt.id)}
                        disabled={deletingId === appt.id}
                        className="btn-danger text-xs px-3 py-1.5"
                      >
                        {deletingId === appt.id ? '...' : 'Delete'}
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
                {editingAppt ? 'Edit Appointment' : 'New Appointment'}
              </h3>
              <button onClick={() => setShowModal(false)} className="text-slate-400 hover:text-slate-600">
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            <form onSubmit={handleSubmit} className="px-6 py-5 space-y-4">

              {/* Provider */}
              <div>
                <label className="label">Provider Name <span className="text-red-500">*</span></label>
                <input
                  type="text"
                  name="provider"
                  className="input"
                  placeholder="Dr. Jane Smith"
                  value={form.provider}
                  onChange={handleChange}
                  required
                />
              </div>

              {/* Date — only future dates allowed */}
              <div>
                <label className="label">Date <span className="text-red-500">*</span></label>
                <input
                  type="date"
                  name="date"
                  className="input"
                  value={form.date}
                  min={format(new Date(), 'yyyy-MM-dd')}
                  onChange={handleChange}
                  required
                />
                <p className="text-xs text-slate-400 mt-1">
                  Only today or future dates allowed
                </p>
              </div>

              {/* Time — manual hour/minute + AM/PM dropdown */}
              <div>
                <label className="label">Time <span className="text-red-500">*</span></label>
                <div className="flex items-center gap-2">
                  <input
                    type="number"
                    name="hour"
                    className="input text-center"
                    placeholder="HH"
                    min={1}
                    max={12}
                    value={form.hour}
                    onChange={e => {
                      const val = e.target.value;
                      if (val === '' || (parseInt(val) >= 1 && parseInt(val) <= 12)) {
                        setForm(prev => ({ ...prev, hour: val }));
                      }
                    }}
                    required
                  />
                  <span className="text-slate-400 font-bold text-lg">:</span>
                  <input
                    type="number"
                    name="minute"
                    className="input text-center"
                    placeholder="MM"
                    min={0}
                    max={59}
                    value={form.minute}
                    onChange={e => {
                      const val = e.target.value;
                      if (val === '' || (parseInt(val) >= 0 && parseInt(val) <= 59)) {
                        setForm(prev => ({ ...prev, minute: val }));
                      }
                    }}
                    required
                  />
                  <select
                    name="ampm"
                    className="input"
                    value={form.ampm}
                    onChange={handleChange}
                  >
                    <option value="AM">AM</option>
                    <option value="PM">PM</option>
                  </select>
                </div>
                <p className="text-xs text-slate-400 mt-1">
                  Enter hour (1-12) and minutes (0-59), then select AM or PM
                </p>
              </div>

              {/* Repeat */}
              <div>
                <label className="label">Repeat Schedule <span className="text-red-500">*</span></label>
                <select
                  name="repeat"
                  className="input"
                  value={form.repeat}
                  onChange={handleChange}
                  required
                >
                  {REPEAT_OPTIONS.map(opt => (
                    <option key={opt} value={opt} className="capitalize">{opt}</option>
                  ))}
                </select>
              </div>

              {/* End Date */}
              {form.repeat !== 'none' && (
                <div>
                  <div className="flex items-center justify-between mb-1">
                    <label className="label mb-0">End Date</label>
                    <button
                      type="button"
                      onClick={toggleEndDate}
                      className="text-xs text-indigo-600 hover:underline"
                    >
                      {endDateEnabled ? 'Remove end date' : '+ Add end date'}
                    </button>
                  </div>
                  {endDateEnabled ? (
                    <input
                      type="date"
                      name="end_date"
                      className="input"
                      value={form.end_date}
                      min={format(new Date(), 'yyyy-MM-dd')}
                      onChange={handleChange}
                    />
                  ) : (
                    <div className="input bg-slate-50 text-slate-400 text-sm cursor-not-allowed select-none">
                      No end date — recurring indefinitely
                    </div>
                  )}
                </div>
              )}

              {error && (
                <div className="bg-red-50 border border-red-200 text-red-700 text-sm px-4 py-3 rounded-lg">
                  {error}
                </div>
              )}

              <div className="flex gap-3 pt-2">
                <button type="submit" className="btn-primary flex-1" disabled={saving}>
                  {saving ? 'Saving...' : editingAppt ? 'Save Changes' : 'Add Appointment'}
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