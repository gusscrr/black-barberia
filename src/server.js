import 'dotenv/config';
import express from 'express';
import crypto from 'node:crypto';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import db from './db.js';
import { notifyBarber } from './whatsapp.js';
import { setupAuth } from './auth.js';
import { TIMEZONE, nowLocal, addDays, isValidDate, toMinutes, toTime } from './time.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const app = express();
const PORT = Number(process.env.PORT || 3000);

// ---------- Reglas de la agenda ----------
const OPEN = 9 * 60;          // abre 9:00
const CLOSE = 21 * 60;        // cierra 21:00
const STEP = 30;              // turnos cada 30 minutos
const MAX_DAYS = 60;          // se puede reservar hasta 2 meses antes
const MAX_PER_PHONE = 3;      // turnos futuros por teléfono (evita que llenen la agenda)
const LIMITS = { name: 80, phone: 25, notes: 300 };

// ---------- Clave de administrador ----------
// Si falta, es la de ejemplo o es muy corta, el panel de admin queda apagado.
const ADMIN_KEY = String(process.env.ADMIN_KEY || '');
const ADMIN_ON = ADMIN_KEY.length >= 12 && ADMIN_KEY !== 'cambia-esta-clave';
if (!ADMIN_ON) {
  console.warn('⚠️  ADMIN_KEY no configurada (o es la de ejemplo): las rutas /api/admin quedan desactivadas.');
  console.warn('    Poné en el .env una clave de 12 caracteres o más, por ejemplo: ADMIN_KEY=' + crypto.randomBytes(12).toString('hex'));
}

app.use(express.json({ limit: '10kb' }));   // nadie necesita mandar más que esto
app.set('trust proxy', 'loopback');
// Frontend React ya compilado (npm run build). En Vercel lo sirve /public directo.
const CLIENT_DIST = path.join(__dirname, '../public');
app.use(express.static(CLIENT_DIST));

// Cuentas de usuario (registro, login, mis turnos)
const { currentUser } = setupAuth(app, db);

// ---------- Límite de reservas por IP (evita que llenen la agenda con un programa) ----------
const BOOK_MAX = 10;
const BOOK_WINDOW = 15 * 60 * 1000;
const bookHits = new Map();
function tooManyBookings(ip) {
  const now = Date.now();
  const list = (bookHits.get(ip) || []).filter((t) => now - t < BOOK_WINDOW);
  bookHits.set(ip, list);
  return list.length >= BOOK_MAX;
}
const addBookingHit = (ip) => bookHits.set(ip, [...(bookHits.get(ip) || []), Date.now()]);

// ---------- Horarios libres ----------
// Cada turno ocupa TODOS los bloques de 30 min que dura su servicio
// (un servicio de 1 h a las 10:00 ocupa 10:00 y 10:30).
function busyBlocks(barberId, date) {
  const busy = new Set();
  const rows = db.prepare(`
    SELECT b.time, s.duration FROM bookings b
    JOIN services s ON s.id = b.service_id
    WHERE b.barber_id = ? AND b.date = ? AND b.status = 'confirmed'
  `).all(barberId, date);
  for (const r of rows) {
    const start = toMinutes(r.time);
    for (let m = start; m < start + r.duration; m += STEP) busy.add(m);
  }
  for (const r of db.prepare('SELECT time FROM blocked_slots WHERE barber_id = ? AND date = ?').all(barberId, date)) {
    busy.add(toMinutes(r.time));
  }
  return busy;
}

function getSlots(barberId, date, duration) {
  const now = nowLocal();
  if (date < now.date || date > addDays(now.date, MAX_DAYS)) return [];
  const minStart = date === now.date ? now.minutes : -1;   // hoy: solo horarios que no pasaron
  const busy = busyBlocks(barberId, date);
  const out = [];
  for (let m = OPEN; m + duration <= CLOSE; m += STEP) {
    if (m <= minStart) continue;
    let free = true;
    for (let x = m; x < m + duration; x += STEP) {
      if (busy.has(x)) { free = false; break; }
    }
    if (free) out.push(toTime(m));
  }
  return out;
}

app.get('/api/barbers', (_req, res) => {
  res.json(db.prepare('SELECT id,name,phone,image,bio FROM barbers WHERE active=1 ORDER BY id').all());
});

