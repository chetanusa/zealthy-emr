'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { format } from 'date-fns';

interface Patient {
  id: number;
  name: string;
  email: string;
  dob?: string;
  phone?: string;
  address?: string;
  created_at: string;
}

export default function PatientDetailPage() {
  const { id } = useParams();
  const router = useRouter();
  const [patient, setPatient] = useState<Patient | null>(null);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const [form, setForm] = useState({
    name: '',
    email: '',
    password: '',
    dob: '',
    phone: '',
    address: '',
  });

  useEffect(() => {
    fetchPatient();
  }, [id]);

  async function fetchPatient() {
    try {
      const res = await fetch(`/api/patients/${id}`);
      if (!res.ok) { router.push('/admin'); return; }
      const data = await res.json();
      setPatient(data.user);
      setForm({
        name: data.user.name || '',
        email: data.user.email || '',
        password: '',
        dob: data.user.dob || '',
        phone: data.user.phone || '',
        address: data.user.address || '',
      });
    } catch {
      router.push('/admin');
    } finally {
      setLoading(false);
    }
  }

  function handleChange(e: React.ChangeEvent<HTMLInputElement>) {
    const { name, value } = e.target;

    if (name === 'phone') {
      const digits = value.replace(/\D/g, '').slice(0, 11);
      let formatted = '';
      if (digits.length === 0) {
        formatted = '';
      } else if (digits.length <= 1) {
        formatted = '+' + digits;
      } else if (digits.length <= 4) {
        formatted = `+${digits[0]} (${digits.slice(1)}`;
      } else if (digits.length <= 7) {
        formatted = `+${digits[0]} (${digits.slice(1, 4)}) ${digits.slice(4)}`;
      } else {
        formatted = `+${digits[0]} (${digits.slice(1, 4)}) ${digits.slice(4, 7)}-${digits.slice(7)}`;
      }
      setForm(prev => ({ ...prev, phone: formatted }));
      return;
    }

    setForm(prev => ({ ...prev, [name]: value }));
  }

  function formatDateForDb(dateStr: string): string | null {
    if (!dateStr) return null;
    if (/^\d{4}-\d{2}-\d{2}$/.test(dateStr)) return dateStr;
    if (dateStr.includes('/')) {
      const parts = dateStr.split('/');
      if (parts.length === 3) {
        return `${parts[2]}-${parts[0].padStart(2, '0')}-${parts[1].padStart(2, '0')}`;
      }
    }
    return null;
  }

  function formatDob(dob: string) {
    try {
      const d = new Date(dob + 'T00:00:00');
      return isNaN(d.getTime()) ? '—' : format(d, 'MMMM d, yyyy');
    } catch {
      return '—';
    }
  }

  async function handleSave(e: React.FormEvent) {
    e.preventDefault();
    setError('');
    setSuccess('');

    // Validate DOB
    if (form.dob) {
      const dob = formatDateForDb(form.dob);
      if (!dob) {
        setError('Invalid date of birth format');
        return;
      }
      const tomorrow = new Date();
      tomorrow.setDate(tomorrow.getDate() + 1);
      tomorrow.setHours(0, 0, 0, 0);
      const dobDate = new Date(dob + 'T00:00:00');
      if (dobDate >= tomorrow) {
        setError('Date of birth cannot be in the future');
        return;
      }
    }

    // Validate phone
    if (form.phone) {
      const digits = form.phone.replace(/\D/g, '');
      if (digits.length !== 11) {
        setError('Please enter a valid US phone number');
        return;
      }
    }

    setSaving(true);

    try {
      const dob = form.dob ? formatDateForDb(form.dob) : null;

      const res = await fetch(`/api/patients/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...form, dob }),
      });

      const data = await res.json();

      if (!res.ok) {
        setError(data.error || 'Failed to update patient');
        return;
      }

      setPatient(data.user);
      setEditing(false);
      setSuccess('Patient updated successfully');
      setTimeout(() => setSuccess(''), 3000);
    } catch {
      setError('Something went wrong. Please try again.');
    } finally {
      setSaving(false);
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin w-8 h-8 border-4 border-indigo-600 border-t-transparent rounded-full" />
      </div>
    );
  }

  if (!patient) return null;

  return (
    <div className="max-w-4xl mx-auto space-y-6">

      {/* Header */}
      <div className="flex items-center gap-4">
        <Link href="/admin" className="text-slate-400 hover:text-slate-600 transition-colors">
          <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
          </svg>
        </Link>
        <div className="flex-1">
          <h1 className="text-3xl font-bold text-slate-900">{patient.name}</h1>
          <p className="text-slate-500 mt-1">
            Patient ID #{patient.id} · Joined {format(new Date(patient.created_at), 'MMMM d, yyyy')}
          </p>
        </div>
        <button
          onClick={() => { setEditing(!editing); setError(''); setSuccess(''); }}
          className={editing ? 'btn-secondary' : 'btn-primary'}
        >
          {editing ? 'Cancel Edit' : 'Edit Patient'}
        </button>
      </div>

      {/* Success */}
      {success && (
        <div className="bg-teal-50 border border-teal-200 text-teal-700 text-sm px-4 py-3 rounded-lg">
          {success}
        </div>
      )}

      {/* Patient Info Card */}
      <div className="card p-6">
        <h2 className="text-lg font-semibold text-slate-800 mb-5">Patient Information</h2>

        {editing ? (
          <form onSubmit={handleSave} className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="label">Full Name <span className="text-red-500">*</span></label>
                <input
                  type="text"
                  name="name"
                  className="input"
                  value={form.name}
                  onChange={handleChange}
                  required
                />
              </div>
              <div>
                <label className="label">Email <span className="text-red-500">*</span></label>
                <input
                  type="email"
                  name="email"
                  className="input"
                  value={form.email}
                  onChange={handleChange}
                  required
                />
              </div>
              <div>
                <label className="label">New Password</label>
                <input
                  type="text"
                  name="password"
                  className="input"
                  placeholder="Leave blank to keep current"
                  value={form.password}
                  onChange={handleChange}
                />
              </div>
              <div>
                <label className="label">Date of Birth</label>
                <input
                  type="date"
                  name="dob"
                  className="input"
                  value={form.dob}
                  max={new Date(new Date().setDate(new Date().getDate())).toISOString().split('T')[0]}
                  onChange={handleChange}
                />
                <p className="text-xs text-slate-400 mt-1">Future dates not allowed</p>
              </div>
              <div>
                <label className="label">Phone</label>
                <input
                  type="tel"
                  name="phone"
                  className="input"
                  placeholder="+1 (469) 890-1234"
                  value={form.phone}
                  onChange={handleChange}
                />
                <p className="text-xs text-slate-400 mt-1">Format: +1 (XXX) XXX-XXXX</p>
              </div>
              <div>
                <label className="label">Address</label>
                <input
                  type="text"
                  name="address"
                  className="input"
                  value={form.address}
                  onChange={handleChange}
                />
              </div>
            </div>

            {error && (
              <div className="bg-red-50 border border-red-200 text-red-700 text-sm px-4 py-3 rounded-lg">
                {error}
              </div>
            )}

            <div className="flex gap-3 pt-2">
              <button type="submit" className="btn-primary" disabled={saving}>
                {saving ? 'Saving...' : 'Save Changes'}
              </button>
              <button
                type="button"
                className="btn-secondary"
                onClick={() => setEditing(false)}
              >
                Cancel
              </button>
            </div>
          </form>
        ) : (
          <div className="grid grid-cols-2 gap-6 text-sm">
            <div>
              <p className="text-slate-400">Full Name</p>
              <p className="font-medium text-slate-800 mt-0.5">{patient.name}</p>
            </div>
            <div>
              <p className="text-slate-400">Email</p>
              <p className="font-medium text-slate-800 mt-0.5">{patient.email}</p>
            </div>
            <div>
              <p className="text-slate-400">Date of Birth</p>
              <p className="font-medium text-slate-800 mt-0.5">
                {patient.dob ? formatDob(patient.dob) : '—'}
              </p>
            </div>
            <div>
              <p className="text-slate-400">Phone</p>
              <p className="font-medium text-slate-800 mt-0.5">{patient.phone || '—'}</p>
            </div>
            <div className="col-span-2">
              <p className="text-slate-400">Address</p>
              <p className="font-medium text-slate-800 mt-0.5">{patient.address || '—'}</p>
            </div>
          </div>
        )}
      </div>

      {/* Quick Links */}
      <div className="grid grid-cols-2 gap-4">
        <Link
          href={`/admin/patients/${id}/appointments`}
          className="card p-6 hover:shadow-md transition-shadow group"
        >
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 bg-teal-50 rounded-xl flex items-center justify-center group-hover:bg-teal-100 transition-colors">
              <svg className="w-6 h-6 text-teal-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
              </svg>
            </div>
            <div>
              <h3 className="font-semibold text-slate-800">Appointments</h3>
              <p className="text-sm text-slate-500">Manage schedule & recurring visits</p>
            </div>
            <svg className="w-5 h-5 text-slate-300 ml-auto group-hover:text-slate-400 transition-colors" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
            </svg>
          </div>
        </Link>

        <Link
          href={`/admin/patients/${id}/prescriptions`}
          className="card p-6 hover:shadow-md transition-shadow group"
        >
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 bg-blue-50 rounded-xl flex items-center justify-center group-hover:bg-blue-100 transition-colors">
              <svg className="w-6 h-6 text-blue-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19.428 15.428a2 2 0 00-1.022-.547l-2.387-.477a6 6 0 00-3.86.517l-.318.158a6 6 0 01-3.86.517L6.05 15.21a2 2 0 00-1.806.547M8 4h8l-1 1v5.172a2 2 0 00.586 1.414l5 5c1.26 1.26.367 3.414-1.415 3.414H4.828c-1.782 0-2.674-2.154-1.414-3.414l5-5A2 2 0 009 10.172V5L8 4z" />
              </svg>
            </div>
            <div>
              <h3 className="font-semibold text-slate-800">Prescriptions</h3>
              <p className="text-sm text-slate-500">Manage medications & refills</p>
            </div>
            <svg className="w-5 h-5 text-slate-300 ml-auto group-hover:text-slate-400 transition-colors" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
            </svg>
          </div>
        </Link>
      </div>

    </div>
  );
}