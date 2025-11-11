import rateLimit from 'express-rate-limit';

export const requestLimiter = rateLimit({
  windowMs: 1000,
  max: 2,
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    message: 'Rate limit exceeded. Please wait before retrying.',
    messageIs: 'Of mörg köll. Vinsamlegast reyndu aftur síðar.'
  }
});
