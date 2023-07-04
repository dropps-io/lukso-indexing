import winston from 'winston';
import ERC725, { ERC725JSONSchema } from '@erc725/erc725.js';
import { LSP4DigitalAsset } from '@lukso/lsp-factory.js/build/main/src/lib/interfaces/lsp4-digital-asset';
import { GetDataDynamicKey } from '@erc725/erc725.js/build/main/src/types/GetData';
import { getAddress, toUtf8String } from 'ethers';

import { MetadataResponse } from '../../types/metadata-response';
import { IPFS_GATEWAY, RPC_URL } from '../../../globals';
import LSP8IdentifiableDigitalAssetSchema from '../schemas/LSP8IdentifiableDigitalAssetSchema.json';
import { LSP8_TOKEN_ID_TYPE } from './enums';
import { ERC725Y_KEY } from '../config';
import { formatMetadataImages } from '../utils/format-metadata-images';

export class LSP8 {
  constructor(protected readonly logger: winston.Logger) {}

  /**
   * Fetches the metadata and images associated with a LSP8 token.
   *
   * @param {string} address - The contract address of the LSP8 collection.
   * @param {string} tokenId - The token ID to fetch data for.
   *
   * @returns {Promise<MetadataResponse | null>} - The metadata and images associated with the LSP8 token or null if an error occurs.
   */
  public async fetchTokenData(
    address: string,
    tokenId: string,
  ): Promise<{ metadata: MetadataResponse; decodedTokenId: string } | null> {
    try {
      const erc725 = this.getErc725(address);

      // Determine the tokenId type.
      const tokenIdType: LSP8_TOKEN_ID_TYPE = await this.getTokenIdType(address);
      // Generate the dynamic key for fetching the token metadata.
      const tokenMetadataKey: GetDataDynamicKey = this.getTokenMetadataKey(tokenIdType, tokenId);

      // Fetch metadata from the contract using the dynamic key.
      const metadata = (
        (await erc725.fetchData(tokenMetadataKey)).value as unknown as {
          LSP4Metadata: LSP4DigitalAsset & { name?: string };
        }
      )?.LSP4Metadata;

      return {
        metadata: this.buildMetadataResponse(metadata, address, tokenId),
        decodedTokenId: tokenMetadataKey.dynamicKeyParts as string,
      };
    } catch (error) {
      this.logger.warn(`Failed to fetch lsp8 token metadata: ${error.message}`, { address });
      return null;
    }
  }

  /**
   * Fetches the token ID type associated with the LSP8 contract.
   *
   * @param {string} address - The contract address of the LSP8 token.
   * @returns {Promise<LSP8_TOKEN_ID_TYPE>} - The token ID type of the LSP8 token.
   *
   * @throws Will throw an error if the contract do no implements ERC725Y contract.
   */
  protected async getTokenIdType(address: string): Promise<LSP8_TOKEN_ID_TYPE> {
    const erc725 = this.getErc725(address);
    let tokenIdType: LSP8_TOKEN_ID_TYPE = LSP8_TOKEN_ID_TYPE.unknown;

    try {
      const fetchedData = (await erc725.fetchData(ERC725Y_KEY.LSP8_TOKEN_ID_TYPE)).value;
      if (typeof fetchedData !== 'string') return tokenIdType;
      const parsedData = parseInt(fetchedData);
      if (parsedData >= LSP8_TOKEN_ID_TYPE.unknown && parsedData <= LSP8_TOKEN_ID_TYPE.string)
        tokenIdType = parsedData as LSP8_TOKEN_ID_TYPE;
    } catch (e) {
      this.logger.error(`Failed to fetch lsp8 token id type: ${e.message}`, { address });
      throw e;
    }

    return tokenIdType;
  }

  /**
   * Generates the token metadata ERC725YSchema key based on the token ID type and token ID.
   *
   * @param {LSP8_TOKEN_ID_TYPE} tokenIdType - The token ID type of the LSP8 contract.
   * @param {string} tokenId - The token ID to generate metadata key for.
   * @returns {GetDataDynamicKey} - The generated token metadata key.
   */
  private getTokenMetadataKey(tokenIdType: LSP8_TOKEN_ID_TYPE, tokenId: string): GetDataDynamicKey {
    let keyName: string;
    let dynamicKeyParts: string;

    switch (tokenIdType) {
      case LSP8_TOKEN_ID_TYPE.address:
        keyName = 'LSP8MetadataJSON:<address>';
        dynamicKeyParts = getAddress(tokenId.slice(0, 42));
        break;
      case LSP8_TOKEN_ID_TYPE.uint256:
        keyName = 'LSP8MetadataJSON:<uint256>';
        dynamicKeyParts = parseInt(tokenId.slice(2), 16).toString();
        break;
      case LSP8_TOKEN_ID_TYPE.string:
        keyName = 'LSP8MetadataJSON:<string>';
        dynamicKeyParts = toUtf8String(tokenId);
        break;
      case LSP8_TOKEN_ID_TYPE.bytes32:
      default: // When no tokenIdType, we assume it's a bytes32 type
        keyName = 'LSP8MetadataJSON:<bytes32>';
        dynamicKeyParts = tokenId;
        break;
    }

    return {
      keyName,
      dynamicKeyParts,
    };
  }

  /**
   * Builds a MetadataResponse object using the provided metadata, images, address, and tokenId.
   *
   * @param {(LSP4DigitalAsset & { name?: string }) | null} metadata - The metadata associated with the LSP8 token.
   * @param {string} address - The contract address of the LSP8 contract.
   * @param {string} tokenId - The token ID to build MetadataResponse for.
   *
   * @returns {MetadataResponse} - The constructed MetadataResponse object.
   */
  private buildMetadataResponse(
    metadata: (LSP4DigitalAsset & { name?: string }) | null,
    address: string,
    tokenId: string,
  ): MetadataResponse {
    return {
      metadata: {
        address,
        tokenId,
        name: metadata?.name || null,
        description: metadata?.description || null,
        symbol: null,
        isNFT: true,
      },
      images: formatMetadataImages(metadata?.images, null),
      tags: [],
      links: metadata?.links || [],
      assets: metadata?.assets || [],
    };
  }

  /**
   * Creates an instance of ERC725 with the provided address and schema.
   *
   * @param {string} address - The contract address
   */
  private getErc725(address: string): ERC725 {
    return new ERC725(LSP8IdentifiableDigitalAssetSchema as ERC725JSONSchema[], address, RPC_URL, {
      ipfsGateway: IPFS_GATEWAY,
    });
  }
}
