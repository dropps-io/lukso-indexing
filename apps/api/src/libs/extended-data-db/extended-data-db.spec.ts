import { Test, TestingModule } from '@nestjs/testing';
import { LoggerService } from '@libs/logger/logger.service';
import { MetadataTable } from '@db/lukso-data/entities/metadata.table';
import { ContractTable } from '@db/lukso-data/entities/contract.table';

import { ExtendedDataDbService } from './extended-data-db.service';
import { ADDRESS1 } from '../../../../../test/utils/test-values';

describe('ExtendedDataDbService', () => {
  let service: ExtendedDataDbService;

  const contract: ContractTable = {
    address: ADDRESS1,
    interfaceCode: 'LSP0',
    interfaceVersion: '0.8.0',
  };

  const contractMetadata: Omit<MetadataTable, 'id'> = {
    address: ADDRESS1,
    tokenId: null,
    name: 'Test Token',
    symbol: 'TST',
    description: 'A test token',
    isNFT: true,
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [ExtendedDataDbService, { provide: LoggerService, useValue: new LoggerService() }],
    }).compile();

    service = module.get<ExtendedDataDbService>(ExtendedDataDbService);
  });

  describe('getContractWithMetadata', () => {
    it('should return contract with metadata', async () => {
      await service.insertContract(contract);
      await service.insertMetadata(contractMetadata);

      const result = await service.getContractWithMetadata(ADDRESS1);
      expect(result).toMatchObject({ ...contract, ...contractMetadata });
    });

    it('should be null if no metadata', async () => {
      await service.insertContract(contract);

      const result = await service.getContractWithMetadata(ADDRESS1);
      expect(result).toBeNull();
    });
  });
});
