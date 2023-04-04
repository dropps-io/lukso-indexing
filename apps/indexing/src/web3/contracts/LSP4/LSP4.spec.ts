import { Test } from '@nestjs/testing';
import { LoggerService } from '@libs/logger/logger.service';
import { LuksoStructureDbService } from '@db/lukso-structure/lukso-structure-db.service';

import { LSP4 } from './LSP4';
import { Web3Service } from '../../web3.service';
import { ADDRESS1 } from '../../../../../../test/utils/test-values';

describe('LSP4', () => {
  let service: LSP4;
  const logger = new LoggerService();
  const db = new LuksoStructureDbService(logger);

  const lsp7Contract = '0x3429BB49c2c67f42ca83b2164D52566F61c4aDF4';

  beforeAll(async () => {
    const moduleRef = await Test.createTestingModule({
      providers: [
        Web3Service,
        { provide: LuksoStructureDbService, useValue: db },
        { provide: LoggerService, useValue: logger },
      ],
    }).compile();

    const web3Service: Web3Service = moduleRef.get<Web3Service>(Web3Service);
    service = new LSP4(web3Service, logger.getChildLogger('LSP4'));
  });

  describe('fetchData', () => {
    it('should return null if no metadata', async () => {
      const res = await service.fetchData(ADDRESS1);
      expect(res).toBeNull();
    });

    it('should fetch LSP4 data', async () => {
      const res = await service.fetchData(lsp7Contract);
      expect(res).toEqual({
        metadata: {
          address: lsp7Contract,
          tokenId: null,
          name: 'My Super Token',
          description: 'My super description',
          symbol: 'MYT',
          isNFT: null,
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
  });
});
