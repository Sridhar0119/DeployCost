import rateLimit from 'express-rate-limit';

export const uploadLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 20, // Limit each IP to 20 requests per window
  message: { error: 'Too many upload attempts, please try again after 15 minutes.' },
  standardHeaders: true,
  legacyHeaders: false,
});

export default uploadLimiter;
