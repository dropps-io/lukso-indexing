import { Test, TestingModule } from '@nestjs/testing';
import { ConfigService } from '@nestjs/config';
import Redis from 'ioredis';
import { RedisManager, RedisService } from '@liaoliaots/nestjs-redis';

import { RedisConnectionService } from './redis-connection.service';

describe('RedisConnectionService', () => {
  let service: RedisConnectionService;
  let mockRedisService: jest.Mocked<RedisService>;
  let mockConfigService: jest.Mocked<ConfigService>;
  let mockRedisClient: jest.Mocked<Redis>;
  let mockRedisManager: jest.Mocked<RedisManager>;

  beforeEach(async () => {
    mockRedisClient = {
      get: jest.fn(),
      set: jest.fn(),
      config: jest.fn(),
    } as unknown as jest.Mocked<Redis>;

    mockRedisService = {
      getClient: jest.fn().mockReturnValue(mockRedisClient),
    } as unknown as jest.Mocked<RedisService>;

    mockConfigService = {
      get: jest.fn(),
    } as unknown as jest.Mocked<ConfigService>;

    mockRedisManager = {} as jest.Mocked<RedisManager>;

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        RedisConnectionService,
        { provide: RedisService, useValue: mockRedisService },
        { provide: RedisManager, useValue: mockRedisManager },
        { provide: ConfigService, useValue: mockConfigService },
      ],
    }).compile();

    service = module.get<RedisConnectionService>(RedisConnectionService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('onModuleInit', () => {
    //   it('should connect to Redis successfully', async () => {
    //     mockRedisService.getClient(); // Explicitly call the mock method
    //     await service.onModuleInit();
    //     expect(mockRedisService.getClient).toBeCalled();
    //   });
    //   it('should handle a failed Redis connection gracefully', async () => {
    //     mockRedisService.getClient.mockImplementationOnce(() => {
    //       throw new Error('Failed to connect');
    //     });
    //     await service.onModuleInit();
    //     // The service should still be defined even if Redis fails
    //     expect(service).toBeDefined();
    //   });
    //   it('should configure RDB persistence if enabled', async () => {
    //     mockConfigService.get.mockReturnValueOnce(true);
    //     await service.onModuleInit();
    //     expect(mockRedisClient.config).toBeCalledWith('SET', 'save', '3600 1');
    //   });
    // });
    // describe('get', () => {
    //   it('should retrieve a value from Redis', async () => {
    //     const key = 'testKey';
    //     const value = 'testValue';
    //     mockRedisClient.get.mockResolvedValueOnce(value);
    //     const result = await service.get(key);
    //     expect(mockRedisClient.get).toBeCalledWith(key);
    //     expect(result).toEqual(value);
    //   });
    // });
    // describe('set', () => {
    //   it('should store a key-value pair in Redis', async () => {
    //     const key = 'testKey';
    //     const value = 'testValue';
    //     mockRedisClient.set.mockResolvedValueOnce('OK');
    //     const result = await service.set(key, value);
    //     expect(mockRedisClient.set).toBeCalledWith(key, value);
    //     expect(result).toEqual('OK');
    //   });
    //   it('should handle a failed set operation gracefully', async () => {
    //     const key = 'testKey';
    //     const value = 'testValue';
    //     mockRedisClient.set.mockResolvedValueOnce('NOT_OK');
    //     await expect(service.set(key, value)).rejects.toThrowError('Redis set operation failed');
    //   });
  });
});
