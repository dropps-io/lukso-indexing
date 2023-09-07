import { Injectable } from '@nestjs/common';
import winston from 'winston';
import { LoggerService } from '@libs/logger/logger.service';
import { LuksoDataDbService } from '@db/lukso-data/lukso-data-db.service';
import { ContractTable } from '@db/lukso-data/entities/contract.table';

import { EthersService } from '../ethers/ethers.service';

@Injectable()
export class ContractsService {
  protected readonly logger: winston.Logger;
  constructor(
    protected readonly loggerService: LoggerService,
    protected readonly dataDB: LuksoDataDbService,
    protected readonly ethersService: EthersService,
  ) {
    this.logger = this.loggerService.getChildLogger('ContractsService');
  }

  /**
   * Indexes a contract by its address and retrieves its interface.
   *
   * @param {string} address - The contract address to index.
   * @returns {Promise<ContractTable | undefined>} The indexed contract data, or undefined if an error occurs.
   */
  public async indexContract(address: string): Promise<ContractTable | undefined> {
    try {
      this.logger.debug(`Indexing address ${address}`, { address });

      // Check if the contract has already been indexed (contract indexed only if interfaceCode is set)
      const contractAlreadyIndexed = await this.dataDB.getContractByAddress(address);
      if (contractAlreadyIndexed && contractAlreadyIndexed?.interfaceCode) {
        this.logger.debug(`Contract already indexed: ${address}`, { address });
        return;
      }

      // Identify the contract interface using its address
      const contractInterface = await this.ethersService.identifyContractInterface(address);

      this.logger.debug(`Contract interface identified: ${contractInterface?.code ?? 'unknown'}`, {
        address,
      });

      // Prepare the contract data to be inserted into the database
      const contractRow: ContractTable = {
        address,
        interfaceCode: contractInterface?.code ?? 'unknown',
        interfaceVersion: contractInterface?.version ?? null,
        type: contractInterface?.type ?? null,
      };

      // Insert contract, and update on conflict
      await this.dataDB.insertContract(contractRow, 'update');

      return contractRow;
    } catch (e) {
      this.logger.error(`Error while indexing contract: ${e.message}`, { address });
    }
  }
}
