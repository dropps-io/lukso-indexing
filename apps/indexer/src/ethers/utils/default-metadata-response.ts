import { MetadataResponse } from '@shared/types/metadata-response';

export const defaultMetadata = (
  eventHash: string | null,
  address: string,
  blockNumber: number | null,
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
