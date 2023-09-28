import { Injectable } from '@nestjs/common';
import { LuksoStructureDbService } from '@db/lukso-structure/lukso-structure-db.service';
import { LoggerService } from '@libs/logger/logger.service';
const db = new LuksoStructureDbService(new LoggerService());
import { tryExecuting } from '@utils/try-executing';
import { ContractInterfaceTable } from '@db/lukso-structure/entities/contractInterface.table';

@Injectable()
export class ContractInterfacesService {
  async uploadContractInterfaces(contractInterfaces: Array<ContractInterfaceTable>): Promise<void> {
    try {
      for (const contractInterface of contractInterfaces) {
        await tryExecuting(db.insertContractInterface(contractInterface));
      }
    } catch (error) {
      throw new Error('Failed to process and upload ABI items: ' + (error as Error).message);
    }
  }
}
