import { DatabaseSync } from 'node:sqlite';
import fs from 'node:fs';
import path from 'node:path';

const dbFile = process.env.DB_FILE || './data/black-barberia.db';
fs.mkdirSync(path.dirname(path.resolve(dbFile)), { recursive: true });
const db = new DatabaseSync(dbFile);
db.exec('PRAGMA journal_mode = WAL');
db.exec('PRAGMA foreign_keys = ON');

db.exec(`
CREATE TABLE IF NOT EXISTS barbers (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT NOT NULL,
  phone TEXT NOT NULL,
  image TEXT DEFAULT '',
  bio TEXT DEFAULT '',
  active INTEGER NOT NULL DEFAULT 1
);
CREATE TABLE IF NOT EXISTS services (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  barber_id INTEGER NOT NULL REFERENCES barbers(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  duration INTEGER NOT NULL DEFAULT 30,
  price INTEGER NOT NULL DEFAULT 0,
  active INTEGER NOT NULL DEFAULT 1
);
CREATE TABLE IF NOT EXISTS bookings (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  barber_id INTEGER NOT NULL REFERENCES barbers(id),
  service_id INTEGER NOT NULL REFERENCES services(id),
  customer_name TEXT NOT NULL,
  customer_phone TEXT NOT NULL,
  notes TEXT DEFAULT '',
  date TEXT NOT NULL,
  time TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'confirmed',
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(barber_id, date, time)
);
CREATE TABLE IF NOT EXISTS blocked_slots (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  barber_id INTEGER NOT NULL REFERENCES barbers(id) ON DELETE CASCADE,
  date TEXT NOT NULL,
  time TEXT NOT NULL,
  reason TEXT DEFAULT '',
  UNIQUE(barber_id, date, time)
);
CREATE TABLE IF NOT EXISTS users (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT NOT NULL,
  email TEXT NOT NULL UNIQUE,
  phone TEXT NOT NULL,
  password_hash TEXT NOT NULL,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE TABLE IF NOT EXISTS sessions (
  token TEXT PRIMARY KEY,
  user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  expires_at INTEGER NOT NULL
);
CREATE TABLE IF NOT EXISTS settings (
  key TEXT PRIMARY KEY,
  value TEXT NOT NULL
);
`);

// Si la base ya existía, agregarle a los turnos la columna del usuario
const bookingCols = db.prepare('PRAGMA table_info(bookings)').all().map((c) => c.name);
if (!bookingCols.includes('user_id')) {
  db.exec('ALTER TABLE bookings ADD COLUMN user_id INTEGER REFERENCES users(id)');
}

const count = db.prepare('SELECT COUNT(*) AS n FROM barbers').get().n;
if (count === 0) {
  const insertBarber = db.prepare('INSERT INTO barbers (name, phone, image, bio) VALUES (?, ?, ?, ?)');
  const krosty = insertBarber.run('Krosty Barber', '5490000000000', '', 'Es muy importante respetar el tiempo del otro.');
  const eri = insertBarber.run('Eri', '5490000000000', '', 'Color, corte y tratamientos.');
  const insertService = db.prepare('INSERT INTO services (barber_id,name,duration,price) VALUES (?,?,?,?)');
  insertService.run(krosty.lastInsertRowid, 'Corte Masculino', 30, 15000);
  insertService.run(krosty.lastInsertRowid, 'Corte y Barba', 30, 18000);
  insertService.run(krosty.lastInsertRowid, 'Barba', 30, 10000);
  insertService.run(krosty.lastInsertRowid, 'Corte femenino', 30, 17000);
  insertService.run(krosty.lastInsertRowid, 'Corte + barba + lavado', 60, 20000);
  insertService.run(eri.lastInsertRowid, 'Prueba de mecha', 60, 0);
  insertService.run(eri.lastInsertRowid, 'Corte femenino + lavado', 120, 25000);
  insertService.run(eri.lastInsertRowid, 'Colores fantasía con decoloración', 240, 50000);
  insertService.run(eri.lastInsertRowid, 'Colores fantasía sin decoloración', 240, 40000);
  insertService.run(eri.lastInsertRowid, 'Alisado sin formol', 240, 70000);
  insertService.run(eri.lastInsertRowid, 'Nutriciones', 90, 35000);
}

export default db;