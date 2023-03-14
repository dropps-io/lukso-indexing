import { Client } from 'pg';
import {setupEnv} from "../../utils/setup-env";
import {LUKSO_STRUCTURE_CONNECTION_STRING, STRUCTURE_TABLE} from "../../database/lukso-structure/config";

setupEnv();

const luksoStructureClient = new Client({
  connectionString: LUKSO_STRUCTURE_CONNECTION_STRING,
});

const cleanup = async () => {
  await luksoStructureClient.connect();

  console.log('Cleaning DB...');

  for (const table of Object.values(STRUCTURE_TABLE)) {
    await luksoStructureClient.query(`DELETE FROM ${table}`);
  }

  console.log('DB cleaned!');

  await luksoStructureClient.end();
};

cleanup().then();
