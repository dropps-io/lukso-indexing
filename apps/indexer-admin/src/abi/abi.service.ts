import { Injectable } from '@nestjs/common';
import { AbiItem } from 'web3-utils';
import { generateAndPersistMethodInterfaces } from '@db/lukso-structure/utils/generate-method-interfaces';
import { LuksoStructureDbService } from '@db/lukso-structure/lukso-structure-db.service';
import { LoggerService } from '@libs/logger/logger.service';

@Injectable()
export class AbiService {
  async processAndUploadAbiItems(abiItems: AbiItem[][]): Promise<void> {
    try {
      await generateAndPersistMethodInterfaces(abiItems);
    } catch (error) {
      throw new Error('Failed to process and upload ABI items: ' + (error as Error).message);
    }
  }
}
