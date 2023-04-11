import { Injectable } from '@nestjs/common';
import winston from 'winston';
import { LoggerService } from '@libs/logger/logger.service';

import { AddressEntity } from './entities/address.entity';
import { ExtendedDataDbService } from '../libs/extended-data-db/extended-data-db.service';
import { MetadataImage } from './entities/metadata.entity';

@Injectable()
export class AddressService {
  private readonly fileLogger: winston.Logger;

  constructor(
    private readonly dataDB: ExtendedDataDbService,
    private readonly logger: LoggerService,
  ) {
    this.fileLogger = logger.getChildLogger('Address');
  }

  async findByAddress(address: string): Promise<AddressEntity | null> {
    return await this.dataDB.getContractWithMetadata(address);
  }

  async findImages(metadataId: number, type?: string | null): Promise<MetadataImage[]> {
    return await this.dataDB.getMetadataImages(metadataId, type);
  }
}
