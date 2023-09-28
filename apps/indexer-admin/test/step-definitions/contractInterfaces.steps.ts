import { binding, before, when } from 'cucumber-tsflow';
import { Test, TestingModule } from '@nestjs/testing';
import { assert } from 'chai';
import { ContractInterfaceTable } from '@db/lukso-structure/entities/contractInterface.table';

import { AppModule } from '../../src/app.module';
import ScenarioScopes from './scenarioScopes';
import * as request from "supertest";

@binding([ScenarioScopes])
export class ContractInterfacesSteps {
  private contractInterfaces: Array<ContractInterfaceTable> = [];
  constructor(protected context: ScenarioScopes) {}

  @before()
  public async before(): Promise<void> {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    this.context.app = moduleFixture.createNestApplication();
    await this.context.app.init();
  }

  @when(/i have a valid array of contract interfaces/)
  public async testContractInterfacesArray() {
    this.contractInterfaces.push();
    assert.equal(this.contractInterfaces.length, 1);
  }

  @when(/i call the endPoint uploadContractInterfaces/)
  public async uploadContractInterfaces() {
    try {
      const body = this.contractInterfaces;
      const post = request.default(this.context.app.getHttpServer()).post('/contractInterfaces');
      this.context.serviceStatus = this.context.response.status;
      this.context.response = await post.send(body);
    } catch (error: any) {
      this.context.response.status = error.response ? error.response.status : 200;
    }
  }
}
