import { useEffect, useRef, useState } from 'react';
import { firstName } from '../api.js';
import './StyleMemory.css';

// Sección oscura "La barbería que recuerda tu estilo":
// un escáner que "lee" tu ficha y muestra lo que guarda tu cuenta.
export default function StyleMemory({ barbers, user, onAuth, onMyBookings }) {
  const ref = useRef(null);
  const gridRef = useRef(null);
  const [seen, setSeen] = useState(false);

  // Las animaciones arrancan cuando el contenido (no el fondo) ya se ve en pantalla.
  // Si subís y la sección queda abajo fuera de la pantalla, se reinicia para repetirse.
  useEffect(() => {
    const grid = gridRef.current;
    const section = ref.current;
    if (!grid || !section) return;
    const show = new IntersectionObserver(([e]) => {
      if (e.isIntersecting) setSeen(true);
    }, { threshold: 0.25, rootMargin: '0px 0px -10% 0px' });
    const reset = new IntersectionObserver(([e]) => {
      if (!e.isIntersecting && e.boundingClientRect.top > 0) setSeen(false);
    }, { threshold: 0, rootMargin: '0px 0px -2px 0px' });
    show.observe(grid);
    reset.observe(section);
    return () => { show.disconnect(); reset.disconnect(); };
  }, []);

  // Ejemplo de ficha con datos reales de la barbería
  const barber = barbers?.[0];
  const service = barber?.services?.[1] || barber?.services?.[0];
  const rows = [
    ['Peluquero', barber ? firstName(barber.name) : 'Krosty'],
    ['Servicio', service?.name || 'Corte y Barba'],
    ['Nota', 'Degradé bajo, tijera arriba']
  ];

  return (
    <section className={'smSection' + (seen ? ' in' : '')} id="cuenta" ref={ref} data-dark>
      <div className="wrap smGrid" ref={gridRef}>
        {/* Texto */}
        <div className="smText">
          <h2 className="smTitle">
            <span className="smLine"><span style={{ '--i': 0 }}>La barbería que</span></span>
            <span className="smLine smMuted"><span style={{ '--i': 1 }}>recuerda tu estilo</span></span>
          </h2>
          <p className="smLead smFade" style={{ '--d': '300ms' }}>
            Creá tu cuenta una sola vez. Tus datos se completan solos al reservar
            y todos tus turnos quedan guardados en un solo lugar.
          </p>
          <ul className="smFacts smFade" style={{ '--d': '420ms' }}>
            <li>Reservás en segundos</li>
            <li>Tus turnos en un solo lugar</li>
            <li>Cancelás con un toque</li>
          </ul>
          <div className="smActions smFade" style={{ '--d': '540ms' }}>
            {user ? (
              <button className="btn smBtn" onClick={onMyBookings}>Ver mis turnos</button>
            ) : (
              <>
                <button className="btn smBtn" onClick={() => onAuth('register')}>Crear mi cuenta</button>
                <button className="smLink" onClick={() => onAuth('login')}>Ya tengo cuenta</button>
              </>
            )}
          </div>
        </div>

        {/* Escáner */}
        <div className="smVisual" aria-hidden="true">
          <div className="smScanner">
            <span className="smCorner tl" /><span className="smCorner tr" />
            <span className="smCorner bl" /><span className="smCorner br" />
            <div className="smDots" />
            <div className="smBeam" />
          </div>

          {/* Ficha que se va completando */}
          <div className="smCard">
            <p className="smCardHead">Tu estilo</p>
            {rows.map(([k, v], i) => (
              <div className="smRow" key={k} style={{ '--r': i }}>
                <span>{k}</span>
                <strong>{v}</strong>
              </div>
            ))}
          </div>

          <p className="smStatus"><span className="liveDot" />Face ID activado</p>
        </div>
      </div>
    </section>
  );
}