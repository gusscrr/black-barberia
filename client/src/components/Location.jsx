import { useEffect, useRef, useState } from 'react';
import { SUCURSALES } from '../sucursales.js';
import './Location.css';

const TZ = 'America/Argentina/Buenos_Aires';

// Dónde estamos: mapa + datos de la sede, con estado "abierto/cerrado" en vivo
export default function Location({ onBook }) {
  const [active, setActive] = useState(0);
  const [seen, setSeen] = useState(false);
  const ref = useRef(null);
  const place = SUCURSALES[active];
  const status = useOpenStatus(place);

  // Animación de entrada cuando la sección aparece.
  // Si subís y la sección queda abajo fuera de la pantalla, se reinicia para repetirse.
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const show = new IntersectionObserver(([e]) => {
      if (e.isIntersecting) setSeen(true);
    }, { threshold: 0.2 });
    const reset = new IntersectionObserver(([e]) => {
      if (!e.isIntersecting && e.boundingClientRect.top > 0) setSeen(false);
    }, { threshold: 0, rootMargin: '0px 0px -2px 0px' });
    show.observe(el);
    reset.observe(el);
    return () => { show.disconnect(); reset.disconnect(); };
  }, []);

  const query = place.mapsQuery || `${place.address}, ${place.city}`;
  const mapSrc = `https://maps.google.com/maps?q=${encodeURIComponent(query)}&z=16&hl=es&output=embed`;
  const directions = `https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(query)}`;

  return (
    <section className={'section locSection' + (seen ? ' in' : '')} id="ubicacion" ref={ref}>
      <div className="wrap">
        <div className="locHead">
          <div>
            <h2 className="h2">Dónde estamos</h2>
            <p className="sideText">Pasá por la barbería. Si reservás antes, te esperamos a la hora justa.</p>
          </div>

          {/* Pestañas: aparecen solas si hay más de una sede */}
          {SUCURSALES.length > 1 && (
            <div className="locTabs" role="tablist" aria-label="Elegí la sede">
              {SUCURSALES.map((s, i) => (
                <button key={s.id} role="tab" aria-selected={i === active}
                  className={'locTab' + (i === active ? ' on' : '')} onClick={() => setActive(i)}>
                  {s.name}
                </button>
              ))}
            </div>
          )}
        </div>

        <div className="locCard" key={place.id}>
          {/* Mapa (siempre a color) */}
          <div className="locMap">
            <MapFrame src={mapSrc} title={`Mapa de ${place.name}`} />
          </div>

          {/* Datos */}
          <div className="locInfo">
            <p className={'locStatus' + (status.open ? ' open' : '')} role="status">
              <span className="locDot" aria-hidden="true" />
              {status.label}
            </p>

            <h3 className="locName">{place.name}</h3>

            <ul className="locRows">
              <li>
                <Icon d="M12 21s-7-6.2-7-11.5A7 7 0 0 1 19 9.5C19 14.8 12 21 12 21zM12 12.2a2.5 2.5 0 1 0 0-5 2.5 2.5 0 0 0 0 5z" />
                {place.address}
              </li>
              <li>
                <Icon d="M12 7v5l3 2M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0z" />
                {place.days}: {place.open} – {place.close}
              </li>
              <li>
                <Icon d="M12 16v-4M12 8h.01M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0z" />
                {place.note}
              </li>
            </ul>

            <div className="locActions">
              <a className="btn btnBlack locGo" href={directions} target="_blank" rel="noreferrer">
                Cómo llegar
                <svg className="locArrow" viewBox="0 0 24 24" aria-hidden="true"><path d="M10 7l5 5-5 5" /></svg>
              </a>
              <CopyButton text={`${place.address}, ${place.city}`} />
            </div>

            <button className="locBook" onClick={() => onBook()}>
              ¿Preferís no esperar? <strong>Reservá tu turno</strong>
            </button>
          </div>
        </div>
      </div>
    </section>
  );
}

function Icon({ d }) {
  return <svg className="locIcon" viewBox="0 0 24 24" aria-hidden="true"><path d={d} /></svg>;
}

// Mapa con aparición suave cuando termina de cargar
function MapFrame({ src, title }) {
  const [loaded, setLoaded] = useState(false);
  useEffect(() => setLoaded(false), [src]);
  return (
    <>
      <div className="locMapSkel" aria-hidden="true" />
      <iframe className={'locFrame' + (loaded ? ' ready' : '')} src={src} title={title}
        loading="lazy" referrerPolicy="no-referrer-when-downgrade" onLoad={() => setLoaded(true)} />
    </>
  );
}

// Copiar la dirección, con aviso "Dirección copiada" por un momento
function CopyButton({ text }) {
  const [done, setDone] = useState(false);
  const copy = async () => {
    try { await navigator.clipboard.writeText(text); }
    catch {
      // por si el navegador no deja usar el portapapeles moderno
      const t = document.createElement('textarea');
      t.value = text; document.body.appendChild(t); t.select(); document.execCommand('copy'); t.remove();
    }
    setDone(true);
    setTimeout(() => setDone(false), 1800);
  };
  return (
    <button className={'btn btnLine locCopy' + (done ? ' done' : '')} onClick={copy} aria-live="polite">
      <span className="locCopyIn" key={done ? 'ok' : 'copy'}>{done ? 'Dirección copiada' : 'Copiar dirección'}</span>
    </button>
  );
}

// ¿Está abierto ahora? (con la hora de Argentina, se actualiza cada minuto)
function useOpenStatus(place) {
  const calc = () => {
    const p = Object.fromEntries(new Intl.DateTimeFormat('en-GB', {
      timeZone: TZ, hour: '2-digit', minute: '2-digit', hourCycle: 'h23'
    }).formatToParts(new Date()).map((x) => [x.type, x.value]));
    const now = Number(p.hour) * 60 + Number(p.minute);
    const toMin = (t) => { const [h, m] = t.split(':').map(Number); return h * 60 + m; };
    const open = toMin(place.open), close = toMin(place.close);
    if (now >= open && now < close) {
      const left = close - now;
      const label = left <= 60 ? `Cierra en ${left} min` : 'Abierto';
      return { open: true, label };
    }
    // Antes de abrir: "abrimos hoy"; después de cerrar: "abrimos mañana"
    const at = place.open.padStart(5, '0');
    return { open: false, label: now < open ? `Cerrado, abrimos hoy a las ${at}` : `Cerrado, abrimos mañana a las ${at}` };
  };
  const [status, setStatus] = useState(calc);
  useEffect(() => {
    setStatus(calc());
    const id = setInterval(() => setStatus(calc()), 30000);
    return () => clearInterval(id);
  }, [place.id]);
  return status;
}