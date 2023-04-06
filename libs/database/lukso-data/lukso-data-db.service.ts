import { Injectable } from '@nestjs/common';
import { Pool, QueryResult } from 'pg';
import { LoggerService } from '@libs/logger/logger.service';
import winston from 'winston';
import format from 'pg-format';

import { DB_DATA_TABLE, LUKSO_DATA_CONNECTION_STRING } from './config';
import { ContractTable } from './entities/contract.table';
import { ContractTokenTable } from './entities/contract-token.table';
import { MetadataTable } from './entities/metadata.table';
import { MetadataImageTable } from './entities/metadata-image.table';
import { MetadataTagTable } from './entities/metadata-tag.table';
import { MetadataLinkTable } from './entities/metadata-link.table';
import { MetadataAssetTable } from './entities/metadata-asset.table';
import { DataChangedTable } from './entities/data-changed.table';
import { TransactionTable } from './entities/tx.table';
import { TxParameterTable } from './entities/tx-parameter.table';
import { TxInputTable } from './entities/tx-input.table';
import { EventTable } from './entities/event.table';
import { EventParameterTable } from './entities/event-parameter.table';
import { WrappedTxTable } from './entities/wrapped-tx.table';
import { WrappedTxParameterTable } from './entities/wrapped-tx-parameter.table';
import { WrappedTxInputTable } from './entities/wrapped-tx-input.table';

@Injectable()
export class LuksoDataDbService {
  private readonly client: Pool & {
    query: (query: string, values?: any[]) => Promise<QueryResult<any>>;
  };
  private readonly logger: winston.Logger;

  constructor(private readonly loggerService: LoggerService) {
    this.logger = this.loggerService.getChildLogger('LuksoDataDb');
    this.client = new Pool({
      connectionString: LUKSO_DATA_CONNECTION_STRING,
    });
  }

  // Contract table functions
  public async insertContract(
    contract: ContractTable,
    onConflict: 'throw' | 'update' | 'do nothing' = 'throw',
  ): Promise<void> {
    let query = `
    INSERT INTO ${DB_DATA_TABLE.CONTRACT}
    ("address", "interfaceCode", "interfaceVersion")
    VALUES ($1, $2, $3)
  `;

    if (onConflict === 'do nothing') query += ' ON CONFLICT DO NOTHING';
    else if (onConflict === 'update')
      query += ` ON CONFLICT ("address") DO UPDATE SET
        "interfaceCode" = EXCLUDED."interfaceCode",
        "interfaceVersion" = EXCLUDED."interfaceVersion"
    `;

    await this.executeQuery(query, [
      contract.address,
      contract.interfaceCode,
      contract.interfaceVersion,
    ]);
  }

  public async getContractByAddress(address: string): Promise<ContractTable | null> {
    const rows = await this.executeQuery<ContractTable>(
      `SELECT * FROM ${DB_DATA_TABLE.CONTRACT} WHERE "address" = $1`,
      [address],
    );
    return rows.length > 0 ? rows[0] : null;
  }

  public async getContractsToIndex(): Promise<string[]> {
    const rows = await this.executeQuery<ContractTable>(
      `SELECT * FROM ${DB_DATA_TABLE.CONTRACT} WHERE "interfaceCode" IS NULL`,
    );
    return rows.map((row) => row.address);
  }

  // ContractToken table functions
  public async insertContractToken(contractToken: ContractTokenTable): Promise<void> {
    await this.executeQuery(
      `
          INSERT INTO ${DB_DATA_TABLE.CONTRACT_TOKEN}
          VALUES ($1, $2, $3, $4, $5)
        `,
      [
        contractToken.id,
        contractToken.address,
        contractToken.index,
        contractToken.decodedTokenId,
        contractToken.tokenId,
      ],
    );
  }

  public async getContractTokenById(id: string): Promise<ContractTokenTable | null> {
    const rows = await this.executeQuery<ContractTokenTable>(
      `SELECT * FROM ${DB_DATA_TABLE.CONTRACT_TOKEN} WHERE "id" = $1`,
      [id],
    );
    return rows.length > 0 ? rows[0] : null;
  }

