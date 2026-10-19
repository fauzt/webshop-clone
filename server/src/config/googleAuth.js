import { OAuth2Client } from 'google-auth-library';

// Only needs the client ID, not a secret: this verifies an ID token the
// frontend already obtained from Google Identity Services, rather than
// performing the server-side authorization-code exchange (which would
// need a client secret and a redirect callback route).
const googleClient = new OAuth2Client({ clientId: process.env.GOOGLE_CLIENT_ID });

export default googleClient;
