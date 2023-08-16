import { MetadataResponse } from '../types/metadata-response';

export const defaultMetadata = (address: string): MetadataResponse => {
  return {
    metadata: {
      address,
      tokenId: null,
      name: null,
      symbol: null,
      description: null,
      isNFT: null,
      isHistorical: null,
      version: null,
    },
    tags: [],
    assets: [],
    images: [],
    links: [],
  };
};
