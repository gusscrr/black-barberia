// =========================================================
// Cuentas de usuario: registro, inicio de sesión y "Mis turnos"
// - Las contraseñas se guardan cifradas con scrypt (nunca en texto)
// - La sesión viaja en una cookie HttpOnly (el navegador no la deja leer por JS)
// =========================================================
import crypto from 'node:crypto';
import { nowLocal } from './time.js';

const COOKIE = 'bb_session';
const SESSION_DAYS = 30;
const MAX_ATTEMPTS = 8;              // intentos de inicio de sesión...
const WINDOW_MS = 10 * 60 * 1000;    // ...cada 10 minutos por IP

// ---------- Contraseñas ----------
function hashPassword(password) {
  const salt = crypto.randomBytes(16).toString('hex');
  const hash = crypto.scryptSync(password, salt, 64).toString('hex');
  return `${salt}:${hash}`;
}
function checkPassword(password, stored) {
  const [salt, hash] = stored.split(':');
  const test = crypto.scryptSync(password, salt, 64);
  return crypto.timingSafeEqual(test, Buffer.from(hash, 'hex'));
}

// ---------- Cookies ----------
function readCookie(req, name) {
  const raw = req.headers.cookie || '';
  const found = raw.split(';').map((c) => c.trim()).find((c) => c.startsWith(name + '='));
  return found ? decodeURIComponent(found.slice(name.length + 1)) : null;
}
function setSessionCookie(res, token) {
  const secure = process.env.NODE_ENV === 'production' ? '; Secure' : '';
  res.setHeader('Set-Cookie',
    `${COOKIE}=${token}; HttpOnly; SameSite=Lax; Path=/; Max-Age=${SESSION_DAYS * 86400}${secure}`);
}
function clearSessionCookie(res) {
  res.setHeader('Set-Cookie', `${COOKIE}=; HttpOnly; SameSite=Lax; Path=/; Max-Age=0`);
}

// ---------- Límite de intentos (evita que prueben contraseñas sin parar) ----------
const attempts = new Map();
function tooManyAttempts(ip) {
  const now = Date.now();
  const list = (attempts.get(ip) || []).filter((t) => now - t < WINDOW_MS);
  attempts.set(ip, list);
  return list.length >= MAX_ATTEMPTS;
}
function addAttempt(ip) {
  attempts.set(ip, [...(attempts.get(ip) || []), Date.now()]);
}

// ---------- Validaciones ----------
const cleanEmail = (e) => String(e || '').trim().toLowerCase();
const isEmail = (e) => /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(e);
const publicUser = (u) => ({ id: u.id, name: u.name, email: u.email, phone: u.phone });

