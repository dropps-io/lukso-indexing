import { Client, QueryResult } from 'pg';

import {
  LUKSO_STRUCTURE_CONNECTION_STRING,
  DB_STRUCTURE_TABLE,
} from '../../libs/database/lukso-structure/config';
import { DB_DATA_TABLE, LUKSO_DATA_CONNECTION_STRING } from '../../libs/database/lukso-data/config';
import { setupEnv } from '../../utils/setup-env';
import { seedLuksoData } from '../../scripts/database/lukso-data/seed';
import { seedLuksoStructure } from '../../scripts/database/lukso-structure/seed';

setupEnv();

const structureClient = new Client({
  connectionString: LUKSO_STRUCTURE_CONNECTION_STRING,
});

const dataClient = new Client({
  connectionString: LUKSO_DATA_CONNECTION_STRING,
});

const cleanup = async () => {
  for (const table of Object.keys(DB_STRUCTURE_TABLE).values()) {
    await structureClient.query(`DELETE FROM ${table}`);
  }
  for (const table of Object.keys(DB_DATA_TABLE).values())
    await dataClient.query(`DELETE FROM ${table}`);

  await structureClient.query(`INSERT INTO ${DB_STRUCTURE_TABLE.CONFIG} DEFAULT VALUES`);
};

beforeAll(async () => {
  await dataClient.connect();
  await structureClient.connect();

  await seedLuksoData(true);
  await seedLuksoStructure(true);
});

beforeEach(async () => {
  await cleanup();
});

afterAll(async () => {
  await structureClient.end();
  await dataClient.end();
});

export const executeQuery = async (
  query: string,
  DB: 'DATA' | 'STRUCTURE',
  values?: any[],
): Promise<QueryResult> => {
  let client;
  switch (DB) {
    case 'DATA':
      client = dataClient;
      break;
    case 'STRUCTURE':
      client = structureClient;
      break;
  }
  return new Promise((resolve, reject) => {
    client.query(query, values ? values : [], async (err, res) => {
      if (err) reject(err);
      else resolve(res);
    });
  });
};
