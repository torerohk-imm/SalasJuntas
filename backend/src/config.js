const dotenv = require('dotenv');

dotenv.config();

const requiredWhenGraphEnabled = [
  'AZURE_TENANT_ID',
  'AZURE_CLIENT_ID',
  'AZURE_CLIENT_SECRET',
  'AZURE_REDIRECT_URI'
];

const config = {
  port: Number(process.env.PORT || 4000),
  frontendUrl: process.env.FRONTEND_URL || 'http://localhost:5173',
  graphEnabled: process.env.GRAPH_ENABLED === 'true',
  timezone: process.env.TIMEZONE || 'America/Mexico_City',
  roomEmails: (process.env.ROOM_EMAILS || '')
    .split(',')
    .map((room) => room.trim())
    .filter(Boolean)
};

const graphScopes = ['Calendars.Read', 'User.Read', 'Places.Read.All'];

const validateGraphEnv = () => {
  if (!config.graphEnabled) {
    return [];
  }

  return requiredWhenGraphEnabled.filter((key) => !process.env[key]);
};

module.exports = {
  config,
  graphScopes,
  validateGraphEnv
};
