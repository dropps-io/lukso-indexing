import { binding, given, before, then } from 'cucumber-tsflow';
import { Test, TestingModule } from '@nestjs/testing';
import { AppModule } from '../../src/app.module';
import { assert } from 'chai';
import * as request from 'supertest';
import ScenarioScopes from './scenarioScopes';
@binding([ScenarioScopes])
export class CommonsSetps {
  constructor(protected context: ScenarioScopes) {}

  @before()
  public async before(): Promise<void> {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    this.context.app = moduleFixture.createNestApplication();
    await this.context.app.init();
  }

  @given(/the API is running/)
  public async callToAPI() {
    const get = request(this.context.app.getHttpServer()).get('/abi');
    this.context.response = await get.send();
    assert.equal(this.context.response.status, 200);
  }

  @then(/^the service should return HTTP (\d+)$/)
  public async checkResponse(code: number) {
    assert.equal(this.context.serviceStatus, code);
  }
}
