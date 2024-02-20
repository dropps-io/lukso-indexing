import { Test } from '@nestjs/testing';
import { LoggerService } from '@libs/logger/logger.service';
import { LuksoStructureDbService } from '@db/lukso-structure/lukso-structure-db.service';

import { EthersService } from './ethers.service';
import { TEST_CONTRACT_INTERFACE } from '../../../../test/utils/test-values';
import { FetcherService } from '../fetcher/fetcher.service';

const mockFetcherService = () => ({
  fetch: mockFetch,
});

const mockFetch = jest.fn();

describe('EthersService', () => {
  let service: EthersService;
  const logger = new LoggerService();
  const db = new LuksoStructureDbService(logger);

  beforeAll(async () => {
    const moduleRef = await Test.createTestingModule({
      providers: [
        EthersService,
        { provide: LuksoStructureDbService, useValue: db },
        { provide: LoggerService, useValue: logger },
        { provide: FetcherService, useFactory: mockFetcherService },
      ],
    }).compile();

    service = moduleRef.get<EthersService>(EthersService);
  });

  describe('identifyContractInterface', () => {
    beforeAll(async () => {
      for (const contractInterface of TEST_CONTRACT_INTERFACE) {
        await db.insertContractInterface(contractInterface);
      }
      // Add interfaces to cache
      await db.getContractInterfaces();
    });

    it('should return null if contract interface not found', async () => {
      const contractInterface = await service.identifyContractInterface(
        '0xc5966895BE86be5CC6dE436B63fD41F60c75B917',
      );
      expect(contractInterface).toBeNull();
    });

    it('should identify a LSP7', async () => {
      const contractInterface = await service.identifyContractInterface(
        '0xDF9124ee97d7a8eB8fe845b6C6eE8a8D75B55a57',
      );
      expect(contractInterface?.code).toEqual('LSP7');
    }, 30000);

    it('should identify a LSP8', async () => {
      const contractInterface = await service.identifyContractInterface(
        '0x402e916fa2b5d5420d1e65466e9553d41d0f66f7',
      );
      expect(contractInterface?.code).toEqual('LSP8');
    }, 30000);

    it('should identify a LSP6', async () => {
      const contractInterface = await service.identifyContractInterface(
        '0xb8eF04DF9c64E53e1770cBA05FE387356DC563aB',
      );
      expect(contractInterface?.code).toEqual('LSP6');
    }, 30000);

    it('should identify a LSP0', async () => {
      const contractInterface = await service.identifyContractInterface(
        '0xA36C2c15207F19E133c9E64c57dE9eA1F49Dcc66',
      );
      expect(contractInterface?.code).toEqual('LSP0');
    }, 30000);

    it('should identify an EOA', async () => {
      const contractInterface = await service.identifyContractInterface(
        '0x5F14Fdca0449bDe08227f40BB21B513D1A4f6f55',
      );
      expect(contractInterface?.code).toEqual('EOA');
    });
  });
});
