import { Injectable } from '@nestjs/common';
import Web3 from 'web3';

import { TxParameterTable } from '../../../../libs/database/lukso-data/entities/txParameter.table';
import { LuksoStructureDbService } from '../../../../libs/database/lukso-structure/lukso-structure-db.service';

@Injectable()
export class DecodingService {
  private readonly web3: Web3;

  constructor(private readonly structureDB: LuksoStructureDbService) {
    this.web3 = new Web3();
  }

  public async identifyAndDecodeTransactionInput(input: string): Promise<{
    parameters: Omit<TxParameterTable, 'transactionHash' | 'unwrapped'>[];
    methodName: string;
  } | null> {
    const methodId = input.slice(0, 10);
    const parameters: Omit<TxParameterTable, 'transactionHash' | 'unwrapped'>[] = [];
    const methodInterface = await this.structureDB.getMethodInterfaceById(methodId);
    if (!methodInterface) return null;

    const methodName = methodInterface.name;

    const methodParameters = await this.structureDB.getMethodParametersByMethodId(methodId);
    const decodedParameters = this.web3.eth.abi.decodeParameters(methodParameters, input.slice(10));

    methodParameters.forEach((parameter) => {
      parameters.push({
        value: decodedParameters[parameter.name] as string,
        position: parameter.position,
        name: parameter.name,
        type: parameter.type,
      });
    });

    return { methodName, parameters };
  }
}
