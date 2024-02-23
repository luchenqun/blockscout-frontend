import { useLocalStorage } from '@uidotdev/usehooks';
import { createWalletClient, http } from 'viem';
import { privateKeyToAccount } from 'viem/accounts';

import storage from 'lib/storage';
import currentChain from 'lib/web3/currentChain';

const UpdateTimeKey = 'updateTime';

export function useWalletClient() {
  useLocalStorage<number>(UpdateTimeKey);
  const wallet = storage.wallet();
  const walletClient = createWalletClient({
    chain: currentChain,
    transport: http(),
    account: privateKeyToAccount(wallet.privateKey),
  });

  return walletClient;
}

export function useWallets() {
  useLocalStorage<number>(UpdateTimeKey);
  const wallets = storage.wallets();
  return wallets;
}
