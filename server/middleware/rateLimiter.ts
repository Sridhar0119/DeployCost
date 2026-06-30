import rateLimit from 'express-rate-limit';

export const generalLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 60, // Limit each IP to 60 requests per window
  message: { error: 'Too many requests, please try again after 15 minutes.' },
  standardHeaders: true,
  legacyHeaders: false,
});

export default generalLimiter;
