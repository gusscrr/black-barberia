import { useEffect, useRef, useState } from 'react';
import {
  api, calendarLink, duration, firstName, fromISO, initials, money, niceDate, toISO, today, tomorrow
} from '../api.js';
import './Booking.css';

const STEPS = ['Peluquero', 'Servicio', 'Día', 'Horario', 'Tus datos'];

// Panel lateral de reserva. preset puede traer { barber, service, date, time }
// o { wanted: 'Nombre del servicio' } (desde la cinta): primero se elige peluquero
export default function Booking({ preset = {}, barbers, user, onAuth, onClose }) {
  const [barber, setBarber] = useState(preset.barber || null);
  const [service, setService] = useState(preset.service || null);
  const [date, setDate] = useState(preset.date || '');
  const [time, setTime] = useState(preset.time || '');
  const wanted = preset.wanted || null; // servicio elegido desde la cinta
  const [done, setDone] = useState(null);
  const [step, setStep] = useState(preset.time ? 4 : preset.service ? 2 : preset.barber ? 1 : 0);
  const [closing, setClosing] = useState(false);
  const bodyRef = useRef(null);

  const close = () => {
    setClosing(true);
    setTimeout(onClose, 220);
  };

  // Escape para cerrar + bloquear el scroll de la página
  useEffect(() => {
    // Si hay otra ventana abierta encima (login), Escape la cierra a ella primero
    const onKey = (e) => e.key === 'Escape' && !document.querySelector('.authOverlay') && close();
    document.addEventListener('keydown', onKey);
    document.body.style.overflow = 'hidden';
    return () => {
      document.removeEventListener('keydown', onKey);
      document.body.style.overflow = '';
    };
  }, []);

  // Cada vez que cambia el paso: arriba de todo y foco en el título
  useEffect(() => {
    bodyRef.current?.scrollTo(0, 0);
    bodyRef.current?.querySelector('h2')?.focus();
  }, [step, done]);

  const go = (n) => setStep(n);

  return (
    <div className={'overlay' + (closing ? ' out' : '')} onMouseDown={(e) => e.target === e.currentTarget && close()}>
      <aside className="drawer" role="dialog" aria-modal="true" aria-labelledby="drawerTitle">
        <header className="drawerHead">
          <button className="iconBtn" onClick={() => go(step - 1)} disabled={step === 0 || !!done} aria-label="Paso anterior">
            <Icon d="M15 5l-7 7 7 7" />
          </button>
          <div className="drawerTitle">
            <p id="drawerTitle">Reservar turno</p>
            <span>{done ? 'Confirmado' : `Paso ${step + 1} de ${STEPS.length}`}</span>
          </div>
          <button className="iconBtn" onClick={close} aria-label="Cerrar">
            <Icon d="M6 6l12 12M18 6L6 18" />
          </button>
        </header>
        <div className="bar" aria-hidden="true">
          <span style={{ width: `${done ? 100 : ((step + 1) / STEPS.length) * 100}%` }} />
        </div>

        <div className="drawerBody" ref={bodyRef}>
          {done ? (
            <Success booking={done} service={service} onClose={close} />
          ) : (
            <>
              {step === 0 && (
                <PickBarber barbers={barbers} current={barber} wanted={wanted}
                  onPick={(b, offer) => {
                    setBarber(b);
                    // Desde la cinta: el servicio ya queda elegido y pasa directo al calendario
                    if (offer) { setService(offer); go(2); return; }
                    if (b.id !== barber?.id) setService(null);
                    go(1);
                  }} />
              )}
              {step === 1 && (
                <PickService barber={barber} current={service} onPick={(s) => { setService(s); go(2); }} />
              )}
              {step === 2 && (
                <PickDay current={date} onPick={(d) => { setDate(d); setTime(''); go(3); }} />
              )}
              {step === 3 && (
                <PickTime barber={barber} service={service} date={date} current={time}
                  onPick={(t) => { setTime(t); go(4); }} onOtherDay={() => go(2)} />
              )}
              {step === 4 && (
                <Details barber={barber} service={service} date={date} time={time}
                  user={user} onAuth={onAuth} onDone={setDone} onTaken={() => go(3)} />
              )}
            </>
          )}
        </div>

        {!done && step > 0 && barber && (
          <footer className="drawerFoot" aria-label="Resumen de tu reserva">
            <span className="sumAvatar" aria-hidden="true">{initials(barber.name)}</span>
            <div className="sumText">
              <p className="sumMain">{service ? service.name : barber.name}</p>
              <p className="sumSub">
                {[
                  service && barber.name,
                  step > 2 && date && shortDate(date),
                  step > 3 && time && `${time} h`,
                  service && duration(service.duration)
                ].filter(Boolean).join(' · ') || 'Elegí un servicio'}
              </p>
            </div>
            {service && <strong className="sumPrice">{money(service.price)}</strong>}
          </footer>
        )}
      </aside>
    </div>
  );
}

