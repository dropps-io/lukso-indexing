import { JsonRpcProvider } from 'ethers';

const provider = new JsonRpcProvider('https://rpc.lukso.gateway.fm');
provider.getLogs({ fromBlock: 1891691 - 50000, toBlock: 1891691 }).then((logs) => {
  console.log(logs.length);
});
