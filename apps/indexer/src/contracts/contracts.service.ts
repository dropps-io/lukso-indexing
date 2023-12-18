import { Injectable } from '@nestjs/common';
import winston from 'winston';
import { LoggerService } from '@libs/logger/logger.service';
import { LuksoDataDbService } from '@db/lukso-data/lukso-data-db.service';
import { ContractTable } from '@db/lukso-data/entities/contract.table';
import { ExceptionHandler } from '@decorators/exception-handler.decorator';
import { DebugLogger } from '@decorators/debug-logging.decorator';

import { EthersService } from '../ethers/ethers.service';
import { MetadataService } from '../metadata/metadata.service';
import { RedisService } from '../redis/redis.service';
import { REDIS_KEY } from '../redis/redis-keys';

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
  @ExceptionHandler(true, true, null, REDIS_KEY.SKIP_CONTRACT_COUNT)
  public async indexContract(address: string): Promise<void> {
    this.logger.debug(`Indexing address ${address}`, { address });

    if (await this.isContractIndexed(address)) {
      this.logger.debug(`Contract already indexed: ${address}`, { address });
      return;
    }

    const contractInterface = await this.identifyContractInterface(address);
    await this.insertOrUpdateContract(address, contractInterface);
    await this.metadataService.indexContractMetadata(address, contractInterface?.code);
  }

  @DebugLogger()
  private async isContractIndexed(address: string): Promise<boolean> {
    const contract = await this.dataDB.getContractByAddress(address);
    return !!contract?.interfaceCode;
  }

  @DebugLogger()
  private async identifyContractInterface(address: string) {
    const contractInterface = await this.ethersService.identifyContractInterface(address);
    if (contractInterface)
      await this.redisService.incrementNumber(REDIS_KEY.DECODED_CONTRACT_COUNT);
    else await this.redisService.incrementNumber(REDIS_KEY.FAILED_DECODE_CONTRACT_COUNT);
    return contractInterface;
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
