import { hash, compare } from 'bcrypt';
import prisma from '../config/db.js';
import { registerSchema, loginSchema } from '../utils/validation.js';
import { signAccessToken, generateRefreshToken, refreshTokenExpiry, REFRESH_TOKEN_TTL_DAYS } from '../utils/tokens.js';

const SALT_ROUNDS = 12;

// Shared cookie options for the refresh token.
// httpOnly: not readable by client JS (mitigates XSS token theft).
// sameSite: 'strict' blocks the cookie being sent on cross-site requests (CSRF mitigation).
// secure: only sent over HTTPS in production.
function refreshCookieOptions() {
  return {
    httpOnly: true,
    sameSite: 'strict',
    secure: process.env.NODE_ENV === 'production',
    path: '/auth/refresh', // scope the cookie to the refresh endpoint only
    maxAge: REFRESH_TOKEN_TTL_DAYS,
  };
}

async function issueTokensAndRespond(res, user) {
  const accessToken = signAccessToken(user);
  const refreshToken = generateRefreshToken();

  await prisma.refreshToken.create({
    data: {
      token: refreshToken,
      userId: user.id,
      expiresAt: refreshTokenExpiry(),
    },
  });

  res.cookie('refreshToken', refreshToken, refreshCookieOptions());
  res.json({
    accessToken,
    user: { id: user.id, email: user.email, role: user.role },
  });
}

async function register(req, res, next) {
  try {
    const { email, password } = registerSchema.parse(req.body);

    const existing = await prisma.user.findUnique({ where: { email } });
    if (existing) {
      return res.status(409).json({ error: 'An account with this email already exists' });
    }

    const passwordHash = await hash(password, SALT_ROUNDS);
    const user = await prisma.user.create({
      data: { email, passwordHash },
    });

    await issueTokensAndRespond(res, user);
  } catch (err) {
    next(err);
  }
}

async function login(req, res, next) {
  try {
    const LOGIN_ERROR_MESSAGE = 'Invalid email or password'
    const { email, password } = loginSchema.parse(req.body);

    const user = await prisma.user.findUnique({ where: { email } });
    // Deliberately vague error — don't reveal whether the email exists.
    if (!user) {
      return res.status(401).json({ error: LOGIN_ERROR_MESSAGE });
    }

    const valid = await compare(password, user.passwordHash);
    if (!valid) {
      return res.status(401).json({ error: LOGIN_ERROR_MESSAGE });
    }

    await issueTokensAndRespond(res, user);
  } catch (err) {
    next(err);
  }
}

async function refresh(req, res, next) {
  try {
    const token = req.cookies?.refreshToken;
    if (!token) {
      return res.status(401).json({ error: 'Missing refresh token' });
    }

    const stored = await prisma.refreshToken.findUnique({
      where: { token },
      include: { user: true },
    });

    if (!stored || stored.revoked || stored.expiresAt < new Date()) {
      return res.status(401).json({ error: 'Refresh token invalid or expired' });
    }

    // Rotate: revoke the used token and issue a new one.
    // Limits the damage window if a refresh token is ever stolen.
    await prisma.refreshToken.update({
      where: { id: stored.id },
      data: { revoked: true },
    });

    await issueTokensAndRespond(res, stored.user);
  } catch (err) {
    next(err);
  }
}

async function logout(req, res, next) {
  try {
    const token = req.cookies?.refreshToken;
    if (token) {
      await prisma.refreshToken.updateMany({
        where: { token },
        data: { revoked: true },
      });
    }
    res.clearCookie('refreshToken', { path: '/auth/refresh' });
    res.status(204).send();
  } catch (err) {
    next(err);
  }
}

export { register, login, refresh, logout };
