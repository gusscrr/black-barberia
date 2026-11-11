import { useEffect, useRef, useState } from 'react';
import { api, duration, initials, longDate, money, nextDays, toISO } from '../api.js';

const STEPS = ['Peluquero', 'Servicio', 'Día', 'Horario', 'Tus datos'];

// preset puede traer { barber, service, date, time } ya elegidos
export default function BookingModal({ preset = {}, onClose }) {
  const [barber, setBarber] = useState(preset.barber || null);
  const [service, setService] = useState(preset.service || null);
  const [date, setDate] = useState(preset.date || '');
  const [time, setTime] = useState(preset.time || '');
  const [result, setResult] = useState(null);
  const [step, setStep] = useState(() => {
    if (preset.time) return 4;
    if (preset.service) return 2;
    if (preset.barber) return 1;
    return 0;
  });
  const sheetRef = useRef(null);

  // Cerrar con Escape y bloquear el scroll de la página de atrás
  useEffect(() => {
    const onKey = (e) => e.key === 'Escape' && onClose();
    document.addEventListener('keydown', onKey);
    document.body.style.overflow = 'hidden';
    return () => {
      document.removeEventListener('keydown', onKey);
      document.body.style.overflow = '';
    };
  }, [onClose]);

  // Al cambiar de paso, volver arriba y enfocar el título
  useEffect(() => {
    sheetRef.current?.scrollTo(0, 0);
    sheetRef.current?.querySelector('h2')?.focus();
  }, [step]);

  const done = step === 5;
  const back = () => step > 0 && !done && setStep(step - 1);

  return (
    <div className="modal" onMouseDown={(e) => e.target === e.currentTarget && onClose()}>
      <div className="sheet" role="dialog" aria-modal="true" aria-label="Reservar turno" ref={sheetRef}>
        <div className="sheetTop">
          <button className="iconBtn" onClick={back} disabled={step === 0 || done} aria-label="Volver">
            <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M15 5l-7 7 7 7" /></svg>
          </button>
          <span className="stepLabel">
            {done ? 'Reserva lista' : `Paso ${step + 1} de 5 · ${STEPS[step]}`}
          </span>
          <button className="iconBtn" onClick={onClose} aria-label="Cerrar">
            <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M6 6l12 12M18 6L6 18" /></svg>
          </button>
        </div>
        <div className="progress" aria-hidden="true">
          {STEPS.map((_, i) => (
            <span key={i} className={i <= step ? 'on' : ''} />
          ))}
        </div>

        {!done && step > 0 && (
          <Recap barber={barber} service={service} date={step > 2 ? date : ''} time={step > 3 ? time : ''} goTo={setStep} />
        )}

        {step === 0 && (
          <StepBarber onPick={(b) => { setBarber(b); setService(null); setStep(1); }} />
        )}
        {step === 1 && (
          <StepService barber={barber} onPick={(s) => { setService(s); setStep(2); }} />
        )}
        {step === 2 && (
          <StepDate value={date} onPick={(d) => { setDate(d); setTime(''); setStep(3); }} />
        )}
        {step === 3 && (
          <StepTime barber={barber} service={service} date={date}
            onPick={(t) => { setTime(t); setStep(4); }}
            onChangeDay={() => setStep(2)} />
        )}
        {step === 4 && (
          <StepData barber={barber} service={service} date={date} time={time}
            onDone={(r) => { setResult(r); setStep(5); }}
            onTaken={() => setStep(3)} />
        )}
        {done && <StepSuccess booking={result.booking} onClose={onClose} />}
      </div>
    </div>
  );
}

// Resumen de lo que ya eligió; cada parte se puede tocar para cambiarla
function Recap({ barber, service, date, time, goTo }) {
  return (
    <div className="recap">
      {barber && <button onClick={() => goTo(0)}>{barber.name}</button>}
      {service && <button onClick={() => goTo(1)}>{service.name}</button>}
      {date && <button onClick={() => goTo(2)}>{longDate(date)}</button>}
      {time && <button onClick={() => goTo(3)}>{time} h</button>}
    </div>
  );
}

