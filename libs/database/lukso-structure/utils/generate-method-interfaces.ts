import { AbiItem, AbiInput, keccak256 } from 'web3-utils';
import { LoggerService } from '@libs/logger/logger.service';
import { tryExecuting } from '@utils/try-executing';

import { MethodInterfaceTable } from '../entities/methodInterface.table';
import { LuksoStructureDbService } from '../lukso-structure-db.service';
import { generateMethodSkeleton } from './method-skeleton';

type MethodInterfaceWithParams = MethodInterfaceTable & {
  parameters: AbiInput[];
};

const db = new LuksoStructureDbService(new LoggerService());

/**
 * Generates and persists method interfaces and their parameters from an array of contract ABIs.
 * It filters out pure and view methods, then generates a method skeleton and hash for each valid method.
 * It also persists the method interfaces and their parameters in the database.
 *
 * @param {AbiItem[][]} contractAbis - An array of arrays of contract ABIs.
 * @returns {Promise<void>} Resolves when the operation is complete.
 */

let isDbDisconnected = false;

// Function to disconnect from the database
async function disconnectFromDatabase() {
  if (!isDbDisconnected) {
    await db.disconnect();
    isDbDisconnected = true;
  }
}
export async function generateAndPersistMethodInterfaces(contractAbis: AbiItem[][]): Promise<void> {
  const interfaces: MethodInterfaceWithParams[] = [];

  // Iterate through contract ABIs and build the interfaces array
  contractAbis.forEach((abis) => {
    abis.forEach((abi) => {
      // Check if the ABI item is a valid method (either a function or an event) and not a pure or view method
      if (
        abi.name &&
        (abi.type === 'event' || abi.type === 'function') &&
        abi.stateMutability !== 'pure' &&
        abi.stateMutability !== 'view'
      ) {
        // Generate the method skeleton and its hash
        const skeleton = generateMethodSkeleton(abi);
        const methodHash = keccak256(skeleton);

        // Add the method interface to the array if it doesn't already exist
        if (interfaces.filter((x) => x.hash === methodHash).length === 0)
          interfaces.push({
            name: abi.name,
            type: abi.type,
            hash: methodHash,
            id: methodHash.slice(0, 10),
            parameters: abi.inputs as AbiInput[],
          });
      }
    });
  });

  //Batch insert method interfaces
  await tryExecuting(db.batchInsertMethodInterfaces(interfaces));

  const methodParameters: any = [];

  for (const methodInterface of interfaces) {
    let n = 0;
    for (const parameter of methodInterface.parameters) {
      methodParameters.push({
        methodId: methodInterface.id,
        ...parameter,
        position: n,
        indexed: parameter.indexed || false,
      });
      n++;
    }
  }

  //Batch insert method parameters
  await tryExecuting(db.batchInsertMethodParameters(methodParameters));

  await disconnectFromDatabase();
}
