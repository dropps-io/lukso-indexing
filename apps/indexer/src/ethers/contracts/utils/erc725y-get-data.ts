import { ethers } from 'ethers';
import ERC725Y_artifact from '@lukso/lsp-smart-contracts/artifacts/LSP0ERC725Account.json';

import { RPC_URL } from '../../../globals';

const provider = new ethers.JsonRpcProvider(RPC_URL);

export const erc725yGetData = async (address: string, dataKey: string): Promise<string | null> => {
  const contract = new ethers.Contract(address, ERC725Y_artifact.abi, provider);
  const response = await contract.getData(dataKey);
  if (!response || response === '0x') return null;
  else return response;
};

//TODO Are we using this function?
export const erc725yGetDataBatch = async (
  address: string,
  dataKeys: string[],
): Promise<string[]> => {
  const contract = new ethers.Contract(address, ERC725Y_artifact.abi, provider);
  return await contract.getDataBatch(dataKeys);
};
