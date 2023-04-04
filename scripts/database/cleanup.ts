import { Client } from 'pg';
import { setupEnv } from '@utils/setup-env';
import { LUKSO_STRUCTURE_CONNECTION_STRING, DB_STRUCTURE_TABLE } from '@db/lukso-structure/config';

setupEnv();

const luksoStructureClient = new Client({
  connectionString: LUKSO_STRUCTURE_CONNECTION_STRING,
});

const cleanup = async () => {
  await luksoStructureClient.connect();

  for (const table of Object.values(DB_STRUCTURE_TABLE)) {
    await luksoStructureClient.query(`DELETE FROM ${table}`);
  }

  await luksoStructureClient.end();
};

cleanup().then();