function Icon({ d }) {
  return <svg className="icon" viewBox="0 0 24 24" aria-hidden="true"><path d={d} /></svg>;
}

// Indicador a la derecha de cada opción: flecha, o tilde si está elegida
function ChoiceEnd({ on }) {
  return (
    <span className={'choiceEnd' + (on ? ' on' : '')} aria-hidden="true">
      <svg viewBox="0 0 24 24"><path d={on ? 'M6.5 12.5l3.5 3.5 7.5-8' : 'M10 7l5 5-5 5'} /></svg>
    </span>
  );
}

// 'YYYY-MM-DD' -> 'Hoy' / 'Mañana' / 'Jue 22 oct'
function shortDate(iso) {
  if (iso === today()) return 'Hoy';
  if (iso === tomorrow()) return 'Mañana';
  const t = fromISO(iso).toLocaleDateString('es-AR', { weekday: 'short', day: 'numeric', month: 'short' }).replace(/\./g, '').replace(',', '');
  return t.charAt(0).toUpperCase() + t.slice(1);
}

// Carga datos de la API
function useApi(url) {
  const [data, setData] = useState(null);
  const [error, setError] = useState('');
  useEffect(() => {
    if (!url) return;
    let alive = true;
    setData(null);
    setError('');
    api(url).then((d) => alive && setData(d)).catch((e) => alive && setError(e.message));
    return () => { alive = false; };
  }, [url]);
  return { data, error };
}

function Title({ children, sub }) {
  return (
    <div className="stepHead">
      <h2 tabIndex={-1}>{children}</h2>
      {sub && <p>{sub}</p>}
    </div>
  );
}

function Skeleton({ rows = 4, error }) {
  if (error) return <p className="notice">{error}</p>;
  return Array.from({ length: rows }, (_, i) => <div className="skelCard" key={i} />);
}

function PickBarber({ barbers, current, wanted, onPick }) {
  const { data, error } = useApi(barbers ? null : '/api/barbers');
  const list = barbers || data;

  // Desde la cinta: ¿este peluquero hace el servicio elegido?
  const offerOf = (b) => (b.services || []).find((s) => s.name === wanted);

  return (
    <>
      {wanted ? (
        <div className="stepHead">
          <span className="wantedTag">{wanted}</span>
          <h2 tabIndex={-1}>¿Con quién te lo hacés?</h2>
          <p>Te mostramos quién hace este servicio.</p>
        </div>
      ) : (
        <Title sub="Elegí con quién te querés atender.">Peluquero</Title>
      )}
      <div className="choices">
        {!list ? <Skeleton rows={2} error={error} /> : list.map((b) => {
          const offer = wanted ? offerOf(b) : null;
          const blocked = wanted && !offer; // no hace este servicio: queda bloqueado
          const on = current?.id === b.id && !blocked;
          return (
            <button key={b.id} className={'choice' + (on ? ' on' : '') + (blocked ? ' blocked' : '')}
              disabled={blocked} onClick={() => onPick(b, offer)}>
              <span className="mono" aria-hidden="true">{initials(b.name)}</span>
              <span className="choiceText">
                <strong>{b.name}</strong>
                <span>
                  {blocked ? 'No hace este servicio'
                    : offer ? `${duration(offer.duration)} · ${money(offer.price)}`
                    : b.bio}
                </span>
              </span>
              {blocked
                ? <span className="choiceLock" aria-hidden="true">No disponible</span>
                : <ChoiceEnd on={on} />}
            </button>
          );
        })}
      </div>
    </>
  );
}

function PickService({ barber, current, onPick }) {
  const { data, error } = useApi(barber.services ? null : '/api/services?barberId=' + barber.id);
  const list = barber.services || data;
  return (
    <>
      <Title sub={`Servicios de ${firstName(barber.name)}.`}>Servicio</Title>
      <div className="choices">
        {!list ? <Skeleton error={error} /> : list.map((s) => (
          <button key={s.id} className={'choice' + (current?.id === s.id ? ' on' : '')} onClick={() => onPick(s)}>
            <span className="choiceText">
              <strong>{s.name}</strong>
              <span>{duration(s.duration)}</span>
            </span>
            <span className="choicePrice">{money(s.price)}</span>
            <ChoiceEnd on={current?.id === s.id} />
          </button>
        ))}
      </div>
    </>
  );
}

