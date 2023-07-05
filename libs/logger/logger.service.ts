import { Injectable } from '@nestjs/common';
import { createLogger, format, transports, Logger as WinstonLogger } from 'winston';
import { LoggingWinston } from '@google-cloud/logging-winston';

/**
 * LoggerService is a NestJS service for logging, using the Winston library.
 * It has separate methods for console and file logging to ensure that logs
 * from the console are never printed to the files and vice versa.
 */
@Injectable()
export class LoggerService {
  private readonly logger: WinstonLogger;

  constructor() {
    const consoleFormat = format.printf(({ level, message, timestamp }) => {
      return `${timestamp} ${level}: ${message}`;
    });

    const fileFormat = format.combine(format.timestamp(), format.metadata(), format.json());

    const prod = process.env.NODE_ENV === 'production' || process.env.NODE_ENV === 'prod';
    const fileLogging = process.env.FILE_LOGGING === 'true';

    const fileTransport = fileLogging
      ? [
          new transports.File({
            filename: 'logs/application.log',
            level: 'debug',
            format: fileFormat,
          }),
          new transports.File({
            filename: 'logs/error.log',
            level: 'error',
            format: fileFormat,
          }),
        ]
      : [];

    const gcpTransport = prod ? [new LoggingWinston()] : [];

    // Logger configuration
    this.logger = createLogger({
      format: format.errors({ stack: true }),
      transports: [
        new transports.Console({
          level: prod ? 'info' : 'debug',
          format: format.combine(format.colorize(), format.timestamp(), consoleFormat),
        }),
        ...fileTransport,
        ...gcpTransport,
      ],
    });
  }

  /**
   * Log an information message to the application log file.
   * @param service
   * @param process
   */
  public getChildLogger(service: string, process?: 'REWARDS' | 'VALIDATORS'): WinstonLogger {
    return this.logger.child({ service, process });
  }
}
