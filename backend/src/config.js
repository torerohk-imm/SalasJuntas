import dotenv from 'dotenv';

dotenv.config();

const requiredWhenGraphEnabled = [
  'AZURE_TENANT_ID',
  'AZURE_CLIENT_ID',
  'AZURE_CLIENT_SECRET',
  'AZURE_REDIRECT_URI'
];

export const config = {
  port: Number(process.env.PORT || 4000),
  frontendUrl: process.env.FRONTEND_URL || 'http://localhost:5173',
  graphEnabled: process.env.GRAPH_ENABLED === 'true',
  timezone: process.env.TIMEZONE || 'America/Mexico_City',
  roomEmails: (process.env.ROOM_EMAILS || '')
    .split(',')
    .map((room) => room.trim())
    .filter(Boolean)
};

export const graphConfig = {
  auth: {
    clientId: process.env.AZURE_CLIENT_ID,
    authority: `https://login.microsoftonline.com/${process.env.AZURE_TENANT_ID}`,
    clientSecret: process.env.AZURE_CLIENT_SECRET
  }
};

export const graphScopes = ['Calendars.Read', 'User.Read', 'Places.Read.All'];

export const validateGraphEnv = () => {
  if (!config.graphEnabled) {
    return [];
  }

  return requiredWhenGraphEnabled.filter((key) => !process.env[key]);
};
