import { useEffect, useState } from 'react';
import { api, shortest, today, tomorrow } from './api.js';
import Header from './components/Header.jsx';
import Hero from './components/Hero.jsx';
import Services from './components/Services.jsx';
import Team from './components/Team.jsx';
import HowTo from './components/HowTo.jsx';
import StyleMemory from './components/StyleMemory.jsx';
import Location from './components/Location.jsx';
import Footer from './components/Footer.jsx';
import WhatsApp from './components/WhatsApp.jsx';
import Booking from './components/Booking.jsx';
import Auth from './components/Auth.jsx';
import Account from './components/Account.jsx';

export default function App() {
  const [barbers, setBarbers] = useState(null); // null = cargando
  const [error, setError] = useState('');
  const [next, setNext] = useState(null);       // próximo turno libre { barber, service, date, time }
  const [booking, setBooking] = useState(null); // null = panel cerrado
  const [user, setUser] = useState(null);       // usuario logueado (null = sin sesión)
  const [auth, setAuth] = useState(null);       // 'login' | 'register' | null
  const [account, setAccount] = useState(false); // panel "Mis turnos"
  const [team, setTeam] = useState(false);       // panel "Equipo" (solo desde el nav o el footer)
  const [svc, setSvc] = useState(false);         // panel "Servicios" (desde el nav, el footer o la portada)

  // ¿Ya hay una sesión abierta?
  useEffect(() => {
    api('/api/auth/me').then((r) => setUser(r.user)).catch(() => {});
  }, []);

  async function logout() {
    await api('/api/auth/logout', { method: 'POST' }).catch(() => {});
    setUser(null);
    setAccount(false);
  }

  // Barberos + servicios (se usa en toda la página)
  useEffect(() => {
    (async () => {
      try {
        const list = await api('/api/barbers');
        const full = await Promise.all(
          list.map(async (b) => ({ ...b, services: await api('/api/services?barberId=' + b.id) }))
        );
        setBarbers(full);
      } catch {
        setError('No pudimos cargar los servicios. Revisá que el servidor esté prendido.');
        setBarbers([]);
      }
    })();
  }, []);

  // Busca el próximo turno libre (hoy, y si no queda nada, mañana)
  useEffect(() => {
    if (!barbers?.length) return;
    (async () => {
      for (const date of [today(), tomorrow()]) {
        const found = [];
        await Promise.all(
          barbers.map(async (b) => {
            const service = shortest(b.services);
            if (!service) return;
            try {
              const r = await api(`/api/slots?barberId=${b.id}&serviceId=${service.id}&date=${date}`);
              if (r.slots[0]) found.push({ barber: b, service, date, time: r.slots[0] });
            } catch { /* sin datos */ }
          })
        );
        if (found.length) {
          found.sort((a, b) => a.time.localeCompare(b.time));
          setNext(found[0]);
          return;
        }
      }
    })();
  }, [barbers]);

  // Al bajar, cada bloque marcado con data-rv aparece suave.
  // Si subís y lo dejás abajo fuera de la pantalla, se reinicia para volver a aparecer.
  useEffect(() => {
    const els = document.querySelectorAll('[data-rv]');
    if (!('IntersectionObserver' in window)) { els.forEach((el) => el.classList.add('rvIn')); return; }
    const show = new IntersectionObserver((entries) => {
      entries.forEach((e) => { if (e.isIntersecting) e.target.classList.add('rvIn'); });
    }, { threshold: 0.15, rootMargin: '0px 0px -8% 0px' });
    const reset = new IntersectionObserver((entries) => {
      entries.forEach((e) => {
        // solo cuando quedó entero por debajo de la pantalla (o sea, subiste)
        if (!e.isIntersecting && e.boundingClientRect.top > 0) e.target.classList.remove('rvIn');
      });
    }, { threshold: 0, rootMargin: '0px 0px -2px 0px' });
    els.forEach((el) => { show.observe(el); reset.observe(el); });
    return () => { show.disconnect(); reset.disconnect(); };
  }, []);

  const book = (preset = {}) => setBooking(preset);

  return (
    <>
      <Header
        user={user}
        onBook={() => book()}
        onAuth={setAuth}
        onMyBookings={() => setAccount(true)}
        onTeam={() => setTeam(true)}
        onServices={() => setSvc(true)}
        onLogout={logout}
      />
      <main>
        <Hero next={next} barbers={barbers} onBook={book} onServices={() => setSvc(true)} />
        <StyleMemory barbers={barbers} user={user} onAuth={setAuth} onMyBookings={() => setAccount(true)} />
        <HowTo barbers={barbers} next={next} />
        <Location onBook={() => book()} />
      </main>
      <Footer next={next} onBook={() => book()} onTeam={() => setTeam(true)} onServices={() => setSvc(true)} />
      <WhatsApp />
      {booking && (
        <Booking preset={booking} barbers={barbers} user={user}
          onAuth={setAuth} onClose={() => setBooking(null)} />
      )}
      {svc && (
        <Services barbers={barbers} error={error} onBook={book} onClose={() => setSvc(false)} />
      )}
      {team && (
        <Team barbers={barbers} onBook={book} onClose={() => setTeam(false)} />
      )}
      {account && user && (
        <Account user={user} onClose={() => setAccount(false)} onBook={() => book()} />
      )}
      {auth && (
        <Auth mode={auth} onClose={() => setAuth(null)}
          onDone={(u) => { setUser(u); setAuth(null); }} />
      )}
    </>
  );
}