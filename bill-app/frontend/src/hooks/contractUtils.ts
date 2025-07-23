import * as Client from '../../packages/billr_contract';

const contract = new Client.Client({
   ...Client.networks.testnet,
   rpcUrl: 'https://soroban-testnet.stellar.org:443'
});



export default contract;