import { useLocalStorage } from '@uidotdev/usehooks';
import React from 'react';
import { createWalletClient, http } from 'viem';
import { privateKeyToAccount } from 'viem/accounts';

import storage from 'lib/storage';
import currentChain from 'lib/web3/currentChain';

export const UpdateTimeKey = 'updateTime';
export const DefaultTime = 20191205;

export function useUpdateTime(time?: number) {
  const [ , setUpdateTime ] = React.useState(time || DefaultTime);
  React.useEffect(
    () => {
      setUpdateTime(time || DefaultTime);
    },
    [ time ],
  );
  return setUpdateTime;
}

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

export function useWallet() {
  // Error: useLocalStorage is a client-only hook
  // eslint-disable-next-line react-hooks/rules-of-hooks
  // useLocalStorage<number>(UpdateTimeKey);
  const wallet = storage.wallet();
  return wallet;
}
