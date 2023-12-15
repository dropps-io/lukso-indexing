import { MetadataImageTable } from '@db/lukso-data/entities/metadata-image.table';
import { ImageMetadata } from '@lukso/lsp-factory.js/build/main/src/lib/interfaces/metadata';

import { METADATA_IMAGE_TYPE } from '../../types/enums';

export const formatMetadataImages = (
  images?: ImageMetadata[][] | ImageMetadata[],
  type?: METADATA_IMAGE_TYPE | null,
): Omit<MetadataImageTable, 'metadataId'>[] => {
  return images
    ? images.flat().map((image) => {
        return { ...image, type: type || null, hash: image.verificationData };
      })
    : [];
};
