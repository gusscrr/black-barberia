import { useEffect, useRef, useState } from 'react';
import { firstName, initials } from '../api.js';
import './Header.css';

// Barra superior: secciones y cuenta del usuario
export default function Header({ user, onBook, onAuth, onMyBookings, onTeam, onServices, onLogout }) {
  const [solid, setSolid] = useState(false);
  const [dark, setDark] = useState(true);    // ¿la barra está sobre un fondo oscuro?
  const [menu, setMenu] = useState(false);   // menú de cuenta
  const [links, setLinks] = useState(false); // menú de secciones (celular)
  const menuRef = useRef(null);
  const headerRef = useRef(null);

  // Al bajar: línea abajo de la barra, y color según el fondo que tiene debajo
  // (las secciones oscuras tienen data-dark: ahí la barra es de vidrio negro)
  useEffect(() => {
    let raf = 0;
    const check = () => {
      raf = 0;
      setSolid(window.scrollY > 8);
      const y = (headerRef.current?.offsetHeight || 38) / 2;
      const overDark = [...document.querySelectorAll('[data-dark]')].some((el) => {
        const r = el.getBoundingClientRect();
        return r.top <= y && r.bottom > y;
      });
      setDark(overDark);
    };
    const onScroll = () => { if (!raf) raf = requestAnimationFrame(check); };
    check();
    const late = setTimeout(check, 600); // por si la página termina de cargar después
    window.addEventListener('scroll', onScroll, { passive: true });
    window.addEventListener('resize', onScroll);
    return () => {
      clearTimeout(late);
      cancelAnimationFrame(raf);
      window.removeEventListener('scroll', onScroll);
      window.removeEventListener('resize', onScroll);
    };
  }, []);

  // Cerrar el menú de cuenta al tocar afuera o con Escape
  useEffect(() => {
    if (!menu) return;
    const onDown = (e) => { if (!menuRef.current?.contains(e.target)) setMenu(false); };
    const onKey = (e) => e.key === 'Escape' && setMenu(false);
    document.addEventListener('mousedown', onDown);
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('mousedown', onDown);
      document.removeEventListener('keydown', onKey);
    };
  }, [menu]);

  // Cerrar el menú de secciones al tocar afuera, con Escape o si la pantalla se agranda
  useEffect(() => {
    if (!links) return;
    const onDown = (e) => { if (!headerRef.current?.contains(e.target)) setLinks(false); };
    const onKey = (e) => e.key === 'Escape' && setLinks(false);
    const onResize = () => window.innerWidth > 960 && setLinks(false);
    document.addEventListener('mousedown', onDown);
    document.addEventListener('touchstart', onDown, { passive: true });
    document.addEventListener('keydown', onKey);
    window.addEventListener('resize', onResize);
    return () => {
      document.removeEventListener('mousedown', onDown);
      document.removeEventListener('touchstart', onDown);
      document.removeEventListener('keydown', onKey);
      window.removeEventListener('resize', onResize);
    };
  }, [links]);

  const pick = (fn) => { setMenu(false); setLinks(false); fn(); };

  return (
    <header className={'nav' + (solid || links ? ' solid' : '') + (dark ? ' dark' : '')} ref={headerRef}>
      <div className="wrap navInner">
        <a href="#top" className="logo" aria-label="Black Barberia, ir al inicio">
          Black Barberia
        </a>
        <nav className="navLinks" aria-label="Secciones">
          <a href="#servicios" onClick={(e) => { e.preventDefault(); onServices(); }}>Servicios</a>
          <a href="#equipo" onClick={(e) => { e.preventDefault(); onTeam(); }}>Equipo</a>
          <a href="#reservar">Cómo reservar</a>
        </nav>

        <div className="navActions">
          {user ? (
            <div className="account" ref={menuRef}>
              <button
                className={'accountBtn' + (menu ? ' on' : '')}
                onClick={() => { setMenu(!menu); setLinks(false); }}
                aria-haspopup="menu"
                aria-expanded={menu}
                aria-label={`Tu cuenta, ${user.name}`}
              >
                <span className="accountAvatar" aria-hidden="true">{initials(user.name)}</span>
                <span className="accountName">{firstName(user.name)}</span>
                <svg className="accountChevron" viewBox="0 0 24 24" aria-hidden="true"><path d="M7 10l5 5 5-5" /></svg>
              </button>

              <div className={'accountMenu' + (menu ? ' open' : '')} role="menu">
                <div className="accountHead">
                  <span className="accountAvatar big" aria-hidden="true">{initials(user.name)}</span>
                  <div>
                    <strong>{user.name}</strong>
                    <span>{user.email}</span>
                  </div>
                </div>
                <button role="menuitem" className="menuItem" onClick={() => pick(onMyBookings)}>
                  <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M8 3v3M16 3v3M4 9h16M5 5h14a1 1 0 0 1 1 1v13a1 1 0 0 1-1 1H5a1 1 0 0 1-1-1V6a1 1 0 0 1 1-1z" /></svg>
                  Mis turnos
                </button>
                <button role="menuitem" className="menuItem" onClick={() => pick(onBook)}>
                  <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 5v14M5 12h14" /></svg>
                  Nuevo turno
                </button>
                <div className="menuSep" />
                <button role="menuitem" className="menuItem" onClick={() => pick(onLogout)}>
                  <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M15 4h3a2 2 0 0 1 2 2v12a2 2 0 0 1-2 2h-3M10 16l-4-4 4-4M6 12h10" /></svg>
                  Cerrar sesión
                </button>
              </div>
            </div>
          ) : (
            <button className="loginBtn" onClick={() => pick(() => onAuth('login'))} aria-label="Iniciar sesión">
              <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 12a4 4 0 1 0 0-8 4 4 0 0 0 0 8zM4 20a8 8 0 0 1 16 0" /></svg>
              <span>Iniciar sesión</span>
            </button>
          )}

          {/* Botón de menú (solo en celular y tablet) */}
          <button
            className={'burger' + (links ? ' on' : '')}
            onClick={() => { setLinks(!links); setMenu(false); }}
            aria-label={links ? 'Cerrar menú' : 'Abrir menú'}
            aria-expanded={links}
            aria-controls="mobileNav"
          >
            <span /><span />
          </button>
        </div>
      </div>

      {/* Secciones en celular */}
      <nav id="mobileNav" className={'mobileNav' + (links ? ' open' : '')} aria-label="Secciones" aria-hidden={!links}>
        <div className="wrap">
          <a href="#servicios" onClick={(e) => { e.preventDefault(); setLinks(false); onServices(); }} tabIndex={links ? 0 : -1}>Servicios</a>
          <a href="#equipo" onClick={(e) => { e.preventDefault(); setLinks(false); onTeam(); }} tabIndex={links ? 0 : -1}>Equipo</a>
          <a href="#reservar" onClick={() => setLinks(false)} tabIndex={links ? 0 : -1}>Cómo reservar</a>
        </div>
      </nav>
    </header>
  );
}