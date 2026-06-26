import { createClient } from '@libsql/client';

const db = createClient({
  url: process.env.TURSO_DATABASE_URL || `file:./data/zealthy.db`,
  authToken: process.env.TURSO_AUTH_TOKEN,
});

export async function initDb() {
  await db.executeMultiple(`
    CREATE TABLE IF NOT EXISTS users (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      email TEXT UNIQUE NOT NULL,
      password TEXT NOT NULL,
      dob TEXT,
      phone TEXT,
      address TEXT,
      created_at TEXT DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS appointments (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER NOT NULL,
      provider TEXT NOT NULL,
      datetime TEXT NOT NULL,
      repeat TEXT NOT NULL,
      end_date TEXT,
      created_at TEXT DEFAULT (datetime('now')),
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS prescriptions (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER NOT NULL,
      medication TEXT NOT NULL,
      dosage TEXT NOT NULL,
      quantity INTEGER NOT NULL,
      refill_on TEXT NOT NULL,
      refill_schedule TEXT NOT NULL,
      created_at TEXT DEFAULT (datetime('now')),
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS medications (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT UNIQUE NOT NULL
    );

    CREATE TABLE IF NOT EXISTS dosages (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      value TEXT UNIQUE NOT NULL
    );
  `);

  await seedIfEmpty();
}

async function seedIfEmpty() {
  const result = await db.execute('SELECT COUNT(*) as count FROM users');
  const count = result.rows[0].count as number;
  if (count > 0) return;

  const medications = ['Diovan','Lexapro','Metformin','Ozempic','Prozac','Seroquel','Tegretol'];
  const dosages = ['1mg','2mg','3mg','5mg','10mg','25mg','50mg','100mg','250mg','500mg','1000mg'];

  for (const m of medications) {
    await db.execute({ sql: 'INSERT OR IGNORE INTO medications (name) VALUES (?)', args: [m] });
  }
  for (const d of dosages) {
    await db.execute({ sql: 'INSERT OR IGNORE INTO dosages (value) VALUES (?)', args: [d] });
  }

  // Mark Johnson
  const mark = await db.execute({
    sql: 'INSERT INTO users (name, email, password, dob, phone, address) VALUES (?, ?, ?, ?, ?, ?)',
    args: ['Mark Johnson', 'mark@some-email-provider.net', 'Password123!', '1985-03-12', '+1 (555) 010-1000', '123 Elm St, Portland OR'],
  });
  await db.execute({
    sql: 'INSERT INTO appointments (user_id, provider, datetime, repeat) VALUES (?, ?, ?, ?)',
    args: [mark.lastInsertRowid, 'Dr Kim West', '2026-04-16T16:30:00.000Z', 'weekly'],
  });
  await db.execute({
    sql: 'INSERT INTO appointments (user_id, provider, datetime, repeat) VALUES (?, ?, ?, ?)',
    args: [mark.lastInsertRowid, 'Dr Lin James', '2026-04-19T18:30:00.000Z', 'monthly'],
  });
  await db.execute({
    sql: 'INSERT INTO prescriptions (user_id, medication, dosage, quantity, refill_on, refill_schedule) VALUES (?, ?, ?, ?, ?, ?)',
    args: [mark.lastInsertRowid, 'Lexapro', '5mg', 2, '2026-04-05', 'monthly'],
  });
  await db.execute({
    sql: 'INSERT INTO prescriptions (user_id, medication, dosage, quantity, refill_on, refill_schedule) VALUES (?, ?, ?, ?, ?, ?)',
    args: [mark.lastInsertRowid, 'Ozempic', '1mg', 1, '2026-04-10', 'monthly'],
  });

  // Lisa Smith
  const lisa = await db.execute({
    sql: 'INSERT INTO users (name, email, password, dob, phone, address) VALUES (?, ?, ?, ?, ?, ?)',
    args: ['Lisa Smith', 'lisa@some-email-provider.net', 'Password123!', '1990-07-24', '+1 (555) 020-2000', '456 Oak Ave, Seattle WA'],
  });
  await db.execute({
    sql: 'INSERT INTO appointments (user_id, provider, datetime, repeat) VALUES (?, ?, ?, ?)',
    args: [lisa.lastInsertRowid, 'Dr Sally Field', '2026-04-22T18:15:00.000Z', 'monthly'],
  });
  await db.execute({
    sql: 'INSERT INTO appointments (user_id, provider, datetime, repeat) VALUES (?, ?, ?, ?)',
    args: [lisa.lastInsertRowid, 'Dr Lin James', '2026-04-25T20:00:00.000Z', 'weekly'],
  });
  await db.execute({
    sql: 'INSERT INTO prescriptions (user_id, medication, dosage, quantity, refill_on, refill_schedule) VALUES (?, ?, ?, ?, ?, ?)',
    args: [lisa.lastInsertRowid, 'Metformin', '500mg', 2, '2026-04-15', 'monthly'],
  });
  await db.execute({
    sql: 'INSERT INTO prescriptions (user_id, medication, dosage, quantity, refill_on, refill_schedule) VALUES (?, ?, ?, ?, ?, ?)',
    args: [lisa.lastInsertRowid, 'Diovan', '100mg', 1, '2026-04-25', 'monthly'],
  });
}

export { db };