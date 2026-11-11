import { useEffect, useRef, useState } from 'react';
import { api, duration, fromISO, money, niceDate } from '../api.js';
import './Account.css';

// Panel "Mis turnos": próximos y anteriores, con opción de cancelar
export default function Account({ user, onClose, onBook }) {
  const [list, setList] = useState(null); // null = cargando
  const [error, setError] = useState('');
  const [closing, setClosing] = useState(false);
  const bodyRef = useRef(null);

  const close = (then) => {
    setClosing(true);
    setTimeout(() => { onClose(); then?.(); }, 220);
  };

  useEffect(() => {
    const onKey = (e) => e.key === 'Escape' && close();
    document.addEventListener('keydown', onKey);
    document.body.style.overflow = 'hidden';
    bodyRef.current?.querySelector('h2')?.focus();
    return () => {
      document.removeEventListener('keydown', onKey);
      document.body.style.overflow = '';
    };
  }, []);

  const load = () =>
    api('/api/me/bookings')
      .then((r) => setList(r.bookings))
      .catch((e) => { setError(e.message); setList([]); });
  useEffect(() => { load(); }, []);

  // Separar próximos y anteriores según fecha y hora actual
  const now = new Date();
  const isUpcoming = (b) => fromISO(b.date).setHours(...b.time.split(':').map(Number)) > now.getTime();
  const upcoming = (list || []).filter(isUpcoming);
  const past = (list || []).filter((b) => !isUpcoming(b)).reverse();

  return (
    <div className={'overlay' + (closing ? ' out' : '')} onMouseDown={(e) => e.target === e.currentTarget && close()}>
      <aside className="drawer" role="dialog" aria-modal="true" aria-labelledby="accTitle">
        <header className="drawerHead">
          <span />
          <div className="drawerTitle">
            <p id="accTitle">Mis turnos</p>
            <span>{user.email}</span>
          </div>
          <button className="iconBtn" onClick={() => close()} aria-label="Cerrar">
            <svg className="icon" viewBox="0 0 24 24" aria-hidden="true"><path d="M6 6l12 12M18 6L6 18" /></svg>
          </button>
        </header>
        <div className="bar" aria-hidden="true"><span style={{ width: 0 }} /></div>

        <div className="drawerBody" ref={bodyRef}>
          <div className="stepHead">
            <h2 tabIndex={-1}>Hola, {user.name.split(' ')[0]}</h2>
            <p>Acá tenés tus turnos. Si no podés venir, cancelalo así el horario queda libre.</p>
          </div>

          {error && <p className="notice bad">{error}</p>}

          {!list ? (
            Array.from({ length: 3 }, (_, i) => <div className="skelCard" key={i} />)
          ) : (
            <>
              <section className="accGroup">
                <h3>Próximos</h3>
                {upcoming.length ? (
                  <ul className="accList">
                    {upcoming.map((b) => (
                      <Item key={b.id} b={b} onCancelled={() => setList(list.filter((x) => x.id !== b.id))} />
                    ))}
                  </ul>
                ) : (
                  <div className="accEmpty">
                    <p>No tenés turnos reservados.</p>
                    <button className="btn btnBlack" onClick={() => close(onBook)}>Reservar turno</button>
                  </div>
                )}
              </section>

              {past.length > 0 && (
                <section className="accGroup">
                  <h3>Anteriores</h3>
                  <ul className="accList">
                    {past.map((b) => <Item key={b.id} b={b} past />)}
                  </ul>
                </section>
              )}
            </>
          )}
        </div>

        {list && upcoming.length > 0 && (
          <footer className="accFoot">
            <button className="btn btnBlack btnFull" onClick={() => close(onBook)}>Reservar otro turno</button>
          </footer>
        )}
      </aside>
    </div>
  );
}

// Un turno de la lista. Cancelar pide confirmación ahí mismo.
function Item({ b, past, onCancelled }) {
  const [ask, setAsk] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const d = fromISO(b.date);
  const month = d.toLocaleDateString('es-AR', { month: 'short' }).replace('.', '');

  async function cancel() {
    setBusy(true);
    setError('');
    try {
      await api('/api/me/bookings/' + b.id, { method: 'DELETE' });
      onCancelled();
    } catch (e) {
      setError(e.message);
      setBusy(false);
    }
  }

  return (
    <li className={'accItem' + (past ? ' past' : '')}>
      <div className="accRow">
        <div className="accDate" aria-hidden="true">
          <strong>{d.getDate()}</strong>
          <span>{month}</span>
        </div>
        <div className="accText">
          <p className="accMain">{b.service_name}</p>
          <p className="accSub">{niceDate(b.date)} · {b.time} h · {b.barber_name}</p>
          <p className="accSub">{duration(b.duration)} · {money(b.price)}</p>
        </div>
        {!past && !ask && (
          <button className="accCancel" onClick={() => setAsk(true)}>Cancelar</button>
        )}
      </div>

      {ask && (
        <div className="accConfirm" role="alert">
          <p>¿Cancelar este turno? El horario va a quedar libre.</p>
          <div>
            <button className="btn btnLine" onClick={() => setAsk(false)} disabled={busy}>Volver</button>
            <button className="btn btnBlack" onClick={cancel} disabled={busy}>{busy ? 'Cancelando…' : 'Sí, cancelar'}</button>
          </div>
          {error && <span className="fieldError">{error}</span>}
        </div>
      )}
    </li>
  );
}