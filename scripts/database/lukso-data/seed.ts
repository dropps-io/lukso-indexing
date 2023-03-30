import { config } from 'dotenv';
import path from 'path';
import pg from 'pg';

import { DB_DATA_TABLE } from '../../../libs/database/lukso-data/config';

if (process.env.NODE_ENV === 'test') config({ path: path.resolve(process.cwd(), '.env.test') });

config();

const client = new pg.Client({
  connectionString: process.env.LUKSO_DATA_CONNECTION_STRING,
});

export const seedLuksoData = async (dropTables?: boolean) => {
  await client.connect();

  if (dropTables) {
    for (const table of Object.keys(DB_DATA_TABLE).values())
      await client.query(`DROP TABLE IF EXISTS ${table} CASCADE`);
  }

  await client.query(`
CREATE TABLE IF NOT EXISTS ${DB_DATA_TABLE.CONTRACT} (
	"address" CHAR(42) NOT NULL,
  "interfaceCode" VARCHAR(10) NOT NULL,
  "interfaceVersion" VARCHAR(10),
	PRIMARY KEY ("address")
)`);

  await client.query(`
CREATE TABLE IF NOT EXISTS ${DB_DATA_TABLE.CONTRACT_TOKEN} (
  "id" CHAR(66) NOT NULL,
  "address" CHAR(42) NOT NULL,
  "index" INTEGER NOT NULL,
  "tokenId" VARCHAR(66) NOT NULL,
  "rawTokenId" CHAR(66) NOT NULL,
  PRIMARY KEY ("id"),
  UNIQUE ("address", "rawTokenId"),
  FOREIGN KEY ("address") REFERENCES ${DB_DATA_TABLE.CONTRACT}("address") ON DELETE CASCADE
)`);

  await client.query(`
CREATE TABLE IF NOT EXISTS ${DB_DATA_TABLE.METADATA} (
  "address" CHAR(42) NOT NULL,
  "tokenId" VARCHAR(66),
  "name" VARCHAR NOT NULL,
  "symbol" VARCHAR NOT NULL,
  "description" VARCHAR NOT NULL,
  "isNFT" BOOLEAN,
  FOREIGN KEY ("address") REFERENCES ${DB_DATA_TABLE.CONTRACT}("address") ON DELETE CASCADE,
  FOREIGN KEY ("address", "tokenId") REFERENCES ${DB_DATA_TABLE.CONTRACT_TOKEN}("address", "rawTokenId") ON DELETE CASCADE
)`);

  await client.query(`
CREATE TABLE IF NOT EXISTS ${DB_DATA_TABLE.METADATA_IMAGE} (
  "address" CHAR(42) NOT NULL,
  "tokenId" VARCHAR(66),
  "url" VARCHAR NOT NULL,
  "width" SMALLINT NOT NULL,
  "height" SMALLINT NOT NULL,
  "type" VARCHAR NOT NULL,
  "hash" CHAR(66) NOT NULL,
  FOREIGN KEY ("address") REFERENCES ${DB_DATA_TABLE.CONTRACT}("address") ON DELETE CASCADE,
  FOREIGN KEY ("address", "tokenId") REFERENCES ${DB_DATA_TABLE.CONTRACT_TOKEN}("address", "rawTokenId") ON DELETE CASCADE
)`);

  await client.query(`
CREATE TABLE IF NOT EXISTS ${DB_DATA_TABLE.METADATA_LINK} (
  "address" CHAR(42) NOT NULL,
  "tokenId" VARCHAR(66),
  "title" VARCHAR NOT NULL,
  "url" VARCHAR NOT NULL,
  FOREIGN KEY ("address") REFERENCES ${DB_DATA_TABLE.CONTRACT}("address") ON DELETE CASCADE,
  FOREIGN KEY ("address", "tokenId") REFERENCES ${DB_DATA_TABLE.CONTRACT_TOKEN}("address", "rawTokenId") ON DELETE CASCADE
)`);

  await client.query(`
CREATE TABLE IF NOT EXISTS ${DB_DATA_TABLE.METADATA_TAG} (
  "address" CHAR(42) NOT NULL,
  "tokenId" VARCHAR(66),
  "title" VARCHAR NOT NULL,
  FOREIGN KEY ("address") REFERENCES ${DB_DATA_TABLE.CONTRACT}("address") ON DELETE CASCADE,
  FOREIGN KEY ("address", "tokenId") REFERENCES ${DB_DATA_TABLE.CONTRACT_TOKEN}("address", "rawTokenId") ON DELETE CASCADE
)`);

  await client.query(`
CREATE TABLE IF NOT EXISTS ${DB_DATA_TABLE.METADATA_ASSET} (
  "address" CHAR(42) NOT NULL,
  "tokenId" VARCHAR(66),
  "url" VARCHAR NOT NULL,
  "fileType" VARCHAR(10) NOT NULL,
  "hash" CHAR(66) NOT NULL,
  FOREIGN KEY ("address") REFERENCES ${DB_DATA_TABLE.CONTRACT}("address") ON DELETE CASCADE,
  FOREIGN KEY ("address", "tokenId") REFERENCES  ${DB_DATA_TABLE.CONTRACT_TOKEN}("address", "rawTokenId") ON DELETE CASCADE
)`);

  await client.query(`
CREATE TABLE IF NOT EXISTS ${DB_DATA_TABLE.DATA_CHANGED} (
  "address" CHAR(42) NOT NULL,
  "key" CHAR(66) NOT NULL,
  "value" VARCHAR NOT NULL,
  "blockNumber" INTEGER NOT NULL,
  FOREIGN KEY ("address") REFERENCES ${DB_DATA_TABLE.CONTRACT}("address") ON DELETE CASCADE
)`);

  await client.query(`
CREATE TABLE IF NOT EXISTS ${DB_DATA_TABLE.TRANSACTION} (
	"hash" CHAR(66) NOT NULL,
  "nonce" INTEGER NOT NULL,
  "blockHash" CHAR(66) NOT NULL,
  "blockNumber" INTEGER NOT NULL,
  "transactionIndex" INTEGER NOT NULL,
  "methodId" CHAR(10) NOT NULL,
  "methodName" VARCHAR(40),
  "from" CHAR(42) NOT NULL,
  "to" CHAR(42) NOT NULL,
  "value" VARCHAR(24) NOT NULL,
  "gasPrice" VARCHAR(14) NOT NULL,
  "gas" INTEGER NOT NULL,
  "input" VARCHAR(65536) NOT NULL,
  "unwrappedMethodId" CHAR(10),
  "unwrappedMethodName" VARCHAR(40),
  "unwrappedFrom" CHAR(42),
  "unwrappedTo" CHAR(42),
	PRIMARY KEY ("hash"),
  FOREIGN KEY ("from") REFERENCES ${DB_DATA_TABLE.CONTRACT}("address") ON DELETE CASCADE,
  FOREIGN KEY ("to") REFERENCES ${DB_DATA_TABLE.CONTRACT}("address") ON DELETE CASCADE
)`);

  await client.query(`
CREATE TABLE IF NOT EXISTS ${DB_DATA_TABLE.TRANSACTION_INPUT} (
	"transactionHash" CHAR(66) NOT NULL,
  "input" VARCHAR(65536) NOT NULL,
	PRIMARY KEY ("transactionHash"),
  FOREIGN KEY ("transactionHash") REFERENCES ${DB_DATA_TABLE.TRANSACTION}("hash") ON DELETE CASCADE
)`);

  await client.query(`
CREATE TABLE IF NOT EXISTS ${DB_DATA_TABLE.TRANSACTION_PARAMETER} (
  "transactionHash" CHAR(66) NOT NULL,
  "unwrapped" CHAR(66) NOT NULL DEFAULT false,
  "value" VARCHAR NOT NULL,
  "name" VARCHAR NOT NULL,
  "type" VARCHAR(20) NOT NULL,
   "position" SMALLINT NOT NULL,
  FOREIGN KEY ("transactionHash") REFERENCES transaction("hash") ON DELETE CASCADE
)`);

  await client.query(`
CREATE TABLE IF NOT EXISTS ${DB_DATA_TABLE.EVENT} ( 
    "id" CHAR(66) NOT NULL, 
    "blockNumber" INTEGER NOT NULL, 
    "transactionHash" CHAR(66) NOT NULL, 
    "logIndex" INTEGER NOT NULL, 
    "address" CHAR(66) NOT NULL, 
    "eventName" VARCHAR, 
    "topic0" CHAR(66) NOT NULL, 
    "topic1" CHAR(66), 
    "topic2" CHAR(66), 
    "topic3" CHAR(66), 
    "data" VARCHAR, 
    PRIMARY KEY ("id"), 
    FOREIGN KEY ("transactionHash") REFERENCES transaction("hash") ON DELETE CASCADE, 
    FOREIGN KEY ("address") REFERENCES ${DB_DATA_TABLE.CONTRACT}("address") ON DELETE CASCADE 
    )`);

  await client.query(`
CREATE TABLE IF NOT EXISTS ${DB_DATA_TABLE.EVENT_PARAMETER} ( 
    "eventId" CHAR(66) NOT NULL,
    "value" VARCHAR NOT NULL,
    "name" VARCHAR NOT NULL,
    "type" VARCHAR NOT NULL,
    "position" SMALLINT NOT NULL,
    FOREIGN KEY ("eventId") REFERENCES event("id") ON DELETE CASCADE 
  )`);

  await client.end();
  console.log('lukso-data seed script successfully executed');
};
