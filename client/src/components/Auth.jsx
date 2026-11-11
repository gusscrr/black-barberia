import { useEffect, useRef, useState } from 'react';
import { api } from '../api.js';
import './Auth.css';

// Ventana para iniciar sesión o crear una cuenta
// mode: 'login' | 'register'
export default function Auth({ mode: startMode = 'login', onClose, onDone }) {
  const [mode, setMode] = useState(startMode);
  const [form, setForm] = useState({ name: '', email: '', phone: '', password: '' });
  const [errors, setErrors] = useState({});
  const [error, setError] = useState('');
  const [sending, setSending] = useState(false);
  const [showPass, setShowPass] = useState(false);
  const [closing, setClosing] = useState(false);
  const boxRef = useRef(null);
  const isLogin = mode === 'login';

  const close = () => {
    setClosing(true);
    setTimeout(onClose, 200);
  };

  // Escape para cerrar y sin scroll atrás
  useEffect(() => {
    const onKey = (e) => e.key === 'Escape' && close();
    document.addEventListener('keydown', onKey);
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.removeEventListener('keydown', onKey);
      document.body.style.overflow = prev;
    };
  }, []);
  // Al abrir: el foco va a la ventana (no a un campo), así no aparece
  // la barrita de escribir hasta que la persona toque el campo
  useEffect(() => { boxRef.current?.focus(); }, []);
  useEffect(() => {
    setErrors({});
    setError('');
  }, [mode]);

  const change = (e) => {
    setForm({ ...form, [e.target.name]: e.target.value });
    setErrors({ ...errors, [e.target.name]: '' });
    setError('');
  };

  // Revisión rápida antes de mandar al servidor
  function validate() {
    const errs = {};
    if (!isLogin && form.name.trim().length < 2) errs.name = 'Escribí tu nombre y apellido.';
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(form.email.trim())) errs.email = 'Escribí un email válido.';
    if (!isLogin && form.phone.replace(/\D/g, '').length < 8) errs.phone = 'Escribí tu teléfono con código de área.';
    if (isLogin ? !form.password : form.password.length < 8) {
      errs.password = isLogin ? 'Escribí tu contraseña.' : 'Usá al menos 8 caracteres.';
    }
    return errs;
  }

  async function submit(e) {
    e.preventDefault();
    const errs = validate();
    setErrors(errs);
    if (Object.keys(errs).length) return;

    setSending(true);
    setError('');
    try {
      const body = isLogin
        ? { email: form.email, password: form.password }
        : form;
      const r = await api(`/api/auth/${isLogin ? 'login' : 'register'}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body)
      });
      onDone(r.user);
    } catch (err) {
      if (err.field) setErrors({ [err.field]: err.message });
      else setError(err.message);
    } finally {
      setSending(false);
    }
  }

  return (
    <div className={'authOverlay' + (closing ? ' out' : '')} onMouseDown={(e) => e.target === e.currentTarget && close()}>
      <div className="authBox" role="dialog" aria-modal="true" aria-labelledby="authTitle" ref={boxRef} tabIndex={-1}>
        <button className="authClose" onClick={close} aria-label="Cerrar">
          <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M6 6l12 12M18 6L6 18" /></svg>
        </button>

        <div className="authHead">
          <span className="authLogo">Black Barberia</span>
          <h2 id="authTitle">{isLogin ? 'Iniciá sesión' : 'Creá tu cuenta'}</h2>
          <p>{isLogin ? 'Entrá para ver y gestionar tus turnos.' : 'Reservá más rápido y tené tus turnos siempre a mano.'}</p>
        </div>

        <div className="authTabs" role="tablist">
          <button role="tab" aria-selected={isLogin} className={'authTab' + (isLogin ? ' on' : '')} onClick={() => setMode('login')}>
            Iniciar sesión
          </button>
          <button role="tab" aria-selected={!isLogin} className={'authTab' + (!isLogin ? ' on' : '')} onClick={() => setMode('register')}>
            Crear cuenta
          </button>
        </div>

        <form onSubmit={submit} noValidate>
          {!isLogin && (
            <Field label="Nombre y apellido" error={errors.name}>
              <input name="name" autoComplete="name" value={form.name} onChange={change} aria-invalid={!!errors.name} />
            </Field>
          )}
          <Field label="Email" error={errors.email}>
            <input name="email" type="email" inputMode="email" autoComplete="email" placeholder="nombre@email.com"
              value={form.email} onChange={change} aria-invalid={!!errors.email} />
          </Field>
          {!isLogin && (
            <Field label="Teléfono" error={errors.phone}>
              <input name="phone" type="tel" inputMode="tel" autoComplete="tel" placeholder="351 123 4567"
                value={form.phone} onChange={change} aria-invalid={!!errors.phone} />
            </Field>
          )}
          <Field label="Contraseña" error={errors.password} hint={!isLogin && !errors.password ? 'Mínimo 8 caracteres.' : ''}>
            <div className="passWrap">
              <input name="password" type={showPass ? 'text' : 'password'}
                autoComplete={isLogin ? 'current-password' : 'new-password'}
                value={form.password} onChange={change} aria-invalid={!!errors.password} />
              <button type="button" className="passToggle" onClick={() => setShowPass(!showPass)}
                aria-label={showPass ? 'Ocultar contraseña' : 'Mostrar contraseña'}>
                {showPass ? (
                  <svg viewBox="0 0 24 24"><path d="M3 3l18 18M10.6 10.6a2 2 0 0 0 2.8 2.8M9.9 5.1A9.8 9.8 0 0 1 12 5c5 0 9 5 9 7a8.6 8.6 0 0 1-2.4 3.4M6.6 6.6C4.4 8 3 10.4 3 12c0 2 4 7 9 7a9.6 9.6 0 0 0 4.4-1.1" /></svg>
                ) : (
                  <svg viewBox="0 0 24 24"><path d="M3 12c0-2 4-7 9-7s9 5 9 7-4 7-9 7-9-5-9-7z" /><circle cx="12" cy="12" r="2.5" /></svg>
                )}
              </button>
            </div>
          </Field>

          {error && <div className="notice bad" role="alert">{error}</div>}

          <button className="btn btnBlack btnFull authSubmit" type="submit" disabled={sending}>
            {sending ? (
              <span className="authSpin" aria-hidden="true" />
            ) : isLogin ? (
              // Flecha entrando (iniciar sesión)
              <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M14 4h4a2 2 0 0 1 2 2v12a2 2 0 0 1-2 2h-4M10 16l4-4-4-4M14 12H4" /></svg>
            ) : (
              // Persona con un + (crear cuenta)
              <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M10 12a4 4 0 1 0 0-8 4 4 0 0 0 0 8zM3 20a7 7 0 0 1 12.5-4.3M19 14v6M16 17h6" /></svg>
            )}
            {sending ? 'Un momento…' : isLogin ? 'Iniciar sesión' : 'Crear cuenta'}
          </button>
        </form>

        <p className="authSwitch">
          {isLogin ? '¿No tenés cuenta?' : '¿Ya tenés cuenta?'}{' '}
          <button className="textLink" onClick={() => setMode(isLogin ? 'register' : 'login')}>
            {isLogin ? 'Creala gratis' : 'Iniciá sesión'}
          </button>
        </p>
      </div>
    </div>
  );
}

function Field({ label, error, hint, children }) {
  return (
    <label className={'field' + (error ? ' hasError' : '')}>
      <span className="fieldLabel">{label}</span>
      {children}
      {error ? <span className="fieldError">{error}</span> : hint ? <span className="fieldHint">{hint}</span> : null}
    </label>
  );
}