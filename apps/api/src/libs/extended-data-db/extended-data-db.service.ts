import knex from 'knex';
import { LoggerService } from '@libs/logger/logger.service';
import { LuksoDataDbService } from '@db/lukso-data/lukso-data-db.service';
import { ContractTable } from '@db/lukso-data/entities/contract.table';
import { DB_DATA_TABLE } from '@db/lukso-data/config';
import { MetadataTable } from '@db/lukso-data/entities/metadata.table';
import { MetadataImageTable } from '@db/lukso-data/entities/metadata-image.table';
import { WrappedTxTable } from '@db/lukso-data/entities/wrapped-tx.table';
import { knexToSQL } from '@db/utils/knexToSQL';
import { CONTRACT_TYPE } from '@models/enums';

const queryBuilder = knex({ client: 'pg' });

export class ExtendedDataDbService extends LuksoDataDbService {
  constructor(protected readonly loggerService: LoggerService) {
    super(loggerService);
  }

  public async getContractWithMetadataByAddress(
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

  public async searchContractWithMetadataByAddress(
    address: string,
    limit: number,
    offset: number,
    type?: string,
    interfaceVersion?: string,
    interfaceCode?: string,
  ): Promise<(ContractTable & MetadataTable)[]> {
    let query = queryBuilder
      .select('*')
      .from(DB_DATA_TABLE.CONTRACT)
      .innerJoin(
        DB_DATA_TABLE.METADATA,
        `${DB_DATA_TABLE.CONTRACT}.address`,
        `${DB_DATA_TABLE.METADATA}.address`,
      )
      .whereRaw('LOWER(contract.address) LIKE LOWER(?)', [`%${address}%`])
      .orderBy('name', 'asc')
      .limit(limit)
      .offset(offset);

    if (type) query = query.andWhere({ type });
    if (interfaceVersion) query = query.andWhere({ interfaceVersion });
    if (interfaceCode) query = query.andWhere({ interfaceCode });

    // Get the SQL query string and bindings
    const { sql, bindings } = knexToSQL(query);

    // Execute the query
    return await this.executeQuery<ContractTable & MetadataTable>(sql, bindings as any[]);
  }

  public async searchContractByAddressCount(
    address: string,
    type?: CONTRACT_TYPE,
    interfaceVersion?: string,
    interfaceCode?: string,
  ): Promise<number> {
    let query = queryBuilder
      .count('*')
      .from(DB_DATA_TABLE.CONTRACT)
      .whereRaw('LOWER(address) LIKE LOWER(?)', [`%${address}%`]);

    if (type) query = query.andWhere({ type });
    if (interfaceVersion) query = query.andWhere({ interfaceVersion });
    if (interfaceCode) query = query.andWhere({ interfaceCode });

    // Get the SQL query string and bindings
    const { sql, bindings } = knexToSQL(query);

    // Execute the query
    return (await this.executeQuery<{ count: number }>(sql, bindings as any[]))[0].count;
  }

  public async searchContractWithMetadataByName(
    name: string,
    limit: number,
    offset: number,
    type?: string,
    interfaceVersion?: string,
    interfaceCode?: string,
  ): Promise<(ContractTable & MetadataTable)[]> {
    let query = queryBuilder
      .select('*')
      .from(DB_DATA_TABLE.CONTRACT)
      .innerJoin(
        DB_DATA_TABLE.METADATA,
        `${DB_DATA_TABLE.CONTRACT}.address`,
        `${DB_DATA_TABLE.METADATA}.address`,
      )
      .whereRaw(`LOWER(name) LIKE LOWER(?)`, [`%${name}%`])
      .orderBy('name', 'asc')
      .limit(limit)
      .offset(offset);

    if (type) query = query.andWhere({ type });
    if (interfaceVersion) query = query.andWhere({ interfaceVersion });
    if (interfaceCode) query = query.andWhere({ interfaceCode });

    // Get the SQL query string and bindings
    const { sql, bindings } = knexToSQL(query);

    return await this.executeQuery<ContractTable & MetadataTable>(sql, bindings as any[]);
  }

  public async searchContractWithMetadataByNameCount(
    name: string,
    type?: CONTRACT_TYPE,
    interfaceVersion?: string,
    interfaceCode?: string,
  ): Promise<number> {
    let query = queryBuilder
      .count('*')
      .from(DB_DATA_TABLE.CONTRACT)
      .innerJoin(
        DB_DATA_TABLE.METADATA,
        `${DB_DATA_TABLE.CONTRACT}.address`,
        `${DB_DATA_TABLE.METADATA}.address`,
      )
      .whereRaw(`LOWER(name) LIKE LOWER(?)`, [`%${name}%`]);

    if (type) query = query.andWhere({ type });
    if (interfaceVersion) query = query.andWhere({ interfaceVersion });
    if (interfaceCode) query = query.andWhere({ interfaceCode });

    // Get the SQL query string and bindings
    const { sql, bindings } = knexToSQL(query);

    return (await this.executeQuery<{ count: number }>(sql, bindings as any[]))[0].count;
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
