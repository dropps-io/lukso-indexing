import winston from 'winston';
import ERC725, { ERC725JSONSchema } from '@erc725/erc725.js';
import { LSP4DigitalAsset } from '@lukso/lsp-factory.js/build/main/src/lib/interfaces/lsp4-digital-asset';
import { toUtf8String } from 'ethers';
import { ExceptionHandler } from '@decorators/exception-handler.decorator';
import { DebugLogger } from '@decorators/debug-logging.decorator';
import { MetadataResponse } from '@shared/types/metadata-response';

import { RPC_URL } from '../../../globals';
import LSP8IdentifiableDigitalAssetSchema from '../schemas/LSP8IdentifiableDigitalAssetSchema.json';
import { LSP8_TOKEN_ID_TYPE } from './enums';
import { ERC725Y_KEY } from '../config';
import { formatMetadataImages } from '../utils/format-metadata-images';
import { erc725yGetData, erc725yGetDataForTokenId } from '../utils/erc725y-get-data';
import { decodeVerifiableUrl } from '../../../utils/json-url';
import { decodeLsp8TokenId } from '../../../decoding/utils/decode-lsp8-token-id';
import { LSP4 } from '../LSP4/LSP4';
import { FetcherService } from '../../../fetcher/fetcher.service';

export class LSP8 {
  private readonly lsp4: LSP4;
  constructor(
    protected readonly fetcherService: FetcherService,
    protected readonly logger: winston.Logger,
  ) {
    this.lsp4 = new LSP4(fetcherService, logger);
  }

  /**
   * Fetches the metadata and images associated with a LSP8 token.
   *
   * @param {string} address - The contract address of the LSP8 collection.
   * @param {string} tokenId - The token ID to fetch data for.
   *
   * @returns {Promise<MetadataResponse | null>} - The metadata and images associated with the LSP8 token or null if an error occurs.
   */
  @DebugLogger()
  @ExceptionHandler(false, true, null)
  public async fetchTokenData(address: string, tokenId: string): Promise<MetadataResponse | null> {
    const tokenIdType: LSP8_TOKEN_ID_TYPE = await this.fetchTokenIdType(address);
    const decodedTokenId = decodeLsp8TokenId(tokenId, tokenIdType);

    let metadata = await this.fetchDataFromBaseURI(address, decodedTokenId);

    if (!metadata) metadata = await this.fetchUniqueTokenIdData(address, tokenId);

    return this.buildMetadataResponse(metadata, address, tokenId);
  }

  protected async fetchUniqueTokenIdData(
    address: string,
    tokenId: string,
  ): Promise<(LSP4DigitalAsset & { name?: string }) | null> {
    const response = await erc725yGetDataForTokenId(address, ERC725Y_KEY.LSP4_METADATA, tokenId);
    if (!response) return null;

    const url = decodeVerifiableUrl(response);
    return await this.lsp4.fetchLsp4MetadataFromUrl(url);
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
    const response = await erc725yGetData(address, ERC725Y_KEY.LSP8_TOKEN_METADATA_BASE_URI);
    if (!response || response === '0x') return null;

    // Convert the response to a UTF8 string, slicing off the first 10 characters
    const baseURI = toUtf8String('0x' + response.slice(10));

    // Format the token URI by appending the decoded token ID to the base URI
    const tokenURI = `${baseURI}/${decodedTokenId.length === 66 ? decodedTokenId.slice(2) : decodedTokenId}`;
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
  public async fetchTokenIdType(address: string): Promise<LSP8_TOKEN_ID_TYPE> {
    this.logger.debug(`Fetching LSP8 token id type for ${address}`, { address });
    let tokenIdType: LSP8_TOKEN_ID_TYPE = LSP8_TOKEN_ID_TYPE.bytes32;

    try {
      const response = await erc725yGetData(address, ERC725Y_KEY.LSP8_TOKEN_ID_FORMAT);
      if (response) {
        // Slice off the 0x from the response, which are the hex prefix
        const parsedData = parseInt(response.slice(2), 16);
        if (parsedData >= 0 && parsedData <= 4) tokenIdType = parsedData as LSP8_TOKEN_ID_TYPE;
      }
    } catch (e: any) {
      this.logger.error(`Failed to fetch lsp8 token id type for ${address}: ${e.message}`, {
        address,
      });
      throw e;
    }

    return tokenIdType;
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
      assets: metadata?.assets
        ? metadata?.assets.map((asset) => {
            return { ...asset, hash: asset.verification.data };
          }) || []
        : [],
    };
  }

  /**
   * Creates an instance of ERC725 with the provided address and schema.
   *
   * @param {string} address - The contract address
   */
  private getErc725(address: string): ERC725 {
    return new ERC725(LSP8IdentifiableDigitalAssetSchema as ERC725JSONSchema[], address, RPC_URL);
  }
}
