import { Injectable } from '@nestjs/common';
import { Pool } from 'pg';

import { DATA_TABLE, LUKSO_DATA_CONNECTION_STRING } from './config';
import { ContractTable } from './entities/contract.table';
import { ContractTokenTable } from './entities/contractToken.table';
import { MetadataTable } from './entities/metadata.table';
import { MetadataImageTable } from './entities/metadataImage.table';
import { MetadataTagTable } from './entities/metadataTag.table';
import { MetadataLinkTable } from './entities/metadataLink.table';
import { MetadataAssetTable } from './entities/metadataAsset.table';
import { DataChangedTable } from './entities/dataChanged.table';
import { TransactionTable } from './entities/tx.table';
import { TxParameterTable } from './entities/txParameter.table';
import { TxInputTable } from './entities/txInput.table';
import { EventTable } from './entities/event.table';
import { EventParameterTable } from './entities/eventParameter.table';

@Injectable()
export class LuksoDataDbService {
  private readonly client: Pool;

  constructor() {
    this.client = new Pool({
      connectionString: LUKSO_DATA_CONNECTION_STRING,
    });
  }

  // Contract table functions
  public async insertContract(contract: ContractTable): Promise<void> {
    await this.client.query(
      `
      INSERT INTO ${DATA_TABLE.CONTRACT}
      ("address", "interfaceCode", "interfaceVersion")
      VALUES ($1, $2, $3)
    `,
      [contract.address, contract.interfaceCode, contract.interfaceVersion],
    );
  }

  public async getContractByAddress(address: string): Promise<ContractTable | null> {
    const result = await this.client.query(
      `SELECT * FROM ${DATA_TABLE.CONTRACT} WHERE "address" = $1`,
      [address],
    );
    return result.rows.length > 0 ? (result.rows[0] as ContractTable) : null;
  }

  // ContractToken table functions
  public async insertContractToken(contractToken: ContractTokenTable): Promise<void> {
    await this.client.query(
      `
          INSERT INTO ${DATA_TABLE.CONTRACT_TOKEN}
          VALUES ($1, $2, $3, $4, $5)
        `,
      [
        contractToken.id,
        contractToken.address,
        contractToken.index,
        contractToken.tokenId,
        contractToken.rawTokenId,
      ],
    );
  }

  public async getContractTokenById(id: string): Promise<ContractTokenTable | null> {
    const result = await this.client.query(
      `SELECT * FROM ${DATA_TABLE.CONTRACT_TOKEN} WHERE "id" = $1`,
      [id],
    );
    return result.rows.length > 0 ? (result.rows[0] as ContractTokenTable) : null;
  }

