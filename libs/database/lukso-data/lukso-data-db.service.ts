import { Injectable, OnModuleDestroy } from '@nestjs/common';
import { Pool, QueryResult } from 'pg';
import { LoggerService } from '@libs/logger/logger.service';
import winston from 'winston';
import format from 'pg-format';
import { TokenHolderTable } from '@db/lukso-data/entities/token-holder.table';
import { DecodedParameter } from 'apps/indexer/src/decoding/types/decoded-parameter';

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

type TransactionWithInput = {
  transactionHash: string;
  input: string;
  hash: string;
  nonce: number;
  blockHash: string;
  blockNumber: number;
  date: string;
  transactionIndex: number;
  methodId: string;
  methodName?: string;
  from: string;
  to: string;
  value: string;
  gasPrice: string;
  gas: number;
};

// type DecodedMethod = {
//   methodName: string;
//   parameters: DecodedParameter[];
// };

type DecodedData = {
  parameters: DecodedParameter[];
  methodName: string;
};

interface DecodedEventData {
  eventName: string;
  parameters: DecodedParameter[];
}

@Injectable()
export class LuksoDataDbService implements OnModuleDestroy {
  protected readonly client: Pool & {
    query: (query: string, values?: any[]) => Promise<QueryResult<any>>;
  };
  protected readonly logger: winston.Logger;

  constructor(protected readonly loggerService: LoggerService) {
    this.logger = this.loggerService.getChildLogger('LuksoDataDb');
    this.client = new Pool({
      connectionString: LUKSO_DATA_CONNECTION_STRING,
    });
  }

  async onModuleDestroy() {
    await this.disconnect();
  }

  public async disconnect() {
    await this.client.end();
  }

