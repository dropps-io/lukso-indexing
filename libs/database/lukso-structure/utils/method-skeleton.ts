import { AbiItem } from 'web3-utils';

/**
 * Generates a method skeleton string from a given ABI item. The method skeleton
 * is a string representation of the method name and its input types, separated
 * by commas and enclosed in parentheses.
 *
 * Example:
 *   For an ABI item with the name "transfer" and inputs of types "address" and "uint256",
 *   the generated method skeleton would be "transfer(address,uint256)".
 *
 * @param {AbiItem} abi - The ABI item to generate the method skeleton for.
 * @returns {string} The method skeleton string.
 */
export function generateMethodSkeleton(abi: AbiItem): string {
  // Start with the method name, followed by an opening parenthesis
  let skeleton = abi.name + '(';

  // If the method has inputs, append their types to the skeleton
  if (abi.inputs && abi.inputs.length > 0) {
    for (let i = 0; i < abi.inputs.length; i++) {
      // Append the input type
      skeleton += abi.inputs[i].type;

      // If it's not the last input, append a comma
      if (i !== abi.inputs.length - 1) {
        skeleton += ',';
      }
    }
  }

  // Append the closing parenthesis
  skeleton += ')';

  return skeleton;
}
