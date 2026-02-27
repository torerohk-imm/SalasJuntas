import { useEffect, useMemo, useState } from 'react';
import { format, isAfter, isBefore, parseISO, startOfWeek } from 'date-fns';
import { es } from 'date-fns/locale';
import { api } from './lib/api';
import { WeeklyCalendar } from './components/WeeklyCalendar';

const endOfWindow = (date) => {
  const copy = new Date(date);
  copy.setDate(copy.getDate() + 6);
  copy.setHours(23, 59, 59, 999);
  return copy;
};

function App() {
  const [rooms, setRooms] = useState([]);
  const [selectedRoomId, setSelectedRoomId] = useState('');
  const [events, setEvents] = useState([]);
  const [notice, setNotice] = useState('');
  const [noticeDraft, setNoticeDraft] = useState('');
  const [now, setNow] = useState(new Date());
  const [token, setToken] = useState(() => localStorage.getItem('graphAccessToken') || '');
  const [graphEnabled, setGraphEnabled] = useState(false);

  useEffect(() => {
    const bootstrap = async () => {
      const params = new URLSearchParams(window.location.search);
      const code = params.get('code');

      if (code) {
        const payload = await api.exchangeCode(code);
        if (payload.accessToken) {
          localStorage.setItem('graphAccessToken', payload.accessToken);
          setToken(payload.accessToken);
        }

        window.history.replaceState({}, '', window.location.pathname);
      }

      const health = await api.getHealth();
      setGraphEnabled(Boolean(health.graphEnabled));

      const [roomsData, noticeData] = await Promise.all([api.getRooms(token), api.getNotice()]);
      setRooms(roomsData);
      if (roomsData.length > 0) {
        setSelectedRoomId((previous) => previous || roomsData[0].id);
      }
      setNotice(noticeData.notice);
      setNoticeDraft(noticeData.notice);
    };

    bootstrap().catch(console.error);
  }, [token]);

  useEffect(() => {
    if (!selectedRoomId) {
      return;
    }

    const weekStart = startOfWeek(new Date(), { weekStartsOn: 1 });
    const start = new Date(weekStart);
    start.setHours(8, 0, 0, 0);

    api
      .getEvents(selectedRoomId, start.toISOString(), endOfWindow(start).toISOString(), token)
      .then(setEvents)
      .catch(console.error);
  }, [selectedRoomId, token]);

  useEffect(() => {
    const interval = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(interval);
  }, []);

  const room = rooms.find((item) => item.id === selectedRoomId);

  const currentEvent = useMemo(
    () => events.find((event) => isBefore(parseISO(event.start), now) && isAfter(parseISO(event.end), now)),
    [events, now]
  );

  const nextEvent = useMemo(
    () =>
      events
        .filter((event) => isAfter(parseISO(event.start), now))
        .sort((a, b) => new Date(a.start) - new Date(b.start))[0],
    [events, now]
  );

  const occupation = useMemo(() => {
    const busyMinutes = events.reduce(
      (total, event) => total + (new Date(event.end).getTime() - new Date(event.start).getTime()) / 60000,
      0
    );
    const totalMinutes = 7 * 10 * 60;
    return Math.round((busyMinutes / totalMinutes) * 100);
  }, [events]);

  const saveNotice = async () => {
    const payload = await api.saveNotice(noticeDraft);
    setNotice(payload.notice);
  };

  const connectToMicrosoft = async () => {
    const { authUrl } = await api.getAuthUrl();
    window.location.href = authUrl;
  };

  const clearSession = () => {
    localStorage.removeItem('graphAccessToken');
    setToken('');
  };

  return (
    <main className="app-shell">
      <section className="card top">
        <div>
          <h1>{room?.displayName || 'Salas de Juntas'}</h1>
          <p>{`Capacidad: ${room?.capacity || '-'} Personas • ${room?.floor || 'Sin ubicación'}`}</p>
          <div className="top-controls">
            <select value={selectedRoomId} onChange={(e) => setSelectedRoomId(e.target.value)}>
              {rooms.map((item) => (
                <option key={item.id} value={item.id}>
                  {item.displayName}
                </option>
              ))}
            </select>
            {graphEnabled && !token && (
              <button className="primary" onClick={connectToMicrosoft}>
                Conectar Microsoft 365
              </button>
            )}
            {graphEnabled && token && (
              <button className="secondary" onClick={clearSession}>
                Cerrar sesión Graph
              </button>
            )}
          </div>
        </div>
        <div className="clock">
          <strong>{format(now, 'HH:mm:ss')}</strong>
          <span>{format(now, "EEEE, d 'de' MMMM", { locale: es })}</span>
        </div>
      </section>

      <section className="card notice">
        <p>
          <strong>Avisos:</strong> {notice}
        </p>
        <span className={`pill ${currentEvent ? 'busy' : 'free'}`}>{currentEvent ? 'Sala Ocupada' : 'Sala Disponible'}</span>
      </section>

      <WeeklyCalendar events={events} />

      <section className="card footer">
        <div className="legend">
          <span>
            <i className="dot busy" /> Ocupado
          </span>
          <span>
            <i className="dot free" /> Libre / Otros
          </span>
        </div>
        <div className="stats">
          <div>
            <small>OCUPACIÓN SEMANAL</small>
            <strong>{occupation}%</strong>
          </div>
          <div>
            <small>PRÓXIMA REUNIÓN</small>
            <strong>
              {nextEvent ? `${format(parseISO(nextEvent.start), 'HH:mm')} - ${nextEvent.subject}` : 'Sin reuniones pendientes'}
            </strong>
          </div>
        </div>
      </section>

      <section className="card admin">
        <h3>Panel de administración (avisos)</h3>
        <textarea value={noticeDraft} onChange={(e) => setNoticeDraft(e.target.value)} rows={3} />
        <button onClick={saveNotice}>Guardar aviso</button>
      </section>
    </main>
  );
}

export default App;
