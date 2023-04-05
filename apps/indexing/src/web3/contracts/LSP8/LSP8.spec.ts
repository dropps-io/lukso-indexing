import { Test } from '@nestjs/testing';
import { LoggerService } from '@libs/logger/logger.service';
import { LuksoStructureDbService } from '@db/lukso-structure/lukso-structure-db.service';
import winston from 'winston';

import { LSP8 } from './LSP8';
import { Web3Service } from '../../web3.service';
import { ADDRESS1, HASH1 } from '../../../../../../test/utils/test-values';
import { MetadataResponse } from '../../types/metadata-response';
import { LSP8_TOKEN_ID_TYPE } from './enums';

jest.setTimeout(15_000);

class TestLSP8 extends LSP8 {
  constructor(
    protected readonly web3Service: Web3Service,
    protected readonly logger: winston.Logger,
  ) {
    super(web3Service, logger);
  }

  testGetTokenIdType(address: string): Promise<LSP8_TOKEN_ID_TYPE> {
    return this.getTokenIdType(address);
  }
}

const lsp8ContractTypeUint = {
  address: '0xBA16135B0DECda0Bf613BB2C88C70B5a6295577c',
  tokenId: '0x0000000000000000000000000000000000000000000000000000000000000929',
};

const lsp8ContractTypeBytes = {
  address: '0x4d631Bb12f545593b786a2A41844F94A1f1C02d4',
  tokenId: '0x7bdcd4190bd973bb158d56093056959eda82f3a125a1fc6bd18d805d61aac002',
};

const lsp8ContractTypeNotSet = {
  address: '0x62203c78286a11ca391DAE5D1B11f16a757d879C',
  tokenId: '0x7bdcd4190bd973bb158d56093056959eda82f3a125a1fc6bd18d805d61aac002',
};

describe('LSP8', () => {
  let service: TestLSP8;
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

    const web3Service: Web3Service = moduleRef.get<Web3Service>(Web3Service);
    service = new TestLSP8(web3Service, logger.getChildLogger('LSP8'));
  });

  describe('fetchTokenData', () => {
    it('should return null if no metadata', async () => {
      const res = await service.fetchTokenData(ADDRESS1, HASH1);
      expect(res).toBeNull();
    });

    it('should fetch data for a LSP8 token with tokenIdType uint256', async () => {
      const res = await service.fetchTokenData(
        lsp8ContractTypeUint.address,
        lsp8ContractTypeUint.tokenId,
      );

      expect(res).toMatchObject({
        ...expectedMetadata,
        metadata: {
          ...expectedMetadata.metadata,
          address: lsp8ContractTypeUint.address,
          tokenId: lsp8ContractTypeUint.tokenId,
        },
      });
    });

    it('should fetch data for a LSP8 token with tokenIdType bytes32', async () => {
      const res = await service.fetchTokenData(
        lsp8ContractTypeBytes.address,
        lsp8ContractTypeBytes.tokenId,
      );

      expect(res).toMatchObject({
        ...expectedMetadata,
        metadata: {
          ...expectedMetadata.metadata,
          address: lsp8ContractTypeBytes.address,
          tokenId: lsp8ContractTypeBytes.tokenId,
        },
      });
    });

    it('should fetch data for a LSP8 token with no tokenIdType', async () => {
      const res = await service.fetchTokenData(
        lsp8ContractTypeNotSet.address,
        lsp8ContractTypeNotSet.tokenId,
      );

      expect(res).toMatchObject({
        ...expectedMetadata,
        metadata: {
          ...expectedMetadata.metadata,
          address: lsp8ContractTypeNotSet.address,
          tokenId: lsp8ContractTypeNotSet.tokenId,
        },
      });
    });
  });

  describe('getTokenIdType', () => {
    it('should find tokenIdType uint256', async () => {
      const res = await service.testGetTokenIdType(lsp8ContractTypeUint.address);
      expect(res).toBe(LSP8_TOKEN_ID_TYPE.uint256);
    });

    it('should find tokenIdType bytes32', async () => {
      const res = await service.testGetTokenIdType(lsp8ContractTypeBytes.address);
      expect(res).toBe(LSP8_TOKEN_ID_TYPE.bytes32);
    });

    it('should find tokenIdType unknown when not set', async () => {
      const res = await service.testGetTokenIdType(lsp8ContractTypeNotSet.address);
      expect(res).toBe(LSP8_TOKEN_ID_TYPE.unknown);
    });

    it('should throw an error if contract do not implement ERC725Y', async () => {
      await expect(service.testGetTokenIdType(ADDRESS1)).rejects.toThrow();
    });
  });
});

