import { Injectable } from '@nestjs/common';
import { createLogger, format, transports, Logger as WinstonLogger } from 'winston';
import { StreamTransportInstance } from 'winston/lib/winston/transports';

/**
 * LoggerService is a NestJS service for logging, using the Winston library.
 * It has separate methods for console and file logging to ensure that logs
 * from the console are never printed to the files and vice versa.
 */
@Injectable()
export class LoggerService {
  private readonly logger: WinstonLogger;
  private readonly dummyLogger: WinstonLogger = createLogger({
    transports: [
      new transports.Console({
        silent: true, // Never print logs
      }),
    ],
  });

  constructor() {
    const consoleFormat = format.printf((info) => {
      let severity;
      if (info.level === 'info') {
        severity = 'INFO';
      } else if (info.level === 'warn') {
        severity = 'WARNING';
      } else if (info.level === 'error') {
        severity = 'ERROR';
      } else {
        severity = 'DEFAULT';
      }

      // unpack metadata from info[Symbol.for('splat')]
      const metadata = info[Symbol.for('splat')] ? info[Symbol.for('splat')][0] : {};

      const entry = {
        message: `${info.timestamp} ${info.message}`,
        severity: severity,
        service: info.service,
        ...info.metadata,
        ...metadata,
      };

      return JSON.stringify(entry);
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

    // Logger configuration
    this.logger = createLogger({
      format: format.combine(format.timestamp(), format.errors({ stack: true })),
      transports: [
        new transports.Console({
          level: prod ? 'info' : 'debug',
          format: format.combine(consoleFormat),
        }),
        ...fileTransport,
      ],
    });
  }

  /**
   * Log an information message to the application log file.
   * @param service
   */
  public getChildLogger(service: string): WinstonLogger {
    const allowedServices = process.env.ONLY_LOG_SERVICE?.split(',').map((s) => s.trim());

    // If ONLY_LOG_SERVICE is set and the current service is not in the allowed list, return the dummy logger
    if (allowedServices && !allowedServices.includes(service)) {
      return this.dummyLogger;
    } else if (allowedServices && allowedServices.includes(service)) {
      this.logger.info(
        `Only logging for services ${allowedServices.join(
          ', ',
        )}, other logs are suppressed and not written to file.`,
      );
    }

    return this.logger.child({ service });
  }
}
