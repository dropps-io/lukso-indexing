import { CONTRACT_TYPE } from '@shared/types/enums';

export interface ContractInterfaceTable {
  id: string;
  code: string;
  name: string;
  version: string;
  type: CONTRACT_TYPE | null;
}
