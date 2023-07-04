import { DecodedParameter } from './decoded-parameter';

export interface WrappedTransaction {
  input: string;
  to: string;
  value: string;
  parameters: DecodedParameter[];
  methodName: string | null;
}
