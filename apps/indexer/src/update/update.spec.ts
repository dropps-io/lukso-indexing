import { Test, TestingModule } from '@nestjs/testing';
import { LoggerService } from '@libs/logger/logger.service';
import { LuksoStructureDbService } from '@db/lukso-structure/lukso-structure-db.service';
import { LuksoDataDbService } from '@db/lukso-data/lukso-data-db.service';
import { ContractInterfaceTable } from '@db/lukso-structure/entities/contractInterface.table';
import { CONTRACT_TYPE } from '@shared/types/enums';
import { MethodInterfaceTable } from '@db/lukso-structure/entities/methodInterface.table';
import { MethodParameterTable } from '@db/lukso-structure/entities/methodParameter.table';
import { RedisService } from '@shared/redis/redis.service';

import { UpdateService } from './update.service';
import { DecodingService } from '../decoding/decoding.service';
import { ContractsService } from '../contracts/contracts.service';

import Mock = jest.Mock;

const mockLoggerService = (): { getChildLogger: Mock<any, any> } => ({
  getChildLogger: jest
    .fn()
    .mockReturnValue({ error: mockLogError, info: jest.fn(), warn: mockLogWarn, debug: jest.fn() }),
});

const mockDataDB = (): any => ({
  getUnidentifiedContracts: mockGetUnidentifiedContracts,
});
const mockStructureDB = (): any => ({
  getMethodInterfaceCreatedAfter: mockGetMethodInterfaceCreatedAfter,
  getMethodParametersByMethodId: mockGetMethodParametersByMethodId,
});
const mockRedisService = (): any => ({
  setDate: mockSetDate,
});
const mockDecodingService = (): any => ({});
const mockContractsService = (): any => ({
  indexContract: mockIndexContract,
});

const mockLogError = jest.fn();
const mockLogWarn = jest.fn();
const mockGetUnidentifiedContracts = jest.fn();
const mockIndexContract = jest.fn();
const mockGetMethodInterfaceCreatedAfter = jest.fn();
const mockGetMethodParametersByMethodId = jest.fn();
const mockSetDate = jest.fn();

class TestUpdateService extends UpdateService {
  testUpdateWithNewMethodInterface = this.updateWithNewMethodInterface;
  testUpdateEventsWithNewMethodInterface = this.updateEventsWithNewMethodInterface;
  testUpdateTxWithNewMethodInterface = this.updateTxWithNewMethodInterface;
}

const contractInterfaces: ContractInterfaceTable[] = [
  {
    id: '0x12345678',
    name: 'supername',
    code: 'LSP123',
    version: '1.0.0',
    type: CONTRACT_TYPE.COLLECTION,
  },
  {
    id: '0x23456789',
    name: 'profile',
    code: 'LSP1223',
    version: '2.0.0',
    type: CONTRACT_TYPE.PROFILE,
  },
];

const methodInterface: MethodInterfaceTable = {
  id: '0x12345678',
  hash: '0x12345678',
  name: 'supername',
  type: 'function',
  createdAt: new Date(),
};

const methodParameters: MethodParameterTable[] = [
  {
    methodId: '0x123456',
    name: 'supername',
    type: 'event',
    indexed: true,
    position: 0,
  },
  {
    methodId: '0x23456789',
    name: 'supername',
    type: 'function',
    indexed: false,
    position: 2,
  },
];

describe('UpdateService', () => {
  let service: TestUpdateService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        TestUpdateService,
        { provide: LoggerService, useFactory: mockLoggerService },
        { provide: LuksoStructureDbService, useFactory: mockStructureDB },
        { provide: LuksoDataDbService, useFactory: mockDataDB },
        { provide: RedisService, useFactory: mockRedisService },
        { provide: DecodingService, useFactory: mockDecodingService },
        { provide: ContractsService, useFactory: mockContractsService },
      ],
    }).compile();

    service = module.get<TestUpdateService>(TestUpdateService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('updateContracts', () => {
    it('should update contracts', async () => {
      mockGetUnidentifiedContracts.mockResolvedValue(['0x1234']);
      await service.updateContracts();
      expect(mockIndexContract).toHaveBeenCalledTimes(1);
      expect(mockIndexContract).toHaveBeenCalledWith('0x1234');
    });

    it('should update multiple contracts', async () => {
      mockGetUnidentifiedContracts.mockResolvedValue(['0x1234', '0x5678', '0x9abc']);
      await service.updateContracts();
      expect(mockIndexContract).toHaveBeenCalledTimes(3);
      expect(mockIndexContract).toHaveBeenCalledWith('0x1234');
      expect(mockIndexContract).toHaveBeenCalledWith('0x5678');
      expect(mockIndexContract).toHaveBeenCalledWith('0x9abc');
    });
  });

  describe('updateWithNewMethodInterface', () => {
    it('should successfully update with a new method interface', async () => {
      const spyUpdateEventsWithNewMethodInterface = jest.spyOn(
        service as any,
        'updateEventsWithNewMethodInterface',
      );
      const spyUpdateTxWithNewMethodInterface = jest.spyOn(
        service as any,
        'updateTxWithNewMethodInterface',
      );
      mockGetMethodParametersByMethodId.mockResolvedValue(methodParameters);

      await service.testUpdateWithNewMethodInterface(methodInterface);

      const events = methodParameters.filter((m) => m.type === 'event');
      const functions = methodParameters.filter((m) => m.type === 'function');

      expect(spyUpdateEventsWithNewMethodInterface).toHaveBeenCalledTimes(1);
      expect(spyUpdateTxWithNewMethodInterface).toHaveBeenCalledTimes(1);

      expect(spyUpdateEventsWithNewMethodInterface).toHaveBeenCalledWith(methodInterface, events);
      expect(spyUpdateTxWithNewMethodInterface).toHaveBeenCalledWith(methodInterface, functions);
    });
  });

  describe('updateTransactionsAndEvents', () => {
    it('should update transactions and events', async () => {
      const spyGetLatestUpdateDate = jest.spyOn(service as any, 'getLatestUpdateDate');
      const spyUpdateWithNewMethodInterface = jest.spyOn(
        service as any,
        'updateWithNewMethodInterface',
      );

      spyUpdateWithNewMethodInterface.mockResolvedValue(undefined);
      spyGetLatestUpdateDate.mockResolvedValue(new Date());
      mockGetMethodInterfaceCreatedAfter.mockResolvedValue(contractInterfaces);

      await service.updateTransactionsAndEvents();

      expect(spyGetLatestUpdateDate).toHaveBeenCalled();
      expect(spyUpdateWithNewMethodInterface).toHaveBeenCalledTimes(2);
      expect(spyUpdateWithNewMethodInterface).toHaveBeenCalledWith(contractInterfaces[0]);
      expect(spyUpdateWithNewMethodInterface).toHaveBeenCalledWith(contractInterfaces[1]);
      expect(mockSetDate).toHaveBeenCalled();
    });
  });
});