// Hook chico para cargar datos de la API
function useApi(url) {
  const [data, setData] = useState(null);
  const [error, setError] = useState('');
  useEffect(() => {
    let alive = true;
    setData(null);
    setError('');
    api(url).then((d) => alive && setData(d)).catch((e) => alive && setError(e.message));
    return () => { alive = false; };
  }, [url]);
  return { data, error };
}

function Loading({ error }) {
  return error ? <div className="error">{error}</div> : <p className="muted">Cargando…</p>;
}

function StepBarber({ onPick }) {
  const { data, error } = useApi('/api/barbers');
  return (
    <>
      <h2 className="stepTitle" tabIndex={-1}>¿Con quién te atendés?</h2>
      {!data ? <Loading error={error} /> : (
        <div className="options">
          {data.map((b) => (
            <button key={b.id} className="option" onClick={() => onPick(b)}>
              <span className="avatar small" aria-hidden="true">{initials(b.name)}</span>
              <span className="optionText">
                <strong>{b.name}</strong>
                <span>{b.bio}</span>
              </span>
            </button>
          ))}
        </div>
      )}
    </>
  );
}

function StepService({ barber, onPick }) {
  const { data, error } = useApi('/api/services?barberId=' + barber.id);
  return (
    <>
      <h2 className="stepTitle" tabIndex={-1}>¿Qué te hacés?</h2>
      {!data ? <Loading error={error} /> : (
        <div className="options">
          {data.map((s) => (
            <button key={s.id} className="option" onClick={() => onPick(s)}>
              <span className="optionText">
                <strong>{s.name}</strong>
                <span>{duration(s.duration)}</span>
              </span>
              <span className="optionPrice">{money(s.price)}</span>
            </button>
          ))}
        </div>
      )}
    </>
  );
}

function StepDate({ value, onPick }) {
  const days = nextDays(21);
  return (
    <>
      <h2 className="stepTitle" tabIndex={-1}>¿Qué día te queda bien?</h2>
      <div className="days">
        {days.map((d, i) => {
          const iso = toISO(d);
          return (
            <button key={iso} className={'day' + (iso === value ? ' on' : '')} onClick={() => onPick(iso)}>
              <span>{i === 0 ? 'Hoy' : i === 1 ? 'Mañana' : d.toLocaleDateString('es-AR', { weekday: 'short' })}</span>
              <strong>{d.getDate()}</strong>
              <span>{d.toLocaleDateString('es-AR', { month: 'short' })}</span>
            </button>
          );
        })}
      </div>
      <label className="field otherDate">
        <span>¿Más adelante? Elegí otra fecha</span>
        <input
          className="input"
          type="date"
          min={toISO(days[0])}
          onChange={(e) => e.target.value && onPick(e.target.value)}
        />
      </label>
    </>
  );
}

const GROUPS = [
  { name: 'Mañana', test: (h) => h < 12 },
  { name: 'Tarde', test: (h) => h >= 12 && h < 18 },
  { name: 'Noche', test: (h) => h >= 18 }
];

function StepTime({ barber, service, date, onPick, onChangeDay }) {
  const { data, error } = useApi(
    `/api/slots?barberId=${barber.id}&serviceId=${service.id}&date=${date}`
  );
  return (
    <>
      <h2 className="stepTitle" tabIndex={-1}>¿A qué hora?</h2>
      <p className="muted">Turnos libres para {longDate(date)}. El servicio dura {duration(service.duration)}.</p>
      {!data ? <Loading error={error} /> : data.slots.length === 0 ? (
        <div className="empty">
          <p>No quedan horarios libres ese día.</p>
          <button className="btn btnLight" onClick={onChangeDay}>Elegir otro día</button>
        </div>
      ) : (
        GROUPS.map((g) => {
          const list = data.slots.filter((t) => g.test(Number(t.slice(0, 2))));
          if (!list.length) return null;
          return (
            <div className="timeGroup" key={g.name}>
              <h3>{g.name}</h3>
              <div className="timeGrid">
                {list.map((t) => (
                  <button key={t} className="time" onClick={() => onPick(t)}>{t}</button>
                ))}
              </div>
            </div>
          );
        })
      )}
    </>
  );
}

