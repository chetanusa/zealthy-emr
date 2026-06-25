'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { format, addDays, addWeeks, addMonths, parseISO } from 'date-fns';

interface Prescription {
  id: number;
  medication: string;
  dosage: string;
  quantity: number;
  refill_on: string;
  refill_schedule: string;
}

function getNextRefills(prescription: Prescription, from: Date, to: Date): Date[] {
  const refills: Date[] = [];
  let current = parseISO(prescription.refill_on);

  while (current < from) {
    if (prescription.refill_schedule === 'daily') current = addDays(current, 1);
    else if (prescription.refill_schedule === 'weekly') current = addWeeks(current, 1);
    else if (prescription.refill_schedule === 'biweekly') current = addWeeks(current, 2);
    else if (prescription.refill_schedule === 'monthly') current = addMonths(current, 1);
    else if (prescription.refill_schedule === 'quarterly') current = addMonths(current, 3);
    else break;
  }

  while (current <= to) {
    refills.push(new Date(current));
    if (prescription.refill_schedule === 'daily') current = addDays(current, 1);
    else if (prescription.refill_schedule === 'weekly') current = addWeeks(current, 1);
    else if (prescription.refill_schedule === 'biweekly') current = addWeeks(current, 2);
    else if (prescription.refill_schedule === 'monthly') current = addMonths(current, 1);
    else if (prescription.refill_schedule === 'quarterly') current = addMonths(current, 3);
    else break;
  }

  return refills;
}

export default function MedicationsPage() {
  const router = useRouter();
  const [prescriptions, setPrescriptions] = useState<Prescription[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      try {
        const sessionRes = await fetch('/api/auth/session');
        if (!sessionRes.ok) { router.push('/'); return; }
        const { user } = await sessionRes.json();

        const res = await fetch(`/api/patients/${user.id}/prescriptions`);
        if (!res.ok) throw new Error('Failed to load');
        const data = await res.json();
        setPrescriptions(data.prescriptions);
      } catch {
        router.push('/');
      } finally {
        setLoading(false);
      }
    }
    load();
  }, [router]);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin w-8 h-8 border-4 border-teal-600 border-t-transparent rounded-full" />
      </div>
    );
  }

  const now = new Date();
  const threeMonthsOut = addMonths(now, 3);

  return (
    <div className="max-w-3xl mx-auto space-y-8">

      {/* Header */}
      <div>
        <Link
          href="/portal"
          className="inline-flex items-center gap-2 text-sm text-slate-500 hover:text-slate-700 mb-4 transition-colors"
        >
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
          </svg>
          Back to Dashboard
        </Link>
        <h1 className="text-3xl font-bold text-slate-900">Medications</h1>
        <p className="text-slate-500 mt-1">
          Your prescriptions and refill schedule for the next 3 months
        </p>
      </div>

      {/* Summary */}
      <div className="flex items-center gap-3">
        <span className="badge-blue text-sm px-3 py-1">
          {prescriptions.length} active {prescriptions.length === 1 ? 'prescription' : 'prescriptions'}
        </span>
      </div>

      {/* Empty State */}
      {prescriptions.length === 0 && (
        <div className="card px-6 py-16 text-center">
          <svg className="w-12 h-12 mx-auto mb-4 text-slate-300" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
          </svg>
          <p className="text-slate-500 font-medium">No prescriptions found</p>
          <p className="text-slate-400 text-sm mt-1">Contact your provider to get a prescription</p>
        </div>
      )}

      {/* Prescription Cards */}
      <div className="space-y-6">
        {prescriptions.map(prescription => {
          const refills = getNextRefills(prescription, now, threeMonthsOut);
          const nextRefill = refills[0];

          return (
            <div key={prescription.id} className="card">

              {/* Medication Header */}
              <div className="px-6 py-5 border-b border-slate-100 flex items-center justify-between">
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 bg-blue-50 rounded-xl flex items-center justify-center flex-shrink-0">
                    <svg className="w-6 h-6 text-blue-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19.428 15.428a2 2 0 00-1.022-.547l-2.387-.477a6 6 0 00-3.86.517l-.318.158a6 6 0 01-3.86.517L6.05 15.21a2 2 0 00-1.806.547M8 4h8l-1 1v5.172a2 2 0 00.586 1.414l5 5c1.26 1.26.367 3.414-1.415 3.414H4.828c-1.782 0-2.674-2.154-1.414-3.414l5-5A2 2 0 009 10.172V5L8 4z" />
                    </svg>
                  </div>
                  <div>
                    <h3 className="font-bold text-slate-900 text-lg">{prescription.medication}</h3>
                    <p className="text-sm text-slate-500">
                      {prescription.dosage} · Qty {prescription.quantity} · {prescription.refill_schedule} refill
                    </p>
                  </div>
                </div>
                {nextRefill && (
                  <div className="text-right">
                    <p className="text-xs text-slate-400">Next refill</p>
                    <p className="font-semibold text-orange-600">{format(nextRefill, 'MMM d, yyyy')}</p>
                  </div>
                )}
              </div>

              {/* Refill Schedule */}
              <div className="px-6 py-4">
                <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-3">
                  Upcoming Refills (next 3 months)
                </p>
                {refills.length === 0 ? (
                  <p className="text-sm text-slate-400">No refills scheduled in the next 3 months</p>
                ) : (
                  <div className="flex flex-wrap gap-2">
                    {refills.map((date, i) => (
                      <span
                        key={i}
                        className={`inline-flex items-center px-3 py-1.5 rounded-lg text-xs font-medium ${
                          i === 0
                            ? 'bg-orange-100 text-orange-700 ring-1 ring-orange-300'
                            : 'bg-slate-100 text-slate-600'
                        }`}
                      >
                        {format(date, 'MMM d')}
                        {i === 0 && <span className="ml-1.5 text-orange-500">← next</span>}
                      </span>
                    ))}
                  </div>
                )}
              </div>

            </div>
          );
        })}
      </div>

    </div>
  );
}