export function setupAuth(app, db) {
  function createSession(res, userId) {
    const token = crypto.randomBytes(32).toString('hex');
    const expires = Date.now() + SESSION_DAYS * 86400 * 1000;
    db.prepare('INSERT INTO sessions (token, user_id, expires_at) VALUES (?, ?, ?)').run(token, userId, expires);
    setSessionCookie(res, token);
  }

  // Devuelve el usuario logueado (o null). Lo usan otras rutas, como la de reservar.
  function currentUser(req) {
    const token = readCookie(req, COOKIE);
    if (!token) return null;
    const row = db.prepare(
      'SELECT u.* FROM sessions s JOIN users u ON u.id = s.user_id WHERE s.token = ? AND s.expires_at > ?'
    ).get(token, Date.now());
    return row || null;
  }

  function requireUser(req, res, next) {
    const user = currentUser(req);
    if (!user) return res.status(401).json({ error: 'Tenés que iniciar sesión.' });
    req.user = user;
    next();
  }

  // Limpia sesiones vencidas al arrancar
  db.prepare('DELETE FROM sessions WHERE expires_at <= ?').run(Date.now());

  // ----- Crear cuenta -----
  app.post('/api/auth/register', (req, res) => {
    const name = String(req.body.name || '').trim();
    const email = cleanEmail(req.body.email);
    const phone = String(req.body.phone || '').trim();
    const password = String(req.body.password || '');

    if (name.length < 2 || name.length > 80) return res.status(400).json({ error: 'Escribí tu nombre y apellido.', field: 'name' });
    if (!isEmail(email) || email.length > 120) return res.status(400).json({ error: 'Escribí un email válido.', field: 'email' });
    if (phone.replace(/\D/g, '').length < 8 || phone.length > 25) return res.status(400).json({ error: 'Escribí tu teléfono con código de área.', field: 'phone' });
    if (password.length < 8) return res.status(400).json({ error: 'La contraseña tiene que tener al menos 8 caracteres.', field: 'password' });
    if (password.length > 200) return res.status(400).json({ error: 'La contraseña es demasiado larga.', field: 'password' });

    const exists = db.prepare('SELECT id FROM users WHERE email = ?').get(email);
    if (exists) return res.status(409).json({ error: 'Ya hay una cuenta con ese email. Iniciá sesión.', field: 'email' });

    const r = db.prepare('INSERT INTO users (name, email, phone, password_hash) VALUES (?, ?, ?, ?)')
      .run(name, email, phone, hashPassword(password));
    const user = db.prepare('SELECT * FROM users WHERE id = ?').get(r.lastInsertRowid);
    createSession(res, user.id);
    res.status(201).json({ user: publicUser(user) });
  });

  // ----- Iniciar sesión -----
  app.post('/api/auth/login', (req, res) => {
    const ip = req.ip || 'local';
    if (tooManyAttempts(ip)) {
      return res.status(429).json({ error: 'Demasiados intentos. Esperá unos minutos y probá de nuevo.' });
    }
    const email = cleanEmail(req.body.email);
    const password = String(req.body.password || '');
    const user = db.prepare('SELECT * FROM users WHERE email = ?').get(email);

    if (!user || !checkPassword(password, user.password_hash)) {
      addAttempt(ip);
      return res.status(401).json({ error: 'El email o la contraseña no son correctos.' });
    }
    attempts.delete(ip);
    createSession(res, user.id);
    res.json({ user: publicUser(user) });
  });

  // ----- Cerrar sesión -----
  app.post('/api/auth/logout', (req, res) => {
    const token = readCookie(req, COOKIE);
    if (token) db.prepare('DELETE FROM sessions WHERE token = ?').run(token);
    clearSessionCookie(res);
    res.json({ ok: true });
  });

  // ----- ¿Quién soy? -----
  app.get('/api/auth/me', (req, res) => {
    const user = currentUser(req);
    res.json({ user: user ? publicUser(user) : null });
  });

  // ----- Mis turnos -----
  app.get('/api/me/bookings', requireUser, (req, res) => {
    const rows = db.prepare(`
      SELECT b.id, b.date, b.time, b.notes, s.name AS service_name, s.duration, s.price, br.name AS barber_name
      FROM bookings b
      JOIN services s ON s.id = b.service_id
      JOIN barbers br ON br.id = b.barber_id
      WHERE b.user_id = ? AND b.status = 'confirmed'
      ORDER BY b.date, b.time
    `).all(req.user.id);
    res.json({ bookings: rows });
  });

  // ----- Cancelar un turno propio (libera el horario) -----
  app.delete('/api/me/bookings/:id', requireUser, (req, res) => {
    const b = db.prepare('SELECT * FROM bookings WHERE id = ? AND user_id = ?').get(Number(req.params.id), req.user.id);
    if (!b) return res.status(404).json({ error: 'No encontramos ese turno.' });
    const now = nowLocal(); // hora de la barbería, no la del servidor
    if (`${b.date} ${b.time}` <= `${now.date} ${now.time}`) return res.status(400).json({ error: 'Ese turno ya pasó.' });
    db.prepare('DELETE FROM bookings WHERE id = ?').run(b.id);
    res.json({ ok: true });
  });

  return { currentUser };
}