  // Metadata table functions
  public async insertMetadata(metadata: MetadataTable): Promise<void> {
    await this.client.query(
      `
          INSERT INTO ${DATA_TABLE.METADATA}
          ("address", "tokenId", "name", "symbol", "description", "isNFT")
          VALUES ($1, $2, $3, $4, $5, $6)
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
  }

  public async getMetadataByAddressAndTokenId(
    address: string,
    tokenId: string | null,
  ): Promise<MetadataTable | null> {
    const result = await this.client.query(
      `SELECT * FROM ${DATA_TABLE.METADATA} WHERE "address" = $1 AND "tokenId" = $2`,
      [address, tokenId],
    );
    return result.rows.length > 0 ? (result.rows[0] as MetadataTable) : null;
  }

  // MetadataImage table functions
  public async insertMetadataImage(metadataImage: MetadataImageTable): Promise<void> {
    await this.client.query(
      `
      INSERT INTO ${DATA_TABLE.METADATA_IMAGE}
      ("address", "tokenId", "url", "width", "height", "type", "hash")
      VALUES ($1, $2, $3, $4, $5, $6, $7)
    `,
      [
        metadataImage.address,
        metadataImage.tokenId,
        metadataImage.url,
        metadataImage.width,
        metadataImage.height,
        metadataImage.type,
        metadataImage.hash,
      ],
    );
  }

  // MetadataLink table functions
  public async insertMetadataLink(metadataLink: MetadataLinkTable): Promise<void> {
    await this.client.query(
      `
      INSERT INTO ${DATA_TABLE.METADATA_LINK}
      ("address", "tokenId", "title",       "url")
      VALUES ($1, $2, $3, $4)
    `,
      [metadataLink.address, metadataLink.tokenId, metadataLink.title, metadataLink.url],
    );
  }

  // MetadataTag table functions
  public async insertMetadataTag(metadataTag: MetadataTagTable): Promise<void> {
    await this.client.query(
      `
      INSERT INTO ${DATA_TABLE.METADATA_TAG}
      ("address", "tokenId", "title")
      VALUES ($1, $2, $3)
    `,
      [metadataTag.address, metadataTag.tokenId, metadataTag.title],
    );
  }

  public async getMetadataTagsByAddressAndTokenId(
    address: string,
    tokenId: string,
  ): Promise<string[]> {
    const result = await this.client.query(
      `SELECT * FROM ${DATA_TABLE.METADATA_TAG} WHERE "address" = $1 AND "tokenId" = $2`,
      [address, tokenId],
    );
    return result.rows.map((r: MetadataTagTable) => r.title);
  }

  // MetadataAsset table functions
  public async insertMetadataAsset(metadataAsset: MetadataAssetTable): Promise<void> {
    await this.client.query(
      `
      INSERT INTO ${DATA_TABLE.METADATA_ASSET}
      ("address", "tokenId", "url", "fileType", "hash")
      VALUES ($1, $2, $3, $4, $5)
    `,
      [
        metadataAsset.address,
        metadataAsset.tokenId,
        metadataAsset.url,
        metadataAsset.fileType,
        metadataAsset.hash,
      ],
    );
  }

  public async getMetadataAssetByAddressAndTokenId(
    address: string,
    tokenId: string,
  ): Promise<MetadataAssetTable | null> {
    const result = await this.client.query(
      `SELECT * FROM ${DATA_TABLE.METADATA_ASSET} WHERE "address" = $1 AND "tokenId" = $2`,
      [address, tokenId],
    );
    return result.rows.length > 0 ? (result.rows[0] as MetadataAssetTable) : null;
  }

  // DataChanged table functions
  public async insertDataChanged(dataChanged: DataChangedTable): Promise<void> {
    await this.client.query(
      `
      INSERT INTO ${DATA_TABLE.DATA_CHANGED}
      ("address", "key", "value", "blockNumber")
      VALUES ($1, $2, $3, $4)
    `,
      [dataChanged.address, dataChanged.key, dataChanged.value, dataChanged.blockNumber],
    );
  }

  public async getDataChangedByAddressAndKey(
    address: string,
    key: string,
  ): Promise<DataChangedTable | null> {
    const result = await this.client.query(
      `SELECT * FROM ${DATA_TABLE.DATA_CHANGED} WHERE "address" = $1 AND "key" = $2`,
      [address, key],
    );
    return result.rows.length > 0 ? (result.rows[0] as DataChangedTable) : null;
  }

  // Transaction table functions
  public async insertTransaction(transaction: TransactionTable): Promise<void> {
    await this.client.query(
      `
      INSERT INTO ${DATA_TABLE.TRANSACTION}
      ("hash", "nonce", "blockHash", "blockNumber", "transactionIndex", "methodId", "from", "to", "value", "gasPrice", "gas", "input", "unwrappedMethodId", "unwrappedFrom", "unwrappedTo")
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15)
    `,
      [
        transaction.hash,
        transaction.nonce,
        transaction.blockHash,
        transaction.blockNumber,
        transaction.transactionIndex,
        transaction.methodId,
        transaction.from,
        transaction.to,
        transaction.value,
        transaction.gasPrice,
        transaction.gas,
        transaction.unwrappedMethodId,
        transaction.unwrappedFrom,
        transaction.unwrappedTo,
      ],
    );
  }

  public async getTransactionByHash(hash: string): Promise<TransactionTable | null> {
    const result = await this.client.query(
      `SELECT * FROM ${DATA_TABLE.TRANSACTION} WHERE "hash" = $1`,
      [hash],
    );
    return result.rows.length > 0 ? (result.rows[0] as TransactionTable) : null;
  }

  // TransactionInput table functions
  public async insertTransactionInput(transactionInput: TxInputTable): Promise<void> {
    await this.client.query(
      `
      INSERT INTO ${DATA_TABLE.TRANSACTION_INPUT}
      ("transactionHash", "input")
      VALUES ($1, $2)
    `,
      [transactionInput.transactionHash, transactionInput.input],
    );
  }

  public async getTransactionInputByTransactionHash(transactionHash: string): Promise<string> {
    const result = await this.client.query(
      `SELECT input FROM ${DATA_TABLE.TRANSACTION_INPUT} WHERE "transactionHash" = $1`,
      [transactionHash],
    );
    return result.rows.length > 0 ? result.rows[0].input : null;
  }

  // TransactionParameter table functions
  public async insertTransactionParameter(transactionParameter: TxParameterTable): Promise<void> {
    await this.client.query(
      `
      INSERT INTO ${DATA_TABLE.TRANSACTION_PARAMETER}
      VALUES ($1, $2, $3, $4, $5, $6)
    `,
      [
        transactionParameter.transactionHash,
        transactionParameter.unwrapped,
        transactionParameter.value,
        transactionParameter.name,
        transactionParameter.type,
        transactionParameter.position,
      ],
    );
  }

  public async getTransactionParametersByTransactionHash(
    transactionHash: string,
  ): Promise<TxParameterTable[]> {
    const result = await this.client.query(
      `SELECT * FROM ${DATA_TABLE.TRANSACTION_PARAMETER} WHERE "transactionHash" = $1`,
      [transactionHash],
    );
    return result.rows as TxParameterTable[];
  }

  // Event table functions
  public async insertEvent(event: EventTable): Promise<void> {
    await this.client.query(
      `
      INSERT INTO ${DATA_TABLE.EVENT}
      ("id", "blockNumber", "transactionHash", "logIndex", "address", "eventName", "topic0", "topic1", "topic2", "topic3", "data")
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
    `,
      [
        event.id,
        event.blockNumber,
        event.transactionHash,
        event.logIndex,
        event.address,
        event.eventName,
        event.topic0,
        event.topic1,
        event.topic2,
        event.topic3,
        event.data,
      ],
    );
  }

  public async getEventById(id: string): Promise<EventTable | null> {
    const result = await this.client.query(`SELECT * FROM ${DATA_TABLE.EVENT} WHERE "id" = $1`, [
      id,
    ]);
    return result.rows.length > 0 ? (result.rows[0] as EventTable) : null;
  }

  // EventParameter table functions
  public async insertEventParameter(eventParameter: EventParameterTable): Promise<void> {
    await this.client.query(
      `INSERT INTO ${DATA_TABLE.EVENT_PARAMETER} VALUES ($1, $2, $3, $4, $5)`,
      [
        eventParameter.eventId,
        eventParameter.value,
        eventParameter.name,
        eventParameter.type,
        eventParameter.position,
      ],
    );
  }

  public async getEventParametersByEventId(eventId: string): Promise<EventParameterTable[]> {
    const result = await this.client.query(
      `SELECT * FROM ${DATA_TABLE.EVENT_PARAMETER} WHERE "eventId" = $1`,
      [eventId],
    );
    return result.rows as EventParameterTable[];
  }
}
