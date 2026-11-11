// Funciones para hablar con el servidor y dar formato a los datos

export async function api(url, options) {
  const res = await fetch(url, options);
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    const err = new Error(data.error || 'No se pudo conectar con el servidor.');
    err.field = data.field; // campo con el error (si el servidor lo indica)
    throw err;
  }
  return data;
}

export const money = (n) =>
  n === 0
    ? 'Sin cargo'
    : new Intl.NumberFormat('es-AR', { style: 'currency', currency: 'ARS', maximumFractionDigits: 0 }).format(n);

export function duration(min) {
  if (min < 60) return `${min} min`;
  const h = Math.floor(min / 60);
  const m = min % 60;
  return m ? `${h} h ${m} min` : `${h} h`;
}

const pad = (n) => String(n).padStart(2, '0');

// Date -> 'YYYY-MM-DD' (hora local)
export const toISO = (d) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
export const today = () => toISO(new Date());
export const tomorrow = () => {
  const t = new Date();
  return toISO(new Date(t.getFullYear(), t.getMonth(), t.getDate() + 1));
};

// 'YYYY-MM-DD' -> Date local
export function fromISO(s) {
  const [y, m, d] = s.split('-').map(Number);
  return new Date(y, m - 1, d);
}

// Los próximos n días desde hoy
export function nextDays(n) {
  const b = new Date();
  return Array.from({ length: n }, (_, i) => new Date(b.getFullYear(), b.getMonth(), b.getDate() + i));
}

// 'YYYY-MM-DD' -> 'Hoy' / 'Mañana' / 'Jueves 22 de octubre'
export function niceDate(s) {
  if (s === today()) return 'Hoy';
  if (s === tomorrow()) return 'Mañana';
  const txt = fromISO(s).toLocaleDateString('es-AR', { weekday: 'long', day: 'numeric', month: 'long' });
  return txt.charAt(0).toUpperCase() + txt.slice(1).replace(',', '');
}

export const initials = (name) =>
  name.split(' ').slice(0, 2).map((w) => w[0]).join('').toUpperCase();

export const firstName = (name) => name.split(' ')[0];

// El servicio más corto de un barbero (para buscar el próximo turno libre)
export const shortest = (services = []) => [...services].sort((a, b) => a.duration - b.duration)[0];

// Link para agregar el turno a Google Calendar
export function calendarLink({ title, date, time, minutes, details }) {
  const [h, m] = time.split(':').map(Number);
  const start = fromISO(date);
  start.setHours(h, m);
  const end = new Date(start.getTime() + minutes * 60000);
  const f = (d) => `${toISO(d).replaceAll('-', '')}T${pad(d.getHours())}${pad(d.getMinutes())}00`;
  const q = new URLSearchParams({
    action: 'TEMPLATE',
    text: title,
    dates: `${f(start)}/${f(end)}`,
    details
  });
  return 'https://calendar.google.com/calendar/render?' + q.toString();
}