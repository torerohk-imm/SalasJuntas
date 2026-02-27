const mockRooms = [
  { id: 'sala-tokio', displayName: 'Sala Tokio', emailAddress: 'sala.tokio@contoso.com', capacity: 12, floor: 'Piso 4' },
  { id: 'sala-berlin', displayName: 'Sala Berlin', emailAddress: 'sala.berlin@contoso.com', capacity: 8, floor: 'Piso 2' },
  { id: 'sala-nairobi', displayName: 'Sala Nairobi', emailAddress: 'sala.nairobi@contoso.com', capacity: 10, floor: 'Piso 3' },
  { id: 'sala-lisboa', displayName: 'Sala Lisboa', emailAddress: 'sala.lisboa@contoso.com', capacity: 6, floor: 'Piso 1' },
  { id: 'sala-bogota', displayName: 'Sala Bogotá', emailAddress: 'sala.bogota@contoso.com', capacity: 14, floor: 'Piso 6' },
  { id: 'sala-dublin', displayName: 'Sala Dublín', emailAddress: 'sala.dublin@contoso.com', capacity: 8, floor: 'Piso 2' },
  { id: 'sala-madrid', displayName: 'Sala Madrid', emailAddress: 'sala.madrid@contoso.com', capacity: 10, floor: 'Piso 5' },
  { id: 'sala-roma', displayName: 'Sala Roma', emailAddress: 'sala.roma@contoso.com', capacity: 5, floor: 'Piso 1' },
  { id: 'sala-oslo', displayName: 'Sala Oslo', emailAddress: 'sala.oslo@contoso.com', capacity: 9, floor: 'Piso 3' },
  { id: 'sala-vancouver', displayName: 'Sala Vancouver', emailAddress: 'sala.vancouver@contoso.com', capacity: 16, floor: 'Piso 7' }
];

const today = new Date();
const monday = new Date(today);
const shift = (today.getDay() + 6) % 7;
monday.setDate(today.getDate() - shift);

const inDay = (dayOffset, startHour, durationHours, subject, organizer) => {
  const start = new Date(monday);
  start.setDate(monday.getDate() + dayOffset);
  start.setHours(startHour, 0, 0, 0);
  const end = new Date(start);
  end.setHours(startHour + durationHours);
  return {
    id: `${subject}-${dayOffset}-${startHour}`,
    subject,
    organizer,
    start: start.toISOString(),
    end: end.toISOString()
  };
};

const mockEventsByRoomId = {
  'sala-tokio': [
    inDay(0, 9, 1.5, 'Sprint Planning', 'Equipo Tech'),
    inDay(1, 8, 2, 'Daily Sync Global', 'M. Rivera'),
    inDay(2, 10, 2, 'Workshop Diseño', 'Sala Completa'),
    inDay(3, 9, 2, 'Client Call: Project X', 'Conf. Internacional'),
    inDay(4, 8, 2.5, 'Planning Semanal', 'Marketing Team'),
    inDay(4, 16, 1, 'Review UX', 'Producto')
  ]
};

const defaultNotice = 'Recordatorio: Favor de dejar la sala limpia al terminar.';

module.exports = {
  defaultNotice,
  mockEventsByRoomId,
  mockRooms
};
