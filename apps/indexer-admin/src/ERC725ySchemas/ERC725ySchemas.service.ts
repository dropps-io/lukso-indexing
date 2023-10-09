import { Injectable } from '@nestjs/common';
import { LuksoStructureDbService } from '@db/lukso-structure/lukso-structure-db.service';
import { LoggerService } from '@libs/logger/logger.service';
const db = new LuksoStructureDbService(new LoggerService());
import { tryExecuting } from '@utils/try-executing';
import { ERC725YSchemaTable } from '@db/lukso-structure/entities/erc725YSchema.table';

@Injectable()
export class ERC725ySchemasService {
  async uploadERC725ySchemas(erc725ySchemas: Array<ERC725YSchemaTable>): Promise<void> {
    try {
      for (const erc725ySchema of erc725ySchemas) {
        await tryExecuting(db.insertErc725ySchema(erc725ySchema));
      }
    } catch (error) {
      throw new Error('Failed to process and upload erc725ySchemas: ' + (error as Error).message);
    }
  }
}
