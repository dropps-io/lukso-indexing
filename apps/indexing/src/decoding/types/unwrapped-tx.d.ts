import { DecodedParameter } from './decoded-parameter';

export interface UnwrappedTransaction {
  input: string;
  to: string;
  value: string;
  parameters: DecodedParameter[];
  methodName: string | null;
}
