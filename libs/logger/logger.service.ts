import { Injectable } from '@nestjs/common';
import { createLogger, format, transports, Logger as WinstonLogger } from 'winston';

/**
 * LoggerService is a NestJS service for logging, using the Winston library.
 * It has separate methods for console and file logging to ensure that logs
 * from the console are never printed to the files and vice versa.
 */
@Injectable()
export class LoggerService {
  private readonly consoleLogger: WinstonLogger;
  private readonly fileLogger: WinstonLogger;

  private lastBlock = 0;
  private latestIndexedBlock = 0;
  private latestIndexedEventBlock = 0;
  private indexedTransactions = 0;
  private indexedContracts = 0;

  constructor() {
    const consoleFormat = format.printf(({ level, message }) => {
      // Use ANSI escape codes to clear the current line and move the cursor to the beginning
      const clearLine = '\x1b[2K\r';
      return `${clearLine}${level}: ${message}`;
    });

    const fileFormat = format.combine(format.timestamp(), format.metadata(), format.json());

    // Console logger configuration
    this.consoleLogger = createLogger({
      format: format.errors({ stack: true }),
      transports: [
        new transports.Console({
          level: 'info',
          format: format.combine(format.colorize(), consoleFormat),
        }),
      ],
    });

    // File logger configuration
    this.fileLogger = createLogger({
      format: format.errors({ stack: true }),
      transports: [
        new transports.File({
          filename: 'logs/application.log',
          level: 'info',
          format: fileFormat,
        }),
        new transports.File({
          filename: 'logs/error.log',
          level: 'error',
          format: fileFormat,
        }),
      ],
    });
  }

  /**
   * Log an information message to the application log file.
   * @param service
   */
  public getChildLogger(service: string) {
    return this.fileLogger.child({ service });
  }

  /**
   * Set the last block number.
   * @param {number} block - The last block number.
   */
  public setLastBlock(block: number): void {
    this.lastBlock = block;
    this.printConsole();
  }

  /**
   * Set the latest indexed block number and update the console.
   * @param {number} block - The latest indexed block number.
   */
  public setLatestIndexedBlock(block: number): void {
    this.latestIndexedBlock = block;
    this.printConsole();
  }

  /**
   * Set the latest indexed event block number and update the console.
   * @param {number} block - The latest indexed event block number.
   */
  public setLatestIndexedEventBlock(block: number): void {
    this.latestIndexedEventBlock = block;
    this.printConsole();
  }

  public incrementIndexedCount(type: 'transaction' | 'contract'): void {
    switch (type) {
      case 'transaction':
        this.indexedTransactions++;
        break;
      case 'contract':
        this.indexedContracts++;
        break;
    }
    this.printConsole();
  }

  /**
   * Print the console log messages, clearing the console each time.
   */
  private printConsole(): void {
    // Use ANSI escape codes to clear he console and move the cursor to the beginning
    const clearConsole = '\x1b[2J\x1b[0;0H';
    process.stdout.write(clearConsole);

    this.consoleLogger.log(
      'info',
      `Event indexing: ${((this.latestIndexedEventBlock / this.lastBlock) * 100).toFixed(
        2,
      )}% complete (${this.latestIndexedEventBlock} / ${this.lastBlock})`,
    );
    this.consoleLogger.log(
      'info',
      `Transaction indexing: ${((this.latestIndexedBlock / this.lastBlock) * 100).toFixed(
        2,
      )}% complete (${this.latestIndexedBlock} / ${this.lastBlock})`,
    );
    this.consoleLogger.log('info', `Indexed transactions: ${this.indexedTransactions}`);
    this.consoleLogger.log('info', `Indexed contracts: ${this.indexedContracts}`);
  }
}
