import { Injectable } from '@nestjs/common';
import Web3 from 'web3';
import LSP6KeyManager from '@lukso/lsp-smart-contracts/artifacts/LSP6KeyManager.json';
import { AbiItem, toChecksumAddress } from 'web3-utils';
import winston from 'winston';

import { LuksoStructureDbService } from '../../../../libs/database/lukso-structure/lukso-structure-db.service';
import { WRAPPING_METHOD } from './types/enums';
import { Web3Service } from '../web3/web3.service';
import { LoggerService } from '../../../../libs/logger/logger.service';
import { WrappedTransaction } from './types/wrapped-tx';
import { DecodedParameter } from './types/decoded-parameter';

@Injectable()
export class DecodingService {
  private readonly web3: Web3;
  private readonly logger: winston.Logger;

  constructor(
    protected readonly structureDB: LuksoStructureDbService,
    protected readonly web3Service: Web3Service,
    protected loggerService: LoggerService,
  ) {
    this.web3 = web3Service.getWeb3();
    this.logger = loggerService.getChildLogger('Decoding');
  }

  /**
   * Identifies and decodes the transaction input data.
   *
   * @param {string} input - The input data string of the transaction.
   * @returns {Promise<{parameters: DecodedParameter[]; methodName: string;} | null>} - An object containing the decoded
   * parameters and the method name, or null if the method interface is not found.
   */
  public async decodeTransactionInput(input: string): Promise<{
    parameters: DecodedParameter[];
    methodName: string;
  } | null> {
    let methodName: string | null = null;
    try {
      const methodId = input.slice(0, 10);

      const methodInterface = await this.structureDB.getMethodInterfaceById(methodId);
      if (!methodInterface) return null;

      methodName = methodInterface.name;
      const methodParameters = await this.structureDB.getMethodParametersByMethodId(methodId);

      // Decode the parameters using the Web3 library.
      const decodedParameters = this.web3.eth.abi.decodeParameters(
        methodParameters,
        input.slice(10),
      );

      // Map the decoded parameters to the DecodedParameter[] format.
      const parameters: DecodedParameter[] = methodParameters.map((parameter) => ({
        value: (decodedParameters[parameter.name] as string) || '',
        position: parameter.position,
        name: parameter.name,
        type: parameter.type,
      }));

      return { methodName, parameters };
    } catch (e) {
      this.logger.error(`Error decoding transaction input: ${e.message}`, {
        input,
      });
      return methodName ? { methodName, parameters: [] } : null;
    }
  }

  /**
   * Unwraps the wrapped transactions based on the provided method ID and decoded parameters.
   *
   * @param {string} methodId - Method ID of the transaction.
   * @param {DecodedParameter[]} decodedParameters - Decoded parameters of the transaction.
   * @param {string} contractAddress - Address of the contract where the transaction was executed
   *
   * @returns {Promise<WrappedTransaction[] | null>} - An array containing the wrapped transaction object(s), or null if the method ID is not recognized.
   */
  public async unwrapTransaction(
    methodId: string,
    decodedParameters: DecodedParameter[],
    contractAddress: string,
  ): Promise<WrappedTransaction[] | null> {
    this.logger.info('Unwrapping transaction', { methodId, decodedParameters, contractAddress });

    try {
      if (decodedParameters.length === 0) return null;

      const parametersMap = decodedParameters.reduce((map, parameter) => {
        map[parameter.name] = parameter.value;
        return map;
      }, {});

      //TODO: Implement batch execution unwrapping

      switch (methodId) {
        case WRAPPING_METHOD.LSP6_EXECUTE_V0_6:
        case WRAPPING_METHOD.LSP6_EXECUTE_RELAY_V0_6: {
          const unwrappedTransaction = await this.unwrapLSP6Execute(contractAddress, parametersMap);
          return unwrappedTransaction ? [unwrappedTransaction] : null;
        }
        case WRAPPING_METHOD.LSP6_EXECUTE_RELAY_BATCH_V0_8:
        case WRAPPING_METHOD.LSP6_EXECUTE_BATCH_V0_8:
        case WRAPPING_METHOD.ERC725X_EXECUTE_BATCH_V4_2:
          return null;
        case WRAPPING_METHOD.ERC725X_EXECUTE_V3: {
          const unwrappedTransaction = await this.unwrapErc725XExecute(parametersMap);
          return unwrappedTransaction ? [unwrappedTransaction] : null;
        }
        default:
          return null;
      }
    } catch (e) {
      this.logger.error(`Error unwrapping transaction: ${e.message}`, {
        methodId,
        decodedParameters,
        contractAddress,
      });
      return null;
    }
  }

  /**
   * Unwraps an ERC725X execute transaction.
   *
   * @param {Record<string, string>} parametersMap - Map of parameter names to values.
   *
   * @returns {Promise<WrappedTransaction | null>} - The wrapped transaction object, or null if an error occurs.
   */
  protected async unwrapErc725XExecute(
    parametersMap: Record<string, string>,
  ): Promise<WrappedTransaction | null> {
    try {
      const wrappedInput: string = parametersMap['data'];
      return await this.getWrappedTransaction(
        wrappedInput,
        toChecksumAddress(parametersMap['to']),
        parametersMap['value'],
      );
    } catch (e) {
      this.logger.error(`Error unwrapping ERC725X execute: ${e.message}`, {
        parametersMap,
      });
      return null;
    }
  }

  /**
   * Unwraps an LSP6 execute or execute relay transaction.
   *
   * @param {string} contractAddress - Address of the contract which executed the wrapped transaction.
   * @param {Record<string, string>} parametersMap - Map of parameter names to values.
   *
   * @returns {Promise<WrappedTransaction | null>} - The wrapped transaction object, or null if an error occurs.
   */
  protected async unwrapLSP6Execute(
    contractAddress: string,
    parametersMap: Record<string, string>,
  ): Promise<WrappedTransaction | null> {
    try {
      const keyManagerContract = new this.web3.eth.Contract(
        LSP6KeyManager.abi as AbiItem[],
        contractAddress,
      );
      const toAddress = await keyManagerContract.methods.target().call();
      const wrappedInput = parametersMap['payload'] as string;
      return await this.getWrappedTransaction(wrappedInput, toAddress, '0');
    } catch (e) {
      this.logger.error(`Error unwrapping LSP6 execute: ${e.message}`, {
        contractAddress,
        parametersMap,
      });
      return null;
    }
  }

  /**
   * Decodes the input data of a wrapped transaction input and returns the decoded parameters and method name.
   *
   * @param {string} wrappedInput - The input data of the wrapped transaction to be decoded.
   * @param {string} toAddress - The address of the contract to which the transaction was sent.
   * @param {string} value - The value (in wei) sent with the wrapped transaction.
   *
   * @returns {Promise<WrappedTransaction>} - The wrapped transaction object.
   */
  protected async getWrappedTransaction(
    wrappedInput: string,
    toAddress: string,
    value: string,
  ): Promise<WrappedTransaction> {
    const wrappedParams = await this.decodeTransactionInput(wrappedInput);
    return {
      input: wrappedInput,
      value: value,
      to: toAddress,
      parameters: wrappedParams ? wrappedParams.parameters : [],
      methodName: wrappedParams ? wrappedParams.methodName : null,
    };
  }
}
