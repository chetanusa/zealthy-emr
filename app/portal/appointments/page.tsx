'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { format, addDays, addWeeks, addMonths, parseISO } from 'date-fns';

interface Appointment {
  id: number;
  provider: string;
  datetime: string;
  repeat: string;
  end_date?: string;
}

function getOccurrences(appt: Appointment, from: Date, to: Date): Date[] {
  const occurrences: Date[] = [];
  let current = parseISO(appt.datetime);
  const endDate = appt.end_date ? parseISO(appt.end_date) : to;

  while (current <= to && current <= endDate) {
    if (current >= from) occurrences.push(new Date(current));
    if (appt.repeat === 'none') break;
    else if (appt.repeat === 'daily') current = addDays(current, 1);
    else if (appt.repeat === 'weekly') current = addWeeks(current, 1);
    else if (appt.repeat === 'biweekly') current = addWeeks(current, 2);
    else if (appt.repeat === 'monthly') current = addMonths(current, 1);
    else break;
  }

  return occurrences;
}

export default function AppointmentsPage() {
  const router = useRouter();
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      try {
        const sessionRes = await fetch('/api/auth/session');
        if (!sessionRes.ok) { router.push('/'); return; }
        const { user } = await sessionRes.json();

        const res = await fetch(`/api/patients/${user.id}/appointments`);
        if (!res.ok) throw new Error('Failed to load');
        const data = await res.json();
        setAppointments(data.appointments);
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

  const allOccurrences: { appt: Appointment; date: Date }[] = [];
  appointments.forEach(appt => {
    const occurrences = getOccurrences(appt, now, threeMonthsOut);
    occurrences.forEach(date => allOccurrences.push({ appt, date }));
  });
  allOccurrences.sort((a, b) => a.date.getTime() - b.date.getTime());

  const grouped: Record<string, { appt: Appointment; date: Date }[]> = {};
  allOccurrences.forEach(item => {
    const key = format(item.date, 'MMMM yyyy');
    if (!grouped[key]) grouped[key] = [];
    grouped[key].push(item);
  });

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
        <h1 className="text-3xl font-bold text-slate-900">Appointments</h1>
        <p className="text-slate-500 mt-1">
          Your full schedule for the next 3 months
        </p>
      </div>

      {/* Summary Badges */}
      <div className="flex items-center gap-3">
        <span className="badge-green text-sm px-3 py-1">
          {allOccurrences.length} upcoming {allOccurrences.length === 1 ? 'appointment' : 'appointments'}
        </span>
        <span className="badge-blue text-sm px-3 py-1">
          {appointments.length} {appointments.length === 1 ? 'provider' : 'providers'}
        </span>
      </div>

      {/* Empty State */}
      {allOccurrences.length === 0 && (
        <div className="card px-6 py-16 text-center">
          <svg className="w-12 h-12 mx-auto mb-4 text-slate-300" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
          </svg>
          <p className="text-slate-500 font-medium">No upcoming appointments</p>
          <p className="text-slate-400 text-sm mt-1">Contact your provider to schedule an appointment</p>
        </div>
      )}

      {/* Grouped by Month */}
      {Object.entries(grouped).map(([month, items]) => (
        <div key={month}>
          <h2 className="text-sm font-semibold text-slate-400 uppercase tracking-wider mb-3">
            {month}
          </h2>
          <div className="card divide-y divide-slate-100">
            {items.map(({ appt, date }, i) => (
              <div key={`${appt.id}-${i}`} className="flex items-center gap-4 px-6 py-4">
                <div className="w-14 h-14 bg-teal-50 rounded-xl flex flex-col items-center justify-center flex-shrink-0">
                  <span className="text-xs font-semibold text-teal-500 uppercase">
                    {format(date, 'EEE')}
                  </span>
                  <span className="text-xl font-bold text-teal-700 leading-none">
                    {format(date, 'd')}
                  </span>
                </div>
                <div className="flex-1">
                  <p className="font-semibold text-slate-800">{appt.provider}</p>
                  <p className="text-sm text-slate-500 mt-0.5">
                    {format(date, 'EEEE, MMMM d')} at {format(date, 'h:mm a')}
                  </p>
                </div>
                <div className="flex flex-col items-end gap-1">
                  <span className="badge-green capitalize">{appt.repeat}</span>
                  {appt.end_date && (
                    <span className="text-xs text-slate-400">
                      ends {format(parseISO(appt.end_date), 'MMM d')}
                    </span>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      ))}

    </div>
  );
}