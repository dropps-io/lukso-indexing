import { Injectable } from '@nestjs/common';
import winston from 'winston';
import { LoggerService } from '@libs/logger/logger.service';
import { LuksoDataDbService } from '@db/lukso-data/lukso-data-db.service';
import { ContractTable } from '@db/lukso-data/entities/contract.table';

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
  ) {
    this.logger = this.loggerService.getChildLogger('ContractsService');
  }

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

  private async isContractIndexed(address: string): Promise<boolean> {
    const contract = await this.dataDB.getContractByAddress(address);
    return !!contract?.interfaceCode;
  }

  private async identifyContractInterface(address: string) {
    return this.ethersService.identifyContractInterface(address);
  }

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
