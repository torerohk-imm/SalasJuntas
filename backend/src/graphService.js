const crypto = require('crypto');
const https = require('https');
const querystring = require('querystring');
const { URL } = require('url');
const { config, graphScopes } = require('./config.js');
const { mockEventsByRoomId, mockRooms } = require('./mockData.js');

const tenantId = process.env.AZURE_TENANT_ID;
const authorizeBaseUrl = `https://login.microsoftonline.com/${tenantId}/oauth2/v2.0/authorize`;
const tokenBaseUrl = `https://login.microsoftonline.com/${tenantId}/oauth2/v2.0/token`;

const makeState = () => crypto.randomBytes(16).toString('hex');

const httpsRequestJson = (requestUrl, options, body) =>
  new Promise((resolve, reject) => {
    const req = https.request(requestUrl, options, (res) => {
      let data = '';
      res.on('data', (chunk) => {
        data += chunk;
      });
      res.on('end', () => {
        const statusCode = res.statusCode || 500;
        let parsed;

        try {
          parsed = data ? JSON.parse(data) : {};
        } catch (error) {
          return reject(new Error(`Respuesta inválida (${statusCode}): ${data}`));
        }

        if (statusCode < 200 || statusCode >= 300) {
          return reject(new Error(`HTTP ${statusCode}: ${JSON.stringify(parsed)}`));
        }

        return resolve(parsed);
      });
    });

    req.on('error', (error) => reject(error));

    if (body) {
      req.write(body);
    }

    req.end();
  });

const graphFetch = async (accessToken, endpoint) => {
  const requestUrl = new URL(`https://graph.microsoft.com/v1.0${endpoint}`);
  const payload = await httpsRequestJson(requestUrl, {
    method: 'GET',
    headers: {
      Authorization: `Bearer ${accessToken}`,
      Accept: 'application/json'
    }
  });

  return payload;
};

const getAuthorizationUrl = async () => {
  const state = makeState();
  const params = new URLSearchParams({
    client_id: process.env.AZURE_CLIENT_ID || '',
    response_type: 'code',
    redirect_uri: process.env.AZURE_REDIRECT_URI || '',
    response_mode: 'query',
    scope: graphScopes.join(' '),
    state
  });

  return { authUrl: `${authorizeBaseUrl}?${params.toString()}`, state };
};

const exchangeCodeForToken = async (code) => {
  const formBody = querystring.stringify({
    client_id: process.env.AZURE_CLIENT_ID,
    client_secret: process.env.AZURE_CLIENT_SECRET,
    scope: graphScopes.join(' '),
    code,
    redirect_uri: process.env.AZURE_REDIRECT_URI,
    grant_type: 'authorization_code'
  });

  const tokenResponse = await httpsRequestJson(tokenBaseUrl, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
      'Content-Length': Buffer.byteLength(formBody)
    }
  }, formBody);

  return tokenResponse && tokenResponse.access_token;
};

const listRooms = async (accessToken) => {
  if (!config.graphEnabled) {
    return mockRooms;
  }

  const filter = config.roomEmails.length
    ? config.roomEmails.map((email) => `emailAddress/address eq '${email}'`).join(' or ')
    : 'placeId ne null';

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

const listRoomEvents = async (accessToken, roomId, startIso, endIso) => {
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
    organizer:
      (event.organizer && event.organizer.emailAddress && event.organizer.emailAddress.name) || 'Sin organizador',
    start: event.start && event.start.dateTime,
    end: event.end && event.end.dateTime
  }));
};

module.exports = {
  exchangeCodeForToken,
  getAuthorizationUrl,
  listRoomEvents,
  listRooms
};
