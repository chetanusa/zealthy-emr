import { NextRequest, NextResponse } from 'next/server';
import { db, initDb } from '@/lib/db';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    await initDb();
    const { id } = await params;

    const userResult = await db.execute({
      sql: 'SELECT * FROM users WHERE id = ?',
      args: [id],
    });

    if (userResult.rows.length === 0) {
      return NextResponse.json({ error: 'Patient not found' }, { status: 404 });
    }

    const user = { ...userResult.rows[0] };
    delete (user as Record<string, unknown>).password;

    const appointments = await db.execute({
      sql: 'SELECT * FROM appointments WHERE user_id = ? ORDER BY datetime ASC',
      args: [id],
    });

    const prescriptions = await db.execute({
      sql: 'SELECT * FROM prescriptions WHERE user_id = ? ORDER BY medication ASC',
      args: [id],
    });

    return NextResponse.json({
      user: {
        ...user,
        appointments: appointments.rows,
        prescriptions: prescriptions.rows,
      },
    });
  } catch (error) {
    console.error('GET patient error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    await initDb();
    const { id } = await params;
    const { name, email, password, dob, phone, address } = await request.json();

    if (!name || !email) {
      return NextResponse.json(
        { error: 'Name and email are required' },
        { status: 400 }
      );
    }

    const existing = await db.execute({
      sql: 'SELECT id FROM users WHERE id = ?',
      args: [id],
    });

    if (existing.rows.length === 0) {
      return NextResponse.json({ error: 'Patient not found' }, { status: 404 });
    }

    const emailConflict = await db.execute({
      sql: 'SELECT id FROM users WHERE email = ? AND id != ?',
      args: [email, id],
    });

    if (emailConflict.rows.length > 0) {
      return NextResponse.json(
        { error: 'Email already in use by another patient' },
        { status: 409 }
      );
    }

    if (password) {
      await db.execute({
        sql: 'UPDATE users SET name = ?, email = ?, password = ?, dob = ?, phone = ?, address = ? WHERE id = ?',
        args: [name, email, password, dob || null, phone || null, address || null, id],
      });
    } else {
      await db.execute({
        sql: 'UPDATE users SET name = ?, email = ?, dob = ?, phone = ?, address = ? WHERE id = ?',
        args: [name, email, dob || null, phone || null, address || null, id],
      });
    }

    const updated = await db.execute({
      sql: 'SELECT * FROM users WHERE id = ?',
      args: [id],
    });

    const user = { ...updated.rows[0] };
    delete (user as Record<string, unknown>).password;

    return NextResponse.json({ user });
  } catch (error) {
    console.error('PUT patient error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
export async function DELETE(
    request: NextRequest,
    { params }: { params: Promise<{ id: string }> }
  ) {
    try {
      await initDb();
      const { id } = await params;
  
      const existing = await db.execute({
        sql: 'SELECT id FROM users WHERE id = ?',
        args: [id],
      });
  
      if (existing.rows.length === 0) {
        return NextResponse.json({ error: 'Patient not found' }, { status: 404 });
      }
  
      // Delete appointments and prescriptions first
      await db.execute({
        sql: 'DELETE FROM appointments WHERE user_id = ?',
        args: [id],
      });
  
      await db.execute({
        sql: 'DELETE FROM prescriptions WHERE user_id = ?',
        args: [id],
      });
  
      await db.execute({
        sql: 'DELETE FROM users WHERE id = ?',
        args: [id],
      });
  
      return NextResponse.json({ success: true });
    } catch (error) {
      console.error('DELETE patient error:', error);
      return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
    }
  }