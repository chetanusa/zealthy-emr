import { NextRequest, NextResponse } from 'next/server';
import { db, initDb } from '@/lib/db';

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; apptId: string }> }
) {
  try {
    await initDb();
    const { id, apptId } = await params;
    const { provider, datetime, repeat, end_date } = await request.json();

    if (!provider || !datetime || !repeat) {
      return NextResponse.json(
        { error: 'Provider, datetime and repeat are required' },
        { status: 400 }
      );
    }

    await db.execute({
      sql: 'UPDATE appointments SET provider = ?, datetime = ?, repeat = ?, end_date = ? WHERE id = ? AND user_id = ?',
      args: [provider, datetime, repeat, end_date || null, apptId, id],
    });

    const updated = await db.execute({
      sql: 'SELECT * FROM appointments WHERE id = ?',
      args: [apptId],
    });

    return NextResponse.json({ appointment: updated.rows[0] });
  } catch (error) {
    console.error('PUT appointment error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; apptId: string }> }
) {
  try {
    await initDb();
    const { id, apptId } = await params;

    await db.execute({
      sql: 'DELETE FROM appointments WHERE id = ? AND user_id = ?',
      args: [apptId, id],
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('DELETE appointment error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}