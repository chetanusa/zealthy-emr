'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';

export default function NewPatientPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const [form, setForm] = useState({
    name: '',
    email: '',
    password: '',
    dob: '',
    phone: '',
    address: '',
  });

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

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError('');

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
        setError('Please enter a valid US phone number: +1 (XXX) XXX-XXXX');
        return;
      }
    }

    setLoading(true);

    try {
      const dob = form.dob ? formatDateForDb(form.dob) : null;

      const res = await fetch('/api/patients', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...form, dob }),
      });

      const data = await res.json();

      if (!res.ok) {
        setError(data.error || 'Failed to create patient');
        return;
      }

      router.push(`/admin/patients/${data.user.id}`);
    } catch {
      setError('Something went wrong. Please try again.');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="max-w-2xl mx-auto space-y-6">

      {/* Header */}
      <div className="flex items-center gap-4">
        <Link
          href="/admin"
          className="text-slate-400 hover:text-slate-600 transition-colors"
        >
          <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
          </svg>
        </Link>
        <div>
          <h1 className="text-3xl font-bold text-slate-900">New Patient</h1>
          <p className="text-slate-500 mt-1">Create a new patient record</p>
        </div>
      </div>

      {/* Form */}
      <div className="card p-6">
        <form onSubmit={handleSubmit} className="space-y-5">

          <div>
            <label className="label">Full Name <span className="text-red-500">*</span></label>
            <input
              type="text"
              name="name"
              className="input"
              placeholder="John Doe"
              value={form.name}
              onChange={handleChange}
              required
            />
          </div>

          <div>
            <label className="label">Email Address <span className="text-red-500">*</span></label>
            <input
              type="email"
              name="email"
              className="input"
              placeholder="patient@example.com"
              value={form.email}
              onChange={handleChange}
              required
            />
          </div>

          <div>
            <label className="label">Password <span className="text-red-500">*</span></label>
            <input
              type="text"
              name="password"
              className="input"
              placeholder="Set a password for portal access"
              value={form.password}
              onChange={handleChange}
              required
            />
            <p className="text-xs text-teal-600 mt-1">
              The patient will use this to log in to their portal
            </p>
          </div>

          <hr className="border-slate-100" />

          <div>
            <label className="label">Date of Birth</label>
            <input
              type="date"
              name="dob"
              className="input"
              value={form.dob}
              max={new Date().toISOString().split('T')[0]}
              onChange={handleChange}
              placeholder="Select date of birth"
            />
            <p className="text-xs text-slate-400 mt-1">
              Future dates are not allowed
            </p>
          </div>

          <div>
            <label className="label">Phone Number</label>
            <input
              type="tel"
              name="phone"
              className="input"
              placeholder="+1 (469) 890-1234"
              value={form.phone}
              onChange={handleChange}
            />
            <p className="text-xs text-slate-400 mt-1">
              Format: +1 (XXX) XXX-XXXX
            </p>
          </div>

          <div>
            <label className="label">Address</label>
            <input
              type="text"
              name="address"
              className="input"
              placeholder="123 Main St, City, State"
              value={form.address}
              onChange={handleChange}
            />
          </div>

          {error && (
            <div className="bg-red-50 border border-red-200 text-red-700 text-sm px-4 py-3 rounded-lg">
              {error}
            </div>
          )}

          <div className="flex items-center gap-3 pt-2">
            <button
              type="submit"
              className="btn-primary"
              disabled={loading}
            >
              {loading ? 'Creating...' : 'Create Patient'}
            </button>
            <Link href="/admin" className="btn-secondary">
              Cancel
            </Link>
          </div>

        </form>
      </div>

    </div>
  );
}