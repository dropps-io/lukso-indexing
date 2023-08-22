import { Injectable } from '@nestjs/common';
import { createLogger, format, transports, Logger as WinstonLogger } from 'winston';
import { IS_PRODUCTION, ONLY_LOG_SERVICE } from 'apps/indexer/src/globals';

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
          level: IS_PRODUCTION ? 'info' : 'debug',
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
    let allowedServices: any[] | undefined;
    if (ONLY_LOG_SERVICE) {
      allowedServices = ONLY_LOG_SERVICE.split(',').map((s) => s.trim());

      if (!allowedServices?.includes(service)) {
        // if the allowed services doesn't include the service, return a dummy logger in place
        // This replaces the logs as well, so only use in testing preferably.

        if (IS_PRODUCTION)
          this.logger.warn(
            `Warning: ONLY_LOG_SERVICE feature is active with IS_PRODUCTION set to true. Logs are not written to file, make sure this was done on purpose as logs won't be written to file...`,
          );
        return this.dummyLogger;
      } else {
        this.logger.info(
          `Only logging for services ${allowedServices.join(
            ', ',
          )}, other logs are suppressed and not written to file.`,
        );
      }
    }

    return this.logger.child({ service });
  }
}