  // Metadata table functions
  public async insertMetadata(metadata: Omit<MetadataTable, 'id'>): Promise<{ id: number }> {
    const rows = await this.executeQuery<{ id: number }>(
      `
          INSERT INTO ${DB_DATA_TABLE.METADATA}
          ("address", "tokenId", "name", "symbol", "description", "isNFT")
          VALUES ($1, $2, $3, $4, $5, $6)
          RETURNING id;
        `,
      [
        metadata.address,
        metadata.tokenId,
        metadata.name,
        metadata.symbol,
        metadata.description,
        metadata.isNFT,
      ],
    );

    return { id: rows[0].id };
  }
  public async getMetadata(address: string, tokenId?: string): Promise<MetadataTable | null> {
    const query = `SELECT * FROM ${DB_DATA_TABLE.METADATA} WHERE "address" = $1 AND "tokenId"${
      tokenId ? '=$2' : ' IS NULL'
    }`;
    const queryParams = tokenId ? [address, tokenId] : [address];

    const rows = await this.executeQuery<MetadataTable>(query, queryParams);
    return rows.length > 0 ? rows[0] : null;
  }

  // MetadataImage table functions
  public async insertMetadataImages(
    metadataId: number,
    metadataImages: Omit<MetadataImageTable, 'metadataId'>[],
    onConflict: 'throw' | 'do nothing' = 'throw',
  ): Promise<void> {
    if (metadataImages.length === 0) return;

    const values = metadataImages.map((metadataImage) => [
      metadataId,
      metadataImage.url,
      metadataImage.width,
      metadataImage.height,
      metadataImage.type,
      metadataImage.hash,
    ]);

    const conflictAction = onConflict === 'do nothing' ? 'ON CONFLICT DO NOTHING' : '';

    const query = format(
      `
    INSERT INTO %I
    ("metadataId", "url", "width", "height", "type", "hash")
    VALUES %L
    %s
  `,
      DB_DATA_TABLE.METADATA_IMAGE,
      values,
      conflictAction,
    );

    await this.executeQuery(query);
  }

  // MetadataLink table functions
  public async insertMetadataLinks(
    metadataId: number,
    metadataLinks: Omit<MetadataLinkTable, 'metadataId'>[],
    onConflict: 'throw' | 'do nothing' = 'throw',
  ): Promise<void> {
    if (metadataLinks.length === 0) return;

    const values = metadataLinks.map((metadataLink) => [
      metadataId,
      metadataLink.title,
      metadataLink.url,
    ]);

    const conflictAction = onConflict === 'do nothing' ? 'ON CONFLICT DO NOTHING' : '';

    const query = format(
      `
      INSERT INTO %I
      ("metadataId", "title", "url")
      VALUES %L
      %s
    `,
      DB_DATA_TABLE.METADATA_LINK,
      values,
      conflictAction,
    );

    await this.executeQuery(query);
  }

  // MetadataTag table functions
  public async insertMetadataTags(
    metadataId: number,
    metadataTags: string[],
    onConflict: 'throw' | 'do nothing' = 'throw',
  ): Promise<void> {
    if (metadataTags.length === 0) return;

    const values = metadataTags.map((metadataTag) => [metadataId, metadataTag]);

    const conflictAction = onConflict === 'do nothing' ? 'ON CONFLICT DO NOTHING' : '';

    const query = format(
      `
      INSERT INTO %I
      ("metadataId", "title")
      VALUES %L
      %s
    `,
      DB_DATA_TABLE.METADATA_TAG,
      values,
      conflictAction,
    );

    await this.executeQuery(query);
  }

  public async getMetadataTagsByMetadataId(metadataId: number): Promise<string[]> {
    const rows = await this.executeQuery<MetadataTagTable>(
      `SELECT * FROM ${DB_DATA_TABLE.METADATA_TAG} WHERE "metadataId" = $1`,
      [metadataId],
    );
    return rows.map((r) => r.title);
  }

  // MetadataAsset table functions
  public async insertMetadataAssets(
    metadataId: number,
    metadataAssets: Omit<MetadataAssetTable, 'metadataId'>[],
    onConflict: 'throw' | 'do nothing' = 'throw',
  ): Promise<void> {
    if (metadataAssets.length === 0) return;

    const values = metadataAssets.map((metadataAsset) => [
      metadataId,
      metadataAsset.url,
      metadataAsset.fileType,
      metadataAsset.hash,
    ]);

    const conflictAction = onConflict === 'do nothing' ? 'ON CONFLICT DO NOTHING' : '';

    const query = format(
      `
      INSERT INTO %I
      ("metadataId", "url", "fileType", "hash")
      VALUES %L
      %s
    `,
      DB_DATA_TABLE.METADATA_ASSET,
      values,
      conflictAction,
    );

    await this.executeQuery(query);
  }

  public async getMetadataAssetsByMetadataId(metadataId: number): Promise<MetadataAssetTable[]> {
    return await this.executeQuery<MetadataAssetTable>(
      `SELECT * FROM ${DB_DATA_TABLE.METADATA_ASSET} WHERE "metadataId" = $1`,
      [metadataId],
    );
  }

