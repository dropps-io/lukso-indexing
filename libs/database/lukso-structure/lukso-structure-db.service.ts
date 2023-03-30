import { Injectable, OnModuleDestroy } from '@nestjs/common';
import { Pool } from 'pg';

import { LUKSO_STRUCTURE_CONNECTION_STRING, DB_STRUCTURE_TABLE } from './config';
import { ConfigTable } from './entities/config.table';
import { ERC725YSchemaTable } from './entities/erc725YSchema.table';
import { ContractInterfaceTable } from './entities/contractInterface.table';
import { MethodInterfaceTable } from './entities/methodInterface.table';
import { MethodParameterTable } from './entities/methodParameter.table';

@Injectable()
export class LuksoStructureDbService implements OnModuleDestroy {
  private readonly client: Pool;

  constructor() {
    this.client = new Pool({
      connectionString: LUKSO_STRUCTURE_CONNECTION_STRING,
    });
  }

  async onModuleDestroy() {
    await this.disconnect();
  }

  public async disconnect() {
    await this.client.end();
  }

  public async getConfig(): Promise<ConfigTable> {
    const result = await this.client.query(`SELECT * FROM ${DB_STRUCTURE_TABLE.CONFIG}`);
    if (result.rows.length === 0) throw 'Config table need to be initialized';
    else return result.rows[0] as ConfigTable;
  }

  public async updateLatestIndexedBlock(blockNumber: number): Promise<void> {
    await this.client.query(
      `
      UPDATE ${DB_STRUCTURE_TABLE.CONFIG}
      SET "latestIndexedBlock" = $1
    `,
      [blockNumber],
    );
  }

  public async updateLatestIndexedEventBlock(blockNumber: number): Promise<void> {
    await this.client.query(
      `
      UPDATE ${DB_STRUCTURE_TABLE.CONFIG}
      SET "latestIndexedEventBlock" = $1
    `,
      [blockNumber],
    );
  }

  async insertErc725ySchema(schema: ERC725YSchemaTable): Promise<void> {
    await this.client.query(
      `
      INSERT INTO ${DB_STRUCTURE_TABLE.ERC725Y_SCHEMA}
      ("key", "name", "keyType", "valueType", "valueContent")
      VALUES ($1, $2, $3, $4, $5)
    `,
      [schema.key, schema.name, schema.keyType, schema.valueType, schema.valueContent],
    );
  }

  async getErc725ySchemaByKey(key: string): Promise<ERC725YSchemaTable | null> {
    const result = await this.client.query(
      `SELECT * FROM ${DB_STRUCTURE_TABLE.ERC725Y_SCHEMA} WHERE "key" = $1`,
      [key],
    );
    return result.rows.length > 0 ? (result.rows[0] as ERC725YSchemaTable) : null;
  }

  async insertContractInterface(contractInterface: ContractInterfaceTable): Promise<void> {
    await this.client.query(
      `
      INSERT INTO ${DB_STRUCTURE_TABLE.CONTRACT_INTERFACE} ("id", "code", "name", "version") VALUES ($1, $2, $3, $4)`,
      [
        contractInterface.id,
        contractInterface.code,
        contractInterface.name,
        contractInterface.version,
      ],
    );
  }

  async getContractInterfaceById(id: string): Promise<ContractInterfaceTable | null> {
    const result = await this.client.query(
      `SELECT * FROM ${DB_STRUCTURE_TABLE.CONTRACT_INTERFACE} WHERE "id" = $1`,
      [id],
    );
    return result.rows.length > 0 ? (result.rows[0] as ContractInterfaceTable) : null;
  }

  async insertMethodInterface(methodInterface: MethodInterfaceTable): Promise<void> {
    await this.client.query(
      `
      INSERT INTO ${DB_STRUCTURE_TABLE.METHOD_INTERFACE}
      VALUES ($1, $2, $3, $4)`,
      [methodInterface.id, methodInterface.hash, methodInterface.name, methodInterface.type],
    );
  }
  async getMethodInterfaceById(id: string): Promise<MethodInterfaceTable | null> {
    const result = await this.client.query(
      `SELECT * FROM ${DB_STRUCTURE_TABLE.METHOD_INTERFACE} WHERE "id" = $1`,
      [id],
    );
    return result.rows.length > 0 ? (result.rows[0] as MethodInterfaceTable) : null;
  }

  async insertMethodParameter(methodParameter: MethodParameterTable): Promise<void> {
    await this.client.query(
      `INSERT INTO ${DB_STRUCTURE_TABLE.METHOD_PARAMETER} ("methodId", "name", "type", "indexed", "position") VALUES ($1, $2, $3, $4, $5)`,
      [
        methodParameter.methodId,
        methodParameter.name,
        methodParameter.type,
        methodParameter.indexed,
        methodParameter.position,
      ],
    );
  }

  async getMethodParametersByMethodId(methodId: string): Promise<MethodParameterTable[]> {
    const result = await this.client.query(
      `SELECT * FROM ${DB_STRUCTURE_TABLE.METHOD_PARAMETER} WHERE "methodId" = $1`,
      [methodId],
    );
    return result.rows.map((row) => row as MethodParameterTable);
  }
}