const WEEKDAYS = ['Lu', 'Ma', 'Mi', 'Ju', 'Vi', 'Sá', 'Do'];
const MAX_DAYS = 60; // se puede reservar hasta 2 meses antes

// Calendario mensual: días pasados deshabilitados, hoy marcado con un punto
function PickDay({ current, onPick }) {
  const now = new Date();
  const todayISO = today();
  const maxISO = toISO(new Date(now.getFullYear(), now.getMonth(), now.getDate() + MAX_DAYS));
  const firstMonth = new Date(now.getFullYear(), now.getMonth(), 1);
  const lastMonth = new Date(now.getFullYear(), now.getMonth(), now.getDate() + MAX_DAYS);
  lastMonth.setDate(1);

  const start = current ? fromISO(current) : now;
  const [view, setView] = useState(new Date(start.getFullYear(), start.getMonth(), 1));
  const y = view.getFullYear();
  const m = view.getMonth();

  // Lugares vacíos antes del día 1 (la semana empieza el lunes)
  const blanks = (view.getDay() + 6) % 7;
  const total = new Date(y, m + 1, 0).getDate();
  const cells = [
    ...Array(blanks).fill(null),
    ...Array.from({ length: total }, (_, i) => new Date(y, m, i + 1))
  ];

  const canPrev = view > firstMonth;
  const canNext = view < lastMonth;
  const month = view.toLocaleDateString('es-AR', { month: 'long' });
  const monthName = `${month.charAt(0).toUpperCase() + month.slice(1)} ${y}`;

  return (
    <>
      <Title sub="Podés reservar con hasta 2 meses de anticipación.">Día</Title>

      <div className="quick">
        <button className={'quickBtn' + (current === todayISO ? ' on' : '')} onClick={() => onPick(todayISO)}>Hoy</button>
        <button className={'quickBtn' + (current === tomorrow() ? ' on' : '')} onClick={() => onPick(tomorrow())}>Mañana</button>
      </div>

      <div className="cal">
        <div className="calHead">
          <p className="calMonth">{monthName}</p>
          <div className="calNav">
            <button className="iconBtn" disabled={!canPrev} onClick={() => setView(new Date(y, m - 1, 1))} aria-label="Mes anterior">
              <Icon d="M15 5l-7 7 7 7" />
            </button>
            <button className="iconBtn" disabled={!canNext} onClick={() => setView(new Date(y, m + 1, 1))} aria-label="Mes siguiente">
              <Icon d="M9 5l7 7-7 7" />
            </button>
          </div>
        </div>

        <div className="calGrid">
          {WEEKDAYS.map((w) => <span className="calWd" key={w}>{w}</span>)}
          {cells.map((d, i) => {
            if (!d) return <span key={'b' + i} />;
            const iso = toISO(d);
            const off = iso < todayISO || iso > maxISO;
            const cls = 'calDay' + (iso === current ? ' on' : '') + (iso === todayISO ? ' today' : '');
            return (
              <button key={iso} className={cls} disabled={off} onClick={() => onPick(iso)}
                aria-label={niceDate(iso)} aria-pressed={iso === current}>
                {d.getDate()}
              </button>
            );
          })}
        </div>
      </div>
    </>
  );
}

const PARTS = [
  { name: 'Mañana', from: 0, to: 12 },
  { name: 'Tarde', from: 12, to: 18 },
  { name: 'Noche', from: 18, to: 24 }
];

function PickTime({ barber, service, date, current, onPick, onOtherDay }) {
  const { data, error } = useApi(`/api/slots?barberId=${barber.id}&serviceId=${service.id}&date=${date}`);
  return (
    <>
      <Title sub={`${niceDate(date)}. El servicio dura ${duration(service.duration)}.`}>Horario</Title>
      {!data ? <Skeleton rows={3} error={error} /> : data.slots.length === 0 ? (
        <div className="empty">
          <p>No quedan horarios libres para este día.</p>
          <button className="btn btnBlack" onClick={onOtherDay}>Elegir otro día</button>
        </div>
      ) : (
        PARTS.map((p) => {
          const list = data.slots.filter((t) => {
            const h = Number(t.slice(0, 2));
            return h >= p.from && h < p.to;
          });
          if (!list.length) return null;
          return (
            <div className="slotGroup" key={p.name}>
              <h3>{p.name}</h3>
              <div className="slots">
                {list.map((t) => (
                  <button key={t} className={'slot' + (t === current ? ' on' : '')} onClick={() => onPick(t)}>{t}</button>
                ))}
              </div>
            </div>
          );
        })
      )}
    </>
  );
}

