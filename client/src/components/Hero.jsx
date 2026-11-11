import { useEffect, useRef, useState } from 'react';
import './Hero.css';

// Portada: video de la barbería de fondo con tapa oscura, título, botones
// y la cinta de servicios abajo.
export default function Hero({ barbers, onBook, onServices }) {
  const heroRef = useRef(null);

  // Servicios para la cinta de abajo (sin repetir nombres)
  const ticker = [];
  const seen = new Set();
  (barbers || []).forEach((barber) => (barber.services || []).forEach((service) => {
    if (!seen.has(service.name)) { seen.add(service.name); ticker.push({ service }); }
  }));

  // Scroll (--p) suavizado: el texto sube y el video se mueve más lento
  useEffect(() => {
    const el = heroRef.current;
    if (!el || matchMedia('(prefers-reduced-motion: reduce)').matches) return;
    let tp = 0, p = 0, raf = 0, last = 0;
    const damp = (a, b, speed, dt) => a + (b - a) * (1 - Math.exp(-speed * dt));
    const step = (now) => {
      const dt = Math.min((now - last) / 1000, 0.05);
      last = now;
      p = damp(p, tp, 8, dt);
      el.style.setProperty('--p', p.toFixed(4));
      raf = Math.abs(tp - p) > 0.0005 ? requestAnimationFrame(step) : 0;
    };
    const onScroll = () => {
      tp = Math.min(window.scrollY / el.offsetHeight, 1);
      if (!raf) { last = performance.now(); raf = requestAnimationFrame(step); }
    };
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => {
      window.removeEventListener('scroll', onScroll);
      cancelAnimationFrame(raf);
    };
  }, []);

  return (
    <section className="hero" id="top" ref={heroRef} data-dark>
      <HeroVideo />

      {/* Texto */}
      <div className="wrap heroInner">
        <div className="heroText">
          <h1 className="heroTitle">
            <span className="tLine"><span style={{ '--i': 0 }}>Cortes precisos</span></span>
            <span className="tLine"><span style={{ '--i': 1 }}>Sin esperas</span></span>
          </h1>
          <p className="heroLead hIn" style={{ '--d': '450ms' }}>
            Black Barberia: corte, barba y color con turno online.
            Elegís con quién y a qué hora, y queda confirmado al instante.
          </p>
          <div className="heroActions hIn" style={{ '--d': '560ms' }}>
            <button className="btn btnBlack" onClick={() => onBook()}>Reservar turno</button>
            <button className="btn btnLine" onClick={onServices}>Ver servicios</button>
          </div>
        </div>
      </div>

      {/* Indicador "Deslizar": línea finita con una luz que baja */}
      <a href="#cuenta" className="heroScroll hIn" style={{ '--d': '1300ms' }} aria-label="Deslizar a la siguiente sección">
        <span>Deslizar</span>
        <i aria-hidden="true" />
      </a>

      {/* Cinta de servicios que se desliza sola (tocás uno y elegís con quién) */}
      {ticker.length > 0 && (
        <div className="heroTicker hIn" style={{ '--d': '1000ms' }} aria-label="Servicios">
          <div className="tkTrack">
            {[0, 1].map((copy) => (
              <ul key={copy} className="tkList" aria-hidden={copy === 1 || undefined}>
                {ticker.map(({ service }) => (
                  <li key={service.name}>
                    <button tabIndex={copy === 1 ? -1 : 0} onClick={() => onBook({ wanted: service.name })}>
                      {service.name}
                    </button>
                  </li>
                ))}
              </ul>
            ))}
          </div>
        </div>
      )}
    </section>
  );
}

// Video de fondo: sin sonido, en bucle, versión vertical en celular.
// Se pausa solo cuando no se ve (ahorra batería y procesador).
function HeroVideo() {
  const ref = useRef(null);
  const [mobile] = useState(() => matchMedia('(max-width: 900px)').matches);
  const [still] = useState(() => matchMedia('(prefers-reduced-motion: reduce)').matches);
  const name = mobile ? 'hero-movil' : 'hero';

  useEffect(() => {
    const v = ref.current;
    if (!v || still) return;
    const io = new IntersectionObserver(([e]) => {
      if (e.isIntersecting) v.play().catch(() => {});
      else v.pause();
    });
    io.observe(v);
    return () => io.disconnect();
  }, [still]);

  return (
    <video ref={ref} className="heroVideo" src={`/${name}.mp4`} autoPlay={!still}
      muted loop playsInline preload="auto" aria-hidden="true" />
  );
}