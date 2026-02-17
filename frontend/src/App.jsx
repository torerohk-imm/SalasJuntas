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

  useEffect(() => {
    const load = async () => {
      const [roomsData, noticeData] = await Promise.all([api.getRooms(), api.getNotice()]);
      setRooms(roomsData);
      if (roomsData.length > 0) {
        setSelectedRoomId(roomsData[0].id);
      }
      setNotice(noticeData.notice);
      setNoticeDraft(noticeData.notice);
    };

    load().catch(console.error);
  }, []);

  useEffect(() => {
    if (!selectedRoomId) {
      return;
    }

    const weekStart = startOfWeek(new Date(), { weekStartsOn: 1 });
    const start = new Date(weekStart);
    start.setHours(8, 0, 0, 0);

    api
      .getEvents(selectedRoomId, start.toISOString(), endOfWindow(start).toISOString())
      .then(setEvents)
      .catch(console.error);
  }, [selectedRoomId]);

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

  return (
    <main className="app-shell">
      <section className="card top">
        <div>
          <h1>{room?.displayName || 'Salas de Juntas'}</h1>
          <p>{`Capacidad: ${room?.capacity || '-'} Personas • ${room?.floor || 'Sin ubicación'}`}</p>
          <select value={selectedRoomId} onChange={(e) => setSelectedRoomId(e.target.value)}>
            {rooms.map((item) => (
              <option key={item.id} value={item.id}>
                {item.displayName}
              </option>
            ))}
          </select>
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
          <span><i className="dot busy" /> Ocupado</span>
          <span><i className="dot free" /> Libre / Otros</span>
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
