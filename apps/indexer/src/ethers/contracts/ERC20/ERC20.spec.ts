import { Test } from '@nestjs/testing';
import { LoggerService } from '@libs/logger/logger.service';
import { LuksoStructureDbService } from '@db/lukso-structure/lukso-structure-db.service';

import { EthersService } from '../../ethers.service';
import { FetcherService } from '../../../fetcher/fetcher.service';
import { ERC20 } from './ERC20';
import { ADDRESS1 } from '../../../../../../test/utils/test-values';

jest.setTimeout(15_000);

describe('ERC20', () => {
  let service: ERC20;
  const logger = new LoggerService();
  const db = new LuksoStructureDbService(logger);

  const erc20TokenContract = '0x74b7b43A0D3261171074Bcf503721C587ad7118F';

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
    service = new ERC20(ethersService, new FetcherService(), logger.getChildLogger('ERC20'));
  });

  describe('fetchData', () => {
    it('should return null if no metadata', async () => {
      const res = await service.fetchData(ADDRESS1);
      expect(res).toBeNull();
    });

    it('should fetch data for a ERC20 token', async () => {
      const res = await service.fetchData(erc20TokenContract);
      expect(res).toEqual({
        metadata: {
          address: erc20TokenContract,
          tokenId: null,
          symbol: 'AARA',
        },
      });
    });
  });
});
