export enum REDIS_KEY {
  LATEST_TX_INDEXED_BLOCK = 'latest_tx_indexed_block',
  LATEST_EVENT_INDEXED_BLOCK = 'latest_event_indexed_block',
  LATEST_UPDATE_DATE = 'latest_update_date',
  P_LIMIT = 'p_limit',
  BLOCKS_P_LIMIT = 'blocks_p_limit',
  EVENTS_CHUNK_SIZE = 'event_chunk_size',
  BLOCK_CHUNK_SIZE = 'block_chunk_size',
  METADATA_CHUNK_SIZE = 'metadata_chunk_size',
  INDEXER_STATUS = 'indexer_status',
}
