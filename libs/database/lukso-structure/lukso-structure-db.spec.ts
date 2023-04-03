import { Test } from '@nestjs/testing';

import { LuksoStructureDbService } from './lukso-structure-db.service';
import { ConfigTable } from './entities/config.table';
import { executeQuery } from '../../../test/utils/db-helpers';
import { DB_STRUCTURE_TABLE } from './config';
import {
  TEST_CONTRACT_INTERFACE,
  TEST_ERC725Y,
  TEST_STRUCTURE_METHODS,
} from '../../../test/utils/test-values';

describe('LuksoStructureDbService', () => {
  let service: LuksoStructureDbService;

  beforeAll(async () => {
    const moduleRef = await Test.createTestingModule({
      providers: [LuksoStructureDbService],
    }).compile();

    service = moduleRef.get<LuksoStructureDbService>(LuksoStructureDbService);
  });

  describe('getConfig', () => {
    it('should be able to get the default values', async () => {
      const config: ConfigTable = {
        blockIteration: 5000,
        nbrOfThreads: 20,
        paused: false,
        sleepBetweenIteration: 2000,
        latestIndexedBlock: 0,
        latestIndexedEventBlock: 0,
      };

      const fetchedConfig = await service.getConfig();
      expect(fetchedConfig).toEqual(config);
    });

    it('should throw an error if the config does not exist', async () => {
      await executeQuery(`DELETE FROM ${DB_STRUCTURE_TABLE.CONFIG}`, 'STRUCTURE');
      await expect(service.getConfig()).rejects.toEqual('Config table need to be initialized');
    });
  });

  describe('updateLatestIndexedBlock', () => {
    it('should update the latestIndexedBlock', async () => {
      await service.updateLatestIndexedBlock(123);

      const fetchedConfig = await service.getConfig();
      expect(fetchedConfig.latestIndexedBlock).toEqual(123);
    });
  });

  describe('updateLatestIndexedEventBlock', () => {
    it('should update the latestIndexedEventBlock', async () => {
      await service.updateLatestIndexedEventBlock(456);

      const fetchedConfig = await service.getConfig();
      expect(fetchedConfig.latestIndexedEventBlock).toEqual(456);
    });
  });

  describe('insertErc725ySchema', () => {
    it('should insert a new ERC725YSchema record', async () => {
      await service.insertErc725ySchema(TEST_ERC725Y[0].schema);

      const fetchedSchema = await service.getErc725ySchemaByKey(TEST_ERC725Y[0].schema.key);
      expect(fetchedSchema).toEqual(TEST_ERC725Y[0].schema);
    });
  });

  describe('getErc725ySchemaByKey', () => {
    it('should return null if nothing found', async () => {
      const fetchedSchema = await service.getErc725ySchemaByKey(TEST_ERC725Y[0].schema.key);
      expect(fetchedSchema).toBeNull();
    });
  });

  describe('insertContractInterface', () => {
    it('should insert a new ContractInterface record', async () => {
      await service.insertContractInterface(TEST_CONTRACT_INTERFACE[0]);

      const fetchedContractInterface = await service.getContractInterfaceById(
        TEST_CONTRACT_INTERFACE[0].id,
      );
      expect(fetchedContractInterface).toEqual(TEST_CONTRACT_INTERFACE[0]);
    });
  });

  describe('getContractInterfaceById', () => {
    it('should return null if nothing found', async () => {
      const fetchedSchema = await service.getContractInterfaceById(TEST_CONTRACT_INTERFACE[0].id);
      expect(fetchedSchema).toBeNull();
    });
  });

  describe('insertMethodInterface', () => {
    it('should insert a new MethodInterface record', async () => {
      await service.insertMethodInterface(TEST_STRUCTURE_METHODS[0].interface);

      const fetchedMethodInterface = await service.getMethodInterfaceById(
        TEST_STRUCTURE_METHODS[0].interface.id,
      );
      expect(fetchedMethodInterface).toEqual(TEST_STRUCTURE_METHODS[0].interface);
    });
  });

  describe('getMethodInterfaceById', () => {
    it('should return null if nothing found', async () => {
      const fetchedSchema = await service.getMethodInterfaceById(
        TEST_STRUCTURE_METHODS[0].interface.id,
      );
      expect(fetchedSchema).toBeNull();
    });
  });

  describe('insertMethodParameter', () => {
    it('should insert a new MethodParameter record', async () => {
      await service.insertMethodInterface(TEST_STRUCTURE_METHODS[0].interface);
      await service.insertMethodParameter(TEST_STRUCTURE_METHODS[0].parameters[0]);

      const fetchedMethodParameters = await service.getMethodParametersByMethodId(
        TEST_STRUCTURE_METHODS[0].interface.id,
      );
      expect(fetchedMethodParameters).toEqual([TEST_STRUCTURE_METHODS[0].parameters[0]]);
    });
  });

  describe('getMethodParametersByMethodId', () => {
    it('should return an array of MethodParameter records for a given method ID', async () => {
      await service.insertMethodInterface(TEST_STRUCTURE_METHODS[0].interface);
      await service.insertMethodParameter(TEST_STRUCTURE_METHODS[0].parameters[0]);
      await service.insertMethodParameter(TEST_STRUCTURE_METHODS[0].parameters[1]);
      await service.insertMethodParameter(TEST_STRUCTURE_METHODS[0].parameters[2]);

      const fetchedMethodParameters = await service.getMethodParametersByMethodId(
        TEST_STRUCTURE_METHODS[0].interface.id,
      );
      expect(fetchedMethodParameters).toEqual(TEST_STRUCTURE_METHODS[0].parameters);
    });

    it('should return an empty array if nothing found', async () => {
      const fetchedMethodParameters = await service.getMethodParametersByMethodId(
        TEST_STRUCTURE_METHODS[0].interface.id,
      );
      expect(fetchedMethodParameters).toEqual([]);
    });
  });
});