  // DataChanged table functions
  public async insertDataChanged(dataChanged: DataChangedTable): Promise<void> {
    await this.executeQuery(
      `
      INSERT INTO ${DB_DATA_TABLE.DATA_CHANGED}
      ("address", "key", "value", "blockNumber")
      VALUES ($1, $2, $3, $4)
    `,
      [dataChanged.address, dataChanged.key, dataChanged.value, dataChanged.blockNumber],
    );
  }

  public async getDataChangedHistoryByAddressAndKey(
    address: string,
    key: string,
  ): Promise<DataChangedTable[]> {
    return await this.executeQuery<DataChangedTable>(
      `SELECT * FROM ${DB_DATA_TABLE.DATA_CHANGED} WHERE "address" = $1 AND "key" = $2`,
      [address, key],
    );
  }

  // Transaction table functions
  public async insertTransaction(transaction: TransactionTable): Promise<void> {
    await this.executeQuery(
      `
      INSERT INTO ${DB_DATA_TABLE.TRANSACTION}
      ("hash", "nonce", "blockHash", "blockNumber", "transactionIndex", "methodId", "methodName", "from", "to", "value", "gasPrice", "gas") VALUES
      ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)
    `,
      [
        transaction.hash,
        transaction.nonce,
        transaction.blockHash,
        transaction.blockNumber,
        transaction.transactionIndex,
        transaction.methodId,
        transaction.methodName,
        transaction.from,
        transaction.to,
        transaction.value,
        transaction.gasPrice,
        transaction.gas,
      ],
    );
  }

  public async getTransactionByHash(hash: string): Promise<TransactionTable | null> {
    const rows = await this.executeQuery<TransactionTable>(
      `SELECT * FROM ${DB_DATA_TABLE.TRANSACTION} WHERE "hash" = $1`,
      [hash],
    );
    return rows.length > 0 ? rows[0] : null;
  }

  // TransactionInput table functions
  public async insertTransactionInput(transactionInput: TxInputTable): Promise<void> {
    await this.executeQuery(
      `
      INSERT INTO ${DB_DATA_TABLE.TRANSACTION_INPUT}
      ("transactionHash", "input")
      VALUES ($1, $2)
    `,
      [transactionInput.transactionHash, transactionInput.input],
    );
  }

  public async getTransactionInput(transactionHash: string): Promise<string | null> {
    const rows = await this.executeQuery<TxInputTable>(
      `SELECT input FROM ${DB_DATA_TABLE.TRANSACTION_INPUT} WHERE "transactionHash" = $1`,
      [transactionHash],
    );
    return rows.length > 0 ? rows[0].input : null;
  }

  // TransactionParameter table functions
  public async insertTransactionParameter(transactionParameter: TxParameterTable): Promise<void> {
    await this.executeQuery(
      `
      INSERT INTO ${DB_DATA_TABLE.TRANSACTION_PARAMETER}
      VALUES ($1, $2, $3, $4, $5)
    `,
      [
        transactionParameter.transactionHash,
        transactionParameter.value,
        transactionParameter.name,
        transactionParameter.type,
        transactionParameter.position,
      ],
    );
  }

  public async getTransactionParameters(transactionHash: string): Promise<TxParameterTable[]> {
    return await this.executeQuery<TxParameterTable>(
      `SELECT * FROM ${DB_DATA_TABLE.TRANSACTION_PARAMETER} WHERE "transactionHash" = $1`,
      [transactionHash],
    );
  }

  // Wrapped Transaction table functions
  public async insertWrappedTx(
    wrappedTransaction: Omit<WrappedTxTable, 'id'>,
  ): Promise<{ id: number }> {
    const rows = await this.executeQuery<{ id: number }>(
      `
    INSERT INTO ${DB_DATA_TABLE.WRAPPED_TRANSACTION}
    ("parentTransactionHash", "parentId", "from", "to", "value", "methodId", "methodName")
    VALUES ($1, $2, $3, $4, $5, $6, $7)
    RETURNING id
  `,
      [
        wrappedTransaction.parentTransactionHash,
        wrappedTransaction.parentId,
        wrappedTransaction.from,
        wrappedTransaction.to,
        wrappedTransaction.value,
        wrappedTransaction.methodId,
        wrappedTransaction.methodName,
      ],
    );

    return { id: rows[0].id };
  }

  public async getWrappedTxById(id: number): Promise<WrappedTxTable | null> {
    const rows = await this.executeQuery<WrappedTxTable>(
      `SELECT * FROM ${DB_DATA_TABLE.WRAPPED_TRANSACTION} WHERE "id" = $1`,
      [id],
    );
    return rows.length > 0 ? rows[0] : null;
  }

