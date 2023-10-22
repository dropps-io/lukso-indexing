import { MetadataTable } from '@db/lukso-data/entities/metadata.table';

export interface ERC20MetadataResponse {
  metadata: Omit<MetadataTable, 'id' | 'isNFT'>;
}
