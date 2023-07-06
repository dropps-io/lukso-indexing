import winston from 'winston';
import ERC725, { ERC725JSONSchema } from '@erc725/erc725.js';
import { LSP4DigitalAsset } from '@lukso/lsp-factory.js/build/main/src/lib/interfaces/lsp4-digital-asset';
import { toUtf8String } from 'ethers';
import { keccak } from '@utils/keccak';

import { MetadataResponse } from '../../types/metadata-response';
import { IPFS_GATEWAY, RPC_URL } from '../../../globals';
import LSP8IdentifiableDigitalAssetSchema from '../schemas/LSP8IdentifiableDigitalAssetSchema.json';
import { LSP8_TOKEN_ID_TYPE } from './enums';
import { ERC725Y_KEY } from '../config';
import { formatMetadataImages } from '../utils/format-metadata-images';
import { erc725yGetData } from '../utils/erc725y-get-data';
import { formatUrl } from '../../../utils/format-url';
import { decodeJsonUrl } from '../../../utils/json-url';
import { decodeLsp8TokenId } from '../../../decoding/utils/decode-lsp8-token-id';
import { LSP4 } from '../LSP4/LSP4';
import { EthersService } from '../../ethers.service';

export class LSP8 {
  private readonly lsp4: LSP4;
  constructor(private ethersService: EthersService, private logger: winston.Logger) {
    this.lsp4 = new LSP4(logger);
  }

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
      this.logger.debug(`Fetching LSP8 data for ${address}:${tokenId}`, { address, tokenId });

      // Determine the tokenId type.
      const tokenIdType: LSP8_TOKEN_ID_TYPE = await this.fetchTokenIdType(address);
      // Generate the dynamic key for fetching the token metadata.
      const decodedTokenId = decodeLsp8TokenId(tokenId, tokenIdType);

      let metadata = await this.fetchDataFromBaseURI(address, decodedTokenId);

      if (!metadata)
        metadata = await this.fetchDataFromMetadataURI(address, decodedTokenId, tokenIdType);

      if (!metadata)
        metadata = await this.fetchDataFromMetadataURI(address, decodedTokenId, tokenIdType, true);

      return {
        metadata: this.buildMetadataResponse(metadata, address, tokenId),
        decodedTokenId,
      };
    } catch (error) {
      this.logger.warn(`Failed to fetch lsp8 token metadata: ${error.message}`, { address });
      return null;
    }
  }

  protected async fetchDataFromMetadataURI(
    address: string,
    decodedTokenId: string,
    tokenIdType: LSP8_TOKEN_ID_TYPE,
    legacy?: boolean,
  ): Promise<(LSP4DigitalAsset & { name?: string }) | null> {
    const tokenMetadataKey: string = this.getLsp8TokenMetadataKey(tokenIdType, legacy);

    // Todo: Tmp fix as there is an issue with the new metadata key hash
    let key = this.getErc725(address).encodeKeyName(tokenMetadataKey, decodedTokenId);
    key = (legacy ? '0x9a26b4060ae7f7d5e3cd0000' : '0x4690256ef7e93288012f0000') + key.slice(26);

    const response = await erc725yGetData(address, key);
    if (!response) return null;

    const url = legacy ? decodeJsonUrl(response) : toUtf8String('0x' + response.slice(10));

    return await this.lsp4.fetchLsp4MetadataFromUrl(formatUrl(url));
  }

  /**
   * Fetches data from the base URI.
   *
   * @param {string} address - The address from which to fetch data.
   * @param {string} decodedTokenId - The decoded token ID.
   *
   * @returns {Promise<(LSP4DigitalAsset & { name?: string }) | null>} -
   * A promise that resolves to an object containing the digital asset's metadata, or null if an error occurs.
   */
  protected async fetchDataFromBaseURI(
    address: string,
    decodedTokenId: string,
  ): Promise<(LSP4DigitalAsset & { name?: string }) | null> {
    // Fetch data from the ERC725Y smart contract by providing the hash of 'LSP8TokenMetadataBaseURI'
    const response = await erc725yGetData(address, keccak('LSP8TokenMetadataBaseURI'));
    if (!response || response === '0x') return null;

    // Convert the response to a UTF8 string, slicing off the first 10 characters
    const baseURI = toUtf8String('0x' + response.slice(10));

    // Format the token URI by appending the decoded token ID to the base URI
    const tokenURI = `${formatUrl(baseURI)}/${decodedTokenId}`;
    return await this.lsp4.fetchLsp4MetadataFromUrl(tokenURI);
  }

  /**
   * Fetches the token ID type associated with the LSP8 contract.
   *
   * @param {string} address - The contract address of the LSP8 token.
   * @returns {Promise<LSP8_TOKEN_ID_TYPE>} - The token ID type of the LSP8 token.
   *
   * @throws Will throw an error if the contract do no implements ERC725Y contract.
   */
  protected async fetchTokenIdType(address: string): Promise<LSP8_TOKEN_ID_TYPE> {
    this.logger.debug(`Fetching LSP8 token id type for ${address}`, { address });
    let tokenIdType: LSP8_TOKEN_ID_TYPE = LSP8_TOKEN_ID_TYPE.unknown;

    try {
      const response = await erc725yGetData(address, ERC725Y_KEY.LSP8_TOKEN_ID_TYPE);
      if (response) {
        // Slice off the 0x from the response, which are the hex prefix
        const parsedData = parseInt(response.slice(2), 16);
        if (parsedData >= LSP8_TOKEN_ID_TYPE.unknown && parsedData <= LSP8_TOKEN_ID_TYPE.string)
          tokenIdType = parsedData as LSP8_TOKEN_ID_TYPE;
      }
    } catch (e) {
      this.logger.error(`Failed to fetch lsp8 token id type for ${address}: ${e.message}`, {
        address,
      });
      throw e;
    }

    return tokenIdType;
  }

  /**
   * Generates the token metadata ERC725YSchema key based on the token ID type and token ID.
   *
   * @param {LSP8_TOKEN_ID_TYPE} tokenIdType - The token ID type of the LSP8 contract.
   * @param legacy
   * @returns string - The generated token metadata key.
   */
  protected getLsp8TokenMetadataKey(tokenIdType: LSP8_TOKEN_ID_TYPE, legacy?: boolean): string {
    const keyNamePrefix = legacy ? 'LSP8MetadataJSON' : 'LSP8MetadataTokenURI';

    if (tokenIdType === LSP8_TOKEN_ID_TYPE.address) return `${keyNamePrefix}:<address>`;
    else if (tokenIdType === LSP8_TOKEN_ID_TYPE.uint256) return `${keyNamePrefix}:<uint256>`;
    else if (tokenIdType === LSP8_TOKEN_ID_TYPE.string) return `${keyNamePrefix}:<string>`;
    else return `${keyNamePrefix}:<bytes32>`;
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
