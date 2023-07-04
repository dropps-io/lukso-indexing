import { MetadataTable } from '@db/lukso-data/entities/metadata.table';
import { MetadataAssetTable } from '@db/lukso-data/entities/metadata-asset.table';
import { MetadataImageTable } from '@db/lukso-data/entities/metadata-image.table';
import { MetadataLinkTable } from '@db/lukso-data/entities/metadata-link.table';

export interface MetadataResponse {
  metadata: Omit<MetadataTable, 'id'>;
  tags: string[];
  assets: Omit<MetadataAssetTable, 'metadataId'>[];
  images: Omit<MetadataImageTable, 'metadataId'>[];
  links: Omit<MetadataLinkTable, 'metadataId'>[];
}
