import { MetadataResponse } from '@shared/types/metadata-response';

export const defaultMetadata = (
  eventHash: string,
  address: string,
  blockNumber: number,
): MetadataResponse => {
  return {
    metadata: {
      address,
      eventHash: eventHash,
      tokenId: null,
      name: null,
      symbol: null,
      description: null,
      blockNumber: blockNumber,
      isNFT: null,
    },
    tags: [],
    assets: [],
    images: [],
    links: [],
  };
};
