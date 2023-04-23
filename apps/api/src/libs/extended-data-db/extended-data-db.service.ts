import { LoggerService } from '@libs/logger/logger.service';
import { LuksoDataDbService } from '@db/lukso-data/lukso-data-db.service';
import { ContractTable } from '@db/lukso-data/entities/contract.table';
import { DB_DATA_TABLE } from '@db/lukso-data/config';
import { MetadataTable } from '@db/lukso-data/entities/metadata.table';
import { MetadataImageTable } from '@db/lukso-data/entities/metadata-image.table';
import { WrappedTxTable } from '@db/lukso-data/entities/wrapped-tx.table';

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
  ): Promise<MetadataImageTable[]> {
    let whereClause = '';
    if (type) whereClause = 'AND type = $2';
    else if (type === null) whereClause = 'AND type IS NULL';

    return await this.executeQuery<MetadataImageTable>(
      `
      SELECT * FROM ${DB_DATA_TABLE.METADATA_IMAGE}
      WHERE "metadataId" = $1 ${whereClause}
    `,
      type ? [metadataId, type] : [metadataId],
    );
  }

  public async getWrappedTxFromTransactionHash(
    transactionHash: string,
    methodId?: string,
  ): Promise<WrappedTxTable[]> {
    let whereClause = '';
    if (methodId) whereClause = 'AND "methodId" = $2';

    return await this.executeQuery<WrappedTxTable>(
      `SELECT * FROM ${DB_DATA_TABLE.WRAPPED_TRANSACTION} 
              WHERE ${DB_DATA_TABLE.WRAPPED_TRANSACTION}."transactionHash" = $1 ${whereClause}`,
      methodId ? [transactionHash, methodId] : [transactionHash],
    );
  }
}
