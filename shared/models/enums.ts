export enum CONTRACT_TYPE {
  PROFILE = 'profile',
  ASSET = 'asset',
  COLLECTION = 'collection',
}

export enum EVENT_TOPIC {
  'DATA_CHANGED' = '0xece574603820d07bc9b91f2a932baadf4628aabcb8afba49776529c14a6104b2',
  'LSP8_TRANSFER' = '0xb333c813a7426a7a11e2b190cad52c44119421594b47f6f32ace6d8c7207b2bf',
  'LSP7_TRANSFER' = '0x3997e418d2cef0b3b0e907b1e39605c3f7d32dbd061e82ea5b4a770d46a160a6',
}

export enum TX_METHOD_ID {
  'SET_DATA' = '0x7f23690c',
  'SET_DATA_BATCH' = '0x14a6e293',
}
