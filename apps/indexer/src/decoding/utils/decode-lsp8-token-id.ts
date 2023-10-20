import { getAddress, toUtf8String } from 'ethers';

import { LSP8_TOKEN_ID_TYPE } from '../../ethers/contracts/LSP8/enums';

/**
 * Decodes an LSP8 token ID based on its type.
 *
 * @param {string} tokenId - The token ID to decode.
 * @param {LSP8_TOKEN_ID_TYPE} [tokenIdType] - The type of the token ID. If not provided, the function will assume the type is `bytes32`.
 * @returns {string} - The decoded token ID.
 *
 * @example
 * const decodedId = decodeLsp8TokenId('0x123...', LSP8_TOKEN_ID_TYPE.address);
 */
export const decodeLsp8TokenId = (tokenId: string, tokenIdType?: LSP8_TOKEN_ID_TYPE): string => {
  if (!tokenIdType) return tokenId;

  try {
    switch (tokenIdType) {
      case LSP8_TOKEN_ID_TYPE.address:
        return getAddress(tokenId.slice(0, 42));
      case LSP8_TOKEN_ID_TYPE.uint256:
        return parseInt(tokenId.slice(2), 16).toString(); // Converts hex to decimal string
      case LSP8_TOKEN_ID_TYPE.string:
        return toUtf8String(tokenId);
      case LSP8_TOKEN_ID_TYPE.bytes32:
      default: // When no tokenIdType, we assume it's a bytes32 type
        return tokenId;
    }
  } catch (error) {
    return 'Error: Unable to decode tokenId';
  }
};
