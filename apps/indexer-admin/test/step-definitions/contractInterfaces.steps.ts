import { binding, before, when } from 'cucumber-tsflow';
import { Test, TestingModule } from '@nestjs/testing';
import { assert } from 'chai';
import * as request from 'supertest';

import contractInterfaces from './mocks/contractInterfaces.json';
import { AppModule } from '../../src/app.module';
import ScenarioScopes from './scenarioScopes';

@binding([ScenarioScopes])
export class ContractInterfacesSteps {
  private contractInterfaces: Array<any> = [];
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
    this.contractInterfaces.push([contractInterfaces]);
    assert.equal(this.contractInterfaces.length, 1);
  }

  @when(/i call the endPoint uploadContractInterfaces/)
  public async uploadContractInterfaces() {
    try {
      const body = this.contractInterfaces;
      const post = request.default(this.context.app.getHttpServer()).post('/contractInterface');
      this.context.serviceStatus = this.context.response.status;
      this.context.response = await post.send(body);
    } catch (error: any) {
      this.context.response.status = error.response ? error.response.status : 200;
    }
  }
}
