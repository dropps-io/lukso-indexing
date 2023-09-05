import { Test } from '@nestjs/testing';
import { LoggerService } from '@libs/logger/logger.service';
import { LuksoStructureDbService } from '@db/lukso-structure/lukso-structure-db.service';

import { LSP7 } from './LSP7';
import { EthersService } from '../../ethers.service';
import { ADDRESS1 } from '../../../../../../test/utils/test-values';
import { FetcherService } from '../../../fetcher/fetcher.service';

jest.setTimeout(15_000);

describe('LSP7', () => {
  let service: LSP7;
  const logger = new LoggerService();
  const db = new LuksoStructureDbService(logger);

  const lsp7TokenContract = '0x3429BB49c2c67f42ca83b2164D52566F61c4aDF4';
  const lsp7NFTContract = '0xb2a520690812e1B26c38D0B1c562686caDF446ea';

  beforeAll(async () => {
    const moduleRef = await Test.createTestingModule({
      providers: [
        EthersService,
        { provide: LuksoStructureDbService, useValue: db },
        { provide: FetcherService, useValue: new FetcherService() },
        { provide: LoggerService, useValue: logger },
      ],
    }).compile();

    const ethersService: EthersService = moduleRef.get<EthersService>(EthersService);
    service = new LSP7(ethersService, new FetcherService(), logger.getChildLogger('LSP7'));
  });

  describe('fetchData', () => {
    it('should return null if no metadata', async () => {
      const res = await service.fetchData(ADDRESS1);
      expect(res).toBeNull();
    });

    it('should fetch data for a LSP7 token', async () => {
      const res = await service.fetchData(lsp7TokenContract);
      expect(res).toEqual({
        metadata: {
          address: lsp7TokenContract,
          tokenId: null,
          name: 'My Super Token',
          description: 'My super description',
          symbol: 'MYT',
          isNFT: false,
        },
        images: [
          {
            width: 512,
            height: 512,
            hashFunction: 'keccak256(bytes)',
            hash: '0xe1ead8f4047b7ff34a74967c1bc727b7394f8c7156a3960761ec7959bf9fdcaf',
            url: 'ipfs://QmPQLr6DdFyLKYEJNQCb5AMLQndKbBo51RBWTwLJWwiBAq',
            type: null,
          },
          {
            width: 512,
            height: 512,
            hashFunction: 'keccak256(bytes)',
            hash: '0xa37266956c03b15d027b262527544f818badbc5c8f945682f738dec7ffc9b662',
            url: 'ipfs://QmTNLfzXEqBsDSqx4VFrNrcHF1DZmHtETCsZebTcv3Zwqd',
            type: null,
          },
          {
            width: 512,
            height: 512,
            hashFunction: 'keccak256(bytes)',
            hash: '0xad7577cc13b6d1a23d3197060f34bc99aae3b9aefb5db79bf1ec20c81ce16de6',
            url: 'ipfs://QmZWshmys5FmdcTegdJUfULrrHNiMiTPjqFpTnkpLN82Xa',
            type: null,
          },
          {
            width: 320,
            height: 320,
            hashFunction: 'keccak256(bytes)',
            hash: '0xd008bae3c2a53116a16bf58a8a69371ef74a7ae510f9ba1fea3a6ec6994d6d01',
            url: 'ipfs://Qmce6nsWgAgQUyyctiBHRE62s9A43MCvnoF6eRWn7qNsew',
            type: null,
          },
          {
            width: 180,
            height: 180,
            hashFunction: 'keccak256(bytes)',
            hash: '0xda6257aed0dc06db6083b059e01312a7eb8eabf8eb37b632a60f3932b50e626d',
            url: 'ipfs://QmRJ8g7x7WXhordTs64JnNvGxrRb1scxAPxetniXymjsQF',
            type: null,
          },
          {
            width: 256,
            height: 256,
            hashFunction: 'keccak256(bytes)',
            hash: '0x5a4680587159b7dc8a9b4cf3343e137793d89c1fa086442719901b5c99008077',
            url: 'ipfs://QmczKFzkAEEqpFReGJxqCUFCHGwN4FcBzT4Z3mcmnANrJD',
            type: 'icon',
          },
          {
            width: 32,
            height: 32,
            hashFunction: 'keccak256(bytes)',
            hash: '0x576ef1710c9d788c2629b509cc875d82774e69661a6ddc0e1d77c0477aa5fed8',
            url: 'ipfs://QmPn7qwPdBy9CNJo5vL74AxiT5qe8equdinSYtPicM1F5X',
            type: 'icon',
          },
        ],
        tags: [],
        links: [{ title: 'LUKSO Docs', url: 'https://docs.lukso.tech' }],
        assets: [],
      });
    });

    it('should fetch data for a LSP7 NFT', async () => {
      const res = await service.fetchData(lsp7NFTContract);

      expect(res).toEqual({
        metadata: {
          address: '0xb2a520690812e1B26c38D0B1c562686caDF446ea',
          tokenId: null,
          name: 'test',
          description: null,
          symbol: 'YLDZ',
          isNFT: true,
        },
        images: [],
        tags: [],
        links: [],
        assets: [],
      });
    });
  });
});
