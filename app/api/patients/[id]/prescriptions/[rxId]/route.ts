import { NextRequest, NextResponse } from 'next/server';
import { db, initDb } from '@/lib/db';

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; rxId: string }> }
) {
  try {
    await initDb();
    const { id, rxId } = await params;
    const { medication, dosage, quantity, refill_on, refill_schedule } = await request.json();

    if (!medication || !dosage || !quantity || !refill_on || !refill_schedule) {
      return NextResponse.json(
        { error: 'All prescription fields are required' },
        { status: 400 }
      );
    }

    await db.execute({
      sql: 'UPDATE prescriptions SET medication = ?, dosage = ?, quantity = ?, refill_on = ?, refill_schedule = ? WHERE id = ? AND user_id = ?',
      args: [medication, dosage, quantity, refill_on, refill_schedule, rxId, id],
    });

    const updated = await db.execute({
      sql: 'SELECT * FROM prescriptions WHERE id = ?',
      args: [rxId],
    });

    return NextResponse.json({ prescription: updated.rows[0] });
  } catch (error) {
    console.error('PUT prescription error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; rxId: string }> }
) {
  try {
    await initDb();
    const { id, rxId } = await params;

    await db.execute({
      sql: 'DELETE FROM prescriptions WHERE id = ? AND user_id = ?',
      args: [rxId, id],
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('DELETE prescription error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}