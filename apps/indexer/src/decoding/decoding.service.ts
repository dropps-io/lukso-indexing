import { Injectable } from '@nestjs/common';
import winston from 'winston';
import { LuksoStructureDbService } from '@db/lukso-structure/lukso-structure-db.service';
import { LoggerService } from '@libs/logger/logger.service';
import ERC725, { ERC725JSONSchema } from '@erc725/erc725.js';
import { ethers, getAddress } from 'ethers';
import { MethodParameterTable } from '@db/lukso-structure/entities/methodParameter.table';
import { ExceptionHandler } from '@decorators/exception-handler.decorator';
import { DebugLogger } from '@decorators/debug-logging.decorator';
import { MethodInterfaceTable } from '@db/lukso-structure/entities/methodInterface.table';
import { RedisService } from '@shared/redis/redis.service';
import { REDIS_KEY } from '@shared/redis/redis-keys';

import { ERC725Y_SUPPORTED_KEYS, WRAPPING_METHOD } from './types/enums';
import { EthersService } from '../ethers/ethers.service';
import { WrappedTransaction } from './types/wrapped-tx';
import { DecodedParameter } from './types/decoded-parameter';
import { permissionsToString } from './utils/permissions-to-string';
import { parseDecodedParameter } from './utils/parse-decoded-parameter';
import { decodedParamToKeyValueMapping } from './utils/decoded-param-to-mapping';

@Injectable()
export class DecodingService {
  private readonly logger: winston.Logger;

  constructor(
    protected readonly structureDB: LuksoStructureDbService,
    protected readonly ethersService: EthersService,
    protected loggerService: LoggerService,
    // Redis service is only used for exception handling
    protected readonly redisService: RedisService,
  ) {
    this.logger = loggerService.getChildLogger('Decoding');
  }

  /**
   * Identifies and decodes the transaction input data.
   *
   * @param {string} input - The input data string of the transaction.
   * @param _methodInterface
   * @param _methodParameters
   * @returns {Promise<{parameters: DecodedParameter[]; methodName: string;} | null>} - An object containing the decoded
   * parameters and the method name, or null if the method interface is not found.
   */
  @DebugLogger()
  public async decodeTransactionInput(
    input: string,
    _methodInterface?: MethodInterfaceTable,
    _methodParameters?: MethodParameterTable[],
  ): Promise<{ parameters: DecodedParameter[]; methodName: string } | null> {
    let methodName: string | null = null;
    const methodId = input.slice(0, 10);

    try {
      this.logger.debug(`Decoding transaction input for methodId ${methodId}`);

      const methodInterface =
        _methodInterface || (await this.structureDB.getMethodInterfaceById(methodId));

      if (!methodInterface) {
        this.logger.debug(`Method interface not found for methodId ${methodId}, exiting...`);
        return null;
      }

      methodName = methodInterface.name;

      const parameters = await this.decodeParameters(
        methodId,
        '0x' + input.slice(10),
        _methodParameters,
      );

      await this.redisService.incrementNumber(REDIS_KEY.DECODED_TX_COUNT);
      return { methodName, parameters };
    } catch (e: any) {
      this.logger.error(
        `Error decoding transaction input with methodId ${methodId}: ${e.message}`,
        { input, methodId, stack: e.stack },
      );
      await this.redisService.incrementNumber(REDIS_KEY.FAILED_DECODE_TX_COUNT);
      return methodName ? { methodName, parameters: [] } : null;
    }
  }

  /**
   * Decodes log parameters from the provided data and topics.
   *
   * @param {string} data - The encoded data string.
   * @param {string[]} topics - An array of topics, where the first element is the method hash (containing the methodIdFromInput).
   *
   * @param _methodParameters
   * @returns {Promise<DecodedParameter[] | null>} A Promise that resolves to an array of DecodedParameter objects,
   *          containing the decoded parameter values, positions, names, and types, or null if an error occurs.
   */
  @ExceptionHandler(false, true, null, REDIS_KEY.FAILED_DECODE_EVENT_COUNT)
  public async decodeLogParameters(
    data: string,
    topics: string[],
    _methodParameters?: MethodParameterTable[],
  ): Promise<DecodedParameter[] | null> {
    const methodId = topics[0].slice(0, 10);

    this.logger.debug(`Decoding log parameters for methodId ${methodId}`);

    const methodParameters =
      _methodParameters || (await this.structureDB.getMethodParametersByMethodId(methodId));
    if (!methodParameters) {
      this.logger.debug(`Method parameters not found for methodId ${methodId}, exiting...`);
      return null;
    }

    const indexedParameters = methodParameters.filter((p) => p.indexed);
    const nonIndexedParameters = methodParameters.filter((p) => !p.indexed);

    const decodedIndexedInput =
      '0x' +
      topics
        .slice(1)
        .map((t) => t.slice(2))
        .join('');

    const indexedParametersDecoded = await this.decodeParameters(
      methodId,
      decodedIndexedInput,
      indexedParameters,
    );
    const nonIndexedParametersDecoded = await this.decodeParameters(
      methodId,
      data,
      nonIndexedParameters,
    );

    await this.redisService.incrementNumber(REDIS_KEY.DECODED_EVENT_COUNT);
    return [...indexedParametersDecoded, ...nonIndexedParametersDecoded];
  }

