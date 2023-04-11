import { LoggerService } from '@libs/logger/logger.service';
import { LuksoDataDbService } from '@db/lukso-data/lukso-data-db.service';
import { ContractTable } from '@db/lukso-data/entities/contract.table';
import { DB_DATA_TABLE } from '@db/lukso-data/config';
import { MetadataTable } from '@db/lukso-data/entities/metadata.table';

import { MetadataImage } from '../../address/entities/metadata.entity';

export class ExtendedDataDbService extends LuksoDataDbService {
  constructor(protected readonly loggerService: LoggerService) {
    super(loggerService);
  }

  public async getContractWithMetadata(
    address: string,
  ): Promise<(ContractTable & MetadataTable) | null> {
    const rows = await this.executeQuery<ContractTable & MetadataTable>(
      `SELECT * FROM ${DB_DATA_TABLE.CONTRACT} 
              INNER JOIN ${DB_DATA_TABLE.METADATA} 
              ON ${DB_DATA_TABLE.CONTRACT}.address = ${DB_DATA_TABLE.METADATA}.address
              WHERE  ${DB_DATA_TABLE.CONTRACT}."address" = $1`,
      [address],
    );
    return rows.length > 0 ? rows[0] : null;
  }

  public async getMetadataImages(
    metadataId: number,
    type?: string | null,
  ): Promise<MetadataImage[]> {
    let whereClause = '';
    if (type) whereClause = 'AND type = $2';
    else if (type === null) whereClause = 'AND type IS NULL';

    return await this.executeQuery<MetadataImage>(
      `
      SELECT * FROM ${DB_DATA_TABLE.METADATA_IMAGE}
      WHERE "metadataId" = $1 ${whereClause}
    `,
      type ? [metadataId, type] : [metadataId],
    );
  }
}
