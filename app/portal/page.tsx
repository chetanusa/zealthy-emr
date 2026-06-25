'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { addDays, isWithinInterval, parseISO, format, addWeeks, addMonths } from 'date-fns';

interface Appointment {
  id: number;
  provider: string;
  datetime: string;
  repeat: string;
  end_date?: string;
}

interface Prescription {
  id: number;
  medication: string;
  dosage: string;
  quantity: number;
  refill_on: string;
  refill_schedule: string;
}

interface Patient {
  id: number;
  name: string;
  email: string;
  dob?: string;
  phone?: string;
  address?: string;
  appointments: Appointment[];
  prescriptions: Prescription[];
}

function getUpcomingOccurrences(appt: Appointment, from: Date, to: Date): Date[] {
  const occurrences: Date[] = [];
  let current = parseISO(appt.datetime);
  const endDate = appt.end_date ? parseISO(appt.end_date) : to;

  while (current <= to && current <= endDate) {
    if (current >= from) occurrences.push(current);
    if (appt.repeat === 'none') break;
    if (appt.repeat === 'weekly') current = addWeeks(current, 1);
    else if (appt.repeat === 'biweekly') current = addWeeks(current, 2);
    else if (appt.repeat === 'monthly') current = addMonths(current, 1);
    else if (appt.repeat === 'daily') current = addDays(current, 1);
    else break;
  }

  return occurrences;
}

function getNextRefillDate(prescription: Prescription, from: Date, to: Date): Date | null {
  let current = parseISO(prescription.refill_on);

  while (current < from) {
    if (prescription.refill_schedule === 'daily') current = addDays(current, 1);
    else if (prescription.refill_schedule === 'weekly') current = addWeeks(current, 1);
    else if (prescription.refill_schedule === 'biweekly') current = addWeeks(current, 2);
    else if (prescription.refill_schedule === 'monthly') current = addMonths(current, 1);
    else if (prescription.refill_schedule === 'quarterly') current = addMonths(current, 3);
    else break;
  }

  if (current <= to) return current;
  return null;
}

