import pino from 'pino';
import { getConfig, isProduction } from '../config/index.js';

const config = getConfig();

export const logger = pino({
  level: config.LOG_LEVEL,
  formatters: {
    level: (label) => ({ level: label }),
  },
  timestamp: pino.stdTimeFunctions.isoTime,
  base: {
    service: 'soul-lab-api',
    env: config.NODE_ENV,
  },
  transport: isProduction()
    ? undefined
    : {
        target: 'pino-pretty',
        options: {
          colorize: true,
          translateTime: 'SYS:standard',
          ignore: 'pid,hostname',
        },
      },
});

export type Logger = typeof logger;

export function createChildLogger(bindings: Record<string, unknown>) {
  return logger.child(bindings);
}
