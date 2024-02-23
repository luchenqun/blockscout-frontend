import { Box, Button, Text } from '@chakra-ui/react';
import React from 'react';

import { useWallets } from 'lib/hooks/useStorage';
import * as mixpanel from 'lib/mixpanel/index';
import getDefaultTransitionProps from 'theme/utils/getDefaultTransitionProps';
import AddressEntity from 'ui/shared/entities/address/AddressEntity';

type Props = {
  address?: string;
  disconnect?: () => void;
};

const WalletMenuContent = ({ address, disconnect }: Props) => {
  const onAddressClick = React.useCallback(() => {
    mixpanel.logEvent(mixpanel.EventTypes.WALLET_ACTION, { Action: 'Address click' });
  }, []);

  const wallets = useWallets();

  return (
    <Box>
      <Text
        fontSize="sm"
        fontWeight={ 600 }
        mb={ 1 }
        { ...getDefaultTransitionProps() }
      >
        My wallet
      </Text>
      <Text
        fontSize="sm"
        mb={ 5 }
        fontWeight={ 400 }
        color="text_secondary"
        { ...getDefaultTransitionProps() }
      >
        Your wallet is used to interact with apps and contracts in the explorer.
      </Text>
      {
        wallets.map(wallet => {
          return (
            <AddressEntity
              address={{ hash: wallet.address }}
              noTooltip
              truncation="dynamic"
              fontSize="sm"
              fontWeight={ 700 }
              color="text"
              mb={ 6 }
              onClick={ onAddressClick }
              key={ wallet.name }
            />
          );
        })
      }
      <AddressEntity
        address={{ hash: address }}
        noTooltip
        truncation="dynamic"
        fontSize="sm"
        fontWeight={ 700 }
        color="text"
        mb={ 6 }
        onClick={ onAddressClick }
      />
      <Button size="sm" width="full" variant="outline" onClick={ disconnect }>
        Disconnect
      </Button>
      <Button size="sm" width="full" variant="outline" onClick={ disconnect }>
        Connect
      </Button>
    </Box>
  );
};

export default WalletMenuContent;
