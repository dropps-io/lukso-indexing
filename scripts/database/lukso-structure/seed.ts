import { config } from 'dotenv';
import path from 'path';
import pg from 'pg';

import { STRUCTURE_TABLE } from '../../../libs/database/lukso-structure/config';

if (process.env.NODE_ENV === 'test') config({ path: path.resolve(process.cwd(), '.env.test') });

config();

const client = new pg.Client({
  connectionString: process.env.LUKSO_STRUCTURE_CONNECTION_STRING,
});

export const seedLuksoStructure = async (dropTables?: boolean) => {
  await client.connect();

  if (dropTables) {
    for (const table of Object.keys(STRUCTURE_TABLE).values())
      await client.query(`DROP TABLE IF EXISTS ${table} CASCADE`);
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
	"version" VARCHAR(10),
	PRIMARY KEY ("id")
)`);

  await client.query(`
CREATE TABLE IF NOT EXISTS ${STRUCTURE_TABLE.METHOD_INTERFACE} (
	"id" CHAR(10) NOT NULL,
  "hash" CHAR(66) NOT NULL,
	"name" VARCHAR(40) NOT NULL,
	"type" VARCHAR(20) NOT NULL,
	PRIMARY KEY ("id")
)`);

  await client.query(`
CREATE TABLE IF NOT EXISTS ${STRUCTURE_TABLE.METHOD_PARAMETER} (
	"methodId" CHAR(10) NOT NULL,
	"name" VARCHAR(40) NOT NULL,
	"type" VARCHAR(40) NOT NULL,
	"indexed" BOOLEAN NOT NULL,
	"position" INTEGER NOT NULL,
	FOREIGN KEY("methodId") REFERENCES ${STRUCTURE_TABLE.METHOD_INTERFACE}("id") ON DELETE CASCADE
)`);

  await client.query(`
CREATE TABLE IF NOT EXISTS ${STRUCTURE_TABLE.CONFIG} (
	"blockIteration" INTEGER NOT NULL DEFAULT 5000,
	"sleepBetweenIteration" INTEGER NOT NULL DEFAULT 2000,
	"nbrOfThreads" INTEGER NOT NULL DEFAULT 20,
	"paused" BOOLEAN NOT NULL DEFAULT false,
	"latestIndexedBlock" INTEGER NOT NULL DEFAULT 0,
	"latestIndexedEventBlock" INTEGER NOT NULL DEFAULT 0
	)`);

  await client.query(`INSERT INTO ${STRUCTURE_TABLE.CONFIG} DEFAULT VALUES`);

  await client.end();
  console.log('lukso-structure seed script successfully executed');
};
