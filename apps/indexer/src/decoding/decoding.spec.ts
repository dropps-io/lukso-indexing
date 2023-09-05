import { Test } from '@nestjs/testing';
import { LuksoStructureDbService } from '@db/lukso-structure/lukso-structure-db.service';
import { MethodInterfaceTable } from '@db/lukso-structure/entities/methodInterface.table';
import { MethodParameterTable } from '@db/lukso-structure/entities/methodParameter.table';
import { LoggerService } from '@libs/logger/logger.service';
import { getAddress } from 'ethers';

import { EthersService } from '../ethers/ethers.service';
import { DecodingService } from './decoding.service';
import { ADDRESS1 } from '../../../../test/utils/test-values';
import { LSP8_TOKEN_ID_TYPE } from '../ethers/contracts/LSP8/enums';
import { decodeLsp8TokenId } from './utils/decode-lsp8-token-id';
import { FetcherService } from '../fetcher/fetcher.service';

class TestDecodingService extends DecodingService {
  constructor(
    protected readonly structureDB: LuksoStructureDbService,
    protected readonly ethersService: EthersService,
    protected readonly loggerService: LoggerService,
  ) {
    super(structureDB, ethersService, loggerService);
  }

  async testUnwrapLSP6Execute(contractAddress: string, parametersMap: Record<string, string>) {
    return await this.unwrapLSP6Execute(contractAddress, parametersMap);
  }

  async testUnwrapErc725XExecute(parametersMap: Record<string, string>) {
    return await this.unwrapErc725XExecute(parametersMap);
  }

  async testGetUnwrappedTransaction(wrappedInput: string, toAddress: string, value: string) {
    return await this.getWrappedTransaction(wrappedInput, toAddress, value);
  }
}

const setDataMethodInterface: MethodInterfaceTable = {
  id: '0x7f23690c',
  hash: '0x7f23690cc80a596acdae0a51503f8066ffd79ab76fd5c929578309d2e2883b77',
  name: 'setData',
  type: 'function',
};
const setDataMethodParameters: MethodParameterTable[] = [
  {
    methodId: '0x7f23690c',
    name: 'dataKey',
    type: 'bytes32',
    indexed: false,
    position: 0,
  },
  {
    methodId: '0x7f23690c',
    name: 'dataValue',
    type: 'bytes',
    indexed: false,
    position: 1,
  },
];
const setDataInputToDecode =
  '0x7f23690c4b80742de2bf82acb3630000254bfe7e25184f72df435b5a9da39db6089dcaf5000000000000000000000000000000000000000000000000000000000000004000000000000000000000000000000000000000000000000000000000000000200000000000000000000000000000000000000000000000000000000000000000';
const setDataDecodedInput = {
  methodName: 'setData',
  parameters: [
    {
      value: '0x4b80742de2bf82acb3630000254bfe7e25184f72df435b5a9da39db6089dcaf5',
      position: 0,
      name: 'dataKey',
      type: 'bytes32',
    },
    {
      value: '0x0000000000000000000000000000000000000000000000000000000000000000',
      position: 1,
      name: 'dataValue',
      type: 'bytes',
    },
  ],
};

// Add test data for decodeLogParameters
const transferEventSignature = '0xddf252ad1be2c89b69c2b068fc378daa952ba7f163c4a11628f55a4df523b3ef';
const transferEventParameters = [
  {
    methodId: transferEventSignature.slice(0, 10),
    name: 'from',
    type: 'address',
    indexed: true,
    position: 0,
  },
  {
    methodId: transferEventSignature.slice(0, 10),
    name: 'to',
    type: 'address',
    indexed: true,
    position: 1,
  },
  {
    methodId: transferEventSignature.slice(0, 10),
    name: 'value',
    type: 'uint256',
    indexed: false,
    position: 2,
  },
];

