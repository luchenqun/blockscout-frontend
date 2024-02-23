// import { useLocalStorage } from '@uidotdev/usehooks';
import { createWalletClient, http } from 'viem';
import { privateKeyToAccount } from 'viem/accounts';

import currentChain from 'lib/web3/currentChain';

export default function useWalletClient(walletName = 'admin') {
  console.log(walletName);
  const walletClient = createWalletClient({
    chain: currentChain,
    transport: http(),
    account: privateKeyToAccount('0xf78a036930ce63791ea6ea20072986d8c3f16a6811f6a2583b0787c45086f769'),
  });
  return walletClient;
}
