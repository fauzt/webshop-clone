import jwt from 'jsonwebtoken';
const { sign, verify } = jwt;
import { randomBytes } from 'crypto';

const ACCESS_TOKEN_TTL = '15m';
export const REFRESH_TOKEN_TTL_DAYS = 30;

function signAccessToken(user) {
  return sign(
    { sub: user.id, role: user.role },
    process.env.JWT_ACCESS_SECRET,
    { expiresIn: ACCESS_TOKEN_TTL }
  );
}

function verifyAccessToken(token) {
  return verify(token, process.env.JWT_ACCESS_SECRET);
}

// Refresh tokens are opaque random strings (not JWTs) stored hashed-free in the DB
// so they can be looked up and revoked directly. Simpler to reason about than
// verifying + cross-checking a JWT refresh token against a DB record.
function generateRefreshToken() {
  return randomBytes(64).toString('hex');
}

function refreshTokenExpiry() {
  const d = new Date();
  d.setDate(d.getDate() + REFRESH_TOKEN_TTL_DAYS);
  return d;
}

export {
  signAccessToken,
  verifyAccessToken,
  generateRefreshToken,
  refreshTokenExpiry,
};
