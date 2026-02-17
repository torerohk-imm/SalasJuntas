import { eachDayOfInterval, endOfWeek, format, isSameDay, parseISO, startOfWeek } from 'date-fns';
import { es } from 'date-fns/locale';

const HOURS = Array.from({ length: 11 }, (_, i) => 8 + i);

const toMinutes = (iso) => {
  const date = parseISO(iso);
  return date.getHours() * 60 + date.getMinutes();
};

export function WeeklyCalendar({ events }) {
  const weekStart = startOfWeek(new Date(), { weekStartsOn: 1 });
  const weekDays = eachDayOfInterval({ start: weekStart, end: endOfWeek(weekStart, { weekStartsOn: 1 }) });

  return (
    <div className="calendar">
      <div className="calendar-header">
        <div className="time-col">🕒</div>
        {weekDays.map((day) => (
          <div key={day.toISOString()} className={`day-col ${isSameDay(day, new Date()) ? 'today' : ''}`}>
            <div>{format(day, 'EEEE', { locale: es }).toUpperCase()}</div>
            <strong>{format(day, 'd')}</strong>
          </div>
        ))}
      </div>
      <div className="calendar-grid">
        <div className="hours">
          {HOURS.map((hour) => (
            <div className="hour" key={hour}>{`${String(hour).padStart(2, '0')}:00`}</div>
          ))}
        </div>
        {weekDays.map((day) => (
          <div className="day-lane" key={day.toISOString()}>
            {HOURS.map((hour) => (
              <div key={hour} className="slot" />
            ))}
            {events
              .filter((event) => isSameDay(parseISO(event.start), day))
              .map((event) => {
                const top = ((toMinutes(event.start) - 8 * 60) / 60) * 60;
                const height = ((toMinutes(event.end) - toMinutes(event.start)) / 60) * 60;
                return (
                  <article key={event.id} className="event" style={{ top: `${top}px`, height: `${height}px` }}>
                    <small>
                      {format(parseISO(event.start), 'HH:mm')} - {format(parseISO(event.end), 'HH:mm')}
                    </small>
                    <h4>{event.subject}</h4>
                    <span>Organizador: {event.organizer}</span>
                  </article>
                );
              })}
          </div>
        ))}
      </div>
    </div>
  );
}
