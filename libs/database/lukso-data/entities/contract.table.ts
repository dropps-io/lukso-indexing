import { CONTRACT_TYPE } from '@shared/types/enums';

export interface ContractTable {
  address: string;
  interfaceCode: string | null;
  interfaceVersion: string | null;
  type: CONTRACT_TYPE | null;
}
