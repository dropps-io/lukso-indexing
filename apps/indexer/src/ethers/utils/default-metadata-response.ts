import { MetadataResponse } from '@shared/types/metadata-response';

export const defaultMetadata = (eventHash: string | null, address: string): MetadataResponse => {
  return {
    metadata: {
      address,
      eventHash: null,
      tokenId: null,
      name: null,
      symbol: null,
      description: null,
      blockNumber: null,
      isNFT: null,
    },
    tags: [],
    assets: [],
    images: [],
    links: [],
  };
};
