import { LocalStoragePreset } from 'lowdb/browser';
import type { LowSync } from 'lowdb/lib/core/Low';

export type Wallet = {
  name: string;
  privateKey: `0x${ string }`;
  address: `0x${ string }`;
  text: string;
  isPrivateKey: boolean;
  latest: boolean;
}

export const Keys = {
  Version: 'version',
  Providers: 'providers',
  Codes: 'codes',
  Wallets: 'wallets',
  Rpcs: 'rpcs',
  Artifacts: 'artifacts',

  Contracts: 'contracts',
  Rpc: 'rpc',
  RpcDatas: 'datas',
  LatestRpc: 'latest',
  LatestRpcs: 'latests',
  Provider: 'provider',
  Timeout: 'timeout',

  LatestWallet: 'latestWallet',
};

export type Data = {
  wallets: Array<Wallet>;
}

export const DefaultWallet: Wallet = {
  name: 'admin',
  privateKey: '0xf78a036930ce63791ea6ea20072986d8c3f16a6811f6a2583b0787c45086f769',
  address: '0x00000Be6819f41400225702D32d3dd23663Dd690',
  text: 'admin-0x00000Be6819f41400225702D32d3dd23663Dd690',
  isPrivateKey: true,
  latest: true,
};
export const DefaultWallet2: Wallet = {
  name: 'pk1',
  privateKey: '0x95e06fa1a8411d7f6693f486f0f450b122c58feadbcee43fbd02e13da59395d5',
  address: '0x1111102Dd32160B064F2A512CDEf74bFdB6a9F96',
  text: 'pk1-0x1111102Dd32160B064F2A512CDEf74bFdB6a9F96',
  isPrivateKey: true,
  latest: false,
};

export const defaultData: Data = { wallets: [ ] };
let lowdb: LowSync<Data>;
if (typeof window !== 'undefined') {
  lowdb = LocalStoragePreset<Data>('db', defaultData);
}

const storage = {
  init: () => {
    const wallets = storage.wallets();
    if (wallets.length === 0) {
      lowdb?.update(({ wallets }) => wallets.push(...[ DefaultWallet, DefaultWallet2 ]));
    }
  },
  wallets: (): Array<Wallet> => {
    const wallets = lowdb?.data.wallets;
    return wallets || [ ];
  },
  wallet: (): Wallet => {
    const wallets = storage.wallets();
    const wallet = wallets.find(item => item.latest);
    if (wallet) {
      return wallet;
    }
    return DefaultWallet;
  },
  selectWallet: (address: string) => {
    lowdb?.update(({ wallets }) => {
      for (const wallet of wallets) {
        wallet.latest = wallet.address.toLowerCase() === address.toLowerCase();
      }
      return wallets;
    });
  },
  DefaultWallet,
};

export default storage;
