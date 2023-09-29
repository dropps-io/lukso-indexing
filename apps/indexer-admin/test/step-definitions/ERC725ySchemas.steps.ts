import { binding, before, when } from 'cucumber-tsflow';
import { Test, TestingModule } from '@nestjs/testing';
import { assert } from 'chai';

import ERC725ySchemas from './mocks/ERC725ySchemas.json';
import { AppModule } from '../../src/app.module';
import ScenarioScopes from './scenarioScopes';
import * as request from "supertest";

@binding([ScenarioScopes])
export class ERC725ySchemasSteps {
  private ERC725ySchemas: Array<any> = [];
  constructor(protected context: ScenarioScopes) {}

  @before()
  public async before(): Promise<void> {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    this.context.app = moduleFixture.createNestApplication();
    await this.context.app.init();
  }

  @when(/i have a valid array of ERC725y schemas/)
  public async testERC725ySchemasArray() {
    this.ERC725ySchemas.push([ERC725ySchemas]);
    assert.equal(this.ERC725ySchemas.length, 1);
  }

  @when(/i call the endPoint uploadERC725ySchemas/)
  public async uploadContractInterfaces() {
    try {
      const body = this.ERC725ySchemas;
      const post = request.default(this.context.app.getHttpServer()).post('/ERC725ySchemas');
      this.context.serviceStatus = this.context.response.status;
      this.context.response = await post.send(body);
    } catch (error: any) {
      this.context.response.status = error.response ? error.response.status : 200;
    }
  }
}
