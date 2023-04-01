import { Test, TestingModule } from '@nestjs/testing';

import { ContractTokenTable } from './entities/contractToken.table';
import { MetadataAssetTable } from './entities/metadataAsset.table';
import { MetadataTagTable } from './entities/metadataTag.table';
import { TransactionTable } from './entities/tx.table';
import { EventParameterTable } from './entities/eventParameter.table';
import { ContractTable } from './entities/contract.table';
import { DataChangedTable } from './entities/dataChanged.table';
import { EventTable } from './entities/event.table';
import { MetadataLinkTable } from './entities/metadataLink.table';
import { TxParameterTable } from './entities/txParameter.table';
import { MetadataTable } from './entities/metadata.table';
import { TxInputTable } from './entities/txInput.table';
import { LuksoDataDbService } from './lukso-data-db.service';
import { MetadataImageTable } from './entities/metadataImage.table';
import { ADDRESS1, ADDRESS2, HASH1, HASH2, HASH3 } from '../../../test/utils/test-values';
import { executeQuery } from '../../../test/utils/db-helpers';
import { DB_DATA_TABLE } from './config';

describe('LuksoDataDbService', () => {
  let service: LuksoDataDbService;

  const contract1: ContractTable = {
    address: ADDRESS1,
    interfaceCode: 'LSP0',
    interfaceVersion: '0.8.0',
  };

  const contractToken1: ContractTokenTable = {
    id: HASH1,
    address: ADDRESS1,
    index: 0,
    decodedTokenId: 'Hello Test',
    tokenId: '0x0000000000000000000000000000000000000000000048656c6c6f2054657374',
  };

  const contractMetadata: Omit<MetadataTable, 'id'> = {
    address: ADDRESS1,
    tokenId: null,
    name: 'Test Token',
    symbol: 'TST',
    description: 'A test token',
    isNFT: true,
  };

  const tokenMetadata = { ...contractMetadata, tokenId: contractToken1.tokenId };

  const transaction: TransactionTable = {
    hash: HASH1,
    nonce: 1,
    blockHash: HASH1,
    blockNumber: 42,
    transactionIndex: 0,
    methodId: '0x12345678',
    methodName: null,
    from: ADDRESS1,
    to: ADDRESS2,
    value: '1000000000000000000',
    gasPrice: '20000000000',
    gas: 21000,
  };

  const event: EventTable = {
    id: HASH2,
    blockNumber: 42,
    transactionHash: HASH1,
    logIndex: 0,
    address: ADDRESS1,
    eventName: 'TestEvent',
    topic0: HASH1,
    topic1: HASH2,
    topic2: HASH3,
    topic3: null,
    data: '0xjkl',
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [LuksoDataDbService],
    }).compile();

    service = module.get<LuksoDataDbService>(LuksoDataDbService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  // This is a sample test suite. In practice, you should use a test database and clean up after each test.
  describe('ContractTable', () => {
    it('should be able insert a contract', async () => {
      await service.insertContract(contract1);

      const res = await executeQuery(`SELECT * FROM ${DB_DATA_TABLE.CONTRACT}`, 'DATA');
      expect(res.rows.length).toEqual(1);
      expect(res.rows[0]).toEqual(contract1);
    });

    it('should be able to query a contract by address', async () => {
      await service.insertContract(contract1);

      const res = await service.getContractByAddress(contract1.address);
      expect(res).toEqual(contract1);
    });

    it('should return null if query a non-existing contract', async () => {
      const res = await service.getContractByAddress(contract1.address);
      expect(res).toBeNull();
    });
  });

  describe('ContractTokenTable', () => {
    beforeEach(async () => {
      await service.insertContract(contract1);
    });

    it('should be able to insert a contract token', async () => {
      await service.insertContractToken(contractToken1);
      const res = await executeQuery(`SELECT * FROM ${DB_DATA_TABLE.CONTRACT_TOKEN}`, 'DATA');
      expect(res.rows.length).toEqual(1);
      expect(res.rows[0]).toEqual(contractToken1);
    });

    it('should be able to query a contract token by id', async () => {
      await service.insertContractToken(contractToken1);

      const res = await service.getContractTokenById(contractToken1.id);
      expect(res).toEqual(contractToken1);
    });

    it('should return null if query an unknown id', async () => {
      const res = await service.getContractTokenById(contractToken1.id);
      expect(res).toBeNull();
    });
  });

  describe('MetadataTable', () => {
    beforeEach(async () => {
      await service.insertContract(contract1);
    });

    it('should be able to insert metadata for a contract', async () => {
      await service.insertMetadata(contractMetadata);

      const res = await executeQuery(`SELECT * FROM ${DB_DATA_TABLE.METADATA}`, 'DATA');
      expect(res.rows.length).toEqual(1);
      expect(res.rows[0]).toMatchObject(contractMetadata);
    });

    it('should be able to insert metadata for a contract token', async () => {
      await service.insertContractToken(contractToken1);
      await service.insertMetadata(tokenMetadata);

      const res = await executeQuery(`SELECT * FROM ${DB_DATA_TABLE.METADATA}`, 'DATA');
      expect(res.rows.length).toEqual(1);
      expect(res.rows[0]).toMatchObject(tokenMetadata);
    });

    it('should be able to query metadata for a contract', async () => {
      await service.insertMetadata(contractMetadata);

      const res = await service.getMetadata(ADDRESS1);
      expect(res).toMatchObject(contractMetadata);
    });

    it('should be able to query metadata for a contract token', async () => {
      await service.insertContractToken(contractToken1);
      await service.insertMetadata(tokenMetadata);

      const res = await service.getMetadata(ADDRESS1, contractToken1.tokenId);
      expect(res).toMatchObject(tokenMetadata);
    });
  });

  describe('MetadataImageTable', () => {
    const metadataImage: MetadataImageTable = {
      metadataId: 1,
      url: 'https://example.com/image.png',
      width: 100,
      height: 100,
      type: 'image/png',
      hash: HASH1,
    };

    beforeEach(async () => {
      await service.insertContract(contract1);
      metadataImage.metadataId = (await service.insertMetadata(contractMetadata)).id;
    });

    it('should be able to insert a metadata image', async () => {
      await service.insertMetadataImage(metadataImage);

      const res = await executeQuery(`SELECT * FROM ${DB_DATA_TABLE.METADATA_IMAGE}`, 'DATA');
      expect(res.rows.length).toEqual(1);
      expect(res.rows[0]).toEqual(metadataImage);
    });
  });

  describe('MetadataLinkTable', () => {
    const metadataLink: MetadataLinkTable = {
      metadataId: 1,
      title: 'Test Link',
      url: 'https://example.com',
    };

    beforeEach(async () => {
      await service.insertContract(contract1);
      metadataLink.metadataId = (await service.insertMetadata(contractMetadata)).id;
    });

    it('should insert a metadata link', async () => {
      await service.insertMetadataLink(metadataLink);

      const res = await executeQuery(`SELECT * FROM ${DB_DATA_TABLE.METADATA_LINK}`, 'DATA');
      expect(res.rows.length).toEqual(1);
      expect(res.rows[0]).toEqual(metadataLink);
    });
  });

  describe('MetadataTagTable', () => {
    const metadataTag: MetadataTagTable = {
      metadataId: 1,
      title: 'Test Tag',
    };

    beforeEach(async () => {
      await service.insertContract(contract1);
      metadataTag.metadataId = (await service.insertMetadata(contractMetadata)).id;
    });

    it('should insert and retrieve a metadata tag', async () => {
      await service.insertMetadataTag(metadataTag);

      const res = await executeQuery(`SELECT * FROM ${DB_DATA_TABLE.METADATA_TAG}`, 'DATA');
      expect(res.rows.length).toEqual(1);
      expect(res.rows[0]).toEqual(metadataTag);
    });

    it('should be able to query metadata tags by id', async () => {
      await service.insertMetadataTag(metadataTag);
      await service.insertMetadataTag({ ...metadataTag, title: 'tag1' });
      await service.insertMetadataTag({ ...metadataTag, title: 'tag2' });

      const res = await service.getMetadataTagsByMetadataId(metadataTag.metadataId);
      expect(res).toEqual([metadataTag.title, 'tag1', 'tag2']);
    });
  });

  describe('MetadataAssetTable', () => {
    const metadataAsset: MetadataAssetTable = {
      metadataId: 1,
      url: 'https://example.com/asset',
      fileType: 'image/png',
      hash: HASH1,
    };

    beforeEach(async () => {
      await service.insertContract(contract1);
      metadataAsset.metadataId = (await service.insertMetadata(contractMetadata)).id;
    });

    it('should insert a metadata asset', async () => {
      await service.insertMetadataAsset(metadataAsset);

      const res = await executeQuery(`SELECT * FROM ${DB_DATA_TABLE.METADATA_ASSET}`, 'DATA');
      expect(res.rows.length).toEqual(1);
      expect(res.rows[0]).toEqual(metadataAsset);
    });

    it('should query metadata assets', async () => {
      await service.insertMetadataAsset(metadataAsset);
      await service.insertMetadataAsset({ ...metadataAsset, hash: HASH2 });
      await service.insertMetadataAsset({ ...metadataAsset, hash: HASH3 });

      const res = await service.getMetadataAssetsByMetadataId(metadataAsset.metadataId);
      expect(res.length).toEqual(3);
      expect(res).toEqual([
        metadataAsset,
        { ...metadataAsset, hash: HASH2 },
        { ...metadataAsset, hash: HASH3 },
      ]);
    });
  });

  describe('DataChangedTable', () => {
    const dataChanged: DataChangedTable = {
      address: ADDRESS1,
      key: HASH1,
      value: 'testValue',
      blockNumber: 42,
    };

    it('should insert a data changed record', async () => {
      await service.insertDataChanged(dataChanged);

      const res = await executeQuery(`SELECT * FROM ${DB_DATA_TABLE.DATA_CHANGED}`, 'DATA');
      expect(res.rows.length).toEqual(1);
      expect(res.rows[0]).toEqual(dataChanged);
    });

    it('should fetch a data changed record', async () => {
      await service.insertDataChanged(dataChanged);
      await service.insertDataChanged({ ...dataChanged, value: 'value1' });
      await service.insertDataChanged({ ...dataChanged, value: 'value2' });

      const result = await service.getDataChangedHistoryByAddressAndKey(
        dataChanged.address,
        dataChanged.key,
      );
      expect(result).toEqual([
        dataChanged,
        { ...dataChanged, value: 'value1' },
        { ...dataChanged, value: 'value2' },
      ]);
    });

    it('should fetch empty array if no record', async () => {
      const result = await service.getDataChangedHistoryByAddressAndKey(
        dataChanged.address,
        dataChanged.key,
      );
      expect(result).toEqual([]);
    });
  });

  describe('TransactionTable', () => {
    it('should insert and retrieve a transaction', async () => {
      await service.insertTransaction(transaction);

      const res = await executeQuery(`SELECT * FROM ${DB_DATA_TABLE.TRANSACTION}`, 'DATA');
      expect(res.rows.length).toEqual(1);
      expect(res.rows[0]).toEqual(transaction);
    });

    it('should fetch a transaction by hash', async () => {
      await service.insertTransaction(transaction);

      const result = await service.getTransactionByHash(transaction.hash);
      expect(result).toEqual(transaction);
    });
  });

  describe('TxInputTable', () => {
    const transactionInput: TxInputTable = {
      transactionHash: HASH1,
      input: '0x456',
    };

    beforeEach(async () => {
      await service.insertTransaction(transaction);
    });

    it('should insert a transaction input', async () => {
      await service.insertTransactionInput(transactionInput);

      const res = await executeQuery(`SELECT * FROM ${DB_DATA_TABLE.TRANSACTION}`, 'DATA');
      expect(res.rows.length).toEqual(1);
      expect(res.rows[0]).toEqual(transaction);
    });

    it('should fetch a transaction input', async () => {
      await service.insertTransactionInput(transactionInput);

      const res = await service.getTransactionInput(HASH1);
      expect(res).toEqual(transactionInput.input);
    });

    it('should fetch null if no transaction input', async () => {
      const res = await service.getTransactionInput(HASH1);
      expect(res).toEqual(null);
    });
  });

  describe('TxParameterTable', () => {
    const txParameter: TxParameterTable = {
      transactionHash: HASH1,
      value: 'testValue',
      name: 'testName',
      type: 'testType',
      position: 0,
    };

    beforeEach(async () => {
      await service.insertTransaction(transaction);
    });

    it('should insert a transaction parameter', async () => {
      await service.insertTransactionParameter(txParameter);

      const res = await executeQuery(
        `SELECT * FROM ${DB_DATA_TABLE.TRANSACTION_PARAMETER}`,
        'DATA',
      );
      expect(res.rows.length).toEqual(1);
      expect(res.rows[0]).toEqual(txParameter);
    });

    it('should fetch the transaction parameters', async () => {
      await service.insertTransactionParameter(txParameter);
      await service.insertTransactionParameter({ ...txParameter, value: 'value1' });
      await service.insertTransactionParameter({ ...txParameter, value: 'value2' });

      const res = await service.getTransactionParameters(transaction.hash);
      expect(res).toEqual([
        txParameter,
        { ...txParameter, value: 'value1' },
        { ...txParameter, value: 'value2' },
      ]);
    });

    it('should fetch empty array if no transaction parameters', async () => {
      const res = await service.getTransactionParameters(transaction.hash);
      expect(res).toEqual([]);
    });
  });

  describe('EventTable', () => {
    it('should insert an event', async () => {
      await service.insertEvent(event);

      const res = await executeQuery(`SELECT * FROM ${DB_DATA_TABLE.EVENT}`, 'DATA');
      expect(res.rows.length).toEqual(1);
      expect(res.rows[0]).toEqual(event);
    });

    it('should fetch an event', async () => {
      await service.insertEvent(event);

      const res = await service.getEventById(event.id);
      expect(res).toEqual(event);
    });

    it('should fetch null if no event', async () => {
      const res = await service.getEventById(event.id);
      expect(res).toEqual(null);
    });
  });

  describe('EventParameterTable', () => {
    const eventParameter: EventParameterTable = {
      eventId: event.id,
      value: 'testValue',
      name: 'testName',
      type: 'testType',
      position: 0,
    };

    beforeEach(async () => {
      await service.insertEvent(event);
    });

    it('should insert an event parameter', async () => {
      await service.insertEventParameter(eventParameter);

      const res = await executeQuery(`SELECT * FROM ${DB_DATA_TABLE.EVENT_PARAMETER}`, 'DATA');
      expect(res.rows.length).toEqual(1);
      expect(res.rows[0]).toEqual(eventParameter);
    });

    it('should fetch an event parameters', async () => {
      await service.insertEventParameter(eventParameter);
      await service.insertEventParameter({ ...eventParameter, position: 1 });
      await service.insertEventParameter({ ...eventParameter, position: 2 });

      const res = await service.getEventParameters(event.id);
      expect(res).toEqual([
        eventParameter,
        { ...eventParameter, position: 1 },
        { ...eventParameter, position: 2 },
      ]);
    });

    it('should fetch empty array if no event parameters', async () => {
      const res = await service.getEventParameters(event.id);
      expect(res).toEqual([]);
    });
  });
});
