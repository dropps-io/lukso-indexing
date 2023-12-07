import { newDb } from 'pg-mem';
import { given } from 'cucumber-tsflow';

export class StructureTablesSteps {
  constructor() {}

  @given(/^a database named (.+) exists$/)
  public async dbExists(name: string) {
  }
}