function Details({ barber, service, date, time, user, onAuth, onDone, onTaken }) {
  const [form, setForm] = useState({ name: user?.name || '', phone: user?.phone || '', notes: '' });
  const [errors, setErrors] = useState({});
  const [error, setError] = useState('');
  const [sending, setSending] = useState(false);

  // Si inicia sesión en este paso, completamos los campos vacíos con sus datos
  useEffect(() => {
    if (!user) return;
    setForm((f) => ({ ...f, name: f.name || user.name, phone: f.phone || user.phone }));
    setErrors({});
  }, [user]);

  const change = (e) => {
    setForm({ ...form, [e.target.name]: e.target.value });
    setErrors({ ...errors, [e.target.name]: '' });
  };

  async function submit(e) {
    e.preventDefault();
    const errs = {};
    if (form.name.trim().length < 2) errs.name = 'Escribí tu nombre y apellido.';
    if (form.phone.replace(/\D/g, '').length < 8) errs.phone = 'Escribí tu teléfono con código de área.';
    setErrors(errs);
    if (Object.keys(errs).length) return;

    setSending(true);
    setError('');
    try {
      const r = await api('/api/bookings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          barberId: barber.id, serviceId: service.id,
          customerName: form.name, customerPhone: form.phone, notes: form.notes,
          date, time
        })
      });
      onDone(r.booking);
    } catch (err) {
      setError(err.message);
    } finally {
      setSending(false);
    }
  }

  return (
    <form onSubmit={submit} noValidate className="form">
      <Title sub="Solo para avisarte si hay algún cambio en tu turno.">Tus datos</Title>
      {user ? (
        <div className="whoBar">
          <span className="whoAvatar" aria-hidden="true">{initials(user.name)}</span>
          <p>El turno se guarda en tu cuenta <strong>{user.email}</strong></p>
        </div>
      ) : (
        <div className="whoBar">
          <p>¿Tenés cuenta? Iniciá sesión y completamos tus datos.</p>
          <button type="button" className="textLink" onClick={() => onAuth('login')}>Iniciar sesión</button>
        </div>
      )}
      <Field label="Nombre y apellido" error={errors.name}>
        <input name="name" autoComplete="name" value={form.name} onChange={change} aria-invalid={!!errors.name} />
      </Field>
      <Field label="Teléfono" error={errors.phone}>
        <input name="phone" type="tel" inputMode="tel" autoComplete="tel" placeholder="351 123 4567"
          value={form.phone} onChange={change} aria-invalid={!!errors.phone} />
      </Field>
      <Field label="Notas" optional>
        <textarea name="notes" rows={3} placeholder="Por ejemplo: degradé bajo, tijera arriba"
          value={form.notes} onChange={change} />
      </Field>

      {error && (
        <div className="notice bad" role="alert">
          {error}
          {error.includes('ocupado') && (
            <button type="button" className="textLink" onClick={onTaken}>Ver otros horarios</button>
          )}
        </div>
      )}
      <button className="btn btnBlack btnFull" type="submit" disabled={sending}>
        {sending ? 'Confirmando…' : 'Confirmar turno'}
      </button>
    </form>
  );
}

function Field({ label, optional, error, children }) {
  return (
    <label className={'field' + (error ? ' hasError' : '')}>
      <span className="fieldLabel">
        {label} {optional && <em>Opcional</em>}
      </span>
      {children}
      {error && <span className="fieldError">{error}</span>}
    </label>
  );
}

function Success({ booking, service, onClose }) {
  const cal = calendarLink({
    title: `${booking.service_name} en Black Barberia`,
    date: booking.date,
    time: booking.time,
    minutes: service?.duration || 30,
    details: `Turno con ${booking.barber_name}.`
  });
  return (
    <div className="success">
      <div className="okMark" aria-hidden="true"><Icon d="M5 12.5l4.5 4.5L19 7.5" /></div>
      <Title sub={`Te esperamos, ${firstName(booking.customer_name)}. Si no podés venir, avisanos así el horario queda libre para otra persona.`}>
        Turno confirmado
      </Title>
      <dl className="receipt">
        <div><dt>Día</dt><dd>{niceDate(booking.date)}</dd></div>
        <div><dt>Hora</dt><dd>{booking.time} h</dd></div>
        <div><dt>Servicio</dt><dd>{booking.service_name}</dd></div>
        <div><dt>Peluquero</dt><dd>{booking.barber_name}</dd></div>
        <div><dt>Precio</dt><dd>{money(booking.price)}</dd></div>
      </dl>
      <div className="successActions">
        <a className="btn btnLine btnFull" href={cal} target="_blank" rel="noreferrer">Agregar a Google Calendar</a>
        <button className="btn btnBlack btnFull" onClick={onClose}>Listo</button>
      </div>
    </div>
  );
}