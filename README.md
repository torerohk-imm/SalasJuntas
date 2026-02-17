# Salas de Juntas

Plataforma full-stack para visualizar la ocupación semanal de salas de juntas conectada a Microsoft Graph (OAuth 2.0), con fallback de datos mock para desarrollo local.

## Stack
- Frontend: React + Vite
- Backend: Node.js + Express
- Integración: Microsoft Graph + MSAL Node

## Ejecución
```bash
npm install
npm run dev
```

Frontend: `http://localhost:5173`  
Backend: `http://localhost:4000`

## Variables de entorno
Copia `.env.example` a `.env` y configura credenciales de Azure AD.

> Si `GRAPH_ENABLED=false`, la app usa salas/eventos simulados.

## Endpoints clave
- `GET /api/rooms`
- `GET /api/rooms/:roomId/events?start=ISO&end=ISO`
- `GET /api/auth/url`
- `POST /api/auth/exchange`
- `GET|PUT /api/settings/notice`