app.get('/api/services', (req, res) => {
  const barberId = Number(req.query.barberId);
  if (!barberId) return res.status(400).json({ error: 'barberId requerido' });
  res.json(db.prepare('SELECT id,name,duration,price FROM services WHERE barber_id=? AND active=1 ORDER BY id').all(barberId));
});

app.get('/api/slots', (req, res) => {
  const barberId = Number(req.query.barberId);
  const serviceId = Number(req.query.serviceId);
  const date = String(req.query.date || '');
  if (!barberId || !serviceId || !isValidDate(date)) return res.status(400).json({ error: 'Datos inválidos' });
  const service = db.prepare('SELECT duration FROM services WHERE id=? AND barber_id=? AND active=1').get(serviceId, barberId);
  if (!service) return res.status(404).json({ error: 'Servicio no encontrado' });
  res.json({ date, slots: getSlots(barberId, date, service.duration) });
});

app.post('/api/bookings', async (req, res) => {
  const ip = req.ip || 'local';
  if (tooManyBookings(ip)) {
    return res.status(429).json({ error: 'Hiciste muchas reservas seguidas. Esperá unos minutos y probá de nuevo.' });
  }

  const body = req.body || {};
  const barberId = Number(body.barberId);
  const serviceId = Number(body.serviceId);
  const customerName = String(body.customerName || '').trim();
  const customerPhone = String(body.customerPhone || '').trim();
  const notes = String(body.notes || '').trim();
  const date = String(body.date || '');
  const time = String(body.time || '');
  const phoneDigits = customerPhone.replace(/\D/g, '');

  // Validaciones (el navegador ya las hace, pero el servidor no confía en nadie)
  if (!barberId || !serviceId || !date || !time) return res.status(400).json({ error: 'Completá todos los datos obligatorios.' });
  if (customerName.length < 2 || customerName.length > LIMITS.name) return res.status(400).json({ error: 'Escribí tu nombre y apellido.', field: 'name' });
  if (phoneDigits.length < 8 || phoneDigits.length > 15 || customerPhone.length > LIMITS.phone) return res.status(400).json({ error: 'Escribí tu teléfono con código de área.', field: 'phone' });
  if (notes.length > LIMITS.notes) return res.status(400).json({ error: `Las notas pueden tener hasta ${LIMITS.notes} caracteres.`, field: 'notes' });
  if (!isValidDate(date) || !/^\d{2}:\d{2}$/.test(time)) return res.status(400).json({ error: 'La fecha o la hora no son válidas.' });

  const now = nowLocal();
  if (date > addDays(now.date, MAX_DAYS)) return res.status(400).json({ error: 'Podés reservar con hasta 2 meses de anticipación.' });

  const barber = db.prepare('SELECT * FROM barbers WHERE id=? AND active=1').get(barberId);
  const service = db.prepare('SELECT * FROM services WHERE id=? AND barber_id=? AND active=1').get(serviceId, barberId);
  if (!barber || !service) return res.status(404).json({ error: 'Barbero o servicio no encontrado.' });

  // Máximo de turnos futuros por teléfono
  const upcoming = db.prepare(`
    SELECT customer_phone FROM bookings
    WHERE status = 'confirmed' AND (date > ? OR (date = ? AND time > ?))
  `).all(now.date, now.date, now.time).filter((b) => b.customer_phone.replace(/\D/g, '') === phoneDigits).length;
  if (upcoming >= MAX_PER_PHONE) {
    return res.status(409).json({ error: `Ya tenés ${MAX_PER_PHONE} turnos reservados con este teléfono. Si necesitás otro, cancelá uno o escribinos.` });
  }

  addBookingHit(ip);

  // Revisar y guardar en el mismo paso (nada se mete en el medio)
  let booking;
  try {
    db.exec('BEGIN IMMEDIATE');
    if (!getSlots(barberId, date, service.duration).includes(time)) {
      db.exec('ROLLBACK');
      return res.status(409).json({ error: 'Ese horario acaba de ser ocupado. Elegí otro.' });
    }
    const user = currentUser(req); // si está logueado, el turno queda en su cuenta
    const result = db.prepare(`INSERT INTO bookings (barber_id,service_id,customer_name,customer_phone,notes,date,time,user_id) VALUES (?,?,?,?,?,?,?,?)`)
      .run(barberId, serviceId, customerName, customerPhone, notes, date, time, user ? user.id : null);
    db.exec('COMMIT');
    booking = db.prepare('SELECT * FROM bookings WHERE id=?').get(result.lastInsertRowid);
  } catch (e) {
    try { db.exec('ROLLBACK'); } catch { /* ya estaba cerrada */ }
    if (String(e.message).includes('UNIQUE')) return res.status(409).json({ error: 'Ese horario acaba de ser ocupado. Elegí otro.' });
    console.error('Reserva:', e.message);
    return res.status(500).json({ error: 'No pudimos guardar el turno. Probá de nuevo en un momento.' });
  }

  let whatsapp = { sent: false };
  try { whatsapp = await notifyBarber({ barber, booking, service }); }
  catch (e) { console.error('WhatsApp:', e.message); whatsapp = { sent: false, error: e.message }; }

  res.status(201).json({ ok: true, booking: { ...booking, barber_name: barber.name, service_name: service.name, price: service.price }, whatsapp });
});

