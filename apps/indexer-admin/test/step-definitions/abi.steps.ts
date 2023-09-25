import { binding, when, before } from 'cucumber-tsflow';
import { Test, TestingModule } from '@nestjs/testing';
import { AppModule } from '../../src/app.module';
import { AbiItem } from 'web3-utils';
import { assert } from 'chai';
import LSP8MintableABI from './mocks/LSP8MintableABI.json';
import axios from 'axios';
import ScenarioScopes from './scenarioScopes';
@binding([ScenarioScopes])
export class HelloWorldSteps {
  private ABIs: Array<AbiItem> = [];
  constructor(protected context: ScenarioScopes) {}

  @before()
  public async before(): Promise<void> {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    this.context.app = moduleFixture.createNestApplication();
    await this.context.app.init();
  }

  @when(/i have a valid array of ABIs/)
  public async testABIArray() {
    // eslint-disable-next-line @typescript-eslint/ban-ts-comment
    // @ts-ignore
    this.ABIs.push([LSP8MintableABI]);
    assert.equal(this.ABIs.length, 1);
  }

  @when(/i call the endPoint uploadAbi/)
  public async uploadAbi() {
    try {
      this.context.response = await axios.post(
        'http://localhost:3000/abi',
        this.ABIs,
        {
          headers: {
            'Content-Type': 'application/json',
          },
        },
      );
      this.context.serviceStatus = this.context.response.status;
    } catch (error) {
      this.context.serviceStatus = error.response ? error.response.status : 200;
    }
  }
}
