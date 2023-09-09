import { Test } from '@nestjs/testing';
import { LoggerService } from '@libs/logger/logger.service';

import { LuksoStructureDbService } from './lukso-structure-db.service';
import { executeQuery } from '../../../test/utils/db-helpers';
import { DB_STRUCTURE_TABLE } from './config';
import {
  TEST_CONTRACT_INTERFACE,
  TEST_ERC725Y,
  TEST_STRUCTURE_METHODS,
} from '../../../test/utils/test-values';

describe('LuksoStructureDbService', () => {
  let service: LuksoStructureDbService;

  // As the service is using a cache system, we need to reset the cache before each test
  beforeEach(async () => {
    const moduleRef = await Test.createTestingModule({
      providers: [
        LuksoStructureDbService,
        { provide: LoggerService, useValue: new LoggerService() },
      ],
    }).compile();

    service = moduleRef.get<LuksoStructureDbService>(LuksoStructureDbService);
  });

  afterEach(async () => {
    await service.disconnect();
  });

  describe('insertErc725ySchema', () => {
    it('should insert a new ERC725YSchema record', async () => {
      await service.insertErc725ySchema(TEST_ERC725Y[0].schema);

      const fetchedSchema = await service.getErc725ySchemaByKey(TEST_ERC725Y[0].schema.key);
      expect(fetchedSchema).toEqual({ ...TEST_ERC725Y[0].schema, createdAt: expect.any(Date) });
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

    it('should add the inserted row to the cache', async () => {
      await service.insertContractInterface(TEST_CONTRACT_INTERFACE[0]);

      // Creating the cache
      await service.getContractInterfaces();

      await service.insertContractInterface(TEST_CONTRACT_INTERFACE[1]);

      const fetchedContractInterfaces = await service.getContractInterfaces();

      // The cache do not save the createdAt date
      expect(fetchedContractInterfaces).toEqual([
        { ...TEST_CONTRACT_INTERFACE[0], createdAt: expect.any(Date) },
        { ...TEST_CONTRACT_INTERFACE[1] },
      ]);
    });
  });

  describe('getContractInterfaceById', () => {
    it('should return null if nothing found', async () => {
      const contractInterface = await service.getContractInterfaceById(
        TEST_CONTRACT_INTERFACE[0].id,
      );
      expect(contractInterface).toBeNull();
    });

    it('should return cached data', async () => {
      await service.insertContractInterface(TEST_CONTRACT_INTERFACE[0]);
      await service.insertContractInterface(TEST_CONTRACT_INTERFACE[1]);

      // Creating the cache
      await service.getContractInterfaces();

      // DELETING the values from the DB, to be sure that the cache is used
      await executeQuery(`DELETE FROM ${DB_STRUCTURE_TABLE.CONTRACT_INTERFACE}`, 'STRUCTURE');

      const contractInterface = await service.getContractInterfaceById(
        TEST_CONTRACT_INTERFACE[1].id,
      );

      // As DB is empty, it will be true only if the cache is used
      expect(contractInterface).toEqual({
        ...TEST_CONTRACT_INTERFACE[1],
        createdAt: expect.any(Date),
      });
    });
  });

  describe('getContractInterfaces', () => {
    it('should return an array of ContractInterfaceTable records', async () => {
      await service.insertContractInterface(TEST_CONTRACT_INTERFACE[0]);
      await service.insertContractInterface(TEST_CONTRACT_INTERFACE[1]);

      const fetchedContractInterfaces = await service.getContractInterfaces();
      expect(fetchedContractInterfaces).toEqual([
        { ...TEST_CONTRACT_INTERFACE[0], createdAt: expect.any(Date) },
        { ...TEST_CONTRACT_INTERFACE[1], createdAt: expect.any(Date) },
      ]);
    });

    it('should return cached data', async () => {
      await service.insertContractInterface(TEST_CONTRACT_INTERFACE[0]);
      await service.insertContractInterface(TEST_CONTRACT_INTERFACE[1]);

      // Creating the cache
      await service.getContractInterfaces();

      // DELETING the values from the DB, to be sure that the cache is used
      await executeQuery(`DELETE FROM ${DB_STRUCTURE_TABLE.CONTRACT_INTERFACE}`, 'STRUCTURE');

      const fetchedContractInterfaces = await service.getContractInterfaces();

      // As DB is empty, it will be true only if the cache is used
      expect(fetchedContractInterfaces).toEqual([
        { ...TEST_CONTRACT_INTERFACE[0], createdAt: expect.any(Date) },
        { ...TEST_CONTRACT_INTERFACE[1], createdAt: expect.any(Date) },
      ]);
    });

    it('should return an empty array if nothing found', async () => {
      const fetchedContractInterfaces = await service.getContractInterfaces();
      expect(fetchedContractInterfaces).toEqual([]);
    });
  });

  describe('insertMethodInterface', () => {
    it('should insert a new MethodInterface record', async () => {
      await service.insertMethodInterface(TEST_STRUCTURE_METHODS[0].interface);

      const fetchedMethodInterface = await service.getMethodInterfaceById(
        TEST_STRUCTURE_METHODS[0].interface.id,
      );
      expect(fetchedMethodInterface).toEqual({
        ...TEST_STRUCTURE_METHODS[0].interface,
        createdAt: expect.any(Date),
      });
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
