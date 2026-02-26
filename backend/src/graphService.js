import { randomUUID } from 'node:crypto';
import { ConfidentialClientApplication } from '@azure/msal-node';
import { config, graphConfig, graphScopes } from './config.js';
import { mockEventsByRoomId, mockRooms } from './mockData.js';

const msalClient = new ConfidentialClientApplication(graphConfig);

const graphFetch = async (accessToken, endpoint) => {
  const response = await fetch(`https://graph.microsoft.com/v1.0${endpoint}`, {
    headers: { Authorization: `Bearer ${accessToken}` }
  });

  if (!response.ok) {
    const details = await response.text();
    throw new Error(`Graph error (${response.status}): ${details}`);
  }

  return response.json();
};

export const getAuthorizationUrl = async () => {
  const state = randomUUID();
  const authCodeUrlParameters = {
    scopes: graphScopes,
    redirectUri: process.env.AZURE_REDIRECT_URI,
    state
  };

  const authUrl = await msalClient.getAuthCodeUrl(authCodeUrlParameters);
  return { authUrl, state };
};

export const exchangeCodeForToken = async (code) => {
  const tokenResponse = await msalClient.acquireTokenByCode({
    code,
    scopes: graphScopes,
    redirectUri: process.env.AZURE_REDIRECT_URI
  });

  return tokenResponse?.accessToken;
};

export const listRooms = async (accessToken) => {
  if (!config.graphEnabled) {
    return mockRooms;
  }

  const filter = config.roomEmails.length
    ? config.roomEmails.map((email) => `emailAddress/address eq '${email}'`).join(' or ')
    : "placeId ne null";

  const data = await graphFetch(
    accessToken,
    `/places/microsoft.graph.room?$select=id,displayName,capacity,displayDeviceName,floorNumber,emailAddress&$filter=${encodeURIComponent(filter)}`
  );

  return (data.value || []).slice(0, 10).map((room) => ({
    id: room.id || room.emailAddress,
    displayName: room.displayName,
    emailAddress: room.emailAddress,
    capacity: room.capacity || 0,
    floor: room.floorNumber ? `Piso ${room.floorNumber}` : room.displayDeviceName || 'Sin ubicación'
  }));
};

export const listRoomEvents = async (accessToken, roomId, startIso, endIso) => {
  if (!config.graphEnabled) {
    return mockEventsByRoomId[roomId] || [];
  }

  const rooms = await listRooms(accessToken);
  const room = rooms.find((candidate) => candidate.id === roomId);
  if (!room) {
    return [];
  }

  const payload = await graphFetch(
    accessToken,
    `/users/${encodeURIComponent(room.emailAddress)}/calendarView?startDateTime=${encodeURIComponent(startIso)}&endDateTime=${encodeURIComponent(endIso)}&$select=id,subject,start,end,organizer`
  );

  return (payload.value || []).map((event) => ({
    id: event.id,
    subject: event.subject,
    organizer: event.organizer?.emailAddress?.name || 'Sin organizador',
    start: event.start?.dateTime,
    end: event.end?.dateTime
  }));
};
