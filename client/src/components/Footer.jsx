import { FaYoutube, FaXTwitter } from 'react-icons/fa6';
import { SiInstagram } from 'react-icons/si';
import { niceDate } from '../api.js';
import './Footer.css';

// Redes sociales: cambiá cada link por el perfil real de la barbería
const REDES = [
  { name: 'Instagram', url: 'https://instagram.com/', Icon: SiInstagram, cls: 'ig' },
  { name: 'YouTube', url: 'https://youtube.com/', Icon: FaYoutube },
  { name: 'X (Twitter)', url: 'https://x.com/', Icon: FaXTwitter }
];

// Cierre de la página: llamado a reservar + pie con datos y copyright
export default function Footer({ next, onBook, onTeam, onServices }) {
  const year = new Date().getFullYear();

  return (
    <footer className="footer">
      <div className="wrap">
        {/* Llamado final */}
        <div className="ftCta" data-rv>
          <div className="ftCtaText">
            <h2>Tu próximo corte<br />está a un minuto.</h2>
            <p className="ftNext">
              <span className="liveDot" aria-hidden="true" />
              <span>
                {next
                  ? <>Próximo turno libre: <strong>{niceDate(next.date)}, {next.time} h</strong></>
                  : 'Buscando el próximo turno libre…'}
              </span>
            </p>
          </div>
          <div className="ftCtaActions">
            <button className="btn btnBlack" onClick={onBook}>Reservar turno</button>
            <button className="btn btnLine" onClick={onServices}>Ver servicios</button>
          </div>
        </div>

        {/* Columnas */}
        <div className="ftGrid">
          <div className="ftBrand" data-rv>
            <a href="#top" className="logo">Black Barberia</a>
            <p>Corte, barba y color con turno online. Elegís, reservás y listo.</p>
            <div className="ftSocial">
              {REDES.map(({ name, url, Icon, cls }) => (
                <a key={name} className={cls} href={url} target="_blank" rel="noreferrer" aria-label={name} title={name}>
                  <Icon aria-hidden="true" />
                </a>
              ))}
            </div>
          </div>

          <div className="ftCol" data-rv style={{ '--rd': '80ms' }}>
            <h3>Horario</h3>
            <p>Lunes a domingo</p>
            <p>9:00 a 21:00 h</p>
          </div>

          <nav className="ftCol" aria-label="Secciones" data-rv style={{ '--rd': '160ms' }}>
            <h3>Secciones</h3>
            <a href="#servicios" onClick={(e) => { e.preventDefault(); onServices(); }}>Servicios</a>
            <a href="#equipo" onClick={(e) => { e.preventDefault(); onTeam(); }}>Equipo</a>
            <a href="#reservar">Cómo reservar</a>
          </nav>

          <div className="ftCol" data-rv style={{ '--rd': '240ms' }}>
            <h3>Reservas</h3>
            <p>Online, las 24 horas</p>
            <button className="ftLink" onClick={onBook}>Reservar un turno</button>
          </div>
        </div>

        {/* Copyright */}
        <p className="ftCopy">
          © {year} Black Barberia, implementado por Gustavo Carrasco. Todos los derechos reservados.
        </p>
      </div>
    </footer>
  );
}