import { Injectable } from '@nestjs/common';
import winston from 'winston';
import { LoggerService } from '@libs/logger/logger.service';
import { LuksoDataDbService } from '@db/lukso-data/lukso-data-db.service';
import { ContractTable } from '@db/lukso-data/entities/contract.table';
import { ExceptionHandler } from '@decorators/exception-handler.decorator';
import { DebugLogger } from '@decorators/debug-logging.decorator';
import { RedisService } from '@shared/redis/redis.service';

import { EthersService } from '../ethers/ethers.service';
import { MetadataService } from '../metadata/metadata.service';

@Injectable()
export class ContractsService {
  protected readonly logger: winston.Logger;
  constructor(
    protected readonly loggerService: LoggerService,
    protected readonly dataDB: LuksoDataDbService,
    protected readonly ethersService: EthersService,
    protected readonly metadataService: MetadataService,
    protected readonly redisService: RedisService,
  ) {
    this.logger = this.loggerService.getChildLogger('ContractsService');
  }

  @DebugLogger()
  @ExceptionHandler(true, true, null)
  public async indexContract(address: string): Promise<void> {
    this.logger.debug(`Indexing address ${address}`, { address });

    if (await this.isContractIndexed(address)) {
      this.logger.debug(`Contract already indexed: ${address}`, { address });
      return;
    }

    const contractInterface = await this.ethersService.identifyContractInterface(address);
    await this.insertOrUpdateContract(address, contractInterface);
    await this.redisService.addAssetToRefreshDataStream(
      address,
      undefined,
      contractInterface?.code,
    );
  }

  @DebugLogger()
  private async isContractIndexed(address: string): Promise<boolean> {
    const contract = await this.dataDB.getContractByAddress(address);
    return !!contract?.interfaceCode;
  }

  @DebugLogger()
  private async insertOrUpdateContract(address: string, contractInterface: any): Promise<void> {
    const contractRow: ContractTable = {
      address,
      interfaceCode: contractInterface?.code ?? 'unknown',
      interfaceVersion: contractInterface?.version ?? null,
      type: contractInterface?.type ?? null,
    };
    await this.dataDB.insertContract(contractRow, 'update');
  }
}
