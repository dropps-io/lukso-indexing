import { LSP4DigitalAsset } from '@lukso/lsp-factory.js/build/main/src/lib/interfaces/lsp4-digital-asset';

export type Lsp4DigitalAssetJson =
  | {
      LSP4Metadata: LSP4DigitalAsset & { name?: string };
    }
  | (LSP4DigitalAsset & { name?: string });
