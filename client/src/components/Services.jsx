import { useEffect, useRef, useState } from 'react';
import { duration, firstName, initials, money } from '../api.js';
import './Services.css';

// Servicios y precios: panel lateral que solo se abre desde "Servicios" (barra, footer o portada)
export default function Services({ barbers, error, onBook, onClose }) {
  const [active, setActive] = useState(0);
  const [closing, setClosing] = useState(false);
  const bodyRef = useRef(null);
  const barber = barbers?.[active];

  const close = (then) => {
    setClosing(true);
    setTimeout(() => { onClose(); then?.(); }, 220);
  };

  // Escape cierra, la página de atrás no se mueve
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

  return (
    <div className={'overlay' + (closing ? ' out' : '')} onMouseDown={(e) => e.target === e.currentTarget && close()}>
      <aside className="drawer svcDrawer" role="dialog" aria-modal="true" aria-labelledby="svcTitle">
        <header className="drawerHead">
          <span />
          <div className="drawerTitle">
            <p id="svcTitle">Servicios</p>
            <span>Precios finales, sin recargos</span>
          </div>
          <button className="iconBtn" onClick={() => close()} aria-label="Cerrar">
            <svg className="icon" viewBox="0 0 24 24" aria-hidden="true"><path d="M6 6l12 12M18 6L6 18" /></svg>
          </button>
        </header>

        <div className="drawerBody" ref={bodyRef}>
          <div className="stepHead">
            <h2 tabIndex={-1}>Servicios y precios</h2>
            <p>Tocá un servicio y lo reservás en el momento.</p>
          </div>

          {/* Selector de peluquero */}
          {barbers?.length > 1 && (
            <div className="svcTabs" role="tablist" aria-label="Elegí peluquero">
              {barbers.map((b, i) => (
                <button key={b.id} role="tab" aria-selected={i === active}
                  className={'svcTab' + (i === active ? ' on' : '')} onClick={() => setActive(i)}>
                  {b.name}
                </button>
              ))}
            </div>
          )}

          {error && <p className="notice">{error}</p>}
          {!barbers && <ListSkeleton />}

          {barber && (
            <div className="svcBody" role="tabpanel" key={barber.id}>
              {/* Ficha corta del peluquero */}
              <div className="svcBarber">
                <span className="svcAvatar" aria-hidden="true">
                  {barber.image ? <img src={barber.image} alt="" /> : initials(barber.name)}
                </span>
                <div className="svcBarberText">
                  <strong>{barber.name}</strong>
                  <span>{barber.bio}</span>
                </div>
                <div className="svcFrom">
                  <span>Desde</span>
                  <strong>{fromPrice(barber.services)}</strong>
                </div>
              </div>

              {/* Lista de servicios */}
              <ul className="svcList">
                {barber.services.map((s, i) => (
                  <li key={s.id} style={{ '--i': i }}>
                    <button className="svcRow" onClick={() => close(() => onBook({ barber, service: s }))}
                      aria-label={`Reservar ${s.name}, ${duration(s.duration)}, ${money(s.price)}`}>
                      <span className="svcInfo">
                        <span className="svcName">{s.name}</span>
                        <span className="svcTime">
                          <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 7v5l3 2M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0z" /></svg>
                          {duration(s.duration)}
                        </span>
                      </span>
                      <span className={'svcPrice' + (s.price === 0 ? ' free' : '')}>{money(s.price)}</span>
                      <span className="svcGo" aria-hidden="true">
                        <svg viewBox="0 0 24 24"><path d="M10 7l5 5-5 5" /></svg>
                      </span>
                    </button>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>

        {barber && (
          <footer className="svcFoot">
            <button className="btn btnBlack btnFull" onClick={() => close(() => onBook({ barber }))}>
              Reservar con {firstName(barber.name)}
            </button>
          </footer>
        )}
      </aside>
    </div>
  );
}

// Precio más bajo (sin contar los servicios sin cargo)
function fromPrice(services) {
  const prices = services.map((s) => s.price).filter((p) => p > 0);
  return prices.length ? money(Math.min(...prices)) : 'Sin cargo';
}

function ListSkeleton() {
  return (
    <div aria-label="Cargando servicios">
      {Array.from({ length: 5 }, (_, i) => <div className="skelCard" key={i} />)}
    </div>
  );
}