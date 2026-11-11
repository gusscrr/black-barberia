// =========================================================
// Hora de la barbería
// El servidor puede estar en cualquier país (en internet suelen usar la hora UTC),
// así que siempre calculamos "hoy" y "ahora" con la zona horaria de la barbería.
// =========================================================

export const TIMEZONE = process.env.TIMEZONE || 'America/Argentina/Buenos_Aires';

const fmt = new Intl.DateTimeFormat('en-CA', {
  timeZone: TIMEZONE,
  year: 'numeric', month: '2-digit', day: '2-digit',
  hour: '2-digit', minute: '2-digit', hourCycle: 'h23'
});

const pad = (n) => String(n).padStart(2, '0');

// Fecha y hora actual en la barbería: { date: 'YYYY-MM-DD', time: 'HH:MM', minutes }
export function nowLocal() {
  const p = Object.fromEntries(fmt.formatToParts(new Date()).map((x) => [x.type, x.value]));
  const date = `${p.year}-${p.month}-${p.day}`;
  const time = `${p.hour}:${p.minute}`;
  return { date, time, minutes: Number(p.hour) * 60 + Number(p.minute) };
}

// Suma días a una fecha 'YYYY-MM-DD' (sin problemas de zona horaria)
export function addDays(date, days) {
  const [y, m, d] = date.split('-').map(Number);
  const t = new Date(Date.UTC(y, m - 1, d + days));
  return `${t.getUTCFullYear()}-${pad(t.getUTCMonth() + 1)}-${pad(t.getUTCDate())}`;
}

// ¿Es una fecha real con formato 'YYYY-MM-DD'? (rechaza cosas como 2026-02-31)
export function isValidDate(date) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(String(date))) return false;
  return addDays(date, 0) === date;
}

// 'HH:MM' <-> minutos desde las 00:00
export const toMinutes = (time) => Number(time.slice(0, 2)) * 60 + Number(time.slice(3, 5));
export const toTime = (minutes) => `${pad(Math.floor(minutes / 60))}:${pad(minutes % 60)}`;