function StepData({ barber, service, date, time, onDone, onTaken }) {
  const [form, setForm] = useState({ name: '', phone: '', notes: '' });
  const [errors, setErrors] = useState({});
  const [error, setError] = useState('');
  const [sending, setSending] = useState(false);

  const change = (e) => setForm({ ...form, [e.target.name]: e.target.value });

  async function confirm(e) {
    e.preventDefault();
    const errs = {};
    if (form.name.trim().length < 2) errs.name = 'Escribí tu nombre.';
    if (form.phone.replace(/\D/g, '').length < 8) errs.phone = 'Escribí un teléfono válido, con código de área.';
    setErrors(errs);
    if (Object.keys(errs).length) return;

    setError('');
    setSending(true);
    try {
      const r = await api('/api/bookings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          barberId: barber.id,
          serviceId: service.id,
          customerName: form.name,
          customerPhone: form.phone,
          notes: form.notes,
          date,
          time
        })
      });
      onDone(r);
    } catch (err) {
      setError(err.message);
    } finally {
      setSending(false);
    }
  }

  const taken = error.includes('ocupado');

  return (
    <form onSubmit={confirm} noValidate>
      <h2 className="stepTitle" tabIndex={-1}>Tus datos</h2>
      <p className="muted">Los usamos solo para avisarte si hay algún cambio en el turno.</p>

      <label className="field">
        <span>Nombre y apellido</span>
        <input name="name" className={'input' + (errors.name ? ' bad' : '')} autoComplete="name"
          value={form.name} onChange={change} />
        {errors.name && <small className="fieldError">{errors.name}</small>}
      </label>
      <label className="field">
        <span>Teléfono</span>
        <input name="phone" type="tel" inputMode="tel" className={'input' + (errors.phone ? ' bad' : '')}
          autoComplete="tel" placeholder="Ej: 351 123 4567" value={form.phone} onChange={change} />
        {errors.phone && <small className="fieldError">{errors.phone}</small>}
      </label>
      <label className="field">
        <span>Notas <em>(opcional)</em></span>
        <textarea name="notes" className="input textarea" placeholder="Ej: quiero un degradé bajo"
          value={form.notes} onChange={change} />
      </label>

      <div className="summary">
        <div>
          <strong>{service.name}</strong>
          <span>con {barber.name}</span>
          <span className="cap">{longDate(date)}, {time} h</span>
        </div>
        <strong className="summaryPrice">{money(service.price)}</strong>
      </div>

      {error && (
        <div className="error">
          {error}
          {taken && <button type="button" className="linkBtn" onClick={onTaken}>Ver otros horarios</button>}
        </div>
      )}
      <button className="btn btnDark btnBlock" type="submit" disabled={sending}>
        {sending ? 'Confirmando…' : 'Confirmar turno'}
      </button>
    </form>
  );
}

function StepSuccess({ booking, onClose }) {
  return (
    <div className="success">
      <div className="check" aria-hidden="true">
        <svg viewBox="0 0 24 24"><path d="M5 12.5l4.5 4.5L19 7.5" /></svg>
      </div>
      <h2 className="stepTitle" tabIndex={-1}>Turno confirmado</h2>
      <p className="muted">Te esperamos. Si no podés venir, avisá con tiempo así otro cliente puede usar el horario.</p>
      <div className="ticket">
        <div className="ticketRow"><span>Servicio</span><strong>{booking.service_name}</strong></div>
        <div className="ticketRow"><span>Peluquero</span><strong>{booking.barber_name}</strong></div>
        <div className="ticketRow"><span>Día</span><strong className="cap">{longDate(booking.date)}</strong></div>
        <div className="ticketRow"><span>Hora</span><strong>{booking.time} h</strong></div>
        <div className="ticketRow"><span>Precio</span><strong>{money(booking.price)}</strong></div>
      </div>
      <button className="btn btnDark btnBlock" onClick={onClose}>Listo</button>
    </div>
  );
}
