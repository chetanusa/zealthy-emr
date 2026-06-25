import { NextRequest, NextResponse } from 'next/server';
import { db, initDb } from '@/lib/db';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    await initDb();
    const { id } = await params;

    const prescriptions = await db.execute({
      sql: 'SELECT * FROM prescriptions WHERE user_id = ? ORDER BY medication ASC',
      args: [id],
    });

    return NextResponse.json({ prescriptions: prescriptions.rows });
  } catch (error) {
    console.error('GET prescriptions error:', error);
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
    const { medication, dosage, quantity, refill_on, refill_schedule } = await request.json();

    if (!medication || !dosage || !quantity || !refill_on || !refill_schedule) {
      return NextResponse.json(
        { error: 'All prescription fields are required' },
        { status: 400 }
      );
    }

    const result = await db.execute({
      sql: 'INSERT INTO prescriptions (user_id, medication, dosage, quantity, refill_on, refill_schedule) VALUES (?, ?, ?, ?, ?, ?)',
      args: [id, medication, dosage, quantity, refill_on, refill_schedule],
    });

    const prescription = await db.execute({
      sql: 'SELECT * FROM prescriptions WHERE id = ?',
      args: [result.lastInsertRowid],
    });

    return NextResponse.json({ prescription: prescription.rows[0] }, { status: 201 });
  } catch (error) {
    console.error('POST prescription error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}