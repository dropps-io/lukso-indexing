import { Injectable } from '@nestjs/common';
import Web3 from 'web3';

import { LuksoStructureDbService } from '../../../../libs/database/lukso-structure/lukso-structure-db.service';

interface DecodedParameter {
  value: string;
  position: number;
  name: string;
  type: string;
}

@Injectable()
export class DecodingService {
  private readonly web3: Web3;

  constructor(private readonly structureDB: LuksoStructureDbService) {
    this.web3 = new Web3();
  }

  /**
   * Identifies and decodes the transaction input data.
   *
   * @param {string} input - The input data string of the transaction.
   * @returns {Promise<{parameters: DecodedParameter[]; methodName: string;} | null>} - An object containing the decoded
   * parameters and the method name, or null if the method interface is not found.
   */
  public async identifyAndDecodeTransactionInput(input: string): Promise<{
    parameters: DecodedParameter[];
    methodName: string;
  } | null> {
    const methodId = input.slice(0, 10);

    const methodInterface = await this.structureDB.getMethodInterfaceById(methodId);
    if (!methodInterface) return null;

    const methodName = methodInterface.name;
    const methodParameters = await this.structureDB.getMethodParametersByMethodId(methodId);

    // Decode the parameters using the Web3 library.
    const decodedParameters = this.web3.eth.abi.decodeParameters(methodParameters, input.slice(10));

    // Map the decoded parameters to the DecodedParameter[] format.
    const parameters: DecodedParameter[] = methodParameters.map((parameter) => ({
      value: decodedParameters[parameter.name] as string,
      position: parameter.position,
      name: parameter.name,
      type: parameter.type,
    }));

    return { methodName, parameters };
  }
}
