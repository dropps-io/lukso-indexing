import { Test } from '@nestjs/testing';
import { LoggerService } from '@libs/logger/logger.service';
import { LuksoStructureDbService } from '@db/lukso-structure/lukso-structure-db.service';
import { LuksoDataDbService } from '@db/lukso-data/lukso-data-db.service';
import { DB_DATA_TABLE } from '@db/lukso-data/config';
import { getAddress } from 'ethers';

import { IpfsService } from '../../ipfs/ipfs.service';
import { EthersService } from '../../ethers/ethers.service';
import { Erc725StandardService } from './erc725-standard.service';
import { DecodingService } from '../../decoding/decoding.service';
import { ADDRESS1 } from '../../../../../test/utils/test-values';
import { DecodedParameter } from '../../decoding/types/decoded-parameter';
import { executeQuery } from '../../../../../test/utils/db-helpers';

describe('Erc725StandardService', () => {
  let service: Erc725StandardService;
  const logger = new LoggerService();
  const dataDB = new LuksoDataDbService(logger);
  const structureDB = new LuksoStructureDbService(logger);
  const ipfsService = new IpfsService(logger);

  beforeAll(async () => {
    const moduleRef = await Test.createTestingModule({
      providers: [
        Erc725StandardService,
        { provide: LoggerService, useValue: logger },
        { provide: LuksoDataDbService, useValue: dataDB },
        {
          provide: DecodingService,
          useValue: new DecodingService(
            structureDB,
            new EthersService(logger, ipfsService, structureDB),
            logger,
          ),
        },
      ],
    }).compile();

    service = moduleRef.get<Erc725StandardService>(Erc725StandardService);
  });

  describe('indexDataChanged', () => {
    it('should index data changed for LSP1UniversalReceiverDelegate', async () => {
      await structureDB.insertErc725ySchema({
        name: 'LSP1UniversalReceiverDelegate',
        key: '0x0cfc51aec37c55a4d0b1a65c6255c4bf2fbdf6277f3cc0730c45b828b6db8b47',
        keyType: 'Singleton',
        valueType: 'address',
        valueContent: 'Address',
      });

      await service.indexDataChanged(
        ADDRESS1,
        '0x0cfc51aec37c55a4d0b1a65c6255c4bf2fbdf6277f3cc0730c45b828b6db8b47',
        '0x76aeb1274d6486be066e653605b25ddccf0e2f18',
        123,
      );

      const res = await dataDB.getDataChangedHistoryByAddressAndKey(
        ADDRESS1,
        '0x0cfc51aec37c55a4d0b1a65c6255c4bf2fbdf6277f3cc0730c45b828b6db8b47',
      );

      expect(res).toHaveLength(1);
      expect(res[0]).toEqual({
        address: ADDRESS1,
        blockNumber: 123,
        key: '0x0cfc51aec37c55a4d0b1a65c6255c4bf2fbdf6277f3cc0730c45b828b6db8b47',
        value: '0x76aeb1274d6486be066e653605b25ddccf0e2f18',
        decodedValue: getAddress('0x76aeb1274d6486be066e653605b25ddccf0e2f18'),
      });
    });

    it('should index data changed for UP Permissions', async () => {
      await structureDB.insertErc725ySchema({
        name: 'AddressPermissions:Permissions:<address>',
        key: '0x4b80742de2bf82acb3630000<address>                               ',
        keyType: 'MappingWithGrouping',
        valueType: 'bytes32',
        valueContent: 'BitArray',
      });

      await service.indexDataChanged(
        ADDRESS1,
        '0x4b80742de2bf82acb3630000d0a434abaa20e8f9627ab2afac944a1264f264d6',
        '0x0000000000000000000000000000000000000000000000000000000000000a11',
        234,
      );

      const res = await dataDB.getDataChangedHistoryByAddressAndKey(
        ADDRESS1,
        '0x4b80742de2bf82acb3630000d0a434abaa20e8f9627ab2afac944a1264f264d6',
      );

      expect(res).toHaveLength(1);
      expect(res[0]).toEqual({
        address: ADDRESS1,
        blockNumber: 234,
        key: '0x4b80742de2bf82acb3630000d0a434abaa20e8f9627ab2afac944a1264f264d6',
        value: '0x0000000000000000000000000000000000000000000000000000000000000a11',
        decodedValue: 'CHANGEOWNER,CHANGEEXTENSIONS,TRANSFERVALUE,CALL',
      });
    });

    it('should index data changed for LSP5ReceivedAssets[3]', async () => {
      await structureDB.insertErc725ySchema({
        name: 'LSP5ReceivedAssets[]',
        key: '0x6460ee3c0aac563ccbf76d6e1d07bada78e3a9514e6382b736ed3f478ab7b90b',
        keyType: 'Array',
        valueType: 'address',
        valueContent: 'Address',
      });

      await service.indexDataChanged(
        ADDRESS1,
        '0x6460ee3c0aac563ccbf76d6e1d07bada00000000000000000000000000000003',
        '0x21d69022dfa30d8e1388388798b28386b2dd9a78',
        234,
      );

      const res = await dataDB.getDataChangedHistoryByAddressAndKey(
        ADDRESS1,
        '0x6460ee3c0aac563ccbf76d6e1d07bada00000000000000000000000000000003',
      );

      expect(res).toHaveLength(1);
      expect(res[0]).toEqual({
        address: ADDRESS1,
        blockNumber: 234,
        key: '0x6460ee3c0aac563ccbf76d6e1d07bada00000000000000000000000000000003',
        value: '0x21d69022dfa30d8e1388388798b28386b2dd9a78',
        decodedValue: getAddress('0x21d69022dfa30d8e1388388798b28386b2dd9a78'),
      });
    });

    it('should index data changed for LSP5ReceivedAssets[] root', async () => {
      await structureDB.insertErc725ySchema({
        name: 'LSP5ReceivedAssets[]',
        key: '0x6460ee3c0aac563ccbf76d6e1d07bada78e3a9514e6382b736ed3f478ab7b90b',
        keyType: 'Array',
        valueType: 'address',
        valueContent: 'Address',
      });

      await service.indexDataChanged(
        ADDRESS1,
        '0x6460ee3c0aac563ccbf76d6e1d07bada78e3a9514e6382b736ed3f478ab7b90b',
        '0x0000000000000000000000000000000000000000000000000000000000000003',
        234,
      );

      const res = await dataDB.getDataChangedHistoryByAddressAndKey(
        ADDRESS1,
        '0x6460ee3c0aac563ccbf76d6e1d07bada78e3a9514e6382b736ed3f478ab7b90b',
      );

      expect(res).toHaveLength(1);
      expect(res[0]).toEqual({
        address: ADDRESS1,
        blockNumber: 234,
        key: '0x6460ee3c0aac563ccbf76d6e1d07bada78e3a9514e6382b736ed3f478ab7b90b',
        value: '0x0000000000000000000000000000000000000000000000000000000000000003',
        decodedValue: '3',
      });
    });

    it('should have null decodedValue if could not decode', async () => {
      await service.indexDataChanged(
        ADDRESS1,
        '0x6460ee3c0aac563ccbf76d6e1d07bada78e3a9514e6382b736ed3f478ab7b90b',
        '0x0000000000000000000000000000000000000000000000000000000000000003',
        234,
      );

      const res = await dataDB.getDataChangedHistoryByAddressAndKey(
        ADDRESS1,
        '0x6460ee3c0aac563ccbf76d6e1d07bada78e3a9514e6382b736ed3f478ab7b90b',
      );

      expect(res).toHaveLength(1);
      expect(res[0]).toEqual({
        address: ADDRESS1,
        blockNumber: 234,
        key: '0x6460ee3c0aac563ccbf76d6e1d07bada78e3a9514e6382b736ed3f478ab7b90b',
        value: '0x0000000000000000000000000000000000000000000000000000000000000003',
        decodedValue: null,
      });
    });
  });

  describe('processSetDataTx', () => {
    it('should index data changed for batch tx', async () => {
      await structureDB.insertErc725ySchema({
        name: 'LSP1UniversalReceiverDelegate',
        key: '0x0cfc51aec37c55a4d0b1a65c6255c4bf2fbdf6277f3cc0730c45b828b6db8b47',
        keyType: 'Singleton',
        valueType: 'address',
        valueContent: 'Address',
      });

      const parameters: { [name: string]: DecodedParameter } = {
        dataKey: {
          value: '0x0cfc51aec37c55a4d0b1a65c6255c4bf2fbdf6277f3cc0730c45b828b6db8b47',
          name: 'dataKey',
          type: 'bytes32',
          position: 0,
        },
        dataValue: {
          value: '0x76aeb1274d6486be066e653605b25ddccf0e2f18',
          name: 'dataValue',
          type: 'bytes',
          position: 1,
        },
      };

      await service.processSetDataTx(ADDRESS1, 2345, parameters);

      const res = await executeQuery(`SELECT * FROM ${DB_DATA_TABLE.ERC725Y_DATA_CHANGED}`, 'DATA');

      expect(res.rows).toHaveLength(1);
      expect(res.rows).toEqual([
        {
          address: ADDRESS1,
          blockNumber: 2345,
          key: '0x0cfc51aec37c55a4d0b1a65c6255c4bf2fbdf6277f3cc0730c45b828b6db8b47',
          value: '0x76aeb1274d6486be066e653605b25ddccf0e2f18',
          decodedValue: getAddress('0x76aeb1274d6486be066e653605b25ddccf0e2f18'),
        },
      ]);
    });
  });

  describe('processSetDataBatchTx', () => {
    it('should index data changed for batch tx', async () => {
      await structureDB.insertErc725ySchema({
        name: 'LSP1UniversalReceiverDelegate',
        key: '0x0cfc51aec37c55a4d0b1a65c6255c4bf2fbdf6277f3cc0730c45b828b6db8b47',
        keyType: 'Singleton',
        valueType: 'address',
        valueContent: 'Address',
      });
      await structureDB.insertErc725ySchema({
        name: 'LSP5ReceivedAssets[]',
        key: '0x6460ee3c0aac563ccbf76d6e1d07bada78e3a9514e6382b736ed3f478ab7b90b',
        keyType: 'Array',
        valueType: 'address',
        valueContent: 'Address',
      });
      await structureDB.insertErc725ySchema({
        name: 'AddressPermissions:Permissions:<address>',
        key: '0x4b80742de2bf82acb3630000<address>                               ',
        keyType: 'MappingWithGrouping',
        valueType: 'bytes32',
        valueContent: 'BitArray',
      });

      const parameters: { [name: string]: DecodedParameter } = {
        dataKeys: {
          value:
            '0x0cfc51aec37c55a4d0b1a65c6255c4bf2fbdf6277f3cc0730c45b828b6db8b47,0x4b80742de2bf82acb3630000d0a434abaa20e8f9627ab2afac944a1264f264d6,0x6460ee3c0aac563ccbf76d6e1d07bada00000000000000000000000000000003,0x6460ee3c0aac563ccbf76d6e1d07bada78e3a9514e6382b736ed3f478ab7b90b',
          name: 'dataKeys',
          type: 'bytes32[]',
          position: 0,
        },
        dataValues: {
          value:
            '0x76aeb1274d6486be066e653605b25ddccf0e2f18,0x0000000000000000000000000000000000000000000000000000000000000a11,0x21d69022dfa30d8e1388388798b28386b2dd9a78,0x0000000000000000000000000000000000000000000000000000000000000003',
          name: 'dataValues',
          type: 'bytes[]',
          position: 1,
        },
      };

      await service.processSetDataBatchTx(ADDRESS1, 2345, parameters);

      const res = await executeQuery(`SELECT * FROM ${DB_DATA_TABLE.ERC725Y_DATA_CHANGED}`, 'DATA');

      expect(res.rows).toHaveLength(4);
      expect(res.rows).toEqual([
        {
          address: ADDRESS1,
          blockNumber: 2345,
          key: '0x0cfc51aec37c55a4d0b1a65c6255c4bf2fbdf6277f3cc0730c45b828b6db8b47',
          value: '0x76aeb1274d6486be066e653605b25ddccf0e2f18',
          decodedValue: getAddress('0x76aeb1274d6486be066e653605b25ddccf0e2f18'),
        },
        {
          address: ADDRESS1,
          blockNumber: 2345,
          key: '0x4b80742de2bf82acb3630000d0a434abaa20e8f9627ab2afac944a1264f264d6',
          value: '0x0000000000000000000000000000000000000000000000000000000000000a11',
          decodedValue: 'CHANGEOWNER,CHANGEEXTENSIONS,TRANSFERVALUE,CALL',
        },
        {
          address: ADDRESS1,
          blockNumber: 2345,
          key: '0x6460ee3c0aac563ccbf76d6e1d07bada00000000000000000000000000000003',
          value: '0x21d69022dfa30d8e1388388798b28386b2dd9a78',
          decodedValue: getAddress('0x21d69022dfa30d8e1388388798b28386b2dd9a78'),
        },
        {
          address: ADDRESS1,
          blockNumber: 2345,
          key: '0x6460ee3c0aac563ccbf76d6e1d07bada78e3a9514e6382b736ed3f478ab7b90b',
          value: '0x0000000000000000000000000000000000000000000000000000000000000003',
          decodedValue: '3',
        },
      ]);
    });
  });
});