// ---------- Administración ----------
function admin(req, res, next) {
  if (!ADMIN_ON) return res.status(503).json({ error: 'Panel desactivado: configurá ADMIN_KEY en el .env.' });
  const sent = Buffer.from(String(req.headers['x-admin-key'] || ''));
  const real = Buffer.from(ADMIN_KEY);
  // Comparación segura (no deja adivinar la clave por el tiempo de respuesta)
  if (sent.length !== real.length || !crypto.timingSafeEqual(sent, real)) {
    return res.status(401).json({ error: 'No autorizado' });
  }
  next();
}
app.get('/api/admin/bookings', admin, (req, res) => {
  const date = req.query.date;
  if (date && !isValidDate(date)) return res.status(400).json({ error: 'Fecha inválida' });
  const sql = `SELECT b.*, br.name barber_name, s.name service_name, s.price, s.duration FROM bookings b JOIN barbers br ON br.id=b.barber_id JOIN services s ON s.id=b.service_id ${date ? 'WHERE b.date=?' : 'WHERE 1=1'} ORDER BY b.date,b.time`;
  res.json(date ? db.prepare(sql).all(date) : db.prepare(sql).all());
});
app.post('/api/admin/block', admin, (req, res) => {
  const { barberId, date, time, reason = '' } = req.body || {};
  if (!Number(barberId) || !isValidDate(date) || !/^\d{2}:\d{2}$/.test(String(time))) return res.status(400).json({ error: 'Datos inválidos' });
  try {
    db.prepare('INSERT INTO blocked_slots(barber_id,date,time,reason) VALUES(?,?,?,?)').run(Number(barberId), date, time, String(reason).slice(0, 120));
    res.json({ ok: true });
  } catch (e) { res.status(409).json({ error: 'Ese horario ya está bloqueado.' }); }
});
app.delete('/api/admin/block', admin, (req, res) => {
  const { barberId, date, time } = req.body || {};
  db.prepare('DELETE FROM blocked_slots WHERE barber_id=? AND date=? AND time=?').run(Number(barberId), String(date), String(time));
  res.json({ ok: true });
});

// Cualquier otra ruta que no sea /api devuelve la app de React
app.use((req, res, next) => {
  if (req.method !== 'GET' || req.path.startsWith('/api')) return next();
  res.sendFile(path.join(CLIENT_DIST, 'index.html'), (err) => {
    if (err) res.status(404).send('Frontend no compilado. Ejecutá: npm run build (o usá npm run dev y entrá a http://localhost:5173)');
  });
});

// Si algo falla, respuesta prolija (sin mostrar detalles internos)
app.use((err, _req, res, _next) => {
  if (err.type === 'entity.too.large') return res.status(413).json({ error: 'Los datos enviados son demasiado largos.' });
  if (err.type === 'entity.parse.failed') return res.status(400).json({ error: 'Datos inválidos.' });
  console.error(err);
  res.status(500).json({ error: 'Algo salió mal. Probá de nuevo en un momento.' });
});

// En tu compu arranca el servidor. En Vercel lo maneja Vercel.
if (!process.env.VERCEL) {
  app.listen(PORT, () => console.log(`Black Barberia: http://localhost:${PORT} (hora de ${TIMEZONE})`));
}

export default app;