import { config } from 'dotenv';
import path from 'path';
import pg from 'pg';

import { STRUCTURE_TABLE } from '../../../database/lukso-structure/config';

if (process.env.NODE_ENV === 'test') config({ path: path.resolve(process.cwd(), '.env.test') });

config();

const client = new pg.Client({
  connectionString: process.env.LUKSO_STRUCTURE_CONNECTION_STRING,
});

export const seedLuksoStructure = async (dropTables?: boolean) => {
  await client.connect();

  if (dropTables) {
    for (const table of Object.keys(STRUCTURE_TABLE).values())
      await client.query(`DROP TABLE IF EXISTS ${table}`);
  }

  await client.query(`
CREATE TABLE IF NOT EXISTS ${STRUCTURE_TABLE.ERC725Y_SCHEMA} (
	"key" CHAR(66) NOT NULL,
  "name" VARCHAR(66) NOT NULL,
	"keyType" VARCHAR(20) NOT NULL,
	"valueType" VARCHAR(20) NOT NULL,
	"valueContent" VARCHAR(20) NOT NULL,
	PRIMARY KEY ("key")
)`);

  await client.query(`
CREATE TABLE IF NOT EXISTS ${STRUCTURE_TABLE.CONTRACT_INTERFACE} (
	"id" CHAR(10) NOT NULL,
  "code" VARCHAR(10) NOT NULL,
	"name" VARCHAR(40) NOT NULL,
	PRIMARY KEY ("id")
)`);

  await client.query(`
CREATE TABLE IF NOT EXISTS ${STRUCTURE_TABLE.METHOD_INTERFACE} (
	"id" CHAR(10) NOT NULL,
  "hash" CHAR(66) NOT NULL,
	"name" VARCHAR(20) NOT NULL,
	"type" VARCHAR(10) NOT NULL,
	PRIMARY KEY ("id")
)`);

  await client.query(`
CREATE TABLE IF NOT EXISTS ${STRUCTURE_TABLE.METHOD_PARAMETER} (
	"methodId" CHAR(10) NOT NULL,
	"name" VARCHAR(20) NOT NULL,
	"type" VARCHAR(20) NOT NULL,
	"indexed" BOOLEAN NOT NULL,
	"position" INTEGER NOT NULL,
	CONSTRAINT fk_id FOREIGN KEY("methodId") REFERENCES ${STRUCTURE_TABLE.METHOD_INTERFACE}("id")
)`);

  await client.end();
  console.log('lukso-structure seed script successfully executed');
};
