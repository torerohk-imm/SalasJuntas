import express from 'express';
import cors from 'cors';
import morgan from 'morgan';
import { config, validateGraphEnv } from './config.js';
import { defaultNotice } from './mockData.js';
import {
  exchangeCodeForToken,
  getAuthorizationUrl,
  listRoomEvents,
  listRooms
} from './graphService.js';

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
  try {
    const data = await getAuthorizationUrl();
    res.json(data);
  } catch (error) {
    res.status(500).json({ message: 'No se pudo generar URL de autenticación.', details: error.message });
  }
});

app.post('/api/auth/exchange', async (req, res) => {
  const { code } = req.body;

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
  const token = req.headers.authorization?.replace('Bearer ', '');

  try {
    const rooms = await listRooms(token);
    res.json(rooms);
  } catch (error) {
    res.status(500).json({ message: 'No se pudieron obtener salas.', details: error.message });
  }
});

app.get('/api/rooms/:roomId/events', async (req, res) => {
  const token = req.headers.authorization?.replace('Bearer ', '');
  const { roomId } = req.params;
  const { start, end } = req.query;

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

app.get('/api/settings/notice', (_req, res) => {
  res.json({ notice: runtimeNotice });
});

app.put('/api/settings/notice', (req, res) => {
  const { notice } = req.body;
  if (typeof notice !== 'string') {
    return res.status(400).json({ message: 'notice debe ser string' });
  }

  runtimeNotice = notice;
  return res.json({ notice: runtimeNotice });
});

app.listen(config.port, () => {
  console.log(`API lista en puerto ${config.port}`);
});
