import rateLimit from 'express-rate-limit';

// Deliberately stricter than general API rate limits — login/register
// are the endpoints attackers brute-force.
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 10, // 10 attempts per IP per window
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Too many attempts, please try again later' },
});

export default authLimiter;
