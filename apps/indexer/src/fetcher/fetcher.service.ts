import { Injectable } from '@nestjs/common';
import { sleep } from '@utils/sleep';
import axios from 'axios';
import { formatUrl } from '@utils/format-url';

import { IPFS_GATEWAYS } from '../globals';

@Injectable()
export class FetcherService {
  async fetch<T>(
    url: string,
    urlParams: { [key: string]: any } = {},
    retries = 0,
    retryDelay = 0,
    timeout = 10000, // New timeout parameter in milliseconds
  ): Promise<T> {
    try {
      const nbrOfGateways = IPFS_GATEWAYS.length;
      const formattedUrl = formatUrl(url, IPFS_GATEWAYS[retries % nbrOfGateways]);
      const res = await axios.get<T>(formattedUrl, {
        params: urlParams,
        timeout: timeout, // Add timeout to axios request
      });
      return res.data;
    } catch (error) {
      if (retries <= 0) throw error;
      else {
        await sleep(retryDelay);
        return await this.fetch<T>(url, urlParams, retries - 1, retryDelay, timeout);
      }
    }
  }
}