  // Contract table functions
  public async insertContract(
    contract: ContractTable,
    onConflict: 'throw' | 'update' | 'do nothing' = 'throw',
  ): Promise<void> {
    let query = `
    INSERT INTO ${DB_DATA_TABLE.CONTRACT}
    ("address", "interfaceCode", "interfaceVersion", "type")
    VALUES ($1, $2, $3, $4)
  `;

    if (onConflict === 'do nothing') query += ' ON CONFLICT DO NOTHING';
    else if (onConflict === 'update')
      query += ` ON CONFLICT ("address") DO UPDATE SET
        "interfaceCode" = EXCLUDED."interfaceCode",
        "interfaceVersion" = EXCLUDED."interfaceVersion",
        "type" = EXCLUDED."type"
    `;

    await this.executeQuery(query, [
      contract.address,
      contract.interfaceCode,
      contract.interfaceVersion,
      contract.type,
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

  public async getTokensToIndex(): Promise<ContractTokenTable[]> {
    return await this.executeQuery<ContractTokenTable>(
      `SELECT * FROM ${DB_DATA_TABLE.CONTRACT_TOKEN} WHERE "decodedTokenId" IS NULL`,
    );
  }

  // ContractToken table functions
  public async insertContractToken(
    contractToken: Omit<ContractTokenTable, 'index'>,
    onConflict: 'throw' | 'update' | 'do nothing' = 'throw',
  ): Promise<void> {
    let query = `
          INSERT INTO ${DB_DATA_TABLE.CONTRACT_TOKEN} (id, address, "decodedTokenId", "tokenId", "interfaceCode", "latestKnownOwner")
          VALUES ($1, $2, $3, $4, $5, $6)
        `;
    if (onConflict === 'do nothing') query += ' ON CONFLICT DO NOTHING';
    else if (onConflict === 'update') {
      query += ` ON CONFLICT ("id") DO UPDATE SET
        "interfaceCode" = EXCLUDED."interfaceCode"`;
      if (contractToken.decodedTokenId) query += `,"decodedTokenId" = EXCLUDED."decodedTokenId"`;
      if (contractToken.latestKnownOwner)
        query += `,"latestKnownOwner" = EXCLUDED."latestKnownOwner"`;
    }

    await this.executeQuery(query, [
      contractToken.id,
      contractToken.address,
      contractToken.decodedTokenId,
      contractToken.tokenId,
      contractToken.interfaceCode,
      contractToken.latestKnownOwner,
    ]);
  }

  public async insertTokenHolder(
    tokenHolder: TokenHolderTable, // 'balanceInEth' is not supplied, hence we omit it
    onConflict: 'throw' | 'update' | 'do nothing' = 'throw',
  ): Promise<void> {
    let query = `
          INSERT INTO ${DB_DATA_TABLE.TOKEN_HOLDER} ("holderAddress", "contractAddress", "tokenId", "balanceInWei", "balanceInEth", "holderSinceBlock")
          VALUES ($1, $2, $3, $4, $5, $6)
        `;

    try {
      await this.executeQuery(query, [
        tokenHolder.holderAddress,
        tokenHolder.contractAddress,
        tokenHolder.tokenId,
        tokenHolder.balanceInWei,
        tokenHolder.balanceInEth,
        tokenHolder.holderSinceBlock,
      ]);
    } catch (error) {
      if (onConflict === 'do nothing' && JSON.stringify(error.message).includes('duplicate')) {
        // Do nothing
      } else if (onConflict === 'update' && JSON.stringify(error.message).includes('duplicate')) {
        query = `
          UPDATE ${DB_DATA_TABLE.TOKEN_HOLDER} 
          SET "balanceInWei" = $4, "balanceInEth" = $5
          WHERE "holderAddress" = $1 AND "contractAddress" = $2 
          AND (("tokenId" = $3 AND $3 IS NOT NULL) OR ("tokenId" IS NULL AND $3 IS NULL));
        `;

        await this.executeQuery(query, [
          tokenHolder.holderAddress,
          tokenHolder.contractAddress,
          tokenHolder.tokenId,
          tokenHolder.balanceInWei,
          tokenHolder.balanceInEth,
        ]);
      } else {
        // If some other error occurred, rethrow it
        throw error;
      }
    }
  }

  public async getContractTokenById(id: string): Promise<ContractTokenTable | null> {
    const rows = await this.executeQuery<ContractTokenTable>(
      `SELECT * FROM ${DB_DATA_TABLE.CONTRACT_TOKEN} WHERE "id" = $1`,
      [id],
    );
    return rows.length > 0 ? rows[0] : null;
  }

  // Metadata table functions
  public async insertMetadata(
    metadata: Omit<MetadataTable, 'id'>,
    onConflict: 'throw' | 'update' | 'do nothing' = 'throw',
  ): Promise<{ id: number }> {
    let query = `
        INSERT INTO ${DB_DATA_TABLE.METADATA}
        ("address", "tokenId", "name", "symbol", "description", "isNFT")
        VALUES ($1, $2, $3, $4, $5, $6)
        RETURNING id;
      `;

    let rows;
    try {
      rows = await this.executeQuery(query, [
        metadata.address,
        metadata.tokenId,
        metadata.name,
        metadata.symbol,
        metadata.description,
        metadata.isNFT,
      ]);
    } catch (error) {
      if (onConflict === 'do nothing' && JSON.stringify(error.message).includes('duplicate')) {
        const id = (await this.getMetadata(metadata.address, metadata.tokenId || undefined))?.id;
        if (!id) throw new Error('Could not get id of metadata');
        else return { id };
      } else if (onConflict === 'update' && JSON.stringify(error.message).includes('duplicate')) {
        query = `
        UPDATE ${DB_DATA_TABLE.METADATA}
        SET "name" = $3, "symbol" = $4, "description" = $5, "isNFT" = $6
        WHERE "address" = $1 AND 
        (("tokenId" = $2 AND $2 IS NOT NULL) OR ("tokenId" IS NULL AND $2 IS NULL))
          RETURNING id;
      `;

        rows = await this.executeQuery(query, [
          metadata.address,
          metadata.tokenId,
          metadata.name,
          metadata.symbol,
          metadata.description,
          metadata.isNFT,
        ]);
      } else {
        // If some other error occurred, rethrow it
        throw error;
      }
    }
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

  public async getTokenHolder(
    holderAddress: string,
    contractAddress: string,
    tokenId?: string | null,
  ): Promise<TokenHolderTable | null> {
    const query = `SELECT * FROM ${
      DB_DATA_TABLE.TOKEN_HOLDER
    } WHERE "holderAddress" = $1 AND "contractAddress" = $2 AND "tokenId"${
      tokenId ? '=$3' : ' IS NULL'
    }`;
    const queryParams = tokenId
      ? [holderAddress, contractAddress, tokenId]
      : [holderAddress, contractAddress];

    const rows = await this.executeQuery<TokenHolderTable>(query, queryParams);
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

  public async getMetadataLinks(metadataId: number): Promise<MetadataLinkTable[]> {
    return await this.executeQuery<MetadataLinkTable>(
      `SELECT * FROM ${DB_DATA_TABLE.METADATA_LINK} WHERE "metadataId" = $1`,
      [metadataId],
    );
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

  public async getMetadataAssetsByMetadataId(
    metadataId: number,
    fileType?: string,
  ): Promise<MetadataAssetTable[]> {
    let query = `SELECT * FROM ${DB_DATA_TABLE.METADATA_ASSET} WHERE "metadataId" = $1`;
    const params: any[] = [metadataId];
    if (fileType) {
      params.push(fileType);
      query += ` AND "fileType" = $2`;
    }
    return await this.executeQuery<MetadataAssetTable>(query, params);
  }

  // DataChanged table functions
  public async insertDataChanged(dataChanged: DataChangedTable): Promise<void> {
    await this.executeQuery(
      `
      INSERT INTO ${DB_DATA_TABLE.ERC725Y_DATA_CHANGED}
      ("address", "key", "value", "decodedValue", "blockNumber")
      VALUES ($1, $2, $3, $4, $5)
    `,
      [
        dataChanged.address,
        dataChanged.key,
        dataChanged.value,
        dataChanged.decodedValue,
        dataChanged.blockNumber,
      ],
    );
  }

  public async getDataChangedHistoryByAddressAndKey(
    address: string,
    key: string,
  ): Promise<DataChangedTable[]> {
    return await this.executeQuery<DataChangedTable>(
      `SELECT * FROM ${DB_DATA_TABLE.ERC725Y_DATA_CHANGED} WHERE "address" = $1 AND "key" = $2`,
      [address, key],
    );
  }

  // Transaction table functions
  public async insertTransaction(transaction: TransactionTable): Promise<void> {
    await this.executeQuery(
      `
      INSERT INTO ${DB_DATA_TABLE.TRANSACTION}
      ("hash", "nonce", "blockHash", "blockNumber", "date", "transactionIndex", "methodId", "methodName", "from", "to", "value", "gasPrice", "gas") VALUES
      ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13)
    `,
      [
        transaction.hash,
        transaction.nonce,
        transaction.blockHash,
        transaction.blockNumber,
        transaction.date,
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
  public async insertTransactionParameters(
    transactionHash: string,
    transactionParameters: Omit<TxParameterTable, 'transactionHash'>[],
    onConflict: 'throw' | 'do nothing' = 'throw',
  ): Promise<void> {
    if (transactionParameters.length === 0) return;

    const values = transactionParameters.map((transactionParameter) => [
      transactionHash,
      `${transactionParameter.value}`,
      transactionParameter.name,
      transactionParameter.type,
      transactionParameter.position,
    ]);

    const conflictAction = onConflict === 'do nothing' ? 'ON CONFLICT DO NOTHING' : '';

    const query = format(
      `
    INSERT INTO %I
    ("transactionHash", "value", "name", "type", "position")
    VALUES %L
    %s
  `,
      DB_DATA_TABLE.TRANSACTION_PARAMETER,
      values,
      conflictAction,
    );

    await this.executeQuery(query);
  }

  public async getTransactionParameters(transactionHash: string): Promise<TxParameterTable[]> {
    return await this.executeQuery<TxParameterTable>(
      `SELECT * FROM ${DB_DATA_TABLE.TRANSACTION_PARAMETER} WHERE "transactionHash" = $1`,
      [transactionHash],
    );
  }

  public async updateTransactionWithDecodedMethod(
    transactionHash: string,
    decodedMethod: DecodedData,
  ): Promise<void> {
    const { methodName, parameters } = decodedMethod;
    //loop through all the new parameters and update the transactionParameter table
    await this.executeQuery(
      `
    UPDATE ${DB_DATA_TABLE.TRANSACTION}
    SET "methodName" = $1
    WHERE "hash" = $2
  `,
      [methodName, transactionHash],
    );
    this.insertTransactionParameters(transactionHash, parameters, 'do nothing');
  }

  public updateWrappedTransactionWithDecodedMethod = (hash, decodedData) => {
    //TODO: implement this
    console.log('updateWrappedTransactionWithDecodedMethod', hash, decodedData);
  };
  //TransactionParameter and TransactionInput table functions

  // Select all transactions that have not been decoded yet and have an input field
  public async fetchNonDecodedTransactionsWithInput(): Promise<TransactionWithInput[]> {
    const sql = `
      -- The purpose of this query is two-fold:
      -- 
      -- 1. There are cases where the decoding process identifies a known method 
      --    but does not decode its parameters (due to an unexpected data format 
      --    or other transient errors). We want to capture such transactions where 
      --    the methodName exists, but the associated parameters have blank values 
      --    to facilitate a re-attempt at decoding or further inspection.
      -- 
      -- 2. In some instances, the decoding process may fail to identify a known method 
      --    altogether, resulting in a blank methodName, but there still exists raw 
      --    transaction input data. Fetching these transactions helps in identifying 
      --    potential updates to the decoding logic or additions to the method interface 
      --    library.

      -- Fetching transactions with blank methodName but with transaction data
      (SELECT t.*, ti.input, NULL AS name, NULL AS type, NULL AS position 
       FROM "transaction" t
       JOIN "transaction_input" ti ON t."hash" = ti."transactionHash"
       WHERE t."methodName" IS NULL AND ti.input IS NOT NULL)
      
      UNION 
      
      -- Fetching transactions with at least one blank parameter value
      (SELECT t.*, ti.input, tp.name, tp.type, tp.position 
       FROM "transaction" t
       JOIN "transaction_input" ti ON t."hash" = ti."transactionHash"
       JOIN "transaction_parameter" tp ON t."hash" = tp."transactionHash"
       WHERE tp."value" = '')
      
      ORDER BY "hash";
    `;
    return await this.executeQuery(sql);
  }

  // Wrapped Transaction table functions
  public async insertWrappedTx(
    wrappedTransaction: Omit<WrappedTxTable, 'id'>,
  ): Promise<{ id: number }> {
    const rows = await this.executeQuery<{ id: number }>(
      `
    INSERT INTO ${DB_DATA_TABLE.WRAPPED_TRANSACTION}
    ("transactionHash", "parentId", "blockNumber", "from", "to", "value", "methodId", "methodName")
    VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
    RETURNING id
  `,
      [
        wrappedTransaction.transactionHash,
        wrappedTransaction.parentId,
        wrappedTransaction.blockNumber,
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

  public async fetchNonDecodedWrapped(): Promise<any[]> {
    try {
      // SQL to fetch the non-decoded wrapped transactions with their input
      const sql = `
      -- Fetching wrapped transactions with blank methodId but with transaction data
      (SELECT t1.*, ti1.input 
       FROM wrapped_transaction t1
       JOIN wrapped_transaction_input ti1 ON t1.id = ti1."wrappedTransactionId"
       WHERE t1."methodId" IS NULL AND ti1.input IS NOT NULL)
      
      UNION 
      
      -- Fetching wrapped transactions with at least one blank parameter value
      (SELECT t2.*, ti2.input 
       FROM wrapped_transaction t2
       JOIN wrapped_transaction_input ti2 ON t2.id = ti2."wrappedTransactionId"
       JOIN wrapped_transaction_parameter tp ON t2.id = tp."wrappedTransactionId"
       WHERE tp.value = '')
      
      ORDER BY id;      
      `;

      // Execute the query
      const rows = await this.executeQuery(sql, []);
      return rows;
    } catch (error) {
      this.logger.error('Error fetching non-decoded wrapped transactions with input:', error);
      throw error;
    }
  }

  public updateDecodedWrappedTransaction = (hash: any, decodedData: any) => {
    // console.log('updateWrappedTransactionWithDecodedMethod', hash, decodedData);
    //Update the main wrapped transaction table with the decoded method name
    //and then update the param table with the insertWrappedTxParameters function
  };

  // Wrapped Transaction Parameter table functions
  public async insertWrappedTxParameters(
    wrappedTransactionId: number,
    wrappedTransactionParameters: Omit<WrappedTxParameterTable, 'wrappedTransactionId'>[],
    onConflict: 'throw' | 'do nothing' = 'throw',
  ): Promise<void> {
    if (wrappedTransactionParameters.length === 0) return;

    const values = wrappedTransactionParameters.map((wrappedTransactionParameter) => [
      wrappedTransactionId,
      `${wrappedTransactionParameter.value}`,
      wrappedTransactionParameter.name,
      wrappedTransactionParameter.type,
      wrappedTransactionParameter.position,
    ]);

    const conflictAction = onConflict === 'do nothing' ? 'ON CONFLICT DO NOTHING' : '';

    const query = format(
      `
    INSERT INTO %I
    ("wrappedTransactionId", "value", "name", "type", "position")
    VALUES %L
    %s
  `,
      DB_DATA_TABLE.WRAPPED_TRANSACTION_PARAMETER,
      values,
      conflictAction,
    );

    await this.executeQuery(query);
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
      ("id", "blockNumber", "date", "transactionHash", "logIndex", "address", "eventName", "methodId", "topic0", "topic1", "topic2", "topic3", "data")
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13)
    `,
      [
        event.id,
        event.blockNumber,
        event.date,
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
      `${eventParameter.value}`,
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
  //General Event and EventParameter table functions
  async updateEventWithDecodedData(hash: string, decodedData: DecodedEventData): Promise<void> {
    try {
      // Get the existing event using its hash
      const existingEvent = await this.getEventById(hash);

      // If the event exists and needs updating
      if (existingEvent && !existingEvent.eventName) {
        existingEvent.eventName = decodedData.eventName;
        await this.insertEvent(existingEvent);

        // For each parameter in decoded data
        for (const param of decodedData.parameters) {
          // Get the parameters for the existing event
          const existingParameters = await this.getEventParameters(hash);

          // Find if this parameter exists
          const existingParam = existingParameters.find(
            (p) => p.name === param.name && p.position === param.position,
          );

          // If the parameter exists, update its value
          if (existingParam) {
            existingParam.value = param.value;
            // Using the insert function, assuming it has UPSERT behavior
            await this.insertEventParameters(hash, [existingParam]);
          } else {
            // Otherwise, insert the new parameter
            await this.insertEventParameters(hash, [param]);
          }
        }

        this.logger.info('Successfully updated event with decoded data', hash, decodedData);
      }
    } catch (error) {
      this.logger.error('Error updating event with decoded data:', error);
      throw error;
    }
  }

  public async fetchNonDecodedEvents(): Promise<any[]> {
    // TODO: type
    try {
      // SQL to fetch the non-decoded events with their input
      const sql = `
      -- Fetching events with blank eventName and with non-null parameter value
      SELECT e1.*, ep1.value
      FROM event e1
      JOIN event_parameter ep1 ON e1.id = ep1."eventId"
      WHERE e1."eventName" IS NULL AND ep1.value IS NOT NULL
      
      ORDER BY id;
      `;
      // Execute the query
      const rows = await this.executeQuery(sql, []);
      return rows;
    } catch (error) {
      this.logger.error('Error fetching non-decoded events with input:', error);
      throw error;
    }
  }

  // General functions
  protected async executeQuery<T>(query: string, values?: any[]): Promise<T[]> {
    try {
      const result = await this.client.query(query, values);
      return result.rows as T[];
    } catch (error) {
      throw new Error(`Error executing query: ${query}\n\nError details: ${error.message}`);
    }
  }
}
