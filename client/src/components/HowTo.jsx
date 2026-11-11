import { initials, money, niceDate } from '../api.js';
import './HowTo.css';

// Cómo reservar: 3 pasos, cada uno con una vista previa de la pantalla real
export default function HowTo({ barbers, next }) {
  // Datos reales para las vistas previas (con respaldo si todavía cargan)
  const barber = barbers?.[0];
  const service = barber?.services?.[1] || barber?.services?.[0];
  const sample = {
    initials: barber ? initials(barber.name) : 'KB',
    barber: barber?.name || 'Krosty Barber',
    service: service?.name || 'Corte y Barba',
    price: service ? money(service.price) : '$ 18.000',
    day: next ? niceDate(next.date) : 'Hoy',
    time: next?.time || '18:30'
  };
  const times = nearbyTimes(sample.time);

  const steps = [
    {
      title: 'Elegí peluquero y servicio',
      text: 'Ves el precio y la duración de cada servicio antes de reservar.',
      preview: (
        <div className="pvCard">
          <span className="pvAvatar">{sample.initials}</span>
          <span className="pvText">
            <strong>{sample.service}</strong>
            <span>{sample.barber}</span>
          </span>
          <span className="pvPrice">{sample.price}</span>
        </div>
      )
    },
    {
      title: 'Elegí día y horario',
      text: 'Solo aparecen los horarios que están libres en ese momento.',
      preview: (
        <div className="pvSlots">
          {times.map((t) => (
            <span key={t} className={'pvSlot' + (t === sample.time ? ' on' : '')}>{t}</span>
          ))}
        </div>
      )
    },
    {
      title: 'Confirmá con tu nombre',
      text: 'El turno queda a tu nombre al instante y nadie más puede tomarlo.',
      preview: (
        <div className="pvCard">
          <span className="pvCheck">
            <svg viewBox="0 0 24 24"><path d="M5 12.5l4.5 4.5L19 7.5" /></svg>
          </span>
          <span className="pvText">
            <strong>Turno confirmado</strong>
            <span>{sample.day}, {sample.time} h</span>
          </span>
        </div>
      )
    }
  ];

  return (
    <section className="section" id="reservar">
      <div className="wrap">
        <div className="howHead" data-rv>
          <h2 className="h2">Cómo reservar</h2>
          <p className="sideText">Sin llamadas ni mensajes. Lo hacés desde el celular o la compu en menos de un minuto.</p>
        </div>

        <ol className="howSteps">
          {steps.map((s, i) => (
            <li key={s.title} className="howStep" data-rv style={{ '--rd': `${i * 120}ms` }}>
              <div className="howPreview" aria-hidden="true">{s.preview}</div>
              <div className="howText">
                <span className="howNum">Paso {i + 1}</span>
                <h3>{s.title}</h3>
                <p>{s.text}</p>
              </div>
            </li>
          ))}
        </ol>

      </div>
    </section>
  );
}

// Tres horarios alrededor del elegido, para la vista previa (ej: 18:00, 18:30, 19:00)
function nearbyTimes(time) {
  const [h, m] = time.split(':').map(Number);
  const base = h * 60 + m;
  const pad = (n) => String(n).padStart(2, '0');
  return [-30, 0, 30].map((d) => {
    const t = Math.min(Math.max(base + d, 0), 23 * 60 + 30);
    return `${pad(Math.floor(t / 60))}:${pad(t % 60)}`;
  });
}