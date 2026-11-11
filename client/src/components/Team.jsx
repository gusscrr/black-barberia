import { useEffect, useRef, useState } from 'react';
import { firstName, initials } from '../api.js';
import './Team.css';

// Equipo: panel lateral que solo se abre desde "Equipo" (barra de arriba o footer)
export default function Team({ barbers, onBook, onClose }) {
  const [closing, setClosing] = useState(false);
  const bodyRef = useRef(null);

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
      <aside className="drawer teamDrawer" role="dialog" aria-modal="true" aria-labelledby="teamTitle">
        <header className="drawerHead">
          <span />
          <div className="drawerTitle">
            <p id="teamTitle">Equipo</p>
            <span>Black Barberia</span>
          </div>
          <button className="iconBtn" onClick={() => close()} aria-label="Cerrar">
            <svg className="icon" viewBox="0 0 24 24" aria-hidden="true"><path d="M6 6l12 12M18 6L6 18" /></svg>
          </button>
        </header>

        <div className="drawerBody" ref={bodyRef}>
          <div className="stepHead">
            <h2 tabIndex={-1}>Quién te atiende</h2>
            <p>Cada uno con su especialidad. Elegí con quién te atendés.</p>
          </div>

          <div className="teamList">
            {(barbers || []).map((b, i) => (
              <Member key={b.id} barber={b} index={i} onBook={() => close(() => onBook({ barber: b }))} />
            ))}
          </div>
        </div>
      </aside>
    </div>
  );
}

function Member({ barber, index, onBook }) {
  const [open, setOpen] = useState(false); // en celular se abre tocando
  const visible = barber.services.slice(0, 3);
  const hidden = barber.services.slice(3);

  return (
    <article className="member" style={{ '--i': index }}>
      <div className="memberTop">
        <div className="memberPhoto">
          {barber.image ? <img src={barber.image} alt={`Foto de ${barber.name}`} /> : <span aria-hidden="true">{initials(barber.name)}</span>}
        </div>
        <div>
          <h3 className="memberName">{barber.name}</h3>
          <p className="memberBio">{barber.bio}</p>
        </div>
      </div>

      <ul className="memberTags" aria-label="Servicios">
        {visible.map((s) => <li key={s.id}>{s.name}</li>)}
        {hidden.length > 0 && (
          <li
            className={'tagMoreWrap' + (open ? ' show' : '')}
            onMouseLeave={() => setOpen(false)}
          >
            <button
              className="tagMore"
              onClick={() => setOpen(!open)}
              onBlur={() => setOpen(false)}
              aria-expanded={open}
              aria-label={`Ver ${hidden.length} servicios más`}
            >
              +{hidden.length}
            </button>
            {/* Ventanita con los servicios que faltan */}
            <div className="tagPop" role="tooltip">
              <p>También hace</p>
              <ul>
                {hidden.map((s) => <li key={s.id}>{s.name}</li>)}
              </ul>
            </div>
          </li>
        )}
      </ul>

      <button className="btn btnBlack btnFull" onClick={onBook}>
        Reservar con {firstName(barber.name)}
      </button>
    </article>
  );
}