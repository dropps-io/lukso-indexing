import { LSP3Profile } from '@lukso/lsp-factory.js/build/main/src/lib/interfaces/lsp3-profile';

export type LSP3ProfileJson =
  | {
      LSP3Profile: LSP3Profile;
    }
  | LSP3Profile;
