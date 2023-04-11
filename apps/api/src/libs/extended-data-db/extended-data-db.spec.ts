import { Test, TestingModule } from '@nestjs/testing';
import { LoggerService } from '@libs/logger/logger.service';
import { MetadataTable } from '@db/lukso-data/entities/metadata.table';
import { ContractTable } from '@db/lukso-data/entities/contract.table';
import { MetadataImageTable } from '@db/lukso-data/entities/metadata-image.table';

import { ExtendedDataDbService } from './extended-data-db.service';
import { ADDRESS1, HASH1, URL1, URL2 } from '../../../../../test/utils/test-values';

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

  describe('getContractWithMetadata', () => {
    const metadataImage: MetadataImageTable = {
      hash: HASH1,
      height: 0,
      metadataId: 0,
      type: null,
      url: URL1,
      width: 0,
    };

    beforeEach(async () => {
      await service.insertContract(contract);
      metadataImage.metadataId = (await service.insertMetadata(contractMetadata)).id;
    });

    it('should fetch all metadata images', async () => {
      await service.insertMetadataImages(metadataImage.metadataId, [
        metadataImage,
        { ...metadataImage, type: 'profile', url: URL2 },
      ]);

      const result = await service.getMetadataImages(metadataImage.metadataId);
      expect(result).toMatchObject([
        metadataImage,
        { ...metadataImage, type: 'profile', url: URL2 },
      ]);
    });

    it('should be able to fetch only metadata images with type null', async () => {
      await service.insertMetadataImages(metadataImage.metadataId, [
        metadataImage,
        { ...metadataImage, type: 'profile', url: URL2 },
      ]);

      const result = await service.getMetadataImages(metadataImage.metadataId, null);
      expect(result).toMatchObject([metadataImage]);
    });

    it('should be able to fetch only metadata images of a specific type', async () => {
      await service.insertMetadataImages(metadataImage.metadataId, [
        metadataImage,
        { ...metadataImage, type: 'profile', url: URL2 },
      ]);

      const result = await service.getMetadataImages(metadataImage.metadataId, 'profile');
      expect(result).toMatchObject([{ ...metadataImage, type: 'profile', url: URL2 }]);
    });

    it('should return empty array if nothing found', async () => {
      const result = await service.getMetadataImages(metadataImage.metadataId, 'profile');
      expect(result).toEqual([]);
    });
  });
});
