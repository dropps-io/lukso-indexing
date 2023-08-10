import { Test, TestingModule } from '@nestjs/testing';
import { LuksoDataDbService } from '@db/lukso-data/lukso-data-db.service';
import { LuksoStructureDbService } from '@db/lukso-structure/lukso-structure-db.service';

import { RedisConnectionService } from '../redis-connection/redis-connection.service';
import { UpdateService } from './update.service';

describe('UpdateService', () => {
  let service: UpdateService;
  let mockLuksoStructureDbService: any;
  let mockLuksoDataDbService: any;
  let mockRedisService: any;

  beforeEach(async () => {
    mockLuksoStructureDbService = {
      fetchNewInterfaces: jest.fn(),
    };

    mockLuksoDataDbService = {
      decodeNewInterfaces: jest.fn(),
    };

    mockRedisService = {
      get: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        UpdateService,
        { provide: LuksoStructureDbService, useValue: mockLuksoStructureDbService },
        { provide: LuksoDataDbService, useValue: mockLuksoDataDbService },
        { provide: RedisConnectionService, useValue: mockRedisService },
      ],
    }).compile();

    service = module.get<UpdateService>(UpdateService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('runUpdate', () => {
    it('should not call decodeNewInterfaces if no new interfaces are found', async () => {
      mockLuksoStructureDbService.getNewInterfaces.mockResolvedValue([]);

      await service.runUpdate();

      expect(mockLuksoDataDbService.decodeNewInterfaces).not.toHaveBeenCalled();
    });

    it('should call decodeNewInterfaces if new interfaces are found', async () => {
      const newInterfaces = [{ id: '1' }, { id: '2' }];
      mockLuksoStructureDbService.getNewInterfaces.mockResolvedValue(newInterfaces);

      await service.runUpdate();

      expect(mockLuksoDataDbService.decodeNewInterfaces).toHaveBeenCalledWith(newInterfaces);
    });

    it('should fetch last_update_timestamp from Redis', async () => {
      await service.runUpdate();

      expect(mockRedisService.get).toHaveBeenCalledWith('last_update_timestamp');
    });
  });
});
