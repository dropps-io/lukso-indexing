import { IPFS_GATEWAYS } from '../globals';

// Function to randomly select an IPFS gateway from the available list & append the ipfs path to it
export const getRandomGateway = (): string => {
  const randomIndex = Math.floor(Math.random() * IPFS_GATEWAYS.length);
  return IPFS_GATEWAYS[randomIndex] + '/ipfs/';
};
