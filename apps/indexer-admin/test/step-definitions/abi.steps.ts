import { binding, when, before } from 'cucumber-tsflow';
import { Test, TestingModule } from '@nestjs/testing';
import { AbiItem } from 'web3-utils';
import { assert } from 'chai';
import * as request from 'supertest';

import { AppModule } from '../../src/app.module';
import LSP8MintableABI from './mocks/LSP8MintableABI.json';
import BrokenAbiItem from './mocks/BrokenAbiItem.json';
import ScenarioScopes from './scenarioScopes';

@binding([ScenarioScopes])
export class AbiSteps {
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

  @when(/i have a un-valid array of ABIs/)
  public async testBadABIArray() {
    // eslint-disable-next-line @typescript-eslint/ban-ts-comment
    // @ts-ignore
    this.ABIs.push([BrokenAbiItem]);
    assert.equal(this.ABIs.length, 1);
    assert.equal(this.ABIs[1]?.inputs?.length, 0);
  }

  @when(/i call the endPoint uploadAbi/)
  public async uploadAbi() {
    try {
      const body = this.ABIs;
      const post = request.default(this.context.app.getHttpServer()).post('/abi');
      this.context.serviceStatus = this.context.response.status;
      this.context.response = await post.send(body);
    } catch (error: any) {
      this.context.response.status = error.response ? error.response.status : 200;
    }
  }
}
