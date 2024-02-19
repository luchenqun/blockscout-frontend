import { createPublicClient, createWalletClient, http } from 'viem';
import { privateKeyToAccount } from 'viem/accounts';

import currentChain from './currentChain';

export const publicClient = createPublicClient({
  chain: currentChain,
  transport: http(),
  batch: {
    multicall: true,
  },
});

export const walletClient = createWalletClient({
  chain: currentChain,
  transport: http(),
  account: privateKeyToAccount('0xf78a036930ce63791ea6ea20072986d8c3f16a6811f6a2583b0787c45086f769'),
});
