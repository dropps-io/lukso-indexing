import { Test } from '@nestjs/testing';
import { LoggerService } from '@libs/logger/logger.service';
import { LuksoStructureDbService } from '@db/lukso-structure/lukso-structure-db.service';

import { Web3Service } from './web3.service';
import { TEST_CONTRACT_INTERFACE } from '../../../../test/utils/test-values';
describe('Web3Service', () => {
  let service: Web3Service;
  const logger = new LoggerService();
  const db = new LuksoStructureDbService(logger);

  beforeAll(async () => {
    const moduleRef = await Test.createTestingModule({
      providers: [
        Web3Service,
        { provide: LuksoStructureDbService, useValue: db },
        { provide: LoggerService, useValue: logger },
      ],
    }).compile();

    service = moduleRef.get<Web3Service>(Web3Service);
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
        '0xA5257143E09Bc5A493D914fBCb6347437Ae639e3',
      );
      expect(contractInterface).toBeNull();
    });

    it('should identify a LSP7', async () => {
      const contractInterface = await service.identifyContractInterface(
        '0xDfC36914b30DE4985C739B7ddEba16165F3bB313',
      );
      expect(contractInterface?.code).toEqual('LSP4');
    });

    it('should identify a LSP8', async () => {
      const contractInterface = await service.identifyContractInterface(
        '0x8AfC7c0E68432A44E7834e9D2d4F537673d7312a',
      );
      expect(contractInterface?.code).toEqual('LSP8');
    });

    it('should identify a LSP6', async () => {
      const contractInterface = await service.identifyContractInterface(
        '0xfb0937538945238BE8009BCf5b8D77c1644a801D',
      );
      expect(contractInterface?.code).toEqual('LSP6');
    });

    it('should identify an EOA', async () => {
      const contractInterface = await service.identifyContractInterface(
        '0x5F14Fdca0449bDe08227f40BB21B513D1A4f6f55',
      );
      expect(contractInterface?.code).toEqual('EOA');
    });
  });
});
