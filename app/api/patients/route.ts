import { NextRequest, NextResponse } from 'next/server';
import { db, initDb } from '@/lib/db';

export async function GET() {
  try {
    await initDb();

    const result = await db.execute(`
      SELECT 
        u.id,
        u.name,
        u.email,
        u.dob,
        u.phone,
        u.address,
        u.created_at,
        COUNT(DISTINCT a.id) as appointment_count,
        COUNT(DISTINCT p.id) as prescription_count
      FROM users u
      LEFT JOIN appointments a ON a.user_id = u.id
      LEFT JOIN prescriptions p ON p.user_id = u.id
      GROUP BY u.id
      ORDER BY u.name ASC
    `);

    return NextResponse.json({ users: result.rows });
  } catch (error) {
    console.error('GET patients error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    await initDb();
    const { name, email, password, dob, phone, address } = await request.json();

    if (!name || !email || !password) {
      return NextResponse.json(
        { error: 'Name, email and password are required' },
        { status: 400 }
      );
    }

    const existing = await db.execute({
      sql: 'SELECT id FROM users WHERE email = ?',
      args: [email],
    });

    if (existing.rows.length > 0) {
      return NextResponse.json(
        { error: 'A patient with this email already exists' },
        { status: 409 }
      );
    }

    const result = await db.execute({
      sql: 'INSERT INTO users (name, email, password, dob, phone, address) VALUES (?, ?, ?, ?, ?, ?)',
      args: [name, email, password, dob || null, phone || null, address || null],
    });

    const newUser = await db.execute({
      sql: 'SELECT * FROM users WHERE id = ?',
      args: [result.lastInsertRowid],
    });

    return NextResponse.json({ user: newUser.rows[0] }, { status: 201 });
  } catch (error) {
    console.error('POST patient error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}