export default function PortalDashboard() {
  const router = useRouter();
  const [patient, setPatient] = useState<Patient | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      try {
        const sessionRes = await fetch('/api/auth/session');
        if (!sessionRes.ok) { router.push('/'); return; }
        const { user } = await sessionRes.json();

        const patientRes = await fetch(`/api/patients/${user.id}`);
        if (!patientRes.ok) { router.push('/'); return; }
        const { user: patientData } = await patientRes.json();
        setPatient(patientData);
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

  if (!patient) return null;

  const now = new Date();
  const in7Days = addDays(now, 7);

  // Upcoming appointments in next 7 days
  const upcomingAppointments: { appt: Appointment; date: Date }[] = [];
  patient.appointments.forEach(appt => {
    const occurrences = getUpcomingOccurrences(appt, now, in7Days);
    occurrences.forEach(date => upcomingAppointments.push({ appt, date }));
  });
  upcomingAppointments.sort((a, b) => a.date.getTime() - b.date.getTime());

  // Refills due in next 7 days
  const upcomingRefills: { prescription: Prescription; date: Date }[] = [];
  patient.prescriptions.forEach(prescription => {
    const date = getNextRefillDate(prescription, now, in7Days);
    if (date) upcomingRefills.push({ prescription, date });
  });
  upcomingRefills.sort((a, b) => a.date.getTime() - b.date.getTime());

  return (
    <div className="max-w-4xl mx-auto space-y-8">

      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold text-slate-900">
          Good {getGreeting()}, {patient.name.split(' ')[0]} 👋
        </h1>
        <p className="text-slate-500 mt-1">
          {format(now, 'EEEE, MMMM d, yyyy')} — Here's your health summary
        </p>
      </div>

      {/* Stats Row */}
      <div className="grid grid-cols-3 gap-4">
        <div className="card p-5">
          <p className="text-sm text-slate-500 mb-1">Upcoming Appointments</p>
          <p className="text-3xl font-bold text-teal-600">{upcomingAppointments.length}</p>
          <p className="text-xs text-slate-400 mt-1">in the next 7 days</p>
        </div>
        <div className="card p-5">
          <p className="text-sm text-slate-500 mb-1">Refills Due</p>
          <p className="text-3xl font-bold text-orange-500">{upcomingRefills.length}</p>
          <p className="text-xs text-slate-400 mt-1">in the next 7 days</p>
        </div>
        <div className="card p-5">
          <p className="text-sm text-slate-500 mb-1">Active Medications</p>
          <p className="text-3xl font-bold text-blue-600">{patient.prescriptions.length}</p>
          <p className="text-xs text-slate-400 mt-1">total prescriptions</p>
        </div>
      </div>

      {/* Upcoming Appointments */}
      <div className="card">
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100">
          <h2 className="text-lg font-semibold text-slate-800">Appointments This Week</h2>
          <Link href="/portal/appointments" className="text-sm text-teal-600 hover:underline font-medium">
            View all →
          </Link>
        </div>

        {upcomingAppointments.length === 0 ? (
          <div className="px-6 py-10 text-center text-slate-400">
            <svg className="w-10 h-10 mx-auto mb-3 text-slate-300" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
            </svg>
            <p className="text-sm">No appointments in the next 7 days</p>
          </div>
        ) : (
          <ul className="divide-y divide-slate-100">
            {upcomingAppointments.map(({ appt, date }, i) => (
              <li key={`${appt.id}-${i}`} className="px-6 py-4 flex items-center gap-4">
                <div className="w-12 h-12 bg-teal-50 rounded-xl flex flex-col items-center justify-center flex-shrink-0">
                  <span className="text-xs font-medium text-teal-600">{format(date, 'MMM')}</span>
                  <span className="text-lg font-bold text-teal-700 leading-none">{format(date, 'd')}</span>
                </div>
                <div className="flex-1">
                  <p className="font-medium text-slate-800">{appt.provider}</p>
                  <p className="text-sm text-slate-500">{format(date, 'EEEE, h:mm a')}</p>
                </div>
                <span className="badge-green capitalize">{appt.repeat}</span>
              </li>
            ))}
          </ul>
        )}
      </div>

      {/* Upcoming Refills */}
      <div className="card">
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100">
          <h2 className="text-lg font-semibold text-slate-800">Refills Due This Week</h2>
          <Link href="/portal/medications" className="text-sm text-teal-600 hover:underline font-medium">
            View all →
          </Link>
        </div>

        {upcomingRefills.length === 0 ? (
          <div className="px-6 py-10 text-center text-slate-400">
            <svg className="w-10 h-10 mx-auto mb-3 text-slate-300" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
            </svg>
            <p className="text-sm">No refills due in the next 7 days</p>
          </div>
        ) : (
          <ul className="divide-y divide-slate-100">
            {upcomingRefills.map(({ prescription, date }) => (
              <li key={prescription.id} className="px-6 py-4 flex items-center gap-4">
                <div className="w-12 h-12 bg-orange-50 rounded-xl flex flex-col items-center justify-center flex-shrink-0">
                  <span className="text-xs font-medium text-orange-500">{format(date, 'MMM')}</span>
                  <span className="text-lg font-bold text-orange-600 leading-none">{format(date, 'd')}</span>
                </div>
                <div className="flex-1">
                  <p className="font-medium text-slate-800">{prescription.medication}</p>
                  <p className="text-sm text-slate-500">{prescription.dosage} · Qty {prescription.quantity}</p>
                </div>
                <span className="badge-orange capitalize">{prescription.refill_schedule}</span>
              </li>
            ))}
          </ul>
        )}
      </div>

      {/* Patient Info */}
      <div className="card px-6 py-5">
        <h2 className="text-lg font-semibold text-slate-800 mb-4">Your Information</h2>
        <div className="grid grid-cols-2 gap-4 text-sm">
          <div>
            <p className="text-slate-400">Full Name</p>
            <p className="font-medium text-slate-800 mt-0.5">{patient.name}</p>
          </div>
          <div>
            <p className="text-slate-400">Email</p>
            <p className="font-medium text-slate-800 mt-0.5">{patient.email}</p>
          </div>
          {patient.dob && (
            <div>
              <p className="text-slate-400">Date of Birth</p>
              <p className="font-medium text-slate-800 mt-0.5">{format(parseISO(patient.dob), 'MMMM d, yyyy')}</p>
            </div>
          )}
          {patient.phone && (
            <div>
              <p className="text-slate-400">Phone</p>
              <p className="font-medium text-slate-800 mt-0.5">{patient.phone}</p>
            </div>
          )}
          {patient.address && (
            <div className="col-span-2">
              <p className="text-slate-400">Address</p>
              <p className="font-medium text-slate-800 mt-0.5">{patient.address}</p>
            </div>
          )}
        </div>
      </div>

    </div>
  );
}

function getGreeting() {
  const hour = new Date().getHours();
  if (hour < 12) return 'morning';
  if (hour < 17) return 'afternoon';
  return 'evening';
}