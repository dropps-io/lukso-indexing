import { Test } from '@nestjs/testing';
import { LoggerService } from '@libs/logger/logger.service';
import { LuksoStructureDbService } from '@db/lukso-structure/lukso-structure-db.service';

import { LSP0 } from './LSP0';
import { Web3Service } from '../../web3.service';
import { ADDRESS1 } from '../../../../../../test/utils/test-values';

describe('LSP0', () => {
  let service: LSP0;
  const logger = new LoggerService();
  const db = new LuksoStructureDbService(logger);

  const e2eProfileAddress = '0xEF1a8DF71Be124E8e0322c62F974C553961E91DC';

  beforeAll(async () => {
    const moduleRef = await Test.createTestingModule({
      providers: [
        Web3Service,
        { provide: LuksoStructureDbService, useValue: db },
        { provide: LoggerService, useValue: logger },
      ],
    }).compile();

    const web3Service: Web3Service = moduleRef.get<Web3Service>(Web3Service);
    service = new LSP0(web3Service, logger.getChildLogger('LSP0'));
  });

  describe('fetchData', () => {
    it('should return null if no metadata', async () => {
      const res = await service.fetchData(ADDRESS1);
      expect(res).toBeNull();
    });

    it('should fetch LSP4 data', async () => {
      const res = await service.fetchData(e2eProfileAddress);

      expect(res).toEqual({
        metadata: {
          address: e2eProfileAddress,
          tokenId: null,
          name: 'e2e-test',
          description: 'Account created by e2e testing scripts',
          symbol: null,
          isNFT: null,
        },
        images: [
          {
            width: 600,
            height: 597,
            hashFunction: 'keccak256(bytes)',
            hash: '0x779052393c4a34eb75ca74109c756c7c5e146d482bc2893784c1604f41a8791a',
            url: 'ipfs://QmPhs4MUtxHR95YV8JhpA3sL83NX5DWLFPxzsZR9KX782L',
            type: 'profile',
          },
          {
            width: 600,
            height: 597,
            hashFunction: 'keccak256(bytes)',
            hash: '0x779052393c4a34eb75ca74109c756c7c5e146d482bc2893784c1604f41a8791a',
            url: 'ipfs://QmPhs4MUtxHR95YV8JhpA3sL83NX5DWLFPxzsZR9KX782L',
            type: 'profile',
          },
          {
            width: 600,
            height: 597,
            hashFunction: 'keccak256(bytes)',
            hash: '0x779052393c4a34eb75ca74109c756c7c5e146d482bc2893784c1604f41a8791a',
            url: 'ipfs://QmPhs4MUtxHR95YV8JhpA3sL83NX5DWLFPxzsZR9KX782L',
            type: 'profile',
          },
          {
            width: 320,
            height: 318,
            hashFunction: 'keccak256(bytes)',
            hash: '0x334f31d13a0d91a73c658c7b5baad02fae58500260073565c6b344eccc302b34',
            url: 'ipfs://QmbG6xU555dGf7xK6hYqBXafaZPWnPc4XFh3h8E2obApaQ',
            type: 'profile',
          },
          {
            width: 180,
            height: 179,
            hashFunction: 'keccak256(bytes)',
            hash: '0x3c69f4bf543e95b7226b236ed52d2d26906cf7506a6f3a317d9da3a0d7394497',
            url: 'ipfs://QmUyKEVANBNKy2XaKA6guuUZuLoMczcRzv71sMAVccGpXL',
            type: 'profile',
          },
          {
            width: 1800,
            height: 1124,
            hashFunction: 'keccak256(bytes)',
            hash: '0x0cfef5f0ca25cf6b526996e66682e866394371bba2ffb89412b3fa566364ca1b',
            url: 'ipfs://QmTVbwHFQ2Jy1XndkwAcY2aPq7M8Yfj562Vs3ae1m3HhQv',
            type: 'background',
          },
          {
            width: 1024,
            height: 639,
            hashFunction: 'keccak256(bytes)',
            hash: '0xc16fd2faf7743df7793219b47367aa9400488973ed5e8cea605eceaeb25dd922',
            url: 'ipfs://QmW45PrVnWmFQJLaEGtLiytGVkmx5waQ9mPbskqwPSfVdw',
            type: 'background',
          },
          {
            width: 640,
            height: 399,
            hashFunction: 'keccak256(bytes)',
            hash: '0x78975cbf585ec774b328977950e65167ae59ceca2a39d9cc31a1b262f5b762e3',
            url: 'ipfs://QmVJzga9fHXDdamQKK56WRUuHNP8Y9LMoe9wUJhVRJyrjb',
            type: 'background',
          },
          {
            width: 320,
            height: 199,
            hashFunction: 'keccak256(bytes)',
            hash: '0x0ad92189975e7c28a9abe31361eb87b78b889d2139745b2f0f6d370c8a94b386',
            url: 'ipfs://QmcX8z7No5NPVTcv9v8iFuGYbzfY6Sq91MYo2DyEaLKLM8',
            type: 'background',
          },
          {
            width: 180,
            height: 112,
            hashFunction: 'keccak256(bytes)',
            hash: '0xe215f4feb1e8bd9d2827aabf0a9481457b59d05fe5cc3f2e8a11c963064786c5',
            url: 'ipfs://QmPDpow9ocgZYmyNoSUJxqcGxFC2p5HctWajmS9WCQeAXf',
            type: 'background',
          },
        ],
        tags: ['public profile'],
        links: [],
        assets: [],
      });
    });
  });
});
