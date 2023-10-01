import { Injectable, OnModuleDestroy } from '@nestjs/common';
import { Pool, QueryResult } from 'pg';
import winston from 'winston';
import { LoggerService } from '@libs/logger/logger.service';

import {
  CACHE_REFRESH_INTERVAL_IN_MS,
  DB_STRUCTURE_TABLE,
  LUKSO_STRUCTURE_CONNECTION_STRING,
} from './config';
import { ERC725YSchemaTable } from './entities/erc725YSchema.table';
import { ContractInterfaceTable } from './entities/contractInterface.table';
import { MethodInterfaceTable } from './entities/methodInterface.table';
import { MethodParameterTable } from './entities/methodParameter.table';

@Injectable()
export class LuksoStructureDbService implements OnModuleDestroy {
  private readonly client: Pool & {
    query: (query: string, values?: any[]) => Promise<QueryResult<any>>;
  };
  private readonly logger: winston.Logger;
  private cache: {
    contractInterfaces: {
      values: ContractInterfaceTable[];
      lastRefresh: number;
    };
  } = {
    contractInterfaces: {
      values: [],
      lastRefresh: 0,
    },
  };

  constructor(protected readonly loggerService: LoggerService) {
    this.logger = this.loggerService.getChildLogger('LuksoStructureDb');
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

  async insertErc725ySchema(schema: ERC725YSchemaTable): Promise<void> {
    await this.executeQuery(
      `
      INSERT INTO ${DB_STRUCTURE_TABLE.ERC725Y_SCHEMA}
      ("key", "name", "keyType", "valueType", "valueContent")
      VALUES ($1, $2, $3, $4, $5)
    `,
      [schema.key, schema.name, schema.keyType, schema.valueType, schema.valueContent],
    );
  }

  async batchInsertErc725ySchemas(schemas: ERC725YSchemaTable[]): Promise<void> {
    if (schemas.length === 0) {
      return;
    }

    const values = schemas.map((schema) => [
      schema.key,
      schema.name,
      schema.keyType,
      schema.valueType,
      schema.valueContent,
    ]);

    const query = `
    INSERT INTO ${DB_STRUCTURE_TABLE.ERC725Y_SCHEMA}
    ("key", "name", "keyType", "valueType", "valueContent")
    VALUES ${values
      .map(
        (_, index) =>
          `($${index * 5 + 1}, $${index * 5 + 2}, $${index * 5 + 3}, $${index * 5 + 4}, $${
            index * 5 + 5
          })`,
      )
      .join(', ')}
  `;

    //Here we flatten the array, because the executeQuery expects a flat array of values
    const flattenedValues = values.flat();

    await this.executeQuery(query, flattenedValues);
  }

  async getErc725ySchemaByKey(key: string): Promise<ERC725YSchemaTable | null> {
    const rows = await this.executeQuery<ERC725YSchemaTable>(
      'SELECT * FROM "erc725y_schema" WHERE LOWER(key) LIKE LOWER($1)',
      [`%${key.slice(0, 26)}%`],
    );
    return rows.length > 0 ? rows[0] : null;
  }

  async insertContractInterface(contractInterface: ContractInterfaceTable): Promise<void> {
    await this.executeQuery(
      `
      INSERT INTO ${DB_STRUCTURE_TABLE.CONTRACT_INTERFACE} ("id", "code", "name", "version", "type") VALUES ($1, $2, $3, $4, $5)`,
      [
        contractInterface.id,
        contractInterface.code,
        contractInterface.name,
        contractInterface.version,
        contractInterface.type,
      ],
    );

    // Update cache with the new value
    this.cache.contractInterfaces.values.push(contractInterface);
  }

  async batchInsertContractInterfaces(contractInterfaces: ContractInterfaceTable[]): Promise<void> {
    if (contractInterfaces.length === 0) {
      return;
    }

    const values = contractInterfaces.map((contractInterface) => [
      contractInterface.id,
      contractInterface.code,
      contractInterface.name,
      contractInterface.version,
      contractInterface.type,
    ]);

    const query = `
    INSERT INTO ${DB_STRUCTURE_TABLE.CONTRACT_INTERFACE} ("id", "code", "name", "version", "type")
    VALUES ${values
      .map(
        (_, index) =>
          `($${index * 5 + 1}, $${index * 5 + 2}, $${index * 5 + 3}, $${index * 5 + 4}, $${
            index * 5 + 5
          })`,
      )
      .join(', ')}
  `;
    //Here we flatten the array, because the executeQuery expects a flat array of values
    const flattenedValues = values.flat();

    await this.executeQuery(query, flattenedValues);

    // Update cache with the new values
    this.cache.contractInterfaces.values.push(...contractInterfaces);
  }

  async getContractInterfaceById(id: string): Promise<ContractInterfaceTable | null> {
    const cachedInterface = this.cache.contractInterfaces.values.find((c) => c.id === id);
    if (cachedInterface) return cachedInterface;

    const rows = await this.executeQuery<ContractInterfaceTable>(
      `SELECT * FROM ${DB_STRUCTURE_TABLE.CONTRACT_INTERFACE} WHERE "id" = $1`,
      [id],
    );
    return rows.length > 0 ? rows[0] : null;
  }

  async getContractInterfaces(): Promise<ContractInterfaceTable[]> {
    const now = Date.now();

    //If the cache is empty or the cache is older than CACHE_REFRESH_INTERVAL_IN_MS, then refresh the cache
    if (
      this.cache.contractInterfaces.values.length === 0 ||
      now - this.cache.contractInterfaces.lastRefresh >= CACHE_REFRESH_INTERVAL_IN_MS
    ) {
      this.cache.contractInterfaces.values = await this.executeQuery<ContractInterfaceTable>(
        `SELECT * FROM ${DB_STRUCTURE_TABLE.CONTRACT_INTERFACE}`,
      );
      this.cache.contractInterfaces.lastRefresh = now;
    }

    return this.cache.contractInterfaces.values;
  }

  async insertMethodInterface(methodInterface: MethodInterfaceTable): Promise<void> {
    await this.executeQuery(
      `
      INSERT INTO ${DB_STRUCTURE_TABLE.METHOD_INTERFACE}
      VALUES ($1, $2, $3, $4)`,
      [methodInterface.id, methodInterface.hash, methodInterface.name, methodInterface.type],
    );
  }
  async getMethodInterfaceById(id: string): Promise<MethodInterfaceTable | null> {
    const rows = await this.executeQuery<MethodInterfaceTable>(
      `SELECT * FROM ${DB_STRUCTURE_TABLE.METHOD_INTERFACE} WHERE "id" = $1`,
      [id],
    );
    return rows.length > 0 ? rows[0] : null;
  }

  async insertMethodParameter(methodParameter: MethodParameterTable): Promise<void> {
    await this.executeQuery(
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
    return await this.executeQuery<MethodParameterTable>(
      `SELECT * FROM ${DB_STRUCTURE_TABLE.METHOD_PARAMETER} WHERE "methodId" = $1`,
      [methodId],
    );
  }

  private async executeQuery<T>(query: string, values?: any[]): Promise<T[]> {
    try {
      const result = await this.client.query(query, values);
      return result.rows as T[];
    } catch (error: any) {
      throw new Error(
        `Error executing a query: ${error.message}, query: ${query}, values: ${values}`,
      );
    }
  }
}
