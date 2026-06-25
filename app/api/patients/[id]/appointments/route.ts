import { NextRequest, NextResponse } from 'next/server';
import { db, initDb } from '@/lib/db';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    await initDb();
    const { id } = await params;

    const user = await db.execute({
      sql: 'SELECT id FROM users WHERE id = ?',
      args: [id],
    });

    if (user.rows.length === 0) {
      return NextResponse.json({ error: 'Patient not found' }, { status: 404 });
    }

    const appointments = await db.execute({
      sql: 'SELECT * FROM appointments WHERE user_id = ? ORDER BY datetime ASC',
      args: [id],
    });

    return NextResponse.json({ appointments: appointments.rows });
  } catch (error) {
    console.error('GET appointments error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    await initDb();
    const { id } = await params;
    const { provider, datetime, repeat, end_date } = await request.json();

    if (!provider || !datetime || !repeat) {
      return NextResponse.json(
        { error: 'Provider, datetime and repeat are required' },
        { status: 400 }
      );
    }

    const result = await db.execute({
      sql: 'INSERT INTO appointments (user_id, provider, datetime, repeat, end_date) VALUES (?, ?, ?, ?, ?)',
      args: [id, provider, datetime, repeat, end_date || null],
    });

    const appointment = await db.execute({
      sql: 'SELECT * FROM appointments WHERE id = ?',
      args: [result.lastInsertRowid],
    });

    return NextResponse.json({ appointment: appointment.rows[0] }, { status: 201 });
  } catch (error) {
    console.error('POST appointment error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}