describe('DecodingService', () => {
  let service: TestDecodingService;
  const logger = new LoggerService();
  const db = new LuksoStructureDbService(logger);

  beforeAll(async () => {
    const moduleRef = await Test.createTestingModule({
      providers: [
        TestDecodingService,
        { provide: LuksoStructureDbService, useValue: db },
        {
          provide: EthersService,
          useValue: new EthersService(new FetcherService(), logger, db),
        },
        { provide: LoggerService, useValue: logger },
      ],
    }).compile();

    service = moduleRef.get<TestDecodingService>(TestDecodingService);
  });

  describe('decodeTransactionInput', () => {
    it('should return null if method ID is not found in structure database', async () => {
      const input = '0xdeadbeef';
      const result = await service.decodeTransactionInput(input);
      expect(result).toBeNull();
    });

    it('should return only methodName if failed to decode params', async () => {
      await db.insertMethodInterface(setDataMethodInterface);
      await db.insertMethodParameter(setDataMethodParameters[1]);

      const result = await service.decodeTransactionInput(setDataInputToDecode);

      expect(result).toEqual({
        methodName: 'setData',
        parameters: [],
      });
    });

    it('should be able to decode a setData input', async () => {
      await db.insertMethodInterface(setDataMethodInterface);
      await db.insertMethodParameter(setDataMethodParameters[0]);
      await db.insertMethodParameter(setDataMethodParameters[1]);

      const result = await service.decodeTransactionInput(setDataInputToDecode);

      expect(result).toEqual(setDataDecodedInput);
    });

    it('should be able to decode an execute input', async () => {
      const methodInterface: MethodInterfaceTable = {
        id: '0x44c028fe',
        hash: '0x44c028fee1c693348483835b83daaff8050a631d70676515d1e283a5b884b4aa',
        name: 'execute',
        type: 'function',
      };
      await db.insertMethodInterface(methodInterface);
      const parameters: MethodParameterTable[] = [
        {
          methodId: '0x44c028fe',
          name: 'operation',
          type: 'uint256',
          indexed: false,
          position: 0,
        },
        {
          methodId: '0x44c028fe',
          name: 'to',
          type: 'address',
          indexed: false,
          position: 1,
        },
        {
          methodId: '0x44c028fe',
          name: 'value',
          type: 'uint256',
          indexed: false,
          position: 2,
        },
        {
          methodId: '0x44c028fe',
          name: 'data',
          type: 'bytes',
          indexed: false,
          position: 3,
        },
      ];
      await db.insertMethodParameter(parameters[0]);
      await db.insertMethodParameter(parameters[1]);
      await db.insertMethodParameter(parameters[2]);
      await db.insertMethodParameter(parameters[3]);

      const inputToDecode =
        '0x44c028fe000000000000000000000000000000000000000000000000000000000000000000000000000000000000000036ec763516259d4be9ede7cc2969969f201139dd0000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000008000000000000000000000000000000000000000000000000000000000000000402b4ece40c19103d32cf026a68c4c129dbda957a7337e5bb24034db0b7d4f8ee2000000000000000000000000d692ba892a902810a2ee3fa41c1d8dcd652d47ab';

      const result = await service.decodeTransactionInput(inputToDecode);

      expect(result?.methodName).toEqual('execute');
      expect(result?.parameters).toEqual([
        {
          value: '0',
          position: 0,
          name: 'operation',
          type: 'uint256',
        },
        {
          value: '0x36eC763516259D4bE9EDe7cC2969969f201139dd',
          position: 1,
          name: 'to',
          type: 'address',
        },
        {
          value: '0',
          position: 2,
          name: 'value',
          type: 'uint256',
        },
        {
          value:
            '0x2b4ece40c19103d32cf026a68c4c129dbda957a7337e5bb24034db0b7d4f8ee2000000000000000000000000d692ba892a902810a2ee3fa41c1d8dcd652d47ab',
          position: 3,
          name: 'data',
          type: 'bytes',
        },
      ]);
    });
  });

  describe('decodeLogParameters', () => {
    beforeEach(async () => {
      await db.insertMethodInterface({
        id: transferEventSignature.slice(0, 10),
        hash: transferEventSignature,
        name: 'Transfer',
        type: 'event',
      });
      await db.insertMethodParameter(transferEventParameters[0]);
      await db.insertMethodParameter(transferEventParameters[1]);
      await db.insertMethodParameter(transferEventParameters[2]);
    });

    it('should decode log parameters correctly', async () => {
      const topics = [
        transferEventSignature,
        '0x0000000000000000000000000000000000000000000000000000000000000000',
        '0x000000000000000000000000506fb98634903caac59e2e02b955e13cac0e3cbf',
      ];
      const data = '0x000000000000000000000000000000000000000000000000002386f26fc10000';

      const result = await service.decodeLogParameters(data, topics);

      expect(result).toEqual([
        {
          value: '0x0000000000000000000000000000000000000000',
          position: 0,
          name: 'from',
          type: 'address',
        },
        {
          value: '0x506Fb98634903CaaC59E2e02b955E13CaC0E3cBF',
          position: 1,
          name: 'to',
          type: 'address',
        },
        {
          value: '10000000000000000',
          position: 2,
          name: 'value',
          type: 'uint256',
        },
      ]);
    });

    it('should return an empty array if event signature is not found', async () => {
      const invalidTopics = [
        '0x0000000000000000000000000000000000000000000000000000000000000000',
        '0x00000000000000000000000036ec763516259d4be9ede7cc2969969f201139dd',
        '0x000000000000000000000000a735b516259d4be9ede7cc2969969f201139dd',
      ];
      const data = '0x0000000000000000000000000000000000000000000000004563918244f40000';
      const result = await service.decodeLogParameters(data, invalidTopics);

      expect(result).toEqual([]);
    });

    it('should return an empty array if no method parameters are found', async () => {
      const otherEventSignature =
        '0x8c5be1e5ebec7d5bd14f71427d1e84f3dd0314c0f7b2291e5b200ac8c7c3b925';
      const topics = [
        otherEventSignature,
        '0x00000000000000000000000036ec763516259d4be9ede7cc2969969f201139dd',
        '0x000000000000000000000000a735b516259d4be9ede7cc2969969f201139dd',
      ];
      const data = '0x0000000000000000000000000000000000000000000000004563918244f40000';

      await db.insertMethodInterface({
        id: otherEventSignature.slice(0, 10),
        hash: otherEventSignature,
        name: 'OtherEvent',
        type: 'event',
      });

      const result = await service.decodeLogParameters(data, topics);

      expect(result).toEqual([]);
    });

    it('should return null if data length is less than required for non-indexed parameters', async () => {
      const topics = [
        transferEventSignature,
        '0x00000000000000000000000036ec763516259d4be9ede7cc2969969f201139dd',
        '0x000000000000000000000000a735b516259d4be9ede7cc2969969f201139dd',
      ];
      const invalidData = '0x0000000000000000000000000000000000000000000000004563918244';

      const res = await service.decodeLogParameters(invalidData, topics);
      await expect(res).toBeNull();
    });
  });

  describe('unwrapLSP6Execute', () => {
    it('should be able to unwrap an execute input', async () => {
      await db.insertMethodInterface(setDataMethodInterface);
      await db.insertMethodParameter(setDataMethodParameters[0]);
      await db.insertMethodParameter(setDataMethodParameters[1]);

      const res = await service.testUnwrapLSP6Execute(
        '0x4a2a6C444c106d7533A48f0bf462bEe3D76B822F',
        {
          payload: setDataInputToDecode,
        },
      );

      expect(res).toEqual({
        ...setDataDecodedInput,
        to: '0xD208a16F18A3bAB276DFf0b62Ef591A846c86cbA',
        value: '0',
        input: setDataInputToDecode,
      });
    });

    it('should return right values if not possible to decode parameters', async () => {
      await db.insertMethodInterface(setDataMethodInterface);
      await db.insertMethodParameter(setDataMethodParameters[1]);

      const res = await service.testUnwrapLSP6Execute(
        '0x4a2a6C444c106d7533A48f0bf462bEe3D76B822F',
        {
          payload: setDataInputToDecode,
        },
      );

      expect(res).toEqual({
        parameters: [],
        methodName: 'setData',
        to: '0xD208a16F18A3bAB276DFf0b62Ef591A846c86cbA',
        value: '0',
        input: setDataInputToDecode,
      });
    });
  });

  describe('unwrapErc725XExecute', () => {
    it('should be able to unwrap an execute input', async () => {
      await db.insertMethodInterface(setDataMethodInterface);
      await db.insertMethodParameter(setDataMethodParameters[0]);
      await db.insertMethodParameter(setDataMethodParameters[1]);

      const res = await service.testUnwrapErc725XExecute({
        to: ADDRESS1.toLowerCase(),
        value: '0x123',
        data: setDataInputToDecode,
      });

      expect(res).toEqual({
        ...setDataDecodedInput,
        to: ADDRESS1,
        value: '0x123',
        input: setDataInputToDecode,
      });
    });

    it('should return right values if no method interface', async () => {
      const res = await service.testUnwrapErc725XExecute({
        to: ADDRESS1.toLowerCase(),
        value: '0x123',
        data: setDataInputToDecode,
      });

      expect(res).toEqual({
        parameters: [],
        methodName: null,
        to: ADDRESS1,
        value: '0x123',
        input: setDataInputToDecode,
      });
    });
  });

  describe('getUnwrappedTransaction', () => {
    it('should return properly formatted data', async () => {
      await db.insertMethodInterface(setDataMethodInterface);
      await db.insertMethodParameter(setDataMethodParameters[0]);
      await db.insertMethodParameter(setDataMethodParameters[1]);

      const res = await service.testGetUnwrappedTransaction(setDataInputToDecode, ADDRESS1, '3');

      expect(res).toEqual({
        ...setDataDecodedInput,
        to: ADDRESS1,
        value: '3',
        input: setDataInputToDecode,
      });
    });
  });

  describe('decodeLsp8TokenId', () => {
    it('should decode LSP8 token ID of type address correctly', () => {
      const tokenId = '0x36eC763516259D4bE9EDe7cC2969969f201139dd000000000000000000000000';
      const decodedTokenId = decodeLsp8TokenId(tokenId, LSP8_TOKEN_ID_TYPE.address);
      expect(decodedTokenId).toEqual('0x36eC763516259D4bE9EDe7cC2969969f201139dd');
    });

    it('should decode LSP8 token ID of type uint256 correctly', () => {
      const tokenId = '0x0000000000000000000000000000000000000000000000004563918244F40000';
      const decodedTokenId = decodeLsp8TokenId(tokenId, LSP8_TOKEN_ID_TYPE.uint256);
      expect(decodedTokenId).toEqual('5000000000000000000');
    });

    it('should decode LSP8 token ID of type string correctly', () => {
      const tokenId = '0x68656c6c6f20776f726c64';
      const decodedTokenId = decodeLsp8TokenId(tokenId, LSP8_TOKEN_ID_TYPE.string);
      expect(decodedTokenId).toEqual('hello world');
    });

    it('should decode LSP8 token ID of type bytes32 correctly', () => {
      const tokenId = '0x4b80742de2bf82acb3630000254bfe7e25184f72df435b5a9da39db6089dcaf5';
      const decodedTokenId = decodeLsp8TokenId(tokenId, LSP8_TOKEN_ID_TYPE.bytes32);
      expect(decodedTokenId).toEqual(tokenId);
    });

    it('should assume LSP8 token ID type as bytes32 if no type is provided', () => {
      const tokenId = '0x4b80742de2bf82acb3630000254bfe7e25184f72df435b5a9da39db6089dcaf5';
      const decodedTokenId = decodeLsp8TokenId(tokenId);
      expect(decodedTokenId).toEqual(tokenId);
    });
  });

  describe('decodeErc725YKeyValuePair', () => {
    it('should decode ERC725Y value correctly for LSP1UniversalReceiverDelegate', async () => {
      await db.insertErc725ySchema({
        name: 'LSP1UniversalReceiverDelegate',
        key: '0x0cfc51aec37c55a4d0b1a65c6255c4bf2fbdf6277f3cc0730c45b828b6db8b47',
        keyType: 'Singleton',
        valueType: 'address',
        valueContent: 'Address',
      });

      const res = await service.decodeErc725YKeyValuePair(
        '0x0cfc51aec37c55a4d0b1a65c6255c4bf2fbdf6277f3cc0730c45b828b6db8b47',
        '0x76aeb1274d6486be066e653605b25ddccf0e2f18',
      );

      expect(res?.value).toEqual(getAddress('0x76aeb1274d6486be066e653605b25ddccf0e2f18'));
      expect(res?.keyParameters).toEqual([]);
      expect(res?.keyIndex).toEqual(null);
    });

    it('should decode ERC725Y value correctly for UP Permissions', async () => {
      await db.insertErc725ySchema({
        name: 'AddressPermissions:Permissions:<address>',
        key: '0x4b80742de2bf82acb3630000<address>                               ',
        keyType: 'MappingWithGrouping',
        valueType: 'bytes32',
        valueContent: 'BitArray',
      });

      const res = await service.decodeErc725YKeyValuePair(
        '0x4b80742de2bf82acb3630000d0a434abaa20e8f9627ab2afac944a1264f264d6',
        '0x0000000000000000000000000000000000000000000000000000000000000a11',
      );

      expect(res?.value).toEqual('CHANGEOWNER,CHANGEEXTENSIONS,TRANSFERVALUE,CALL');
      expect(res?.keyParameters).toEqual([
        getAddress('0xd0a434abaa20e8f9627ab2afac944a1264f264d6'),
      ]);
    });

    it('should decode ERC725Y value correctly for LSP5ReceivedAssets[3]', async () => {
      await db.insertErc725ySchema({
        name: 'LSP5ReceivedAssets[]',
        key: '0x6460ee3c0aac563ccbf76d6e1d07bada78e3a9514e6382b736ed3f478ab7b90b',
        keyType: 'Array',
        valueType: 'address',
        valueContent: 'Address',
      });

      const res = await service.decodeErc725YKeyValuePair(
        '0x6460ee3c0aac563ccbf76d6e1d07bada00000000000000000000000000000003',
        '0x21d69022dfa30d8e1388388798b28386b2dd9a78',
      );

      expect(res?.value).toEqual(getAddress('0x21d69022dfa30d8e1388388798b28386b2dd9a78'));
      expect(res?.keyParameters).toEqual([]);
      expect(res?.keyIndex).toEqual(3);
    });

    it('should decode ERC725Y value correctly for LSP5ReceivedAssets[17]', async () => {
      await db.insertErc725ySchema({
        name: 'LSP5ReceivedAssets[]',
        key: '0x6460ee3c0aac563ccbf76d6e1d07bada78e3a9514e6382b736ed3f478ab7b90b',
        keyType: 'Array',
        valueType: 'address',
        valueContent: 'Address',
      });

      const res = await service.decodeErc725YKeyValuePair(
        '0x6460ee3c0aac563ccbf76d6e1d07bada00000000000000000000000000000011',
        '0x21d69022dfa30d8e1388388798b28386b2dd9a78',
      );

      expect(res?.value).toEqual(getAddress('0x21d69022dfa30d8e1388388798b28386b2dd9a78'));
      expect(res?.keyParameters).toEqual([]);
      expect(res?.keyIndex).toEqual(17);
    });

    it('should decode ERC725Y value correctly for LSP5ReceivedAssets[] root length', async () => {
      await db.insertErc725ySchema({
        name: 'LSP5ReceivedAssets[]',
        key: '0x6460ee3c0aac563ccbf76d6e1d07bada78e3a9514e6382b736ed3f478ab7b90b',
        keyType: 'Array',
        valueType: 'address',
        valueContent: 'Address',
      });

      const res = await service.decodeErc725YKeyValuePair(
        '0x6460ee3c0aac563ccbf76d6e1d07bada78e3a9514e6382b736ed3f478ab7b90b',
        '0x0000000000000000000000000000000000000000000000000000000000000003',
      );

      expect(res?.value).toEqual('3');
      expect(res?.keyParameters).toEqual([]);
      expect(res?.keyIndex).toEqual(null);
    });
  });
});
