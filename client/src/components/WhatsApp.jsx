import { useEffect, useState } from 'react';
import { FaWhatsapp } from 'react-icons/fa6';
import './WhatsApp.css';

// Número de WhatsApp de la barbería: código de país + área + número, solo dígitos
// (ej. Córdoba: 549351XXXXXXX). Cambialo por el real.
const NUMERO = '5493510000000';
const MENSAJE = 'Hola Black Barberia, quería hacer una consulta.';

// Botón flotante de WhatsApp: círculo verde con una onda suave que sale de él.
// Aparece recién cuando bajás de la portada.
export default function WhatsApp() {
  const [show, setShow] = useState(false);

  useEffect(() => {
    const hero = document.getElementById('top');
    let raf = 0;
    const check = () => {
      raf = 0;
      const limit = (hero?.offsetHeight || window.innerHeight) * 0.6;
      setShow(window.scrollY > limit);
    };
    const onScroll = () => { if (!raf) raf = requestAnimationFrame(check); };
    check();
    window.addEventListener('scroll', onScroll, { passive: true });
    window.addEventListener('resize', onScroll);
    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener('scroll', onScroll);
      window.removeEventListener('resize', onScroll);
    };
  }, []);

  const url = `https://wa.me/${NUMERO}?text=${encodeURIComponent(MENSAJE)}`;

  return (
    <a
      className={'waBtn' + (show ? ' show' : '')}
      href={url}
      target="_blank"
      rel="noreferrer"
      aria-label="Contactanos por WhatsApp"
      tabIndex={show ? 0 : -1}
      aria-hidden={!show}
      title="WhatsApp"
    >
      <FaWhatsapp aria-hidden="true" />
    </a>
  );
}