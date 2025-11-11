import pino from 'pino';

export const logger = pino({
  name: 'icelandic-mortgage-api',
  level: process.env.LOG_LEVEL ?? 'info',
  transport:
    process.env.NODE_ENV === 'development'
      ? {
          target: 'pino-pretty',
          options: {
            translateTime: 'SYS:standard',
            colorize: true
          }
        }
      : undefined
});
