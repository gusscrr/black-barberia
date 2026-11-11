import { useState } from 'react';
import { duration, money } from '../api.js';

// Lista de precios en la sección negra, con pestañas por peluquero
export default function Prices({ barbers, onBook }) {
  const [active, setActive] = useState(0);
  const barber = barbers[active];

  return (
    <section className="prices" id="precios">
      <div className="pricesInner">
        <div className="sectionHead dark">
          <h2>Precios</h2>
          <p>Tocá un servicio para reservarlo directamente.</p>
        </div>

        <div className="tabs" role="tablist" aria-label="Peluquero">
          {barbers.map((b, i) => (
            <button
              key={b.id}
              role="tab"
              aria-selected={i === active}
              className={'tab' + (i === active ? ' on' : '')}
              onClick={() => setActive(i)}
            >
              {b.name}
            </button>
          ))}
        </div>

        {barber && (
          <ul className="priceList" role="tabpanel">
            {barber.services.map((s) => (
              <li key={s.id}>
                <button className="priceRow" onClick={() => onBook({ barber, service: s })}>
                  <span className="priceName">
                    {s.name}
                    <small>{duration(s.duration)}</small>
                  </span>
                  <span className="priceValue">{money(s.price)}</span>
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>
    </section>
  );
}
