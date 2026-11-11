// =========================================================
// Datos de la barbería para la sección "Dónde estamos"
// Cambiá solo este archivo. Si algún día abren otra sede,
// agregá otro bloque { ... } y aparecen las pestañas solas.
// =========================================================

export const SUCURSALES = [
  {
    id: 'principal',
    name: 'Black Barberia',
    address: 'Tu dirección 123',          // ← calle y número
    city: 'Tu ciudad, Córdoba',            // ← ciudad y provincia
    // Lo que se busca en Google Maps (si queda vacío usa dirección + ciudad)
    mapsQuery: '',
    days: 'Lun-Dom',                       // días de atención (corto)
    open: '9:00',
    close: '21:00',
    note: 'Con turno online'               // tercer renglón (ej: Orden de llegada)
  }
];