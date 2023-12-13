import { given } from 'cucumber-tsflow';
import { GenericContainer, StartedTestContainer } from 'testcontainers';
import { Pool } from 'pg';

export class StructureTablesSteps {
  constructor() {}

  testContainer1: StartedTestContainer | undefined;
  testContainer2: StartedTestContainer | undefined;
  pool1: Pool | undefined; //LuksoData database
  pool2: Pool | undefined; //LukoStructure database

  private async createPool1() {
    const container1 = await new GenericContainer('postgres').withExposedPorts(5432).start();

    const pool1 = new Pool({
      host: container1.getHost(),
      port: container1.getMappedPort(5432),
    });
    this.pool1 = pool1;

    return { pool1, container1 };
  }

  private async createPool2() {
    const container2 = await new GenericContainer('postgres').withExposedPorts(5433).start();

    const pool2 = new Pool({
      host: container2.getHost(),
      port: container2.getMappedPort(5433),
    });
    this.pool2 = pool2;

    return { pool2, container2 };
  }

  initDatabase = async (name: string) => {
    const { pool1, container1 } = await this.createPool1();
    const { pool2, container2 } = await this.createPool2();

    try {
      // Connect to the default 'postgres' of container1 database to create a new database
      const client1 = await pool1.connect();
      await client1.query(`CREATE DATABASE luksodata`);
      client1.release();

      // Connect to the default 'postgres' of container2 database to create a new database
      const client2 = await pool1.connect();
      await client2.query(`CREATE DATABASE luksostructure`);
      client2.release();

      return { pool1, container1, pool2, container2 };
    } catch (error: any) {
      console.error(`Error creating database '${name}': ${error.message}`);
      throw error;
    }
  };

  @given(/^the luksodata and luksostructure databases exist$/)
  public async dbExists() {
    const { container1 } = await this.initDatabase('luksodata');
    const { container2 } = await this.initDatabase('luksostructure');
    this.testContainer1 = container1;
    this.testContainer2 = container2;
  }

  @given(/^a table "(.+)" exists in database "(.+)"/)
  public async checkTable(tableName: string, database: string) {
    const pool = database === 'luksostructure' ? this.pool2 : this.pool1;
    const client = await pool!.connect();

    const createTableQuery = `
    CREATE TABLE ${tableName} ();
  `;

    await client.query(createTableQuery);
    client.release();
  }
}