  // Wrapped Transaction Input table functions
  public async insertWrappedTxInput(wrappedTransactionInput: WrappedTxInputTable): Promise<void> {
    await this.executeQuery(
      `
    INSERT INTO ${DB_DATA_TABLE.WRAPPED_TRANSACTION_INPUT}
    ("wrappedTransactionId", "input")
    VALUES ($1, $2)
  `,
      [wrappedTransactionInput.wrappedTransactionId, wrappedTransactionInput.input],
    );
  }

  public async getWrappedTxInputById(wrappedTransactionId: number): Promise<string | null> {
    const rows = await this.executeQuery<WrappedTxInputTable>(
      `SELECT input FROM ${DB_DATA_TABLE.WRAPPED_TRANSACTION_INPUT} WHERE "wrappedTransactionId" = $1`,
      [wrappedTransactionId],
    );
    return rows.length > 0 ? rows[0].input : null;
  }

  // Wrapped Transaction Parameter table functions
  public async insertWrappedTxParameter(
    wrappedTransactionParameter: WrappedTxParameterTable,
  ): Promise<void> {
    await this.executeQuery(
      `
    INSERT INTO ${DB_DATA_TABLE.WRAPPED_TRANSACTION_PARAMETER}
    ("wrappedTransactionId", "value", "name", "type", "position")
    VALUES ($1, $2, $3, $4, $5)
  `,
      [
        wrappedTransactionParameter.wrappedTransactionId,
        wrappedTransactionParameter.value,
        wrappedTransactionParameter.name,
        wrappedTransactionParameter.type,
        wrappedTransactionParameter.position,
      ],
    );
  }

  public async getWrappedTxParameters(
    wrappedTransactionId: number,
  ): Promise<WrappedTxParameterTable[]> {
    return await this.executeQuery<WrappedTxParameterTable>(
      `SELECT * FROM ${DB_DATA_TABLE.WRAPPED_TRANSACTION_PARAMETER} WHERE "wrappedTransactionId" = $1`,
      [wrappedTransactionId],
    );
  }

  // Event table functions
  public async insertEvent(event: EventTable): Promise<void> {
    await this.executeQuery(
      `
      INSERT INTO ${DB_DATA_TABLE.EVENT}
      ("id", "blockNumber", "transactionHash", "logIndex", "address", "eventName", "methodId", "topic0", "topic1", "topic2", "topic3", "data")
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)
    `,
      [
        event.id,
        event.blockNumber,
        event.transactionHash,
        event.logIndex,
        event.address,
        event.eventName,
        event.methodId,
        event.topic0,
        event.topic1,
        event.topic2,
        event.topic3,
        event.data,
      ],
    );
  }

  public async getEventById(id: string): Promise<EventTable | null> {
    const rows = await this.executeQuery<EventTable>(
      `SELECT * FROM ${DB_DATA_TABLE.EVENT} WHERE "id" = $1`,
      [id],
    );
    return rows.length > 0 ? rows[0] : null;
  }

  // EventParameter table functions
  public async insertEventParameters(
    eventId: string,
    eventParameters: Omit<EventParameterTable, 'eventId'>[],
    onConflict: 'throw' | 'do nothing' = 'throw',
  ): Promise<void> {
    if (eventParameters.length === 0) return;

    const values = eventParameters.map((eventParameter) => [
      eventId,
      eventParameter.value,
      eventParameter.name,
      eventParameter.type,
      eventParameter.position,
    ]);

    const conflictAction = onConflict === 'do nothing' ? 'ON CONFLICT DO NOTHING' : '';

    const query = format(
      `
        INSERT INTO %I
        ("eventId", "value", "name", "type", "position")
        VALUES %L
        %s
      `,
      DB_DATA_TABLE.EVENT_PARAMETER,
      values,
      conflictAction,
    );

    await this.executeQuery(query);
  }

  public async getEventParameters(eventId: string): Promise<EventParameterTable[]> {
    return await this.executeQuery<EventParameterTable>(
      `SELECT * FROM ${DB_DATA_TABLE.EVENT_PARAMETER} WHERE "eventId" = $1`,
      [eventId],
    );
  }

  private async executeQuery<T>(query: string, values?: any[]): Promise<T[]> {
    try {
      const result = await this.client.query(query, values);
      return result.rows as T[];
    } catch (error) {
      // Log the error and rethrow a custom error with a more specific message
      this.logger.error('Error executing a query', { query, values, error });
      throw new Error(`Error executing query: ${query}\n\nError details: ${error.message}`);
    }
  }
}
