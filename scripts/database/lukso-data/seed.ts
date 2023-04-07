import { config } from 'dotenv';
import path from 'path';
import pg from 'pg';
import { DB_DATA_TABLE } from '@db/lukso-data/config';

if (process.env.NODE_ENV === 'test') config({ path: path.resolve(process.cwd(), '.env.test') });

config();

const client = new pg.Client({
  connectionString: process.env.LUKSO_DATA_CONNECTION_STRING,
});

export const seedLuksoData = async (dropTables?: boolean) => {
  await client.connect();

  if (dropTables) {
    for (const table of Object.keys(DB_DATA_TABLE).values())
      await client.query(`DROP TABLE IF EXISTS ${DB_DATA_TABLE[table]} CASCADE`);
  }

  await client.query(`
CREATE TABLE IF NOT EXISTS ${DB_DATA_TABLE.CONTRACT} (
	"address" CHAR(42) NOT NULL,
  "interfaceCode" VARCHAR(20),
  "interfaceVersion" VARCHAR(20),
	PRIMARY KEY ("address")
)`);

  await client.query(`
CREATE TABLE IF NOT EXISTS ${DB_DATA_TABLE.CONTRACT_TOKEN} (
  "id" CHAR(66) NOT NULL,
  "address" CHAR(42) NOT NULL,
  "index" INTEGER NOT NULL,
  "decodedTokenId" VARCHAR(66),
  "tokenId" CHAR(66) NOT NULL,
  "interfaceCode" VARCHAR(20) NOT NULL,
  PRIMARY KEY ("id"),
  UNIQUE ("address", "tokenId"),
  FOREIGN KEY ("address") REFERENCES ${DB_DATA_TABLE.CONTRACT}("address") ON DELETE CASCADE
)`);

  await client.query(`
    CREATE SEQUENCE IF NOT EXISTS contract_token_index_seq;
  `);

  await client.query(`CREATE OR REPLACE FUNCTION update_contract_token_index()
RETURNS TRIGGER AS $$
BEGIN
  SELECT COALESCE(MAX(index), 0) + 1
  INTO NEW.index
  FROM contract_token
  WHERE address = NEW.address;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql`);

  await client.query(`
      CREATE TRIGGER contract_token_before_insert
BEFORE INSERT ON contract_token
FOR EACH ROW
EXECUTE FUNCTION update_contract_token_index();
  `);

  await client.query(`
CREATE TABLE IF NOT EXISTS ${DB_DATA_TABLE.METADATA} (
  "id" SERIAL PRIMARY KEY,
  "address" CHAR(42) NOT NULL,
  "tokenId" VARCHAR(66),
  "name" VARCHAR(256),
  "symbol" VARCHAR(50),
  "description" VARCHAR(4096),
  "isNFT" BOOLEAN,
  FOREIGN KEY ("address") REFERENCES ${DB_DATA_TABLE.CONTRACT}("address") ON DELETE CASCADE,
  FOREIGN KEY ("address", "tokenId") REFERENCES ${DB_DATA_TABLE.CONTRACT_TOKEN}("address", "tokenId") ON DELETE CASCADE
)`);

  await client.query(`
CREATE TABLE IF NOT EXISTS ${DB_DATA_TABLE.METADATA_IMAGE} (
  "metadataId" INTEGER NOT NULL,
  "url" VARCHAR(2048) NOT NULL,
  "width" SMALLINT NOT NULL,
  "height" SMALLINT NOT NULL,
  "type" VARCHAR(40),
  "hash" CHAR(66) NOT NULL,
  FOREIGN KEY ("metadataId") REFERENCES ${DB_DATA_TABLE.METADATA}("id") ON DELETE CASCADE,
  UNIQUE ("metadataId", "url")
)`);

  await client.query(`
CREATE TABLE IF NOT EXISTS ${DB_DATA_TABLE.METADATA_LINK} (
  "metadataId" INTEGER NOT NULL,
  "title" VARCHAR(64) NOT NULL,
  "url" VARCHAR(2048) NOT NULL,
  FOREIGN KEY ("metadataId") REFERENCES ${DB_DATA_TABLE.METADATA}("id") ON DELETE CASCADE,
  UNIQUE ("metadataId", "url")
)`);

  await client.query(`
CREATE TABLE IF NOT EXISTS ${DB_DATA_TABLE.METADATA_TAG} (
  "metadataId" INTEGER NOT NULL,
  "title" VARCHAR(40) NOT NULL,
   FOREIGN KEY ("metadataId") REFERENCES ${DB_DATA_TABLE.METADATA}("id") ON DELETE CASCADE,
   UNIQUE ("metadataId", "title")
)`);

  await client.query(`
CREATE TABLE IF NOT EXISTS ${DB_DATA_TABLE.METADATA_ASSET} (
  "metadataId" INTEGER NOT NULL,
  "url" VARCHAR(2048) NOT NULL,
  "fileType" VARCHAR(32) NOT NULL,
  "hash" CHAR(66) NOT NULL,
   FOREIGN KEY ("metadataId") REFERENCES ${DB_DATA_TABLE.METADATA}("id") ON DELETE CASCADE,
   UNIQUE ("metadataId", "url")
)`);

  await client.query(`
CREATE TABLE IF NOT EXISTS ${DB_DATA_TABLE.DATA_CHANGED} (
  "address" CHAR(42) NOT NULL,
  "key" CHAR(66) NOT NULL,
  "value" VARCHAR(2048) NOT NULL,
  "decodedValue" VARCHAR(2048),
  "blockNumber" INTEGER NOT NULL
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
	PRIMARY KEY ("hash")
)`);

  await client.query(`
CREATE TABLE IF NOT EXISTS ${DB_DATA_TABLE.TRANSACTION_INPUT} (
	"transactionHash" CHAR(66) NOT NULL,
  "input" VARCHAR(65535) NOT NULL,
	PRIMARY KEY ("transactionHash"),
  FOREIGN KEY ("transactionHash") REFERENCES ${DB_DATA_TABLE.TRANSACTION}("hash") ON DELETE CASCADE
)`);

  await client.query(`
CREATE TABLE IF NOT EXISTS ${DB_DATA_TABLE.TRANSACTION_PARAMETER} (
  "transactionHash" CHAR(66) NOT NULL,
  "value" VARCHAR(65535) NOT NULL,
  "name" VARCHAR(40) NOT NULL,
  "type" VARCHAR(20) NOT NULL,
    "position" SMALLINT NOT NULL,
  FOREIGN KEY ("transactionHash") REFERENCES transaction("hash") ON DELETE CASCADE,
  UNIQUE ("transactionHash", "position")
)`);

  await client.query(`
CREATE TABLE IF NOT EXISTS ${DB_DATA_TABLE.WRAPPED_TRANSACTION} (
  "id" SERIAL PRIMARY KEY NOT NULL,
  "parentTransactionHash" CHAR(66),
  "parentId" INTEGER,
  "from" CHAR(42),
  "to" CHAR(42),
  "value" VARCHAR(24) NOT NULL,
  "methodId" CHAR(10) NOT NULL,
  "methodName" VARCHAR(40),
  FOREIGN KEY ("parentTransactionHash") REFERENCES ${DB_DATA_TABLE.TRANSACTION}("hash") ON DELETE CASCADE,
  FOREIGN KEY ("parentId") REFERENCES ${DB_DATA_TABLE.WRAPPED_TRANSACTION}("id") ON DELETE CASCADE
)`);

  await client.query(`
CREATE TABLE IF NOT EXISTS ${DB_DATA_TABLE.WRAPPED_TRANSACTION_INPUT} (
  "wrappedTransactionId" INTEGER NOT NULL,
  "input" VARCHAR(65535) NOT NULL,
  PRIMARY KEY ("wrappedTransactionId"),
  FOREIGN KEY ("wrappedTransactionId") REFERENCES ${DB_DATA_TABLE.WRAPPED_TRANSACTION}("id") ON DELETE CASCADE
)`);

  await client.query(`
CREATE TABLE IF NOT EXISTS ${DB_DATA_TABLE.WRAPPED_TRANSACTION_PARAMETER} (
  "wrappedTransactionId" INTEGER NOT NULL,
  "value" VARCHAR(65535) NOT NULL,
  "name" VARCHAR(40) NOT NULL,
  "type" VARCHAR(20) NOT NULL,
  "position" SMALLINT NOT NULL,
  FOREIGN KEY ("wrappedTransactionId") REFERENCES ${DB_DATA_TABLE.WRAPPED_TRANSACTION}("id") ON DELETE CASCADE,
  UNIQUE ("wrappedTransactionId", "position")
)`);

  await client.query(`
CREATE TABLE IF NOT EXISTS ${DB_DATA_TABLE.EVENT} ( 
    "id" CHAR(66) NOT NULL, 
    "blockNumber" INTEGER NOT NULL, 
    "transactionHash" CHAR(66) NOT NULL, 
    "logIndex" INTEGER NOT NULL, 
    "address" CHAR(42) NOT NULL, 
    "eventName" VARCHAR(40), 
    "methodId" CHAR(10) NOT NULL, 
    "topic0" CHAR(66) NOT NULL, 
    "topic1" CHAR(66), 
    "topic2" CHAR(66), 
    "topic3" CHAR(66), 
    "data" VARCHAR(16384), 
    PRIMARY KEY ("id")
    )`);

  await client.query(`
CREATE TABLE IF NOT EXISTS ${DB_DATA_TABLE.EVENT_PARAMETER} ( 
    "eventId" CHAR(66) NOT NULL,
    "value" VARCHAR(512) NOT NULL,
  "name" VARCHAR(40) NOT NULL,
  "type" VARCHAR(20) NOT NULL,
    "position" SMALLINT NOT NULL,
    FOREIGN KEY ("eventId") REFERENCES event("id") ON DELETE CASCADE,
    UNIQUE ("eventId", "position")
  )`);

  await client.end();
  // eslint-disable-next-line no-console
  console.log('lukso-data seed script successfully executed');
};
