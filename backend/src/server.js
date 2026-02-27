const express = require('express');
const cors = require('cors');
const morgan = require('morgan');
const { config, validateGraphEnv } = require('./config.js');
const { defaultNotice } = require('./mockData.js');
const {
  exchangeCodeForToken,
  getAuthorizationUrl,
  listRoomEvents,
  listRooms
} = require('./graphService.js');

const app = express();
app.use(cors({ origin: config.frontendUrl, credentials: true }));
app.use(express.json());
app.use(morgan('dev'));

let runtimeNotice = defaultNotice;

app.get('/api/health', (_req, res) => {
  const missingEnv = validateGraphEnv();
  res.json({ ok: true, graphEnabled: config.graphEnabled, missingEnv });
});

app.get('/api/auth/url', async (_req, res) => {
  if (!config.graphEnabled) {
    return res.status(400).json({ message: 'Graph está deshabilitado. Activa GRAPH_ENABLED=true.' });
  }

  try {
    const data = await getAuthorizationUrl();
    return res.json(data);
  } catch (error) {
    return res.status(500).json({ message: 'No se pudo generar URL de autenticación.', details: error.message });
  }
});

app.post('/api/auth/exchange', async (req, res) => {
  if (!config.graphEnabled) {
    return res.status(400).json({ message: 'Graph está deshabilitado. Activa GRAPH_ENABLED=true.' });
  }

  const code = req.body && req.body.code;
  if (!code) {
    return res.status(400).json({ message: 'Código OAuth requerido.' });
  }

  try {
    const accessToken = await exchangeCodeForToken(code);
    return res.json({ accessToken });
  } catch (error) {
    return res.status(500).json({ message: 'No se pudo intercambiar el código.', details: error.message });
  }
});

app.get('/api/rooms', async (req, res) => {
  const authHeader = req.headers.authorization || '';
  const token = authHeader.startsWith('Bearer ') ? authHeader.replace('Bearer ', '') : '';

  if (config.graphEnabled && !token) {
    return res.status(401).json({ message: 'Se requiere token OAuth para consultar salas.' });
  }

  try {
    const rooms = await listRooms(token);
    return res.json(rooms);
  } catch (error) {
    return res.status(500).json({ message: 'No se pudieron obtener salas.', details: error.message });
  }
});

app.get('/api/rooms/:roomId/events', async (req, res) => {
  const authHeader = req.headers.authorization || '';
  const token = authHeader.startsWith('Bearer ') ? authHeader.replace('Bearer ', '') : '';
  const roomId = req.params.roomId;

  if (config.graphEnabled && !token) {
    return res.status(401).json({ message: 'Se requiere token OAuth para consultar eventos.' });
  }

  const start = req.query.start;
  const end = req.query.end;
  if (!start || !end) {
    return res.status(400).json({ message: 'Se requieren start y end ISO.' });
  }

  try {
    const events = await listRoomEvents(token, roomId, start, end);
    return res.json(events);
  } catch (error) {
    return res.status(500).json({ message: 'No se pudieron obtener eventos.', details: error.message });
  }
});

app.get('/api/settings/notice', (_req, res) => res.json({ notice: runtimeNotice }));

app.put('/api/settings/notice', (req, res) => {
  const notice = req.body && req.body.notice;
  if (typeof notice !== 'string') {
    return res.status(400).json({ message: 'notice debe ser string' });
  }

  runtimeNotice = notice;
  return res.json({ notice: runtimeNotice });
});

app.listen(config.port, () => {
  console.log(`API lista en puerto ${config.port}`);
});
