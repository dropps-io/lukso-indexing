import { MetadataResponse } from '@shared/types/metadata-response';

export const defaultMetadata = (address: string): MetadataResponse => {
  return {
    metadata: {
      address,
      tokenId: null,
      name: null,
      symbol: null,
      description: null,
      isNFT: null,
    },
    tags: [],
    assets: [],
    images: [],
    links: [],
    attributes: [],
  };
};
