import { createLogger, format, transports } from 'winston';
import path from 'path';

const { combine, timestamp, colorize, printf, json } = format;

const consoleFormat = printf(({ level, message, timestamp: ts, ...meta }) => {
  const extra = Object.keys(meta).length ? ` ${JSON.stringify(meta)}` : '';
  return `${ts} [${level}] ${message}${extra}`;
});

const logTransports: transports.ConsoleTransportInstance[] = [
  new transports.Console({
    format:
      process.env.NODE_ENV === 'production'
        ? combine(timestamp(), json())
        : combine(colorize(), timestamp({ format: 'HH:mm:ss' }), consoleFormat),
  }),
];

export const logger = createLogger({
  level: process.env.NODE_ENV === 'production' ? 'info' : 'debug',
  transports: logTransports,
});

if (process.env.NODE_ENV !== 'test') {
  logger.add(
    new transports.File({
      filename: path.join('logs', 'error.log'),
      level: 'error',
      format: combine(timestamp(), json()),
    })
  );
  logger.add(
    new transports.File({
      filename: path.join('logs', 'combined.log'),
      format: combine(timestamp(), json()),
    })
  );
}

export const winstonStream = {
  write: (message: string) => logger.info(message.trim()),
};