  /**
   * Decode parameters using provided methodIdFromInput and input.
   *
   * @param {string} methodId - The methodIdFromInput to identify the parameters.
   * @param {string} input - The input data string of the transaction or the data string from the log.
   * @param {MethodParameterTable[]} parameters - The optional parameters interface to decode.
   * @returns {DecodedParameter[]} - An array of DecodedParameter objects.
   */
  private async decodeParameters(
    methodId: string,
    input: string,
    parameters?: MethodParameterTable[],
  ): Promise<DecodedParameter[]> {
    const methodParameters =
      parameters || (await this.structureDB.getMethodParametersByMethodId(methodId));

    const decodedParametersArray = ethers.AbiCoder.defaultAbiCoder().decode(
      methodParameters.map((p) => p.type),
      input,
    );

    return methodParameters.map((parameter, index) => ({
      value: parseDecodedParameter(decodedParametersArray[index]),
      position: parameter.position,
      name: parameter.name,
      type: parameter.type,
    }));
  }

  /**
   * Unwraps the wrapped transactions based on the provided method ID and decoded parameters.
   *
   * @param {string} methodId - Method ID of the transaction.
   * @param {DecodedParameter[]} decodedParameters - Decoded parameters of the transaction.
   * @param {string} contractAddress - AddressEntity of the contract where the transaction was executed
   *
   * @returns {Promise<WrappedTransaction[] | null>} - An array containing the wrapped transaction object(s), or null if the method ID is not recognized.
   */
  @ExceptionHandler(false, true, null, REDIS_KEY.FAILED_UNWRAP_TX_COUNT)
  public async unwrapTransaction(
    methodId: string,
    decodedParameters: DecodedParameter[],
    contractAddress: string,
  ): Promise<WrappedTransaction[] | null> {
    if (decodedParameters.length === 0) return null;

    this.logger.debug(
      `Unwrapping of a transaction of methodId ${methodId} executed on ${contractAddress}`,
      {
        methodId,
        decodedParameters,
        contract: contractAddress,
      },
    );

    const parametersMap = decodedParamToKeyValueMapping(decodedParameters);
    //TODO: Implement batch execution unwrapping

    switch (methodId) {
      case WRAPPING_METHOD.LSP6_EXECUTE_V0_6:
      case WRAPPING_METHOD.LSP6_EXECUTE_RELAY_V0_X:
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
  }

  /**
   * Decodes an ERC725Y key-value pair based on the provided key and value.
   *
   * @param {string} key - The key associated with the value to decode.
   * @param {string} value - The value to decode.
   * @returns {Promise<{ value: string; keyParameters: string[]; keyIndex: number | null } | null>} A Promise that resolves to an object containing the decoded value, key parameters, and key index. If the value cannot be decoded, it resolves to null.
   */
  @ExceptionHandler(false, true, null, REDIS_KEY.FAILED_DECODE_ERC725Y_COUNT)
  public async decodeErc725YKeyValuePair(
    key: string,
    value: string,
  ): Promise<{ value: string; keyParameters: string[]; keyIndex: number | null } | null> {
    // Get the schema for the provided key
    const schema = await this.structureDB.getErc725ySchemaByKey(key);
    if (!schema) return null;

    // Decode the key and obtain key parameters and index
    const decodedKey = this.decodeErc725YKey(key, schema as ERC725JSONSchema);

    // Decode the value and handle array length case
    const decodedValue = this.decodeErc725YValue(value, decodedKey.keyParameters, {
      ...schema,
      valueContent:
        key === schema.key && schema.keyType === 'Array' ? 'Number' : schema.valueContent,
    } as ERC725JSONSchema);

    if (!decodedValue) return null;

    await this.redisService.incrementNumber(REDIS_KEY.DECODED_ERC725Y_COUNT);
    // Return the decoded value and key parameters, if applicable
    return { value: decodedValue, ...decodedKey };
  }

  /**
   * Decodes an ERC725Y key and returns key parameters and key index.
   *
   * @param {string} key - The key to decode.
   * @param {ERC725JSONSchema} schema - The schema associated with the key.
   * @returns {{ keyParameters: string[]; keyIndex: number | null }} An object containing the key parameters and key index.
   */
  @DebugLogger()
  protected decodeErc725YKey(
    key: string,
    schema: ERC725JSONSchema,
  ): { keyParameters: string[]; keyIndex: number | null } {
    if (schema.keyType === 'Array' && schema.key !== key)
      return {
        keyParameters: [],
        keyIndex: parseInt(key.slice(34), 16),
      };

    // Decode the dynamic key parts
    const dynamicKeyParts = ERC725.decodeMappingKey(key, schema as ERC725JSONSchema);
    return {
      keyParameters: dynamicKeyParts ? dynamicKeyParts.map((p) => p.value.toString()) : [],
      keyIndex: null,
    };
  }

  /**
   * Decodes an ERC725Y value based on the provided value, dynamic key parts, and schema.
   *
   * @param {string} value - The value to decode.
   * @param {string[]} dynamicKeyParts - The dynamic key parts.
   * @param {ERC725JSONSchema} schema - The schema associated with the value.
   * @returns {string | null} The decoded value or null if the value cannot be decoded.
   */
  @DebugLogger()
  protected decodeErc725YValue(
    value: string,
    dynamicKeyParts: string[],
    schema: ERC725JSONSchema,
  ): string | null {
    // Decode the value based on the dynamic key parts and schema
    const decodedValue = ERC725.decodeData(
      [
        {
          value,
          keyName: schema.name,
          dynamicKeyParts,
        },
      ],
      [
        {
          ...schema,
          keyType: schema.keyType === 'Array' ? 'Singleton' : schema.keyType,
          valueType: schema.keyType === 'Array' ? 'uint256' : schema.valueType,
        },
      ],
    );

    // Special handling for ADDRESS_PERMISSIONS
    if (schema.name === ERC725Y_SUPPORTED_KEYS.ADDRESS_PERMISSIONS) {
      const permissions = ERC725.decodePermissions(value);
      return permissionsToString(permissions);
    }

    if (decodedValue.length === 0) return null;
    return decodedValue[0].value;
  }

  /**
   * Unwraps an ERC725X execute transaction.
   *
   * @param {Record<string, string>} parametersMap - Map of parameter names to values.
   *
   * @returns {Promise<WrappedTransaction | null>} - The wrapped transaction object, or null if an error occurs.
   */
  @ExceptionHandler(true, true)
  protected async unwrapErc725XExecute(
    parametersMap: Record<string, string>,
  ): Promise<WrappedTransaction | null> {
    this.logger.debug(`Unwrapping of an ERC725X execute transaction executed`, { parametersMap });

    const wrappedInput: string = parametersMap['data'];
    const toAddress: string = parametersMap['target'] || parametersMap['to'];
    return await this.getWrappedTransaction(
      wrappedInput,
      getAddress(toAddress),
      parametersMap['value'],
    );
  }

  /**
   * Unwraps an LSP6 execute or execute relay transaction.
   *
   * @param {string} contractAddress - AddressEntity of the contract which executed the wrapped transaction.
   * @param {Record<string, string>} parametersMap - Map of parameter names to values.
   *
   * @returns {Promise<WrappedTransaction | null>} - The wrapped transaction object, or null if an error occurs.
   */
  @ExceptionHandler(true, true)
  protected async unwrapLSP6Execute(
    contractAddress: string,
    parametersMap: Record<string, string>,
  ): Promise<WrappedTransaction | null> {
    this.logger.debug(`Unwrapping of a LSP6 execute transaction executed on ${contractAddress}`, {
      contract: contractAddress,
    });

    const targetFuncSig = ethers.id('target()').slice(0, 10); // get the first 4 bytes (8 characters) of the keccak-256 hash of the function signature

    const callTransaction = {
      to: contractAddress,
      data: targetFuncSig,
    };

    const result = await this.ethersService.getProvider().call(callTransaction);
    if (!result || result === '0x') {
      this.logger.warn(`No target found for ${contractAddress}`, {
        contract: contractAddress,
      });
      return null;
    }

    // If the "target" function returns an address, decode the result like this:
    const targetAddress = ethers.getAddress('0x' + result.slice(26)); // remove the first 12 bytes (24 characters) from the returned data

    const wrappedInput = (parametersMap['payload'] || parametersMap['_calldata']) as string;
    return await this.getWrappedTransaction(wrappedInput, targetAddress, '0');
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
