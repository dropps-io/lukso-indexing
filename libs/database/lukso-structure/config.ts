import { setupEnv } from '../../../utils/setup-env';

setupEnv();

export enum STRUCTURE_TABLE {
  ERC725Y_SCHEMA = 'erc725y_schema',
  CONTRACT_INTERFACE = 'contract_interface',
  METHOD_INTERFACE = 'method_interface',
  METHOD_PARAMETER = 'method_parameter',
  CONFIG = 'config',
}

export const LUKSO_STRUCTURE_CONNECTION_STRING = process.env.LUKSO_STRUCTURE_CONNECTION_STRING;
