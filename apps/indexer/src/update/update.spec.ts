// Importing modules and services
import { Test, TestingModule } from '@nestjs/testing';
import { LuksoStructureDbService } from '@db/lukso-structure/lukso-structure-db.service';
import { LuksoDataDbService } from '@db/lukso-data/lukso-data-db.service';
import { LoggerService } from '@libs/logger/logger.service';
import winston from 'winston';

import { RedisConnectionService } from '../redis-connection/redis-connection.service';
import { DecodingService } from '../decoding/decoding.service';
import { UpdateService } from './update.service';

// Setting up winston logger
const logger = winston.createLogger({
  level: 'info',
  format: winston.format.json(),
  transports: [
    new winston.transports.Console({
      format: winston.format.simple(),
    }),
    // Add more transports as needed
  ],
});

module.exports = logger;

// Setting up the mocks
const mockLuksoStructureDbService = {
  fetchNewInterfaces: jest.fn(),
};
const mockLuksoDataDbService = {
  fetchNonDecodedTransactionsWithInput: jest.fn(),
  fetchNonDecodedWrapped: jest.fn(),
  fetchNonDecodedEvents: jest.fn(),
  updateTransactionWithDecodedMethod: jest.fn(),
};
const mockRedisConnectionService = {
  get: jest.fn(),
  set: jest.fn(),
};
const mockLoggerService = {
  getChildLogger: jest.fn().mockReturnValue(logger), // Here, use the 'logger' you've set up at the beginning of the file.
};
const mockDecodingService = {
  decodeTransactionInput: jest.fn(),
  decodeLogParameters: jest.fn(),
};

// Starting the test suite
describe('UpdateService', () => {
  let service: UpdateService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        UpdateService,
        { provide: LuksoStructureDbService, useValue: mockLuksoStructureDbService },
        { provide: LuksoDataDbService, useValue: mockLuksoDataDbService },
        { provide: RedisConnectionService, useValue: mockRedisConnectionService },
        { provide: LoggerService, useValue: mockLoggerService },
        { provide: DecodingService, useValue: mockDecodingService },
      ],
    }).compile();

    service = module.get<UpdateService>(UpdateService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('runUpdate', () => {
    it('should not run if isUpdateRunning is true', async () => {
      service['isUpdateRunning'] = true;
      await service.runUpdate();
      expect(mockRedisConnectionService.get).not.toHaveBeenCalled();
    });

    it('should fetch the last update timestamp', async () => {
      mockRedisConnectionService.get.mockResolvedValueOnce(new Date().toISOString());
      await service.runUpdate();
      expect(mockRedisConnectionService.get).toHaveBeenCalled();
    });

    // Add more tests...
  });

  describe('fetchAllNonDecoded', () => {
    // Add tests for this function...
  });

  // Add other describe blocks for other methods as needed...
});
