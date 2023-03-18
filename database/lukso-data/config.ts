export enum DATA_TABLE {
  CONTRACT = 'contract',
  METADATA = 'metadata',
  METADATA_IMAGE = 'metadata_image',
  METADATA_LINK = 'metadata_link',
  METADATA_TAG = 'metadata_tag',
  METADATA_ASSET = 'metadata_asset',
  CONTRACT_TOKEN = 'contract_token',
  DATA_CHANGED = 'data_changed',
  TRANSACTION = 'transaction',
  TRANSACTION_INPUT = 'transaction_input',
  TRANSACTION_PARAMETER = 'transaction_parameter',
  EVENT = 'event',
  EVENT_PARAMETER = 'event_parameter',
}

export const LUKSO_DATA_CONNECTION_STRING = process.env.LUKSO_DATA_CONNECTION_STRING;
