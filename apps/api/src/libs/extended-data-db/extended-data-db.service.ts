import knex, { Knex } from 'knex';
import { LoggerService } from '@libs/logger/logger.service';
import { LuksoDataDbService } from '@db/lukso-data/lukso-data-db.service';
import { ContractTable } from '@db/lukso-data/entities/contract.table';
import { DB_DATA_TABLE } from '@db/lukso-data/config';
import { MetadataTable } from '@db/lukso-data/entities/metadata.table';
import { MetadataImageTable } from '@db/lukso-data/entities/metadata-image.table';
import { WrappedTxTable } from '@db/lukso-data/entities/wrapped-tx.table';
import { knexToSQL } from '@db/utils/knexToSQL';
import { CONTRACT_TYPE } from '@models/enums';
import { isPartialEthereumAddress } from '@utils/is-ethereum-address';
import { ContractTokenTable } from '@db/lukso-data/entities/contract-token.table';

const queryBuilder = knex({ client: 'pg' });

type TokenWithMetadata = ContractTokenTable &
  ContractTable &
  MetadataTable & {
    collectionName: string | null;
    collectionDescription: string | null;
    collectionSymbol: string | null;
  };

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

  public async searchContractWithMetadata(
    limit: number,
    offset: number,
    input?: string,
    type?: CONTRACT_TYPE,
    interfaceVersion?: string,
    interfaceCode?: string,
    tag?: string,
    havePermissions?: string,
  ): Promise<(ContractTable & MetadataTable)[]> {
    const query = this.buildAddressSearchQuery(
      input,
      type,
      interfaceVersion,
      interfaceCode,
      tag,
      havePermissions,
    )
      .select('*')
      .orderBy(`${DB_DATA_TABLE.METADATA}.name`, 'asc')
      .orderBy(`${DB_DATA_TABLE.CONTRACT}.address`, 'asc')
      .limit(limit)
      .offset(offset);

    // Get the SQL query string and bindings
    const { sql, bindings } = knexToSQL(query);

    // Execute the query
    return await this.executeQuery<ContractTable & MetadataTable>(sql, bindings as any[]);
  }

  public async searchContractCount(
    input?: string,
    type?: CONTRACT_TYPE,
    interfaceVersion?: string,
    interfaceCode?: string,
    tag?: string,
    havePermissions?: string,
  ): Promise<number> {
    const query = this.buildAddressSearchQuery(
      input,
      type,
      interfaceVersion,
      interfaceCode,
      tag,
      havePermissions,
    ).count('*');

    // Get the SQL query string and bindings
    const { sql, bindings } = knexToSQL(query);

    // Execute the query
    return (await this.executeQuery<{ count: number }>(sql, bindings as any[]))[0].count;
  }

  private buildAddressSearchQuery(
    input?: string,
    type?: CONTRACT_TYPE,
    interfaceVersion?: string,
    interfaceCode?: string,
    tag?: string,
    havePermissions?: string,
  ): Knex.QueryBuilder {
    const query = queryBuilder
      .from(DB_DATA_TABLE.CONTRACT)
      .innerJoin(
        DB_DATA_TABLE.METADATA,
        `${DB_DATA_TABLE.CONTRACT}.address`,
        `${DB_DATA_TABLE.METADATA}.address`,
      );

    if (input && isPartialEthereumAddress(input))
      query.whereRaw(`LOWER(${DB_DATA_TABLE.CONTRACT}.address) LIKE LOWER(?)`, [`%${input}%`]);
    else if (input)
      query.whereRaw(`LOWER(${DB_DATA_TABLE.METADATA}.name) LIKE LOWER(?)`, [`%${input}%`]);
    if (havePermissions) {
      const subQuery = `
      SELECT erc725y_data_changed.address, 
             erc725y_data_changed.key,
             erc725y_data_changed.value,
             ROW_NUMBER() OVER (PARTITION BY erc725y_data_changed.address 
             ORDER BY erc725y_data_changed."blockNumber" DESC) as rn
      FROM erc725y_data_changed
      WHERE LOWER(erc725y_data_changed.key) = LOWER(?)
    `;

      query
        .innerJoin(
          queryBuilder.raw(
            `(${subQuery}) AS latest_data ON ${DB_DATA_TABLE.CONTRACT}.address = latest_data.address`,
            [`0x4b80742de2bf82acb3630000${havePermissions.slice(2)}`],
          ),
        )
        .whereRaw(
          `latest_data.rn = 1 AND latest_data.value != '0x0000000000000000000000000000000000000000000000000000000000000000'`,
        );
    }
    if (tag)
      query
        .innerJoin(
          DB_DATA_TABLE.METADATA_TAG,
          `${DB_DATA_TABLE.METADATA}.id`,
          `${DB_DATA_TABLE.METADATA_TAG}.metadataId`,
        )
        .whereRaw(`LOWER(${DB_DATA_TABLE.METADATA_TAG}.title) LIKE LOWER(?)`, [`%${tag}%`]);
    if (type) query.andWhere({ type });
    if (interfaceVersion) query.andWhere({ interfaceVersion });
    if (interfaceCode) query.andWhere({ interfaceCode });

    return query;
  }

  public async searchTokenWithMetadata(
    limit: number,
    offset: number,
    addressInput?: string,
    collectionName?: string,
    collectionSymbol?: string,
    input?: string,
    interfaceCode?: string,
    interfaceVersion?: string,
    owner?: string,
  ): Promise<TokenWithMetadata[]> {
    const query = queryBuilder
      .select(
        'ct.*',
        'c.*',
        'm1.*',
        'm2.name as collectionName',
        'm2.description as collectionDescription',
        'm2.symbol as collectionSymbol',
      )
      .from(`${DB_DATA_TABLE.CONTRACT_TOKEN} as ct`)
      .innerJoin(`${DB_DATA_TABLE.METADATA} as m1`, function () {
        this.on('ct.address', 'm1.address').andOn('ct.tokenId', 'm1.tokenId');
      })
      .innerJoin(`${DB_DATA_TABLE.CONTRACT} as c`, 'ct.address', 'c.address')
      .innerJoin(`${DB_DATA_TABLE.METADATA} as m2`, function () {
        this.on('ct.address', '=', 'm2.address').andOnNull('m2.tokenId');
      })
      .orderBy('ct.address', 'asc')
      .orderBy('m2.name', 'asc')
      .orderBy('ct.tokenId', 'asc')
      .limit(limit)
      .offset(offset);

    if (addressInput) query.whereRaw('ct.address LIKE LOWER(?)', [`%${addressInput}%`]);
    if (input)
      query.whereRaw(
        'CONCAT(LOWER(m1.name), ct."tokenId", LOWER(ct."decodedTokenId")) LIKE LOWER(?)',
        [`%${input}%`],
      );
    if (collectionName) query.whereRaw('LOWER(m2.name) LIKE LOWER(?)', [`%${collectionName}%`]);
    if (collectionSymbol)
      query.whereRaw('LOWER(m2.symbol) LIKE LOWER(?)', [`%${collectionSymbol}%`]);
    if (interfaceVersion) query.andWhere({ interfaceVersion });
    if (interfaceCode) query.andWhere({ interfaceCode });
    if (owner) query.andWhere('ct.latestKnownOwner', owner);

    // Get the SQL query string and bindings
    const { sql, bindings } = knexToSQL(query);

    // Execute the query
    return await this.executeQuery<TokenWithMetadata>(sql, bindings as any[]);
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
