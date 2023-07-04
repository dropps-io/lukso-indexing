import { Test, TestingModule } from '@nestjs/testing';
import { LoggerService } from '@libs/logger/logger.service';

import { IndexingWsGateway } from './indexing-ws.gateway';

describe('IndexingWsGateway', () => {
  let gateway: IndexingWsGateway;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [IndexingWsGateway, { provide: LoggerService, useValue: new LoggerService() }],
    }).compile();

    gateway = module.get<IndexingWsGateway>(IndexingWsGateway);
  });

  it('should be defined', () => {
    expect(gateway).toBeDefined();
  });
});
