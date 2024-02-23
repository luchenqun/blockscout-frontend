import { useIsClient } from '@uidotdev/usehooks';
import { useWeb3Modal, useWeb3ModalState } from '@web3modal/wagmi/react';
import React from 'react';
import { useAccount, useDisconnect } from 'wagmi';

import { useWallet as useHookWallet } from 'lib/hooks/useStorage';
import * as mixpanel from 'lib/mixpanel/index';
interface Params {
  source: mixpanel.EventPayload<mixpanel.EventTypes.WALLET_CONNECT>['Source'];
}

export default function useWallet({ source }: Params) {
  const { open } = useWeb3Modal();
  const { open: isOpen } = useWeb3ModalState();
  const { disconnect } = useDisconnect();
  const [ isModalOpening, setIsModalOpening ] = React.useState(false);
  const [ isClientLoaded, setIsClientLoaded ] = React.useState(false);
  const isConnectionStarted = React.useRef(false);

  // eslint-disable-next-line react-hooks/rules-of-hooks
  const wallet = useIsClient() ? useHookWallet() : { address: '0x00000Be6819f41400225702D32d3dd23663Dd690' };

  React.useEffect(() => {
    setIsClientLoaded(true);
  }, []);

  const handleConnect = React.useCallback(async() => {
    setIsModalOpening(true);
    await open();
    setIsModalOpening(false);
    mixpanel.logEvent(mixpanel.EventTypes.WALLET_CONNECT, { Source: source, Status: 'Started' });
    isConnectionStarted.current = true;
  }, [ open, source ]);

  const handleAccountConnected = React.useCallback(({ isReconnected }: { isReconnected: boolean }) => {
    !isReconnected && isConnectionStarted.current &&
      mixpanel.logEvent(mixpanel.EventTypes.WALLET_CONNECT, { Source: source, Status: 'Connected' });
    isConnectionStarted.current = false;
  }, [ source ]);

  const handleDisconnect = React.useCallback(() => {
    disconnect();
  }, [ disconnect ]);

  const { address, isDisconnected } = useAccount({ onConnect: handleAccountConnected });

  const isWalletConnected = true || (isClientLoaded && !isDisconnected && address !== undefined);

  return {
    isWalletConnected,
    address: wallet.address || '0x00000Be6819f41400225702D32d3dd23663Dd690',
    connect: handleConnect,
    disconnect: handleDisconnect,
    isModalOpening,
    isModalOpen: isOpen,
  };
}
