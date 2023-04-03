import { Test } from '@nestjs/testing';

import { DecodingService } from './decoding.service';
import { LuksoStructureDbService } from '../../../../libs/database/lukso-structure/lukso-structure-db.service';
import { MethodInterfaceTable } from '../../../../libs/database/lukso-structure/entities/methodInterface.table';
import { MethodParameterTable } from '../../../../libs/database/lukso-structure/entities/methodParameter.table';
import { Web3Service } from '../web3/web3.service';
import { LoggerService } from '../../../../libs/logger/logger.service';
import { ADDRESS1 } from '../../../../test/utils/test-values';

class TestDecodingService extends DecodingService {
  constructor(
    protected readonly structureDB: LuksoStructureDbService,
    protected readonly web3Service: Web3Service,
    protected readonly loggerService: LoggerService,
  ) {
    super(structureDB, web3Service, loggerService);
  }

  async testUnwrapLSP6Execute(contractAddress: string, parametersMap: Record<string, string>) {
    return await this.unwrapLSP6Execute(contractAddress, parametersMap);
  }

  async testUnwrapErc725XExecute(parametersMap: Record<string, string>) {
    return await this.unwrapErc725XExecute(parametersMap);
  }

  async testGetUnwrappedTransaction(wrappedInput: string, toAddress: string, value: string) {
    return await this.getUnwrappedTransaction(wrappedInput, toAddress, value);
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

describe('DecodingService', () => {
  let service: TestDecodingService;
  const db = new LuksoStructureDbService();

  beforeAll(async () => {
    const moduleRef = await Test.createTestingModule({
      providers: [
        TestDecodingService,
        { provide: LuksoStructureDbService, useValue: db },
        { provide: Web3Service, useValue: new Web3Service() },
        { provide: LoggerService, useValue: new LoggerService() },
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
});
