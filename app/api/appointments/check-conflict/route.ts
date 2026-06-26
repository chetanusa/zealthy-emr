import { NextRequest, NextResponse } from 'next/server';
import { db, initDb } from '@/lib/db';

export async function POST(request: NextRequest) {
  try {
    await initDb();
    const { provider, datetime, excludeApptId } = await request.json();

    const newTime = new Date(datetime).getTime();

    // Get ALL appointments across ALL patients for this provider
    const result = await db.execute({
      sql: 'SELECT * FROM appointments WHERE provider = ?',
      args: [provider],
    });

    const conflict = result.rows.find(appt => {
      if (excludeApptId && appt.id === excludeApptId) return false;
      const existingTime = new Date(appt.datetime as string).getTime();
      const diffMinutes = Math.abs(newTime - existingTime) / (1000 * 60);
      return diffMinutes < 30;
    });

    if (conflict) {
      return NextResponse.json({
        conflict: true,
        message: `${provider} already has an appointment on ${new Date(conflict.datetime as string).toLocaleDateString()} at ${new Date(conflict.datetime as string).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}. Please choose a different time.`
      });
    }

    return NextResponse.json({ conflict: false });
  } catch (error) {
    console.error('Conflict check error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}