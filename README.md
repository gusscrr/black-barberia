# Black Barberia — sistema real de turnos

Proyecto para Visual Studio Code con frontend moderno + Node.js + SQLite.

## Qué hace
- Flujo tipo el de tus capturas: peluquero → servicio → fecha → horario → datos → confirmación.
- Los horarios disponibles se calculan desde la base de datos.
- Cuando se confirma un turno, ese horario queda ocupado automáticamente y deja de aparecer.
- Tiene restricción única por barbero + fecha + hora para evitar que dos personas reserven el mismo turno al mismo tiempo.
- Permite bloquear horarios desde una API de administración.
- Puede avisar al barbero por WhatsApp Cloud API.

## Estructura
- `src/` → servidor Node + Express + SQLite (API).
- `client/` → frontend en React (Vite).

## Instalar
1. Instalar Node.js 20+.
2. Abrir esta carpeta en VS Code.
3. En la terminal: `npm install` (instala también lo de `client/`).
4. Copiar `.env.example` como `.env` y cambiar `ADMIN_KEY`.

## Usar
- **Desarrollo:** `npm run dev` → abrir `http://localhost:5173` (React con recarga automática; la API corre en el 3000).
- **Producción:** `npm run build` y después `npm start` → abrir `http://localhost:3000`.

## WhatsApp
Para uso real hay que configurar una cuenta de WhatsApp Business/Cloud API, el ID del número y un token. Para mensajes iniciados por el negocio puede ser necesario usar una plantilla aprobada; por eso el proyecto permite definir `WHATSAPP_TEMPLATE_NAME`.

No pongas el token de WhatsApp en el frontend. Va solamente en `.env` del servidor.

## Panel
La base ya soporta bloqueos de horarios y consulta de turnos con `x-admin-key`. El siguiente paso recomendable es agregar una pantalla `/admin` para que el dueño pueda crear horarios, bloquearlos y ver todos los turnos sin tocar código.