const expectedMetadata: MetadataResponse = {
  metadata: {
    address: lsp8ContractTypeUint.address,
    tokenId: lsp8ContractTypeUint.tokenId,
    name: null,
    description: 'My super token id description',
    symbol: null,
    isNFT: true,
  },
  images: [
    {
      width: 512,
      height: 512,
      hash: '0x16629d2dc76d30fbb537acdcf6fcfb950ea70506cb53e93daad119019f9e3e44',
      url: 'ipfs://QmamhMCEg1JmtCS2SdbfoDYG21VoTUrPTd2S8poG2N835w',
      type: null,
    },
    {
      width: 512,
      height: 512,
      hash: '0x894a8741fb0e27420905505ad67184ffb01c2eafdfdc245a638ff7a0718e5992',
      url: 'ipfs://Qmb3mMyUJaivYFqDxN76LiRLwoqxLAM9sBkbgatPASdQ52',
      type: null,
    },
    {
      width: 512,
      height: 512,
      hash: '0x703f16df5e516136fe41ecaa932134c9bd06eb381d6a41abbe9146afb4c0b41b',
      url: 'ipfs://QmZ8cdefjji4iqApSjJLMno37d7iNe8BFQ4Z2Bd69uRE6c',
      type: null,
    },
    {
      width: 320,
      height: 320,
      hash: '0xe671b2dcf3deb625cd0718877acae3d446df49951b91292a495e2ade5eff4b33',
      url: 'ipfs://QmcB4ebd4ZibWtrwZh1gXYgJ5YX6NJFbmzG6QrdD2hucpP',
      type: null,
    },
    {
      width: 180,
      height: 180,
      hash: '0xba55c580264923d99b2a95dcdcdd45a345534d8f1792a158480e6f08dd2669a5',
      url: 'ipfs://QmX2GNCzzUqZyR4PXWRGBBHfbX8sv4GVxxVS4zUT84TPkc',
      type: null,
    },
    {
      width: 600,
      height: 600,
      hash: '0x76aa1fa44b21919053bdb3571a41265450e6174ea9065e5a0ddce2d0d4037889',
      url: 'ipfs://QmY68MfWqnV153jD92AYCTEx95BWY5TJ23zdrSebByoH16',
      type: null,
    },
    {
      width: 600,
      height: 600,
      hash: '0x76aa1fa44b21919053bdb3571a41265450e6174ea9065e5a0ddce2d0d4037889',
      url: 'ipfs://QmY68MfWqnV153jD92AYCTEx95BWY5TJ23zdrSebByoH16',
      type: null,
    },
    {
      width: 600,
      height: 600,
      hash: '0x76aa1fa44b21919053bdb3571a41265450e6174ea9065e5a0ddce2d0d4037889',
      url: 'ipfs://QmY68MfWqnV153jD92AYCTEx95BWY5TJ23zdrSebByoH16',
      type: null,
    },
    {
      width: 320,
      height: 320,
      hash: '0xda1501588b03009266c06c926c44fc09cedbbed830b761b20236119b563476ba',
      url: 'ipfs://QmeiUuMA7p5fZCsaMYuuTnjU4XKehLD3tjtRws5wHrn1ER',
      type: null,
    },
    {
      width: 180,
      height: 180,
      hash: '0x121b5702105fe56facb337dec4ceb0f058f4c397d2f01960c9783fa13cdf6906',
      url: 'ipfs://QmTYsVnvMP3Z5YR97jqzUU39dNju2yEuVNpukEGYmmYL7F',
      type: null,
    },
    {
      width: 600,
      height: 600,
      hash: '0x4c7658048916efd49e96003bb1d2778479cef42297024ceb95762ece923e61ec',
      url: 'ipfs://QmTgEq76S5ec7jUVgScGijRvWcxvUqLMvg6bqQETA3girF',
      type: null,
    },
    {
      width: 600,
      height: 600,
      hash: '0xe615eb81a32066922dce83e6b4633a8a68272db104fd7980c01fc49dc8fb4f63',
      url: 'ipfs://QmSTh22mNi2Z4H4v6TNKYqJjcAoJugDK16Bofp7Sq48AjX',
      type: null,
    },
    {
      width: 600,
      height: 600,
      hash: '0xf0d3c7fc2ff7c0b1e305faa3456be7e25b6b2dde0ba0235a01761b80f03f295a',
      url: 'ipfs://QmZUnaDnjWddTrXCyw6cHjpiqzHdoNDCoBCW89H1wBJgh3',
      type: null,
    },
    {
      width: 320,
      height: 320,
      hash: '0x81b518c930052895908fcb1c95ac30429b679089734f1d57cc5abf388b68f1ea',
      url: 'ipfs://QmUn6MUGbvHEAZhsKF4MGzybZvARTXUnLRpfYSW6DDQ62p',
      type: null,
    },
    {
      width: 180,
      height: 180,
      hash: '0x7eaf577ced06daf922f4e582f2a15d8a2b128c045d00557af2bb1fa85b547236',
      url: 'ipfs://QmRtsNeNgYevpJxsYw4k8watSKXrETqoUPUDCF2gS6z1zS',
      type: null,
    },
  ],
  tags: [],
  links: [{ title: 'LUKSO Docs', url: 'https://docs.lukso.tech' }],
  assets: [],
};
