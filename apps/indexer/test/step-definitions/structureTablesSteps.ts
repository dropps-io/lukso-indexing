import { newDb } from 'pg-mem';
import { given } from 'cucumber-tsflow';
import { GenericContainer, StartedTestContainer } from 'testcontainers';
import { Pool } from 'pg';

export class StructureTablesSteps {
  constructor() {}

  testContainer: StartedTestContainer | undefined;

  createPool = async () => {
    const container = await new GenericContainer('postgres').withExposedPorts(5432).start();

    const pool = new Pool({
      host: container.getHost(),
      port: container.getMappedPort(5432),
    });

    return { pool, container };
  };

  initDatabase = async (name: string) => {
    const { pool, container } = await this.createPool();

    try {
      const dbName = name.toLowerCase();

      // Connect to the default 'postgres' database to create a new database
      const client = await pool.connect();
      await client.query(`CREATE DATABASE ${dbName}`);
      client.release();

      console.log(`Database '${dbName}' created successfully.`);

      return { pool, container, dbName };
    } catch (error: any) {
      console.error(`Error creating database '${name}': ${error.message}`);
      throw error;
    }
  };

  @given(/^a database named (.+) exists$/)
  public async dbExists(name: string) {
    const { container } = await this.initDatabase(name);
    this.testContainer = container;
  }
}
