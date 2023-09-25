import { binding, given, before, then } from 'cucumber-tsflow';
import axios from 'axios';
import { Test, TestingModule } from '@nestjs/testing';
import { AppModule } from '../../src/app.module';
import { assert } from 'chai';
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
    let serviceStatus;
    try {
      const response = await axios.get('http://localhost:3000/health'); // Replace with the actual URL of your service's health check endpoint
      serviceStatus = response.status;
    } catch (error) {
      serviceStatus = error.response ? error.response.status : 500;
    }
    assert.equal(serviceStatus, 200);
  }

  @then(/^the service should return HTTP (\d+)$/)
  public async checkResponse(code: number) {
    assert.equal(this.context.serviceStatus, code);
  }
}
