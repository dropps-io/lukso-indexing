import { Injectable } from '@nestjs/common';
import axios from 'axios';
import { LoggerService } from '@libs/logger/logger.service';
import winston from 'winston';

import { IPFS_GATEWAYS } from '../globals';

import { getRandomGateway } from '../utils/get-random-gateway';

@Injectable()
export class IpfsService {
  private readonly logger: winston.Logger;
  private static readonly MAX_GATEWAY_ATTEMPTS = 10; // Maximum times we'll try to get a valid gateway

  constructor(private readonly loggerService: LoggerService) {
    this.logger = loggerService.getChildLogger('IpfsGatewayService');
  }

  /**
   * Retrieves a file from IPFS using redundant gateways to improve performance.
   * @param hash - IPFS hash of the file to be retrieved.
   * @returns - A promise that resolves to the file's buffer.
   */
  public async getFileFromIPFS(hash: string): Promise<Buffer> {
    let attempt = 0;
    const maxAttempts = 3;

    while (attempt < maxAttempts) {
      try {
        const ipfsGateway = this.getRandomGatewayURL();
        if (!ipfsGateway) {
          throw new Error('Unable to get a valid IPFS gateway URL.');
        }
        const url = `${ipfsGateway}${hash}`;
        const response = await axios.get(url, { responseType: 'arraybuffer' });

        return Buffer.from(response.data as ArrayBuffer);
      } catch (e) {
        attempt++;
        this.logger.error(`Attempt ${attempt}: Error fetching file from IPFS. Error: ${e.message}`);
      }
    }

    this.logger.error(`Failed to retrieve file after ${maxAttempts} attempts.`);
    throw new Error(`Failed to retrieve file after ${maxAttempts} attempts.`);
  }

  /**
   * Retrieves a random IPFS gateway URL.
   * The function will make a maximum of 'IpfsService.MAX_GATEWAY_ATTEMPTS' attempts to fetch a URL
   * and ensures it adheres to a basic URL format.
   *
   * @returns A potentially valid IPFS gateway URL.
   * @throws {Error} If a URL in the correct format can't be obtained after the maximum attempts.
   */
  public getRandomGatewayURL(): string {
    // Basic regex pattern to validate a typical HTTP/HTTPS URL format without spaces or quotes
    const gatewayPattern = /^https?:\/\/[^ "]+$/;

    let gatewayAttempt = 0;
    let gateway = getRandomGateway();

    while (!gatewayPattern.test(gateway) && gatewayAttempt < IpfsService.MAX_GATEWAY_ATTEMPTS) {
      gatewayAttempt++;
      gateway = getRandomGateway();
    }

    // If the maximum number of attempts is reached without retrieving a URL in the correct format, log an error and throw an exception
    if (gatewayAttempt === IpfsService.MAX_GATEWAY_ATTEMPTS) {
      const errorMessage = `Exceeded maximum attempts to retrieve a correctly formatted IPFS gateway URL. Last fetched URL: ${gateway}`;
      this.logger.error(errorMessage);
      throw new Error(errorMessage);
    }

    return gateway;
  }

  public getAllGateways(): string[] {
    return IPFS_GATEWAYS.map((gateway) => `${gateway}/ipfs/`);
  }
}
